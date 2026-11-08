import { Link, useLocation } from "react-router-dom";

function PaymentSuccess() {
  const location = useLocation();

  const {
    formData,
    cartItems,
    totalPrice,
    paymentProofName,
  } = location.state || {};

  return (
    <section className="mx-auto max-w-3xl px-6 py-16">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-100">
        <div className="text-6xl">⏳</div>

        <h1 className="mt-5 text-3xl font-bold text-gray-900">
          Bukti Pembayaran Berhasil Dikirim
        </h1>

        <p className="mt-3 text-gray-500">
          Pembayaran kamu sedang menunggu verifikasi dari admin.
        </p>

        <div className="mt-8 rounded-xl bg-yellow-50 p-5 text-left">
          <p className="text-sm text-gray-600">
            Status Pembayaran
          </p>

          <p className="mt-1 font-semibold text-yellow-700">
            PAYMENT_REVIEW
          </p>
        </div>

        {paymentProofName && (
          <div className="mt-4 rounded-xl bg-gray-50 p-5 text-left">
            <p className="text-sm text-gray-500">
              Bukti pembayaran
            </p>

            <p className="mt-1 font-medium text-gray-900">
              {paymentProofName}
            </p>
          </div>
        )}

        <div className="mt-4 rounded-xl bg-gray-50 p-5 text-left">
          <p className="text-sm text-gray-500">
            Total pembayaran
          </p>

          <p className="mt-1 text-xl font-bold text-green-700">
            Rp{totalPrice?.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="mt-6 text-left">
          <h2 className="font-semibold text-gray-900">
            Detail Pesanan
          </h2>

          <div className="mt-3 space-y-3">
            {cartItems?.map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-gray-100 p-4"
              >
                <p className="font-medium text-gray-900">
                  {item.name} × {item.quantity}
                </p>

                <p className="mt-1 text-sm text-gray-500">
                  {item.selectedStyle || "Hot Whisked"} •{" "}
                  {item.selectedSweetness || "Normal"}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Link
          to="/payments"
          className="mt-8 inline-block rounded-xl bg-green-700 px-6 py-3 font-medium text-white hover:bg-green-800"
        >
          Lihat Riwayat Pembayaran
        </Link>
      </div>
    </section>
  );
}

export default PaymentSuccess;