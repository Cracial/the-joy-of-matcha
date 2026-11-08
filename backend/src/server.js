const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./config/database");
const productRoutes = require("./routes/productRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const orderRoutes = require("./routes/orderRoutes");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL?.split(",") || "http://localhost:5173" }));
app.use(express.json({ limit: "32kb" }));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (_req, res) => res.json({ message: "The Joy of Matcha API is running" }));

// Jangan mempublikasikan folder uploads: hanya admin boleh melihat bukti melalui API.
connectDB().then(() => {
  app.listen(PORT, () => console.log(`The Joy of Matcha API di http://localhost:${PORT}`));
});

module.exports = app;
