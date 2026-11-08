const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const fsPromises = require("fs/promises");
const mongoose = require("mongoose");

const Payment = require("../models/Payment");
const Order = require("../models/Order");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();
const uploadWindows = new Map();
// Pembatasan sederhana per proses. Untuk deployment multi-instance gunakan Redis/WAF.
function limitGuestUploads(req, res, next) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const old = uploadWindows.get(ip);
  const entry = !old || old.until < now ? { count: 0, until: now + 60 * 60 * 1000 } : old;
  entry.count++;
  uploadWindows.set(ip, entry);
  if (uploadWindows.size > 2000) for (const [key, val] of uploadWindows) if (val.until < now) uploadWindows.delete(key);
  if (entry.count > 15) return res.status(429).json({ success: false, message: "Terlalu banyak percobaan upload. Coba lagi nanti." });
  next();
}
const getTrackingHash = (req) => {
  const token = req.get("x-guest-token") || "";
  return /^[a-f0-9]{64}$/.test(token) ? crypto.createHash("sha256").update(token).digest("hex") : null;
};
// Tanggal diinterpretasikan berdasarkan waktu lokal toko, bukan timezone server.
function validateSchedule(pickupDate, pickupTime) {
  if (typeof pickupDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) ||
      typeof pickupTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)) return false;
  const utcDate = new Date(`${pickupDate}T00:00:00.000Z`);
  if (!Number.isFinite(utcDate.getTime()) || utcDate.toISOString().slice(0, 10) !== pickupDate) return false;
  const timeZone = process.env.STORE_TIME_ZONE || "Asia/Makassar";
  let current;
  try {
    current = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  } catch { return false; }
  const parts = Object.fromEntries(current.map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  const minutesInDay = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5));
  const dayGap = (Date.parse(`${pickupDate}T00:00:00.000Z`) - Date.parse(`${today}T00:00:00.000Z`)) / 86400000;
  const selected = dayGap * 1440 + minutesInDay(pickupTime);
  const now = Number(parts.hour) * 60 + Number(parts.minute);
  if (selected < now + 30 || selected > now + 14 * 1440) return false;
  const openTime = process.env.STORE_OPEN_TIME;
  const closeTime = process.env.STORE_CLOSE_TIME;
  if (openTime && closeTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(openTime) && /^([01]\d|2[0-3]):[0-5]\d$/.test(closeTime)) {
    return pickupTime >= openTime && pickupTime <= closeTime;
  }
  return true;
}
const uploadDir = path.resolve(__dirname, "../../uploads/payments");
fs.mkdirSync(uploadDir, { recursive: true });

