const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    selectedStyle: {
      type: String,
      required: true,
    },

    selectedSweetness: {
      type: String,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Guest order tidak membutuhkan akun pelanggan.
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      unique: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    fulfillment: {
      type: String,
      enum: ["Pickup", "Delivery"],
      required: true,
    },

    pickupTime: {
      type: String,
      required: true,
    },

    // Optional untuk menjaga kompatibilitas dokumen order/pembayaran lama.
    pickupDate: { type: String, default: "" },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: "Order harus memiliki minimal satu produk.",
      },
    },

    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    paymentMethod: {
      type: String,
      default: "QRIS",
    },

    paymentStatus: {
      type: String,
      enum: ["PAID"],
      default: "PAID",
    },

    orderStatus: {
      type: String,
      enum: [
        "CONFIRMED",
        "PREPARING",
        "READY",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "CONFIRMED",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);