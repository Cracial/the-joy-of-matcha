"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const Product = require("../src/models/Product");
const chatRoutes = require("../src/routes/chatRoutes");
const { orderPlan, customerOrderIntent } = require("../src/services/shoppingAssistant");

const products = [
  { _id: "507f1f77bcf86cd799439011", name: "Mori", price: 60000, stock: 14, description: "creamy matcha",
    availableStyles: ["Hot Whisked", "Cold Whisked"], availableSweetness: ["No Sweet", "Less Sweet", "Normal"], image: "/images/mori.png" },
  { _id: "507f1f77bcf86cd799439012", name: "Hinoka", price: 45000, stock: 0, description: "matcha ringan",
    availableStyles: ["Cold Whisked"], availableSweetness: ["Normal"], image: "/images/hinoka.png" },
];

test("explicit product request produces draft and not a confirmed order", () => {
  const result = orderPlan("pesan 2 Mori dingin less sweet", products);
  assert.equal(result.proposal.productId, String(products[0]._id));
  assert.equal(result.proposal.quantity, 2);
  assert.equal(result.proposal.selectedStyle, "Cold Whisked");
  assert.equal(result.proposal.selectedSweetness, "Less Sweet");
  assert.match(result.reply, /Konfirmasi Tambah/);
  assert.doesNotMatch(result.reply, /pembayaran (?:berhasil|sudah diterima)/i);
});
test("rejects unsupported styles/sweetness instead of inventing availability", () => {
  const result = orderPlan("beli Mori smoothie no ice super sweet", products);
  assert.ok(result.proposal);
  assert.equal(result.proposal.selectedSweetness, null);
});
test("out of stock orders do not offer add-to-cart actions", () => {
  const result = orderPlan("beli Hinoka", products);
  assert.match(result.reply, /habis/);
  assert.equal(result.proposal, undefined);
});
test("quantity limit is enforced before action", () => {
  const result = orderPlan("tambah 30 gelas Mori ke keranjang", products);
  assert.equal(result.proposal.quantity, 10);
  assert.match(result.reply, /dibatasi/);
});
test("questions about how to buy are not interpreted as purchase intent", () => {
  assert.equal(customerOrderIntent("bagaimana cara pesan tanpa login?"), false);
  assert.equal(customerOrderIntent("cara checkout"), false);
  assert.equal(orderPlan("Cara pesan Mori?", products), null);
});
test("ambiguous requests never pick a product without user choosing", () => {
  assert.equal(orderPlan("tambah Mori dan Hinoka", products).proposal, undefined);
  assert.equal(orderPlan("aku mau pesan", products).proposal, undefined);
});
test("single last-mentioned product can be referenced via 'yang tadi'", () => {
  const history = [{ role: "assistant", content: "Mori — Rp60.000 (stok 14)" }];
  assert.equal(orderPlan("pesan yang tadi", products, history).proposal.productId, String(products[0]._id));
});
test("multiple products in last recommendation remain ambiguous", () => {
  const history = [{ role: "assistant", content: "Mori — Rp60.000\nHinoka — Rp45.000" }];
  assert.equal(orderPlan("pesan yang tadi", products, history).proposal, undefined);
});
test("no default choice when customer did not specify style and sweetness", () => {
  const result = orderPlan("beli Mori", products);
  assert.equal(result.proposal.selectedStyle, null);
  assert.equal(result.proposal.selectedSweetness, null);
});
test("guest chat API returns purchase proposal without accessing payment endpoints", async () => {
  const originalFind = Product.find;
  Product.find = () => ({ select: () => ({ lean: async () => products }) });
  const app = express();
  app.use(express.json()); app.use("/api/chat", chatRoutes);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "pesan 2 Mori dingin less sweet" }),
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.data.cartProposal.quantity, 2);
    assert.equal(body.data.cartProposal.price, 60000);
    assert.equal(body.data.cartProposal.selectedSweetness, "Less Sweet");
    assert.equal(body.data.mode, "catalog");
    assert.equal(body.data.suggestions.length, 0);
    assert.equal(body.data.paymentId, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    Product.find = originalFind;
  }
});
