const test = require('node:test');
const assert = require('node:assert/strict');
const { safeIntro, isSensitive, redactPrivate } = require('../src/routes/chatRoutes');

const catalogue = [{ name: 'Mori' }, { name: 'Ubee Matcha' }];

test('AI intro cannot add invented amounts, named products or unsafe claims', () => {
  assert.equal(safeIntro('Aku bantu pilihkan sesuai seleramu.', catalogue), 'Aku bantu pilihkan sesuai seleramu.');
  assert.equal(safeIntro('Mori harganya Rp45.000.', catalogue), null);
  assert.equal(safeIntro('Semua produk dijamin halal dan aman.', catalogue), null);
  assert.equal(safeIntro('Ada 4 rekomendasi untuk kamu.', catalogue), null);
  assert.equal(safeIntro('Coba Ubee Matcha dulu, ya!', catalogue), null);
});

test('sensitive requests remain deterministic while menu can use safe AI intro', () => {
  assert.equal(isSensitive('bagaimana status pesanan saya?'), true);
  assert.equal(isSensitive('apakah aman untuk alergi susu?'), true);
  assert.equal(isSensitive('berapa harga Mori?'), false);
  assert.equal(isSensitive('rekomendasi di bawah 60rb'), false);
});

test('privacy filter masks email, phone and secret tracking token', () => {
  const hidden = redactPrivate('Email: user@example.com HP: 081234567891 token ' + 'a'.repeat(64));
  assert.doesNotMatch(hidden, /user@example\.com|081234567891|a{64}/);
});

test('AI introductory sentence cannot mention a shortened product name', () => {
  assert.equal(safeIntro('Coba Ubee aja, yuk!', catalogue), null);
});

test('private address and dairy-sensitive queries avoid generative AI introduction', () => {
  assert.equal(isSensitive('Antar ke Jalan Mawar 10'), true);
  assert.equal(isSensitive('Aku tidak pakai susu'), true);
});

test('AI introductory sentence cannot invent flavor claims', () => {
  assert.equal(safeIntro('Minumannya creamy dan rasanya manis.', catalogue), null);
});
