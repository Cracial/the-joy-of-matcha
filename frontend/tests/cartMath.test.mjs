import test from "node:test";
import assert from "node:assert/strict";
import { appendVariant, cartLineKey, changeQuantity, changeVariant, syncCatalog, cartProblems, validateAdd } from "../src/lib/cartOperations.js";

const mori = { _id: "mori", name: "Mori", price: 60000, stock: 5, category: "Matcha", image: "/images/mori.png",
  availableStyles: ["Cold Whisked", "Hot Whisked"], availableSweetness: ["Normal", "Less Sweet"] };

test("two different options of same product remain separate cart lines", () => {
  let cart = appendVariant([], mori, 2, "Cold Whisked", "Less Sweet");
  cart = appendVariant(cart, mori, 1, "Hot Whisked", "Normal");
  assert.equal(cart.length, 2);
  assert.notEqual(cartLineKey(cart[0]), cartLineKey(cart[1]));
  assert.equal(cart.reduce((n, p) => n + p.quantity, 0), 3);
});
test("adding the same exact variant merges quantity", () => {
  let cart = appendVariant([], mori, 2, "Cold Whisked", "Normal");
  cart = appendVariant(cart, mori, 2, "Cold Whisked", "Normal");
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 4);
});
test("stock is limited by sum across all variants", () => {
  let cart = appendVariant([], mori, 4, "Cold Whisked", "Normal");
  assert.equal(validateAdd(cart, mori, 2, "Hot Whisked", "Normal"), false);
  cart = appendVariant(cart, mori, 2, "Hot Whisked", "Normal");
  assert.equal(cart.length, 1);
});
test("invalid style, sweetness, zero or fractional quantities are refused", () => {
  for (const [count, style, sweet] of [[1, "Iced", "Normal"], [1, "Cold Whisked", "No Sweet"], [0, "Cold Whisked", "Normal"], [2.5, "Cold Whisked", "Normal"]])
    assert.equal(validateAdd([], mori, count, style, sweet), false);
});
test("changing a variant into an existing one merges both", () => {
  let cart = appendVariant([], mori, 2, "Cold Whisked", "Normal");
  cart = appendVariant(cart, mori, 2, "Hot Whisked", "Normal");
  cart = changeVariant(cart, cartLineKey(cart[1]), { selectedStyle: "Cold Whisked" });
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 4);
});
test("quantity change cannot exceed stock across other variants", () => {
  let cart = appendVariant([], mori, 3, "Cold Whisked", "Normal");
  cart = appendVariant(cart, mori, 1, "Hot Whisked", "Normal");
  cart = changeQuantity(cart, cartLineKey(cart[1]), 5);
  assert.equal(cart[1].quantity, 2);
});
test("old carts with no cartKey still work", () => {
  const legacy = { ...mori, quantity: 1, selectedStyle: "Cold Whisked", selectedSweetness: "Normal" };
  assert.equal(cartLineKey(legacy), "mori");
  assert.equal(changeQuantity([legacy], "mori", 2)[0].quantity, 2);
});
test("catalog sync updates price image and stock without overriding choices", () => {
  const items = appendVariant([], mori, 1, "Cold Whisked", "Less Sweet");
  const updated = syncCatalog(items, [{ ...mori, price: 65000, stock: 3, image: "/images/mori-new.png" }]);
  assert.equal(updated[0].price, 65000);
  assert.equal(updated[0].image, "/images/mori-new.png");
  assert.equal(updated[0].selectedSweetness, "Less Sweet");
});
test("removing a product in database blocks checkout instead of deleting cart", () => {
  const items = appendVariant([], mori, 1, "Cold Whisked", "Normal");
  const result = syncCatalog(items, []);
  assert.equal(result.length, 1);
  assert.equal(cartProblems(result).length, 1);
});
test("changed choices or insufficient stock block checkout", () => {
  const cart = appendVariant([], mori, 3, "Cold Whisked", "Less Sweet");
  const updated = syncCatalog(cart, [{ ...mori, stock: 2, availableSweetness: ["Normal"] }]);
  assert.equal(cartProblems(updated).length, 2);
});
