const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const crypto = require("node:crypto");
const Product = require("../src/models/Product");
const Payment = require("../src/models/Payment");
const Order = require("../src/models/Order");

process.env.JWT_SECRET = "unit-test-only-secret-not-for-production";
process.env.PAYMENT_MODE = "demo";
const payments = require("../src/routes/paymentRoutes");
const products = require("../src/routes/productRoutes");
const orders = require("../src/routes/orderRoutes");
const auth = require("../src/routes/authRoutes");
const chat = require("../src/routes/chatRoutes");
const { getFaqAnswer } = require("../src/routes/chatRoutes");

async function withServer(fn) {
  const app = express();
  app.use(express.json());
  app.use("/api/payments", payments);
  app.use("/api/products", products);
  app.use("/api/orders", orders);
  app.use("/api/auth", auth);
  app.use("/api/chat", chat);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

const customerToken = jwt.sign({ userId: "507f1f77bcf86cd799439011", role: "CUSTOMER" }, process.env.JWT_SECRET);
const adminToken = jwt.sign({ userId: "507f1f77bcf86cd799439022", role: "ADMIN" }, process.env.JWT_SECRET);
const productId = "507f1f77bcf86cd799439033";

function localShopSchedule(hoursFromNow = 2) {
  const future = new Date(Date.now() + hoursFromNow * 3600_000);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(future);
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { pickupDate: `${p.year}-${p.month}-${p.day}`, pickupTime: `${p.hour}:${p.minute}` };
}

function paymentForm(totalPrice) {
  const form = new FormData();
  const { pickupDate, pickupTime } = localShopSchedule();
  form.set("customerName", "Pembeli Uji");
  form.set("phone", "081234567890");
  form.set("fulfillment", "Pickup");
  form.set("pickupDate", pickupDate);
  form.set("pickupTime", pickupTime);
  form.set("totalPrice", String(totalPrice));
  form.set("items", JSON.stringify([{ productId, name: "Nama Palsu", price: 1, quantity: 2, selectedStyle: "Hot Whisked", selectedSweetness: "Normal" }]));
  form.set("paymentProof", new Blob([Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])], { type: "image/png" }), "proof.png");
  return form;
}


test("unauthenticated clients cannot access payments or edit products", async () => {
  await withServer(async (url) => {
    const paymentsList = await fetch(`${url}/api/payments`);
    assert.equal(paymentsList.status, 401);
    assert.equal((await fetch(`${url}/api/orders`)).status, 401);
    assert.equal((await fetch(`${url}/api/orders/507f1f77bcf86cd799439011`)).status, 401);
    const productEdit = await fetch(`${url}/api/products`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Injected" }),
    });
    assert.equal(productEdit.status, 401);
    const approve = await fetch(`${url}/api/payments/507f1f77bcf86cd799439011/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "PAID" }),
    });
    assert.equal(approve.status, 401);
  });
});

test("a customer cannot list other customers' payments or approve a payment", async () => {
  await withServer(async (url) => {
    const headers = { Authorization: `Bearer ${customerToken}`, "Content-Type": "application/json" };
    assert.equal((await fetch(`${url}/api/payments`, { headers })).status, 403);
    assert.equal((await fetch(`${url}/api/orders`, { headers })).status, 403);
    assert.equal((await fetch(`${url}/api/orders/507f1f77bcf86cd799439011`, { headers })).status, 403);
    assert.equal((await fetch(`${url}/api/payments/507f1f77bcf86cd799439011`, { headers })).status, 403);
    assert.equal((await fetch(`${url}/api/payments/507f1f77bcf86cd799439011/status`, {
      method: "PATCH", headers, body: JSON.stringify({ status: "PAID" }),
    })).status, 403);
    assert.equal((await fetch(`${url}/api/payments/507f1f77bcf86cd799439011/proof`, { headers })).status, 403);
  });
});

test("chat rejects empty and too-long messages without database", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/chat`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "" }),
    });
    assert.equal(response.status, 400);
    const huge = await fetch(`${url}/api/chat`, { method: "POST",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "x".repeat(501) }),
    });
    assert.equal(huge.status, 400);
  });
});

test("FAQ uses actual catalogue prices and does not fabricate payment approval", () => {
  const products = [{ name: "Hinoka", price: 45000, stock: 12, description: "Matcha yang lembut.", availableStyles: ["Hot Whisked", "Cold Whisked"], availableSweetness: ["Normal"] }];
  assert.match(getFaqAnswer("Harga Hinoka berapa?", products), /Rp45\.000/);
  assert.match(getFaqAnswer("Harga Hinoka berapa?", products), /stok saat ini 12/);
  assert.match(getFaqAnswer("bagaimana bayar QRIS?", products), /admin akan memverifikasi/i);
});