const extensions = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) =>
      cb(null, `payment-${crypto.randomUUID()}${extensions[file.mimetype]}`),
  }),
  fileFilter: (_req, file, cb) => {
    if (!extensions[file.mimetype]) {
      return cb(new Error("Bukti pembayaran harus JPG, PNG, atau WebP."));
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

async function deleteUploadedFile(req) {
  if (req.file?.path) {
    await fsPromises.unlink(req.file.path).catch(() => {});
  }
}

async function isImageFile(filePath) {
  const handle = await fsPromises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(12);
    const { bytesRead } = await handle.read(buffer, 0, 12, 0);
    const jpg = bytesRead >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    const png = bytesRead >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp = bytesRead >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
    return jpg || png || webp;
  } finally {
    await handle.close();
  }
}

const invalidInput = (res, message, status = 400) =>
  res.status(status).json({ success: false, message });

// Customer mengunggah bukti pembayaran. Harga/nama/total SELALU dihitung ulang di server.
router.post("/", limitGuestUploads, (req, res, next) => {
  upload.single("paymentProof")(req, res, (error) => {
    if (error) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return invalidInput(res, error.message, status);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (process.env.PAYMENT_MODE !== "demo" && !(process.env.PAYMENT_MODE === "live" && process.env.QRIS_MERCHANT_CONFIGURED === "true")) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Pembayaran belum diaktifkan pengelola. Periksa konfigurasi QRIS dan PAYMENT_MODE.", 503);
    }
    if (!req.file) return invalidInput(res, "Bukti pembayaran wajib diunggah.");
    if (!(await isImageFile(req.file.path))) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Isi file bukti pembayaran bukan gambar yang valid.");
    }

    const { customerName, fulfillment, pickupDate, pickupTime, address, phone, items, totalPrice } = req.body;
    if (typeof customerName !== "string" || !customerName.trim() || customerName.length > 100) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Nama pelanggan wajib diisi (maksimal 100 karakter).");
    }
    if (!["Pickup", "Delivery"].includes(fulfillment) || !validateSchedule(pickupDate, pickupTime)) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Tanggal/jam tidak valid. Pilih jadwal dalam 14 hari ke depan, minimal 30 menit dari sekarang, dan dalam jam operasional jika ditetapkan.");
    }
    if (fulfillment === "Delivery") {
      await deleteUploadedFile(req);
      return invalidInput(res, "Delivery belum tersedia. Silakan pilih Pickup.");
    }
    if (typeof phone !== "string" || !/^\+?[0-9][0-9\s-]{7,18}$/.test(phone.trim())) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Nomor WhatsApp wajib diisi dan harus valid.");
    }
    if (fulfillment === "Delivery" && (typeof address !== "string" || !address.trim())) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Alamat pengantaran wajib diisi.");
    }
    if ((address && (typeof address !== "string" || address.length > 500)) || (phone && (typeof phone !== "string" || phone.length > 40))) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Alamat atau nomor telepon terlalu panjang.");
    }

    let requested;
    try { requested = JSON.parse(items); } catch { requested = null; }
    if (!Array.isArray(requested) || requested.length < 1 || requested.length > 30) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Daftar produk tidak valid (maksimal 30 baris).");
    }
    if (requested.some((item) =>
      !item || !mongoose.isValidObjectId(item.productId) ||
      !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 100 ||
      typeof item.selectedStyle !== "string" || typeof item.selectedSweetness !== "string"
    )) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Terdapat produk, jumlah, atau pilihan yang tidak valid.");
    }

    const ids = [...new Set(requested.map((item) => String(item.productId)))];
    const products = await Product.find({ _id: { $in: ids } });
    const productMap = new Map(products.map((product) => [String(product._id), product]));
    const quantities = new Map();
    const verifiedItems = [];

    for (const item of requested) {
      const product = productMap.get(String(item.productId));
      if (!product || !product.availableStyles.includes(item.selectedStyle) ||
          !product.availableSweetness.includes(item.selectedSweetness)) {
        await deleteUploadedFile(req);
        return invalidInput(res, "Produk atau pilihan minuman berubah. Silakan periksa keranjang.", 409);
      }
      const key = String(product._id);
      quantities.set(key, (quantities.get(key) || 0) + item.quantity);
      verifiedItems.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        selectedStyle: item.selectedStyle,
        selectedSweetness: item.selectedSweetness,
      });
    }
    if ([...quantities].some(([id, quantity]) => quantity > productMap.get(id).stock)) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Stok produk tidak mencukupi. Silakan perbarui keranjang.", 409);
    }
    const serverTotal = verifiedItems.reduce((total, item) => total + item.price * item.quantity, 0);
    if (!Number.isSafeInteger(serverTotal) || Number(totalPrice) !== serverTotal) {
      await deleteUploadedFile(req);
      return invalidInput(res, `Harga produk berubah. Total terbaru Rp${serverTotal.toLocaleString("id-ID")}. Silakan perbarui keranjang.`, 409);
    }

    // Guest token dibuat acak, hanya hash yang disimpan di MongoDB.
    const trackingToken = crypto.randomBytes(32).toString("hex");
    const guestTokenHash = crypto.createHash("sha256").update(trackingToken).digest("hex");
    const payment = await Payment.create({
      guestTokenHash,
      customerName: customerName.trim(),
      fulfillment,
      pickupTime: pickupTime.trim(),
      pickupDate,
      address: fulfillment === "Delivery" ? address.trim() : "",
      phone: typeof phone === "string" ? phone.trim() : "",
      items: verifiedItems,
      totalPrice: serverTotal,
      paymentMethod: "QRIS",
      paymentProof: req.file.filename,
      status: "PAYMENT_REVIEW",
    });
    return res.status(201).json({
      success: true, message: "Bukti pembayaran dikirim. Simpan tautan pelacakan rahasia Anda.",
      data: { _id: payment._id, totalPrice: payment.totalPrice, status: payment.status },
      trackingToken,
    });
  } catch (error) {
    await deleteUploadedFile(req);
    console.error("Create payment:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan pembayaran." });
  }
});

