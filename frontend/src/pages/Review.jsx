import { cartLineKey } from "../context/CartContext";
import { Link, useLocation, useNavigate } from "react-router-dom";

function Review() {
  const location = useLocation();
  const navigate = useNavigate();

  const { formData, cartItems, totalPrice } = location.state || {};

  if (!formData || !cartItems) {
    return (
      <section className="joy-page joy-narrow text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Data checkout tidak ditemukan
        </h1>

        <p className="mt-2 text-gray-500">
          Silakan kembali ke keranjang dan lakukan checkout lagi.
        </p>

        <Link
          to="/cart"
          className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 font-medium text-white"
        >
          Kembali ke Keranjang
        </Link>
      </section>
    );
  }

  const handlePayment = () => {
    navigate("/payment", {
      state: {
        formData,
        cartItems,
        totalPrice,
      },
    });
  };

  return (
    <section className="joy-page joy-narrow">
      <Link
        to="/checkout"
        className="joy-text-link"
      >
        ← Kembali ke Checkout
      </Link>

      <div className="mt-6">
        <h1 className="joy-page-title">
          Review Pesanan
        </h1>

        <p className="mt-2 text-gray-500">
          Periksa kembali detail pesanan sebelum melakukan pembayaran.
        </p>
      </div>

      {/* Data pelanggan */}
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">
          Data Pelanggan
        </h2>

        <div className="mt-4 space-y-2 text-gray-600">
          <p>
            <span className="font-medium text-gray-900">
              Nama:
            </span>{" "}
            {formData.name}
          </p>

          <p>
            <span className="font-medium text-gray-900">
              Pengambilan:
            </span>{" "}
            {formData.fulfillment}
          </p>

          <p>
            <span className="font-medium text-gray-900">
              Jam:
            </span>{" "}
            {formData.pickupDate ? `${formData.pickupDate} · ` : ""}{formData.pickupTime}
          </p>

          {formData.fulfillment === "Delivery" && (
            <>
              <p>
                <span className="font-medium text-gray-900">
                  Alamat:
                </span>{" "}
                {formData.address}
              </p>

              <p>
                <span className="font-medium text-gray-900">
                  No. Telepon:
                </span>{" "}
                {formData.phone}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Detail pesanan */}
      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h2 className="text-xl font-semibold text-gray-900">
          Detail Pesanan
        </h2>

        <div className="mt-5 space-y-5">
          {cartItems.map((item) => (
            <div
              key={cartLineKey(item)}
              className="border-b border-gray-100 pb-5 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {item.name}
                  </h3>

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

                  <p className="mt-1 text-sm text-gray-500">
                    Jumlah: {item.quantity}
                  </p>
                </div>

                <p className="font-medium text-gray-900">
                  Rp
                  {(item.price * item.quantity).toLocaleString(
                    "id-ID"
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-6 rounded-2xl bg-green-50 p-6">
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-gray-900">
            Total Pembayaran
          </span>

          <span className="text-2xl font-bold text-green-700">
            Rp{totalPrice.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Tombol */}
      <button
        onClick={handlePayment}
        className="mt-6 w-full rounded-xl bg-green-700 px-6 py-4 font-medium text-white hover:bg-green-800"
      >
        Bayar Sekarang
      </button>
    </section>
  );
}

export default Review;