test("checkout rejects a manipulated price and trusts server-side product data", async () => {
  const originalFind = Product.find;
  const originalCreate = Payment.create;
  const observed = [];
  Product.find = async () => [{ _id: productId, name: "Hinoka", price: 45000, stock: 20, availableStyles: ["Hot Whisked"], availableSweetness: ["Normal"] }];
  Payment.create = async (payload) => { observed.push(payload); return { _id: "507f1f77bcf86cd799439044", ...payload }; };
  try {
    await withServer(async (url) => {
      const tampered = await fetch(`${url}/api/payments`, { method: "POST", body: paymentForm(2) });
      assert.equal(tampered.status, 409);
      assert.equal(observed.length, 0);
      const valid = await fetch(`${url}/api/payments`, { method: "POST", body: paymentForm(90000) });
      assert.equal(valid.status, 201);
      const result = await valid.json();
      assert.match(result.trackingToken, /^[a-f0-9]{64}$/);
      assert.equal(result.data.guestTokenHash, undefined);
      assert.equal(result.data.userId, undefined);
      assert.equal(observed[0].guestTokenHash, crypto.createHash("sha256").update(result.trackingToken).digest("hex"));
      assert.equal(observed[0].userId, undefined);
      assert.equal(observed.length, 1);
      assert.equal(observed[0].totalPrice, 90000);
      assert.equal(observed[0].items[0].name, "Hinoka");
      assert.equal(observed[0].items[0].price, 45000);
      assert.equal(observed[0].status, "PAYMENT_REVIEW");
    });
  } finally {
    Product.find = originalFind;
    Payment.create = originalCreate;
  }
});