// Semua pembayaran hanya dapat dilihat ADMIN.
router.get("/", authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const payments = await Payment.find().populate("userId", "name email").sort({ createdAt: -1 });
    res.json({ success: true, data: payments });
  } catch (error) {
    console.error("List payments:", error);
    res.status(500).json({ success: false, message: "Gagal mengambil pembayaran." });
  }
});

// Riwayat pembayaran lama tidak dibuka untuk guest, hanya daftar admin.
router.get("/mine", (_req, res) => res.status(410).json({
  success: false, message: "Gunakan tautan Lacak Pesanan untuk pembayaran guest baru.",
}));

// Lacak pembayaran guest memakai token acak 256-bit (bukan kode pesanan saja).
// Dokumen lama tanpa guestTokenHash tidak akan pernah ditemukan oleh route ini.
router.get("/guest/:id", async (req, res) => {
  try {
    const guestTokenHash = getTrackingHash(req);
    if (!mongoose.isValidObjectId(req.params.id) || !guestTokenHash) {
      return invalidInput(res, "Tautan pelacakan tidak valid atau tidak ditemukan.", 404);
    }
    const payment = await Payment.findOne({ _id: req.params.id, guestTokenHash })
      .select("_id customerName fulfillment pickupDate pickupTime items totalPrice status rejectionReason createdAt");
    if (!payment) return invalidInput(res, "Tautan pelacakan tidak valid atau tidak ditemukan.", 404);
    const order = payment.status === "PAID"
      ? await Order.findOne({ paymentId: payment._id }).select("orderNumber orderStatus createdAt")
      : null;
    return res.json({
      success: true,
      data: {
        paymentId: payment._id, customerName: payment.customerName,
        fulfillment: payment.fulfillment, pickupDate: payment.pickupDate, pickupTime: payment.pickupTime,
        items: payment.items, totalPrice: payment.totalPrice,
        status: payment.status, rejectionReason: payment.rejectionReason,
        createdAt: payment.createdAt,
        order: order ? { orderNumber: order.orderNumber, orderStatus: order.orderStatus, createdAt: order.createdAt } : null,
      },
    });
  } catch (error) {
    console.error("Guest tracking:", error);
    return invalidInput(res, "Gagal memuat status pesanan.", 500);
  }
});

// Pelanggan yang memiliki tautan rahasia dapat mengirim ulang bukti yang ditolak,
// TANPA membuat pembayaran/pesanan baru. Ini tidak membuka dokumen lama kepada publik.
router.post("/guest/:id/reupload", limitGuestUploads, (req, res, next) => {
  upload.single("paymentProof")(req, res, (error) => {
    if (error) return invalidInput(res, error.message, error.code === "LIMIT_FILE_SIZE" ? 413 : 400);
    next();
  });
}, async (req, res) => {
  try {
    const guestTokenHash = getTrackingHash(req);
    if (!guestTokenHash || !mongoose.isValidObjectId(req.params.id)) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Tautan pelacakan tidak valid.", 404);
    }
    if (!req.file || !(await isImageFile(req.file.path))) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Bukti pembayaran harus berupa JPG, PNG, atau WebP valid.");
    }
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, guestTokenHash, status: "REJECTED" },
      { $set: { paymentProof: req.file.filename, status: "PAYMENT_REVIEW", rejectionReason: "" } },
      { returnDocument: "before", runValidators: true }
    );
    if (!payment) {
      await deleteUploadedFile(req);
      return invalidInput(res, "Pembayaran tidak ditemukan atau tidak sedang ditolak.", 409);
    }
    if (payment.paymentProof && /^[a-zA-Z0-9._-]+$/.test(payment.paymentProof)) {
      await fsPromises.unlink(path.join(uploadDir, payment.paymentProof)).catch(() => {});
    }
    return res.json({ success: true, message: "Bukti baru diterima dan menunggu verifikasi admin.", data: { status: "PAYMENT_REVIEW" } });
  } catch (error) {
    await deleteUploadedFile(req);
    console.error("Reupload proof:", error);
    return res.status(500).json({ success: false, message: "Gagal mengirim ulang bukti." });
  }
});

