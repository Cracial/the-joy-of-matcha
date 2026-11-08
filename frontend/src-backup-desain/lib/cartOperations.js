/** Pure cart operations, independently testable without React or browser. */
export const cartLineKey = (item) => item.cartKey || String(item._id);
export const cartVariantKey = (id, style, sweet) => `${id}::${encodeURIComponent(style)}::${encodeURIComponent(sweet)}`;
export const stockOf = (p) => Math.max(0, Math.floor(Number(p.stock) || 0));
export const quantityOf = (p) => Math.max(0, Math.floor(Number(p.quantity) || 0));

export function makeCartLine(product, quantity, style, sweet) {
  return {
    _id: String(product._id), cartKey: cartVariantKey(String(product._id), style, sweet),
    name: product.name, category: product.category || "", image: product.image || "",
    price: Number(product.price), stock: stockOf(product),
    availableStyles: [...product.availableStyles], availableSweetness: [...product.availableSweetness],
    quantity, selectedStyle: style, selectedSweetness: sweet,
  };
}

export function validateAdd(items, product, quantity, style, sweet) {
  const id = String(product?._id || "");
  const count = Number(quantity);
  if (!id || !Array.isArray(product.availableStyles) || !Array.isArray(product.availableSweetness) ||
      !product.availableStyles.includes(style) || !product.availableSweetness.includes(sweet) ||
      !Number.isSafeInteger(count) || count < 1 || count > 10 ||
      !Number.isFinite(Number(product.price)) || Number(product.price) < 0) return false;
  const inCart = items.filter((item) => String(item._id) === id).reduce((n, item) => n + quantityOf(item), 0);
  return inCart + count <= stockOf(product);
}

export function appendVariant(items, product, quantity, style, sweet) {
  if (!validateAdd(items, product, quantity, style, sweet)) return items;
  const id = String(product._id);
  const sameIndex = items.findIndex((item) => String(item._id) === id &&
    item.selectedStyle === style && item.selectedSweetness === sweet);
  const line = makeCartLine(product, quantity, style, sweet);
  if (sameIndex === -1) return [...items, line];
  return items.map((item, i) => i === sameIndex ? { ...line, quantity: quantityOf(item) + quantity } : item);
}

export function changeQuantity(items, key, quantity) {
  const target = items.find((item) => cartLineKey(item) === key);
  if (!target) return items;
  const requested = Math.floor(Number(quantity) || 0);
  if (requested <= 0) return items.filter((item) => cartLineKey(item) !== key);
  const others = items.filter((item) => item !== target && String(item._id) === String(target._id))
    .reduce((total, item) => total + quantityOf(item), 0);
  const allowed = Math.min(requested, Math.max(0, stockOf(target) - others));
  return items.map((item) => item === target ? { ...item, quantity: allowed } : item).filter((item) => item.quantity > 0);
}

export function changeVariant(items, key, patch) {
  const target = items.find((item) => cartLineKey(item) === key);
  if (!target) return items;
  const style = patch.selectedStyle ?? target.selectedStyle;
  const sweet = patch.selectedSweetness ?? target.selectedSweetness;
  if (!target.availableStyles?.includes(style) || !target.availableSweetness?.includes(sweet)) return items;
  const existing = items.find((item) => item !== target && String(item._id) === String(target._id) &&
    item.selectedStyle === style && item.selectedSweetness === sweet);
  if (existing) return items.filter((item) => item !== target).map((item) => item === existing
    ? { ...item, quantity: quantityOf(item) + quantityOf(target) } : item);
  return items.map((item) => item === target
    ? { ...item, selectedStyle: style, selectedSweetness: sweet, cartKey: cartVariantKey(String(item._id), style, sweet) } : item);
}

export function syncCatalog(items, catalogue) {
  const products = new Map(catalogue.map((p) => [String(p._id), p]));
  return items.map((item) => {
    const current = products.get(String(item._id));
    if (!current) return { ...item, unavailable: true };
    return {
      ...item, unavailable: false, name: current.name, price: Number(current.price), image: current.image || "",
      category: current.category || "", stock: stockOf(current),
      availableStyles: [...(current.availableStyles || [])], availableSweetness: [...(current.availableSweetness || [])],
    };
  });
}

export function cartProblems(items) {
  const totals = new Map();
  for (const item of items) totals.set(String(item._id), (totals.get(String(item._id)) || 0) + quantityOf(item));
  return items.flatMap((item) => {
    const errors = [];
    if (item.unavailable) errors.push(`${item.name} tidak tersedia dalam katalog.`);
    else {
      if (!item.availableStyles?.includes(item.selectedStyle) || !item.availableSweetness?.includes(item.selectedSweetness))
        errors.push(`Pilihan varian ${item.name} berubah. Pilih ulang sebelum checkout.`);
      if (totals.get(String(item._id)) > stockOf(item)) errors.push(`Stok ${item.name} tidak mencukupi untuk jumlah dalam keranjang.`);
    }
    return errors;
  }).filter((error, i, all) => all.indexOf(error) === i);
}
