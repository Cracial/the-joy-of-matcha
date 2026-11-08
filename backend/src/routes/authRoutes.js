const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

// ==============================
// REGISTER
// ==============================

router.post("/register", (_req, res) => res.status(410).json({
  success: false, message: "The Joy of Matcha sekarang menggunakan checkout tanpa akun. Registrasi pelanggan ditutup.",
}));

// ==============================
// LOGIN
// ==============================

router.post("/login", async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    // Validasi input
    if (typeof email !== "string" || !email.trim() ||
        typeof password !== "string" || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email dan password wajib diisi.",
      });
    }

    // Normalisasi email
    const normalizedEmail =
      email.trim().toLowerCase();

    // Cari user
    const user =
      await User.findOne({
        email: normalizedEmail,
      });

    if (!user) {
      return res.status(401).json({
        success: false,
        message:
          "Email atau password salah.",
      });
    }

    // Cek password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Email atau password salah.",
      });
    }

    // Pastikan role memiliki nilai
    const userRole =
      user.role || "CUSTOMER";

    // Hanya admin bisa login. User customer lama tetap tersimpan, tanpa akses ke data historis.
    if (userRole !== "ADMIN") {
      return res.status(403).json({ success: false, message: "Customer tidak perlu login. Silakan pesan langsung dari katalog." });
    }

    // Buat JWT
    const token =
      jwt.sign(
        {
          userId: user._id.toString(),
          role: userRole,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

    // Hindari mencetak nama, email, dan ID pengguna ke log server.

    // Response
    res.json({
      success: true,
      message:
        "Login berhasil.",
      data: {
        token,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: userRole,
        },
      },
    });
  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Gagal melakukan login.",
    });
  }
});

module.exports = router;