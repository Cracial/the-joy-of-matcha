const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const router = express.Router();

// Riwayat lama dan baru hanya tersedia bagi admin terautentikasi.
router.use(authMiddleware, adminMiddleware);

router.get("/", async (_req, res) => {
  try {
    const orders = await Order.find().populate("paymentId").populate("userId", "name email").sort({ createdAt: -1 });
    return res.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data order." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "ID order tidak valid." });
    const order = await Order.findById(req.params.id).populate("paymentId").populate("userId", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order tidak ditemukan." });
    return res.json({ success: true, data: order });
  } catch (error) {
    console.error("Get order detail:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil detail order." });
  }
});

router.patch("/:id/status", async (req, res) => {
  try {
    const { orderStatus } = req.body || {};
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "ID order tidak valid." });
    if (!["CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"].includes(orderStatus)) {
      return res.status(400).json({ success: false, message: "Status order tidak valid." });
    }
    // Jangan izinkan status mundur; pembatalan berbayar butuh proses refund/restok terpisah.
    const allowedPrevious = { PREPARING: "CONFIRMED", READY: "PREPARING", COMPLETED: "READY" };
    if (!allowedPrevious[orderStatus]) return res.status(409).json({ success: false, message: "Gunakan urutan CONFIRMED → PREPARING → READY → COMPLETED. Pembatalan pembayaran berbayar harus ditangani manual bersama refund dan penyesuaian stok." });
    const order = await Order.findOneAndUpdate(
      { _id: req.params.id, orderStatus: allowedPrevious[orderStatus] },
      { $set: { orderStatus } }, { returnDocument: "after", runValidators: true }
    );
    if (!order) return res.status(409).json({ success: false, message: "Pesanan tidak ditemukan atau status telah berubah. Segarkan halaman admin." });
    return res.json({ success: true, message: "Status order berhasil diperbarui.", data: order });
  } catch (error) {
    console.error("Update order:", error);
    return res.status(500).json({ success: false, message: "Gagal mengubah status order." });
  }
});

module.exports = router;
