import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { cartLineKey, validateAdd, appendVariant, changeQuantity, changeVariant, syncCatalog, quantityOf } from "../lib/cartOperations";
export { cartLineKey } from "../lib/cartOperations";

const CartContext = createContext(null);
const CART_KEY = "matchaku_cart_guest"; // Legacy browser key preserved: do not lose existing carts.

function readCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(readCart);

  useEffect(() => {
    const reload = () => setCartItems(readCart());
    window.addEventListener("storage", reload);
    return () => window.removeEventListener("storage", reload);
  }, []);
  useEffect(() => { localStorage.setItem(CART_KEY, JSON.stringify(cartItems)); }, [cartItems]);

  // Explicitly validates options against freshly fetched product data. This only
  // edits the local browser cart; payment backend rechecks price, stock and options.
  function addConfiguredToCart(product, { quantity = 1, selectedStyle, selectedSweetness } = {}) {
    if (!validateAdd(cartItems, product, quantity, selectedStyle, selectedSweetness)) return false;
    setCartItems((items) => appendVariant(items, product, quantity, selectedStyle, selectedSweetness));
    return true;
  }

  function addToCart(product) {
    return addConfiguredToCart(product, {
      quantity: 1,
      selectedStyle: product.availableStyles?.[0],
      selectedSweetness: product.availableSweetness?.includes("Normal") ? "Normal" : product.availableSweetness?.[0],
    });
  }

  const removeFromCart = (key) => setCartItems((items) => items.filter((item) => cartLineKey(item) !== key));
  const updateQuantity = (key, quantity) => setCartItems((items) => changeQuantity(items, key, quantity));
  const updateStyle = (key, style) => setCartItems((items) => changeVariant(items, key, { selectedStyle: style }));
  const updateSweetness = (key, sweetness) => setCartItems((items) => changeVariant(items, key, { selectedSweetness: sweetness }));
  const syncCartWithCatalog = (catalogue) => setCartItems((items) => syncCatalog(items, catalogue));
  const clearCart = () => setCartItems([]);
  const totalItems = useMemo(() => cartItems.reduce((n, item) => n + quantityOf(item), 0), [cartItems]);
  const totalPrice = useMemo(() => cartItems.reduce((n, item) => n + Number(item.price) * quantityOf(item), 0), [cartItems]);

  return <CartContext.Provider value={{ cartItems, addToCart, addConfiguredToCart, removeFromCart,
    updateQuantity, updateStyle, updateSweetness, syncCartWithCatalog, clearCart, totalItems, totalPrice }}>{children}</CartContext.Provider>;
}
export function useCart() { return useContext(CartContext); }
