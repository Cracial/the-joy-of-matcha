import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import App from "./App.jsx";
import { CartProvider } from "./context/CartContext";

// Versi lama menyimpan JWT di localStorage bersama seluruh tab.
// Hapus hanya kredensial lama; keranjang (matchaku_cart_*) tetap aman.
localStorage.removeItem("token");
localStorage.removeItem("user");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CartProvider>
      <App />
    </CartProvider>
  </StrictMode>
);