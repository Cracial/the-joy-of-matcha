require("dotenv").config();

const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  {
    name: "Hinoka",
    price: 45000,
    category: "Matcha Powder",
    stock: 20,
    description:
      "Matcha powder dengan karakter rasa yang lembut dan cocok untuk berbagai olahan matcha.",
    availableStyles: ["Hot Whisked", "Cold Whisked"],
    availableSweetness: ["No Sweet", "Less Sweet", "Normal"],
  },

  {
    name: "Mori",
    price: 60000,
    category: "Matcha Powder",
    stock: 20,
    description:
      "Matcha powder dengan rasa dan aroma khas yang cocok untuk dinikmati sebagai minuman matcha.",
    availableStyles: ["Hot Whisked", "Cold Whisked"],
    availableSweetness: ["No Sweet", "Less Sweet", "Normal"],
  },

  {
    name: "Kinko",
    price: 55000,
    category: "Hojicha Powder",
    stock: 20,
    description:
      "Hojicha powder dengan aroma roasted yang khas dan rasa yang nyaman untuk dinikmati.",
    availableStyles: ["Hot Whisked", "Cold Whisked"],
    availableSweetness: ["No Sweet", "Less Sweet", "Normal"],
  },

  {
    name: "Corn Milk Matcha",
    price: 60000,
    category: "Matcha Specials",
    stock: 20,
    description:
      "Special matcha dengan karakter rasa unik yang menjadi salah satu pilihan spesial The Joy of Matcha.",
    availableStyles: ["Hot Whisked", "Cold Whisked"],
    availableSweetness: ["No Sweet", "Less Sweet", "Normal"],
  },

  {
    name: "Ubee Matcha",
    price: 60000,
    category: "Matcha Specials",
    stock: 20,
    description:
      "Special matcha dengan karakter rasa unik yang menjadi salah satu pilihan spesial The Joy of Matcha.",
    availableStyles: ["Hot Whisked", "Cold Whisked"],
    availableSweetness: ["No Sweet", "Less Sweet", "Normal"],
  },
];

const seedProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected.");

    // Upsert agar seed tidak menghapus produk/order atau mereset stok yang sudah berjalan.
    for (const { stock, ...product } of products) {
      await Product.updateOne(
        { name: product.name },
        { $set: product, $setOnInsert: { stock } },
        { upsert: true }
      );
    }

    console.log("Data produk diperbarui tanpa mereset stok yang sudah ada.");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Gagal melakukan seed:", error.message);
    process.exit(1);
  }
};

seedProducts();