test("admin approval creates one order and decrements stock in transaction", async () => {
  const saved = {
    session: mongoose.startSession,
    paymentUpdate: Payment.findOneAndUpdate,
    productUpdate: Product.findOneAndUpdate,
    createOrder: Order.create,
  };
  let transactionCount = 0;
  let stockDecrement = 0;
  let orderCount = 0;
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => { transactionCount++; await fn(); },
    endSession: async () => {},
  });
  Payment.findOneAndUpdate = async () => ({
    _id: "507f1f77bcf86cd799439044",
    userId: "507f1f77bcf86cd799439011",
    items: [{ productId, name: "Hinoka", price: 45000, quantity: 2, selectedStyle: "Hot Whisked", selectedSweetness: "Normal" }],
    totalPrice: 90000, customerName: "Pembeli", fulfillment: "Pickup", pickupTime: "Besok", address: "", phone: "", paymentMethod: "QRIS",
  });
  Product.findOneAndUpdate = async (_query, update) => {
    stockDecrement += update.$inc.stock;
    return { _id: productId };
  };
  Order.create = async (rows) => { orderCount++; return [{ _id: "507f1f77bcf86cd799439055", ...rows[0] }]; };
  try {
    await withServer(async (url) => {
      const result = await fetch(`${url}/api/payments/507f1f77bcf86cd799439044/status`, {
        method: "PATCH", headers: { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      assert.equal(result.status, 200);
      assert.equal(transactionCount, 1);
      assert.equal(stockDecrement, -2);
      assert.equal(orderCount, 1);
    });
  } finally {
    mongoose.startSession = saved.session;
    Payment.findOneAndUpdate = saved.paymentUpdate;
    Product.findOneAndUpdate = saved.productUpdate;
    Order.create = saved.createOrder;
  }
});

test("FAQ endpoint replies without an AI key using catalogue database values", async () => {
  const originalFind = Product.find;
  const existingKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  Product.find = () => ({
    select: () => ({ lean: async () => [{ name: "Mori", price: 60000, stock: 7,
      description: "Matcha lembut.", availableStyles: ["Cold Whisked"], availableSweetness: ["Less Sweet"] }] }),
  });
  try {
    await withServer(async (url) => {
      const result = await fetch(`${url}/api/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Berapa harga Mori?" }),
      });
      assert.equal(result.status, 200);
      const payload = await result.json();
      assert.equal(payload.data.mode, "faq");
      assert.match(payload.data.reply, /Rp60\.000/);
      assert.match(payload.data.reply, /stok saat ini 7/);
    });
  } finally {
    Product.find = originalFind;
    if (existingKey) process.env.OPENAI_API_KEY = existingKey;
  }
});

// Dokumen lama tidak memiliki hash akses guest; endpoint pelacakan tidak boleh membocorkannya.
test("tracking refuses missing/wrong tokens and never exposes old orders", async () => {
  const saved = Payment.findOne;
  let called = 0;
  Payment.findOne = (query) => {
    called++;
    assert.ok(query.guestTokenHash);
    return { select: async () => null }; // pembayaran lama tanpa token -> tidak cocok
  };
  try {
    await withServer(async (url) => {
      const id = "507f1f77bcf86cd799439044";
      assert.equal((await fetch(`${url}/api/payments/guest/${id}`)).status, 404);
      assert.equal((await fetch(`${url}/api/payments/guest/${id}`, { headers: { "x-guest-token": "a".repeat(64) } })).status, 404);
      assert.equal(called, 1);
    });
  } finally { Payment.findOne = saved; }
});

test("valid guest token only reveals scoped payment and order status", async () => {
  const savedPayment = Payment.findOne;
  const savedOrder = Order.findOne;
  const token = "c".repeat(64);
  const id = "507f1f77bcf86cd799439044";
  Payment.findOne = (q) => {
    assert.equal(q.guestTokenHash, crypto.createHash("sha256").update(token).digest("hex"));
    return { select: async () => ({ _id: id, customerName: "Guest", totalPrice: 45000,
      status: "PAID", items: [], fulfillment: "Pickup", pickupTime: "10:00", phone: "08222", paymentProof: "private.png", userId: "old" }) };
  };
  Order.findOne = (q) => {
    assert.equal(String(q.paymentId), id);
    return { select: async () => ({ orderNumber: "MK-TEST", orderStatus: "PREPARING" }) };
  };
  try {
    await withServer(async (url) => {
      const r = await fetch(`${url}/api/payments/guest/${id}`, { headers: { "x-guest-token": token } });
      assert.equal(r.status, 200);
      const body = await r.json();
      assert.equal(body.data.order.orderStatus, "PREPARING");
      assert.equal(body.data.userId, undefined);
      assert.equal(body.data.paymentProof, undefined);
      assert.equal(body.data.phone, undefined);
    });
  } finally { Payment.findOne = savedPayment; Order.findOne = savedOrder; }
});

test("guest order schema does not require customer userId; old record userId remains supported", async () => {
  const base = { orderNumber: "MK-TEST-GUEST", paymentId: "507f1f77bcf86cd799439044", customerName: "Guest",
    fulfillment: "Pickup", pickupTime: "09:00", items: [{ productId: "507f1f77bcf86cd799439033", name: "Mori", price: 60000,
      quantity: 1, selectedStyle: "Cold Whisked", selectedSweetness: "Normal" }], totalPrice: 60000 };
  const order = new Order(base);
  await order.validate();
  const payment = new Payment({ ...base, paymentProof: "payment.png", phone: "081234567890", guestTokenHash: "f".repeat(64) });
  await payment.validate();
  assert.equal(order.userId, undefined);
  assert.equal(payment.userId, undefined);
});

test("registration is closed; old customer accounts are not recreated", async () => {
  await withServer(async (url) => {
    const response = await fetch(`${url}/api/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "A", email: "a@example.com", password: "123456" }),
    });
    assert.equal(response.status, 410);
  });
});

test("admin can still list historical orders and payment documents", async () => {
  const savedOrders = Order.find;
  const savedPayments = Payment.find;
  Order.find = () => ({ populate: () => ({ populate: () => ({ sort: async () => [
    { orderNumber: "MK-OLD-ORDER", userId: { name: "Historical Customer" } },
  ] }) }) });
  Payment.find = () => ({ populate: () => ({ sort: async () => [
    { _id: "507f1f77bcf86cd799439044", customerName: "Historical Customer" },
  ] }) });
  try {
    await withServer(async (url) => {
      const headers = { Authorization: `Bearer ${adminToken}` };
      const ordersResponse = await fetch(`${url}/api/orders`, { headers });
      assert.equal(ordersResponse.status, 200);
      assert.equal((await ordersResponse.json()).data[0].orderNumber, "MK-OLD-ORDER");
      const paymentsResponse = await fetch(`${url}/api/payments`, { headers });
      assert.equal(paymentsResponse.status, 200);
      assert.equal((await paymentsResponse.json()).data[0].customerName, "Historical Customer");
    });
  } finally { Order.find = savedOrders; Payment.find = savedPayments; }
});

