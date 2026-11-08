import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { cartLineKey, useCart } from "../context/CartContext";
import ProductImage from "../components/ProductImage";
import { cartProblems } from "../lib/cartOperations";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function Cart() {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    updateStyle,
    updateSweetness,
    syncCartWithCatalog,
    totalPrice,
  } = useCart();

  // Keranjang guest disimpan di browser. Ambil foto terbaru dari katalog
  // supaya item yang dimasukkan sebelum admin mengganti gambar tetap terbarui.
  const [imageByProductId, setImageByProductId] = useState({});
  const [catalogError, setCatalogError] = useState("");
  const warnings = cartProblems(cartItems);

  useEffect(() => {
    if (cartItems.length === 0) return;

    let active = true;
    const fetchImages = async () => {
      try {
        const response = await axios.get(`${API}/api/products`);
        const products = Array.isArray(response.data?.data) ? response.data.data : [];
        if (active) {
          syncCartWithCatalog(products);
          setCatalogError("");
          setImageByProductId(Object.fromEntries(
            products.map((product) => [product._id, product.image || ""])
          ));
        }
      } catch (error) {
        // Jika API belum tersedia, foto yang tersimpan di keranjang tetap dipakai.
        console.error("Gagal memuat katalog di keranjang:", error);
        if (active) setCatalogError("Tidak dapat memperbarui harga dan stok. Periksa koneksi sebelum checkout.");
      }
    };

    fetchImages();
    return () => { active = false; };
  }, [cartItems.length]);

  if (cartItems.length === 0) {
    return (
      <section className="joy-page text-center">
        <div className="text-6xl">🛒</div>

        <h1 className="joy-page-title mt-4">
          Keranjang Masih Kosong
        </h1>

        <p className="mt-2 text-gray-500">
          Yuk pilih matcha favorit kamu.
        </p>

        <Link
          to="/products"
          className="joy-button mt-6"
        >
          Lihat Produk
        </Link>
      </section>
    );
  }

  return (
    <section className="joy-page">
      <h1 className="joy-page-title">
        Keranjang
      </h1>

      {(warnings.length > 0 || catalogError) && (
        <div role="alert" className="mt-5 space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Periksa keranjang sebelum melanjutkan:</strong>
          {catalogError && <p>{catalogError}</p>}
          {warnings.map((warning) => <p key={warning}>• {warning}</p>)}
        </div>
      )}
      <div className="joy-cart-layout mt-8">
        <div className="space-y-5">
          {cartItems.map((item) => (
            <div
              key={cartLineKey(item)}
              className="joy-cart-item"
            >
              <div className="flex flex-wrap gap-4 sm:flex-nowrap">
                <ProductImage
                  image={imageByProductId[item._id] ?? item.image}
                  name={item.name}
                  thumbnail
                />

                <div className="flex-1">
                  <p className="text-sm text-green-700">
                    {item.category}
                  </p>

                  <h2 className="text-lg font-semibold text-gray-900">
                    {item.name}
                  </h2>

                  <p className="mt-1 text-green-700">
                    Rp{item.price.toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="ml-auto text-right">
                  <p className="font-semibold text-gray-900">
                    Rp
                    {(item.price * item.quantity).toLocaleString(
                      "id-ID"
                    )}
                  </p>

                  <button
                    onClick={() => removeFromCart(cartLineKey(item))}
                    className="mt-2 text-sm text-red-600 hover:underline"
                  >
                    Hapus
                  </button>
                </div>
              </div>

              {/* Pilihan Style */}
              <div className="joy-cart-options">
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Style
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.availableStyles?.map((style) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={item.selectedStyle === style}
                      onClick={() =>
                        updateStyle(cartLineKey(item), style)
                      }
                      className="joy-choice"
                    >
                      {style}
                    </button>
                  ))}
                </div>

              {/* Pilihan Sweetness */}
              <div>
                <p className="mb-2 text-sm font-semibold text-gray-900">
                  Sweetness
                </p>

                <div className="flex flex-wrap gap-2">
                  {item.availableSweetness?.map((sweetness) => (
                    <button
                      key={sweetness}
                      type="button"
                      aria-pressed={item.selectedSweetness === sweetness}
                      onClick={() =>
                        updateSweetness(
                          cartLineKey(item),
                          sweetness
                        )
                      }
                      className="joy-choice"
                    >
                      {sweetness}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity */}
              <div className="joy-counter flex-wrap">
                <p className="text-sm font-semibold text-gray-900">
                  Jumlah
                </p>

                <button
                  aria-label="Kurangi jumlah"
                  type="button"
                  onClick={() =>
                    updateQuantity(
                      cartLineKey(item),
                      item.quantity - 1
                    )
                  }
                  className=""
                >
                  −
                </button>

                <span className="min-w-5 text-center">
                  {item.quantity}
                </span>

                <button
                  type="button"
                  aria-label="Tambah jumlah"
                  onClick={() =>
                    updateQuantity(
                      cartLineKey(item),
                      item.quantity + 1
                    )
                  }
                  className=""
                >
                  +
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>

        {/* Ringkasan */}
        <div className="joy-cart-summary">
          <h2 className="text-2xl">
            Ringkasan Pesanan
          </h2>

          <div className="mt-6 space-y-3">
            {cartItems.map((item) => (
              <div
                key={cartLineKey(item)}
                className="text-sm"
              >
                <div className="flex justify-between">
                  <span>
                    {item.name} × {item.quantity}
                  </span>

                  <span>
                    Rp
                    {(item.price * item.quantity).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>

                <p className="mt-1 text-xs text-gray-500">
                  {item.selectedStyle} •{" "}
                  {item.selectedSweetness}
                </p>
              </div>
            ))}
          </div>

          <div className="my-5 border-t" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>

            <span className="text-green-700">
              Rp{totalPrice.toLocaleString("id-ID")}
            </span>
          </div>

          {warnings.length === 0 && !catalogError ? (
            <Link to="/checkout" className="joy-button mt-6 w-full">Checkout</Link>
          ) : (
            <p className="mt-6 rounded-xl bg-amber-50 p-3 text-center text-sm font-medium text-amber-900">Checkout ditunda sampai pilihan, stok, dan harga dapat diperiksa.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default Cart;