const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBudget, getRecommendations, chatReply, getFaqAnswer } = require('../src/services/chatService');

const catalogue = [
  { _id: '11', name: 'Hinoka', price: 45000, stock: 11, category: 'Matcha', description: 'Matcha yang lembut dan creamy.', image: '/images/hinoka.png', availableStyles: ['Cold Whisked', 'Hot Whisked'], availableSweetness: ['Normal', 'Less Sweet', 'No Sweet'] },
  { _id: '22', name: 'Mori', price: 60000, stock: 8, category: 'Matcha', description: 'Matcha bold dengan karakter kuat.', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal'] },
  { _id: '33', name: 'Kinko', price: 55000, stock: 0, category: 'Hojicha', description: 'Hojicha roasted, wangi teh panggang.', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal'] },
  { _id: '44', name: 'Majicha Latte', price: 65000, stock: 4, category: 'Matcha Specials', description: 'Perpaduan matcha dan hojicha, oat milk.', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
  { _id: '55', name: 'Ubee Matcha', price: 60000, stock: 3, category: 'Matcha Specials', description: 'Matcha dengan rasa ubi ungu dan ubee cream.', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal'] },
];

test('parses budget with rupiah and Indonesian compact notation', () => {
  assert.equal(parseBudget('budget 60 ribu'), 60000);
  assert.equal(parseBudget('di bawah 60k'), 60000);
  assert.equal(parseBudget('maksimal Rp45.000'), 45000);
  assert.equal(parseBudget('harga di bawah 50-60 ribu'), 60000);
  assert.equal(parseBudget('stok 20'), null);
});

test('strict di bawah 60 ribu excludes items exactly Rp60.000', () => {
  const result = getRecommendations('rekomendasi yang creamy di bawah 60 ribu', catalogue);
  assert.deepEqual(result.items.map((p) => p.name), ['Hinoka']);
  assert.match(chatReply('di bawah 60 ribu', catalogue).reply, /Rp45\.000/);
});

test('single product questions are answered with stored prices, availability and options', () => {
  const answer = getFaqAnswer('Mori harganya berapa?', catalogue);
  assert.match(answer, /Rp60\.000/);
  assert.match(answer, /stok saat ini 8/);
  assert.match(getFaqAnswer('Kinko stok?', catalogue), /stok saat ini 0.*habis/);
});

test('comparison includes both real products and not fabricated preferences', () => {
  const response = chatReply('Mori atau Hinoka bedanya apa?', catalogue);
  assert.match(response.reply, /Mori:/);
  assert.match(response.reply, /Hinoka:/);
  assert.equal(response.suggestions.length, 2);
});

test('recommender excludes sold-out stock and impossible style choices', () => {
  const suggestions = getRecommendations('yang roasted', catalogue).items;
  assert.ok(!suggestions.some((p) => p.name === 'Kinko'));
  const tooCheap = getRecommendations('budget 30rb', catalogue);
  assert.equal(tooCheap.items.length, 0);
  assert.match(chatReply('budget 30rb', catalogue).reply, /Belum ada/);
});

test('private payment inquiries do not claim access to orders', () => {
  const answer = chatReply('status pesanan saya sudah dibayar?', catalogue);
  assert.match(answer.reply, /tidak bisa melihat pesanan pribadi/i);
  const payment = chatReply('bukti pembayaran ditolak', catalogue);
  assert.match(payment.reply, /admin akan memverifikasi/i);
});

test('allergen, dietary and unverified shop data are not fabricated', () => {
  assert.match(chatReply('apa aman untuk alergi susu?', catalogue).reply, /belum tercatat lengkap/i);
  assert.match(chatReply('alamat toko dimana?', catalogue).reply, /belum diverifikasi/i);
});

test('menu listing includes all current products, even sold-out items marked as such', () => {
  const answer = chatReply('Menu dan harga', catalogue);
  assert.match(answer.reply, /Kinko — Rp55\.000 \(habis\)/);
  assert.match(answer.reply, /Majicha Latte/);
});

test('follow up recommendations can consider prior budget', () => {
  const history = [{ role: 'user', content: 'rekomendasi di bawah 60 ribu' }, { role: 'assistant', content: 'Hinoka recommended' }];
  const result = getRecommendations('kalau yang dingin?', catalogue, history);
  assert.ok(result.items.every((p) => p.price < 60000));
});

test('chat suggestions contain app-local product ID and image from database', () => {
  const response = chatReply('rekomendasi matcha creamy', catalogue);
  assert.equal(response.suggestions[0].id, '11');
  assert.equal(response.suggestions[0].image, '/images/hinoka.png');
  assert.ok(!('phone' in response.suggestions[0]));
});

test('single named product flavor questions do not turn into unrelated recommendations', () => {
  const answer = chatReply('Ubee manis nggak?', catalogue);
  assert.match(answer.reply, /Tentang Ubee Matcha:/);
  assert.match(answer.reply, /ubi ungu/);
  assert.deepEqual(answer.suggestions.map((p) => p.name), ['Ubee Matcha']);
  const second = chatReply('Mori pahit nggak?', catalogue);
  assert.match(second.reply, /Tentang Mori:/);
  assert.deepEqual(second.suggestions.map((p) => p.name), ['Mori']);
});

test('unique shortened product names support price and detail questions', () => {
  const answer = chatReply('Majicha itu apa?', catalogue);
  assert.match(answer.reply, /Tentang Majicha Latte:/);
  assert.match(answer.reply, /oat milk/);
  assert.match(chatReply('Ubee berapa?', catalogue).reply, /Rp60\.000/);
});

test('relative price recommendations compare against current catalogue price', () => {
  const cheaper = chatReply('ada yang lebih murah dari Mori?', catalogue);
  assert.deepEqual(cheaper.suggestions.map((p) => p.name), ['Hinoka']);
  const expensive = chatReply('ada yang lebih mahal dari Mori?', catalogue);
  assert.deepEqual(expensive.suggestions.map((p) => p.name), ['Majicha Latte']);
  assert.match(chatReply('ada yang lebih murah dari Hinoka?', catalogue).reply, /Belum ada produk/);
});

test('short comparisons can resolve distinctive names safely', () => {
  const answer = chatReply('Ubee vs Majicha', catalogue);
  assert.match(answer.reply, /Ubee Matcha:/);
  assert.match(answer.reply, /Majicha Latte:/);
});

test('options not offered by a named product are explicitly explained', () => {
  const answer = chatReply('aku mau Ubee no sweet', catalogue);
  assert.match(answer.reply, /opsi No Sweet belum tersedia/i);
  assert.deepEqual(answer.suggestions.map((p) => p.name), ['Ubee Matcha']);
});

test('a single-product follow-up can refer to the previous answer', () => {
  const history = [{ role: 'user', content: 'Ubee itu apa?' }, { role: 'assistant', content: 'Tentang Ubee Matcha: ubi ungu dan matcha.' }];
  const answer = chatReply('berapa harganya?', catalogue, history);
  assert.match(answer.reply, /Ubee Matcha/);
  assert.match(answer.reply, /Rp60\.000/);
});

test('the superlative recommendations rank cheapest or priciest product first', () => {
  assert.deepEqual(chatReply('yang paling murah?', catalogue).suggestions.map((p) => p.name), ['Hinoka']);
  assert.deepEqual(chatReply('yang paling mahal?', catalogue).suggestions.map((p) => p.name), ['Majicha Latte']);
});

test('polite closing does not force an unrelated product recommendation', () => {
  const answer = chatReply('makasih', catalogue);
  assert.match(answer.reply, /Sama-sama!/);
  assert.equal(answer.suggestions.length, 0);
});

test('first-time customer receives preference question instead of arbitrary menu', () => {
  const answer = chatReply('Aku baru pertama kali minum matcha, rekomendasi dong', catalogue);
  assert.match(answer.reply, /lebih suka rasa creamy/i);
  assert.equal(answer.suggestions.length, 0);
  assert.ok(answer.quickReplies.some((q) => /rasa tehnya kuat/i.test(q)));
});

test('strong tea preference recommends documented bold product, not every drink', () => {
  const result = chatReply('Yang rasa tehnya kuat', catalogue);
  assert.deepEqual(result.suggestions.map((p) => p.name), ['Mori']);
  assert.match(result.reply, /Mori/);
  assert.doesNotMatch(result.reply, /Hinoka/);
});

test('follow-up cheaper uses previous single product only', () => {
  const history = [{ role: 'user', content: 'Mori itu apa?' }, { role: 'assistant', content: chatReply('Mori itu apa?', catalogue).reply }];
  const response = chatReply('yang lebih murah?', catalogue, history);
  assert.deepEqual(response.suggestions.map((p) => p.name), ['Hinoka']);
  assert.match(response.reply, /lebih murah daripada Mori/i);
});

test('cheaper question without unambiguous anchor requests clarification', () => {
  const response = chatReply('Yang lebih murah?', catalogue, [{ role: 'assistant', content: 'Mori dan Hinoka.' }]);
  assert.equal(response.suggestions.length, 0);
  assert.match(response.reply, /menu yang mana/i);
});

test('alternative list explains exhaustion instead of repeating options', () => {
  const history = [{ role: 'user', content: 'Rekomendasi yang creamy di bawah 60 ribu' },
    { role: 'assistant', content: chatReply('Rekomendasi yang creamy di bawah 60 ribu', catalogue).reply }];
  const response = chatReply('Ada alternatif lain?', catalogue, history);
  assert.equal(response.suggestions.length, 0);
  assert.match(response.reply, /sudah kutampilkan semua/i);
});

test('no dairy assertions from uncertain catalogue ingredients', () => {
  const response = chatReply('Aku mau yang tidak pakai susu', catalogue);
  assert.match(response.reply, /belum tercatat lengkap/i);
  assert.equal(response.suggestions.length, 0);
});

// Kasus nyata dari transkrip pengujian customer pada The Joy of Matcha.
const realMenuFixture = [
  { _id: 'a1', name: 'Hinoka', price: 45000, stock: 20, category: 'Matcha', description: 'a smooth & vibrant matcha with gentle toasted nuttiness and delicate floral notes', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
  { _id: 'a2', name: 'Kinko', price: 55000, stock: 20, category: 'Hojicha', description: 'a silky texture, natural sweetness, roasted nut and caramel notes', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
  { _id: 'a3', name: 'Mori', price: 60000, stock: 14, category: 'Matcha', description: 'a rich and velvety matcha with deep umami and a creamy finish', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
  { _id: 'a4', name: 'Corn Milk Matcha', price: 60000, stock: 20, category: 'Specials', description: 'Special matcha dengan karakter rasa unik', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
  { _id: 'a5', name: 'Ubee Matcha', price: 60000, stock: 20, category: 'Specials', description: 'Special matcha dengan karakter rasa unik', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
  { _id: 'a6', name: 'Majicha Latte', price: 65000, stock: 18, category: 'Specials', description: 'a delicate balance of floral matcha, toasted nuttiness, and creamy oat milk', availableStyles: ['Cold Whisked'], availableSweetness: ['Normal', 'Less Sweet'] },
];

function runDialogue(inputs, products = realMenuFixture) {
  const history = [];
  const results = [];
  for (const question of inputs) {
    const answer = chatReply(question, products, history);
    results.push(answer);
    history.push({ role: 'user', content: question }, { role: 'assistant', content: answer.reply });
  }
  return results;
}

test('creamy and mild only recommends documented candidates matching both preferences', () => {
  const answers = runDialogue(['Aku baru pertama kali minum matcha, rekomendasikan yang enak dong.', 'Yang creamy dan ringan']);
  assert.deepEqual(answers[1].suggestions.map(p => p.name), ['Majicha Latte']);
  assert.doesNotMatch(answers[1].reply, /Mori —/);
});

test('negative sweetness is not interpreted as a request for sweet-flavored products', () => {
  const answer = chatReply('Aku suka yang creamy, nggak terlalu manis, budget maksimal 60 ribu', realMenuFixture);
  assert.deepEqual(answer.suggestions.map(p => p.name), ['Mori']);
  assert.match(answer.reply, /Less Sweet/);
  assert.doesNotMatch(answer.reply, /berkaitan dengan preferensi: sweet/);
});

test('repeated alternatives exclude all previously recommended items within a sequence', () => {
  const answers = runDialogue(['Rekomendasi tanpa batas harga', 'Ada alternatif lain?', 'Ada alternatif lain?', 'Ada alternatif lain?']);
  assert.deepEqual(answers[0].suggestions.map(p => p.name), ['Hinoka', 'Kinko', 'Mori']);
  assert.deepEqual(answers[1].suggestions.map(p => p.name), ['Corn Milk Matcha', 'Ubee Matcha', 'Majicha Latte']);
  assert.equal(answers[2].suggestions.length, 0);
  assert.match(answers[2].reply, /sudah kutampilkan semua/i);
  assert.equal(answers[3].suggestions.length, 0);
});

test('cheaper than a multi-product list uses the least expensive item in that list', () => {
  const answers = runDialogue(['Rekomendasi tanpa batas harga', 'Yang lebih murah?']);
  assert.equal(answers[1].suggestions.length, 0);
  assert.match(answers[1].reply, /belum ada produk/i);
  const history = [
    { role: 'user', content: 'Rekomendasi creamy, maksimal 60 ribu' },
    { role: 'assistant', content: 'Ini pilihan yang tersedia:\n• Kinko — Rp55.000 (stok 20)\n• Mori — Rp60.000 (stok 14)\n• Corn Milk Matcha — Rp60.000 (stok 20)' },
  ];
  const response = chatReply('Ada yang lebih murah?', realMenuFixture, history);
  assert.deepEqual(response.suggestions.map(p => p.name), ['Hinoka']);
  assert.match(response.reply, /Kinko/);
});

test('relative cheaper follow-up respects stored sweetness and does not invent flavor match', () => {
  const results = runDialogue(['Aku suka yang creamy, nggak terlalu manis, budget maksimal 60 ribu', 'Kalau ada yang lebih murah?']);
  assert.deepEqual(results[0].suggestions.map(p => p.name), ['Mori']);
  assert.equal(results[1].suggestions.length, 0);
  assert.match(results[1].reply, /lebih murah daripada Mori/);
  assert.match(results[1].reply, /belum memastikan karakter rasa/i);
});

test('alternatives retain budget from older question despite several alternative turns', () => {
  const answers = runDialogue(['Menu di bawah 60 ribu', 'Ada alternatif lain?', 'Ada alternatif lain?', 'Ada alternatif lain?']);
  assert.ok(answers.every(answer => answer.suggestions.every(p => p.price < 60000)));
  assert.equal(answers[3].suggestions.length, 0);
});

test('explicit new no-budget request resets prior budget', () => {
  const answers = runDialogue(['Menu di bawah 60 ribu', 'Ada alternatif lain?', 'Rekomendasi tanpa batas harga']);
  assert.ok(answers[2].suggestions.some(p => p.price >= 60000));
});