test("chat recommendation respects inclusive maximum and exclusive below budgets", () => {
  const { recommendProducts, parseBudget } = require("../src/routes/chatRoutes");
  assert.equal(parseBudget("di bawah 60 ribu"), 60000);
  const catalogue = [
    { _id: productId, name: "Mori", category: "Matcha", price: 60000, stock: 4, description: "Matcha creamy", availableStyles: ["Cold Whisked"], availableSweetness: ["Less Sweet"] },
    { _id: "507f1f77bcf86cd799439034", name: "Premium", category: "Matcha", price: 85000, stock: 2, description: "Matcha creamy", availableStyles: ["Cold Whisked"], availableSweetness: ["Normal"] },
    { _id: "507f1f77bcf86cd799439035", name: "Habis", category: "Matcha", price: 20000, stock: 0, description: "Matcha creamy", availableStyles: ["Cold Whisked"], availableSweetness: ["Normal"] },
  ];
  const picks = recommendProducts("Rekomendasikan creamy maksimal 60 ribu", catalogue);
  assert.equal(recommendProducts("Rekomendasikan creamy di bawah 60 ribu", catalogue).length, 0);
  assert.equal(picks.length, 1);
  assert.equal(picks[0].name, "Mori");
  assert.equal(picks[0].id, productId);
});

test("checkout rejects outdated schedule before touching database", async () => {
  await withServer(async (url) => {
    const body = paymentForm(90000);
    body.set("pickupDate", "2020-01-01");
    body.set("pickupTime", "05:00");
    const r = await fetch(`${url}/api/payments`, { method: "POST", body });
    assert.equal(r.status, 400);
    assert.match((await r.json()).message, /Tanggal\/jam/);
  });
});

test("delivery checkout is disabled until fees and coverage are supported", async () => {
  await withServer(async (url) => {
    const body = paymentForm(90000);
    body.set("fulfillment", "Delivery");
    body.set("address", "Alamat contoh");
    const r = await fetch(`${url}/api/payments`, { method: "POST", body });
    assert.equal(r.status, 400);
    assert.match((await r.json()).message, /Delivery belum tersedia/);
  });
});

test("rejected guest can reupload proof with scoped token and no new order", async () => {
  const originalUpdate = Payment.findOneAndUpdate;
  const originalCreate = Payment.create;
  const token = "d".repeat(64);
  const id = "507f1f77bcf86cd799439044";
  let matches = 0;
  let createCalls = 0;
  Payment.findOneAndUpdate = async (query, update, opts) => {
    assert.equal(String(query._id), id);
    assert.equal(query.guestTokenHash, crypto.createHash("sha256").update(token).digest("hex"));
    assert.equal(query.status, "REJECTED");
    assert.equal(update.$set.status, "PAYMENT_REVIEW");
    assert.equal(opts.returnDocument, "before");
    matches++;
    return { _id: id, paymentProof: "" };
  };
  Payment.create = async () => { createCalls++; throw new Error("should not create payment"); };
  try {
    await withServer(async (url) => {
      const form = new FormData();
      form.set("paymentProof", new Blob([Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0])], { type: "image/png" }), "proof.png");
      const invalid = await fetch(`${url}/api/payments/guest/${id}/reupload`, { method: "POST", body: form });
      assert.equal(invalid.status, 404);
      const accepted = await fetch(`${url}/api/payments/guest/${id}/reupload`, { method: "POST", body: form, headers: { "x-guest-token": token } });
      assert.equal(accepted.status, 200);
      assert.equal((await accepted.json()).data.status, "PAYMENT_REVIEW");
      assert.equal(matches, 1);
      assert.equal(createCalls, 0);
    });
  } finally { Payment.findOneAndUpdate = originalUpdate; Payment.create = originalCreate; }
});

test("admin status updates enforce previous-state guard and disallow cancellation", async () => {
  const saved = Order.findOneAndUpdate;
  let calls = 0;
  Order.findOneAndUpdate = async (query) => { calls++; assert.equal(query.orderStatus, "PREPARING"); return { _id: query._id, orderStatus: "READY" }; };
  try {
    await withServer(async (url) => {
      const id = "507f1f77bcf86cd799439055";
      const header = { Authorization: `Bearer ${adminToken}`, "Content-Type": "application/json" };
      const skip = await fetch(`${url}/api/orders/${id}/status`, { method: "PATCH", headers: header, body: JSON.stringify({ orderStatus: "READY" }) });
      // READY is only allowed when PREPARING; mock simply has to check guarded filter.
      assert.equal(skip.status, 200);
      const cancel = await fetch(`${url}/api/orders/${id}/status`, { method: "PATCH", headers: header, body: JSON.stringify({ orderStatus: "CANCELLED" }) });
      assert.equal(cancel.status, 409);
      assert.equal(calls, 1);
    });
  } finally { Order.findOneAndUpdate = saved; }
});
