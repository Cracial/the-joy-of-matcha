const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    return res.json({ success: true, data: products });
  } catch (error) {
    console.error("List products:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data produk." });
  }
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "ID produk tidak valid." });
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
    return res.json({ success: true, data: product });
  } catch (error) {
    console.error("Product detail:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil detail produk." });
  }
});

router.post("/", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, price, category, stock, description, image, availableStyles, availableSweetness } = req.body;
    const product = await Product.create({ name, price, category, stock, description, image, availableStyles, availableSweetness });
    return res.status(201).json({ success: true, data: product });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Gagal menambah produk.", error: error.message });
  }
});

router.put("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "ID produk tidak valid." });
  try {
    const allowed = ["name", "price", "category", "stock", "description", "image", "availableStyles", "availableSweetness"];
    const update = Object.fromEntries(Object.entries(req.body || {}).filter(([key]) => allowed.includes(key)));
    const product = await Product.findByIdAndUpdate(req.params.id, { $set: update }, { returnDocument: "after", runValidators: true });
    if (!product) return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
    return res.json({ success: true, data: product });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Gagal memperbarui produk.", error: error.message });
  }
});

router.delete("/:id", authMiddleware, adminMiddleware, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "ID produk tidak valid." });
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Produk tidak ditemukan." });
    return res.json({ success: true, message: "Produk berhasil dihapus." });
  } catch (error) {
    console.error("Delete product:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus produk." });
  }
});

module.exports = router;
