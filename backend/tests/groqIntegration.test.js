"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const Product = require("../src/models/Product");
const chat = require("../src/routes/chatRoutes");
const { callGroq, maskPrivate, groqMessages, DEFAULT_MODEL, GROQ_ENDPOINT } = require("../src/services/groqService");

const catalogue = [{
  _id: "507f1f77bcf86cd799439033", name: "Hinoka", price: 45000, stock: 9,
  description: "Matcha dengan karakter lembut.", availableStyles: ["Cold Whisked", "Hot Whisked"],
  availableSweetness: ["Normal", "Less Sweet"], image: "/images/hinoka.png",
}];

async function withMockChat({ aiContent = "Aku bantu pilihkan yang pas, ya.", aiStatus = 200, apiKey = "test-groq-api-key", message = "Rekomendasi matcha yang lembut", history = [], onGroq }, assertResponse) {
  const originalFind = Product.find;
  const originalFetch = global.fetch;
  const originalKey = process.env.GROQ_API_KEY;
  const originalOpenai = process.env.OPENAI_API_KEY;
  process.env.GROQ_API_KEY = apiKey;
  delete process.env.OPENAI_API_KEY;
  Product.find = () => ({ select: () => ({ lean: async () => catalogue }) });
  global.fetch = (url, options) => {
    if (String(url) === GROQ_ENDPOINT) {
      onGroq?.(options);
      return Promise.resolve({ ok: aiStatus >= 200 && aiStatus < 300, status: aiStatus,
        json: async () => ({ choices: [{ message: { content: aiContent } }] }) });
    }
    return originalFetch(url, options);
  };
  const app = express();
  app.use(express.json());
  app.use("/api/chat", chat);
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    const result = await originalFetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, history }),
    });
    assert.equal(result.status, 200);
    await assertResponse(await result.json());
  } finally {
    await new Promise((resolve) => server.close(resolve));
    Product.find = originalFind;
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = originalKey;
    if (originalOpenai === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenai;
  }
}

test("Groq uses official chat endpoint, default model, and backend-only credential", async () => {
  let inspected = false;
  const content = await callGroq({ message: "Pilihin minuman", groundedReply: "Katalog tersedia.", apiKey: "test-secret",
    fetchImpl: async (url, options) => {
      assert.equal(url, GROQ_ENDPOINT);
      assert.equal(options.headers.Authorization, "Bearer test-secret");
      const body = JSON.parse(options.body);
      assert.equal(body.model, DEFAULT_MODEL);
      assert.equal(body.messages[0].role, "system");
      assert.equal(body.messages[1].role, "user");
      assert.ok(body.max_completion_tokens <= 120);
      assert.equal(body.stream, false);
      inspected = true;
      return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: "Aku bantu, ya." } }] }) };
    },
  });
  assert.equal(content, "Aku bantu, ya.");
  assert.ok(inspected);
});

test("redaction removes private data; Groq does not receive conversation history", () => {
  const privateText = `Email pelanggan@example.com HP 081234567890. Kode ${"a".repeat(64)} tautan https://localhost:5173/track?token=secret`;
  const redacted = maskPrivate(privateText);
  assert.doesNotMatch(redacted, /pelanggan@example.com|081234567890|a{64}|track\?token/);
  const prompt = JSON.stringify(groqMessages({ message: privateText, groundedReply: "Silakan pilih menu." }));
  assert.doesNotMatch(prompt, /pelanggan@example.com|081234567890|a{64}|track\?token/);
});

test("Groq intro augments but cannot replace canonical product price or stock", async () => {
  await withMockChat({ onGroq: (options) => {
    const data = JSON.parse(options.body);
    assert.equal(data.messages[1].content.includes("Rp45.000"), true);
    assert.equal(data.messages.some((m) => /081234567890/.test(m.content)), false);
  }, history: [{ role: "user", content: "WA saya 081234567890" }] }, async (body) => {
    assert.equal(body.success, true);
    assert.equal(body.data.mode, "ai");
    assert.match(body.data.reply, /^Aku bantu pilihkan yang pas, ya\./);
    assert.match(body.data.reply, /Hinoka — Rp45\.000 \(stok 9\)/);
    assert.equal(body.data.suggestions[0].price, 45000);
    assert.equal(body.data.suggestions[0].stock, 9);
  });
});

test("Groq rate-limit (429) safely falls back to catalogue without changed facts", async () => {
  await withMockChat({ aiStatus: 429 }, async (body) => {
    assert.equal(body.success, true);
    assert.equal(body.data.mode, "faq");
    assert.match(body.data.reply, /Hinoka — Rp45\.000 \(stok 9\)/);
  });
});

test("AI cannot inject fake discounts or prices into the chat response", async () => {
  await withMockChat({ aiContent: "Hinoka diskon menjadi Rp1.000!" }, async (body) => {
    assert.equal(body.data.mode, "faq");
    assert.doesNotMatch(body.data.reply, /Rp1\.000|diskon/);
    assert.match(body.data.reply, /Rp45\.000/);
  });
});

test("transaction status remains backend-only even when GROQ_API_KEY is configured", async () => {
  let calls = 0;
  await withMockChat({ message: "Tolong cek status pesanan saya", onGroq: () => { calls++; } }, async (body) => {
    assert.equal(body.data.mode, "faq");
    assert.match(body.data.reply, /tidak bisa melihat pesanan pribadi/i);
  });
  assert.equal(calls, 0);
});

test("general tea conversation can be handled by Groq without fabricated product facts", async () => {
  await withMockChat({ message: "Kamu bisa bantu apa?", aiContent: "Boleh ceritakan kamu suka minuman yang lembut atau rasa teh yang lebih tegas?" }, async (body) => {
    assert.equal(body.data.mode, "ai");
    assert.match(body.data.reply, /kamu suka minuman/);
  });
});

test("missing Groq key returns null without making an API request", async () => {
  const response = await callGroq({ message: "Halo", groundedReply: "Halo", apiKey: "", fetchImpl: () => { throw new Error("Should never call network"); } });
  assert.equal(response, null);
});