// Bukti pembayaran disimpan privat dan hanya tersedia untuk admin.
router.get("/:id/proof", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidInput(res, "ID pembayaran tidak valid.");
    const payment = await Payment.findById(req.params.id);
    if (!payment) return invalidInput(res, "Pembayaran tidak ditemukan.", 404);
    const filename = path.basename(payment.paymentProof);
    const fullPath = path.join(uploadDir, filename);
    return res.sendFile(fullPath, (error) => {
      if (error && !res.headersSent) res.status(404).json({ success: false, message: "File bukti tidak ditemukan." });
    });
  } catch (error) {
    console.error("Payment proof:", error);
    return res.status(500).json({ success: false, message: "Gagal membaca bukti pembayaran." });
  }
});

router.get("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidInput(res, "ID pembayaran tidak valid.");
    const payment = await Payment.findById(req.params.id).select("-paymentProof");
    if (!payment) return invalidInput(res, "Pembayaran tidak ditemukan.", 404);
    return res.json({ success: true, data: payment });
  } catch (error) {
    console.error("Payment detail:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pembayaran." });
  }
});

// Hanya admin dapat memutuskan. Order dan pengurangan stok satu transaksi MongoDB.
router.patch("/:id/status", authMiddleware, adminMiddleware, async (req, res) => {
  const { status, rejectionReason } = req.body || {};
  if (!["PAID", "REJECTED"].includes(status)) return invalidInput(res, "Status pembayaran tidak valid.");
  if (status === "REJECTED" && (typeof rejectionReason !== "string" || !rejectionReason.trim())) {
    return invalidInput(res, "Alasan penolakan wajib diisi.");
  }
  if (!mongoose.isValidObjectId(req.params.id)) return invalidInput(res, "ID pembayaran tidak valid.");

  try {
    if (status === "REJECTED") {
      const payment = await Payment.findOneAndUpdate(
        { _id: req.params.id, status: "PAYMENT_REVIEW" },
        { $set: { status: "REJECTED", rejectionReason: rejectionReason.trim().slice(0, 500) } },
        { returnDocument: "after", runValidators: true }
      );
      if (!payment) return invalidInput(res, "Pembayaran tidak ditemukan atau sudah diproses.", 409);
      return res.json({ success: true, message: "Pembayaran ditolak.", data: payment });
    }

    const session = await mongoose.startSession();
    let result;
    try {
      await session.withTransaction(async () => {
        const payment = await Payment.findOneAndUpdate(
          { _id: req.params.id, status: "PAYMENT_REVIEW" },
          { $set: { status: "PAID", rejectionReason: "" } },
          { returnDocument: "after", session, runValidators: true }
        );
        if (!payment) {
          const error = new Error("Pembayaran tidak ditemukan atau sudah diproses.");
          error.statusCode = 409;
          throw error;
        }

        // Gabungkan jumlah untuk produk yang sama sebelum mengurangi stok.
        const quantities = new Map();
        for (const item of payment.items) {
          const id = String(item.productId);
          quantities.set(id, (quantities.get(id) || 0) + item.quantity);
        }
        for (const [id, quantity] of quantities) {
          const product = await Product.findOneAndUpdate(
            { _id: id, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { session, returnDocument: "after" }
          );
          if (!product) {
            const error = new Error("Stok tidak mencukupi untuk persetujuan ini. Hubungi pelanggan sebelum mengonfirmasi pembayaran.");
            error.statusCode = 409;
            throw error;
          }
        }

        const [order] = await Order.create([{
          ...(payment.userId ? { userId: payment.userId } : {}),
          orderNumber: `MK-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`,
          paymentId: payment._id,
          customerName: payment.customerName,
          fulfillment: payment.fulfillment,
          pickupTime: payment.pickupTime,
          pickupDate: payment.pickupDate || "",
          address: payment.address,
          phone: payment.phone,
          items: payment.items,
          totalPrice: payment.totalPrice,
          paymentMethod: payment.paymentMethod,
          paymentStatus: "PAID",
          orderStatus: "CONFIRMED",
        }], { session });
        result = { payment, order };
      });
    } finally {
      await session.endSession();
    }
    return res.json({ success: true, message: "Pembayaran diterima, stok diperbarui, dan pesanan dibuat.", data: result });
  } catch (error) {
    console.error("Update payment:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode ? error.message : "Gagal memproses pembayaran. Pastikan MongoDB mendukung transaksi (misalnya MongoDB Atlas).",
    });
  }
});

module.exports = router;
