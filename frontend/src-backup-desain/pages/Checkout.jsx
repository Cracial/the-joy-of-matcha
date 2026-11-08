import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { cartLineKey, useCart } from "../context/CartContext";
import { cartProblems } from "../lib/cartOperations";

function getStoreToday() {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Makassar", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function Checkout() {
  const navigate = useNavigate();
  const { cartItems, totalPrice } = useCart();
  const warnings = cartProblems(cartItems);

  const [formData, setFormData] = useState({
    name: "",
    fulfillment: "Pickup",
    pickupDate: "",
    pickupTime: "",
    address: "",
    phone: "",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (warnings.length) return;

    navigate("/review", {
      state: {
        formData,
        cartItems,
        totalPrice,
      },
    });
  };

  if (cartItems.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <div className="text-6xl">🛒</div>

        <h1 className="mt-4 text-3xl font-bold text-gray-900">
          Keranjang Masih Kosong
        </h1>

        <p className="mt-2 text-gray-500">
          Tambahkan produk terlebih dahulu sebelum checkout.
        </p>

        <Link
          to="/products"
          className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
        >
          Lihat Produk
        </Link>
      </section>
    );
  }

  if (warnings.length) return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold">Keranjang perlu diperbaiki</h1>
      <p className="mt-2 text-gray-600">{warnings.join(" ")}</p>
      <Link to="/cart" className="mt-4 inline-block text-green-800 underline">Kembali ke keranjang</Link>
    </section>
  );

  return (
    <section className="mx-auto max-w-4xl px-6 py-12">
      <Link
        to="/cart"
        className="text-sm text-green-700 hover:underline"
      >
        ← Kembali ke Keranjang
      </Link>

      <div className="mt-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Checkout
        </h1>

        <p className="mt-2 text-gray-500">
          Isi data pesanan sebelum melanjutkan ke pembayaran.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        {/* Data pelanggan */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Data Pelanggan
          </h2>

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">Nama</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              required maxLength={100} placeholder="Masukkan nama kamu"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700" />
          </div>
          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">Nomor WhatsApp untuk konfirmasi</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
              required maxLength={40} placeholder="Contoh: 081234567890"
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700" />
          </div>
        </div>

        {/* Pickup / Delivery */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Pickup / Delivery
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label
              className={`cursor-pointer rounded-xl border p-4 ${
                formData.fulfillment === "Pickup"
                  ? "border-green-700 bg-green-50"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="fulfillment"
                value="Pickup"
                checked={formData.fulfillment === "Pickup"}
                onChange={handleChange}
                className="mr-2"
              />
              Pickup
            </label>

            <label
              className={`cursor-pointer rounded-xl border p-4 ${
                formData.fulfillment === "Delivery"
                  ? "border-green-700 bg-green-50"
                  : "border-gray-300"
              }`}
            >
              <input
                type="radio"
                name="fulfillment"
                value="Delivery"
                disabled
                checked={formData.fulfillment === "Delivery"}
                onChange={handleChange}
                className="mr-2"
              />
              Delivery (belum tersedia)
            </label>
          </div>

          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">Tanggal pengambilan / pengiriman</label>
            <input type="date" name="pickupDate" value={formData.pickupDate} onChange={handleChange} required
              min={getStoreToday()}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3" />
            <p className="mt-2 text-xs text-gray-500">Pilih minimal 30 menit dari waktu sekarang, maksimal 14 hari ke depan. Jam operasional harus dikonfirmasi dengan toko.</p>
          </div>
          <div className="mt-5">
            <label className="block text-sm font-medium text-gray-700">
              Jam
            </label>

            <input
              type="time"
              name="pickupTime"
              value={formData.pickupTime}
              onChange={handleChange}
              required
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3"
            />
          </div>

          {formData.fulfillment === "Delivery" && (
            <div className="mt-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Alamat
                </label>

                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows="4"
                  placeholder="Masukkan alamat lengkap"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-green-700"
                />
              </div>


            </div>
          )}
        </div>

        {/* Ringkasan Pesanan */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            Ringkasan Pesanan
          </h2>

          <div className="mt-5 space-y-5">
            {cartItems.map((item) => (
              <div
                key={cartLineKey(item)}
                className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0"
              >
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.name} × {item.quantity}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.category}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      Style:{" "}
                      <span className="font-medium text-gray-900">
                        {item.selectedStyle || "Hot Whisked"}
                      </span>
                    </p>

                    <p className="mt-1 text-sm text-gray-600">
                      Sweetness:{" "}
                      <span className="font-medium text-gray-900">
                        {item.selectedSweetness || "Normal"}
                      </span>
                    </p>
                  </div>

                  <span className="font-medium text-gray-900">
                    Rp
                    {(item.price * item.quantity).toLocaleString(
                      "id-ID"
                    )}
                  </span>
                </div>
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
        </div>

        <button
          type="submit"
          className="w-full rounded-xl bg-green-700 px-6 py-4 font-medium text-white hover:bg-green-800"
        >
          Lanjut ke Review Pesanan
        </button>
      </form>
    </section>
  );
}

export default Checkout;