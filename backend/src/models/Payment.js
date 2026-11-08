const mongoose = require("mongoose");

const paymentItemSchema = new mongoose.Schema(
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

const paymentSchema = new mongoose.Schema(
  {
    // USER PEMILIK PEMBAYARAN
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Kosong untuk guest; pesanan lama tetap menyimpan userId.
    },

    // Token tidak dikirim lewat daftar pembayaran/admin maupun API biasa.
    guestTokenHash: { type: String, select: false, default: undefined },

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
      type: [paymentItemSchema],
      required: true,

      validate: {
        validator: (items) => items.length > 0,
        message: "Minimal harus ada satu produk.",
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

    paymentProof: {
      type: String,
      required: true,
    },

    status: {
      type: String,

      enum: [
        "WAITING_PAYMENT",
        "PAYMENT_REVIEW",
        "PAID",
        "REJECTED",
      ],

      default: "PAYMENT_REVIEW",
    },

    rejectionReason: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);