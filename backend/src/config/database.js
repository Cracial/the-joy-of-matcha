const mongoose = require("mongoose");
const dns = require("node:dns");

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI belum diatur pada backend/.env");
  }

  // Di beberapa konfigurasi Windows, Node.js menggunakan resolver lokal
  // 127.0.0.1 yang gagal membaca DNS SRV MongoDB Atlas.
  // Gunakan resolver publik hanya saat kondisi tersebut terdeteksi.
  const currentDnsServers = dns.getServers();
  if (
    process.env.MONGODB_URI.startsWith("mongodb+srv://") &&
    currentDnsServers.length === 1 &&
    currentDnsServers[0] === "127.0.0.1"
  ) {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
    console.log("DNS MongoDB Atlas: menggunakan 8.8.8.8 dan 1.1.1.1");
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

module.exports = connectDB;
