import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [proofUrl, setProofUrl] = useState("");

  const token = sessionStorage.getItem("token");

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/api/payments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log(
        "Data payments:",
        response.data
      );

      setPayments(response.data.data || []);
    } catch (error) {
      console.error(
        "Get payments error:",
        error
      );

      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        window.location.href = "/login";
        return;
      }

      setError(
        error.response?.data?.message ||
          "Gagal mengambil data pembayaran."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const updatePaymentStatus = async (
    paymentId,
    status
  ) => {
    try {
      const rejectionReason = status === "REJECTED" ? window.prompt("Alasan penolakan pembayaran:") : "";
      if (status === "REJECTED" && !rejectionReason?.trim()) return;
      if (status === "PAID" && !window.confirm("Terima bukti pembayaran dan buat pesanan?")) return;
      await axios.patch(
        `${API}/api/payments/${paymentId}/status`,
        {
          status, rejectionReason,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      await fetchPayments();
    } catch (error) {
      console.error(
        "Update payment error:",
        error
      );

      alert(
        error.response?.data?.message ||
          "Gagal memperbarui pembayaran."
      );
    }
  };

  const viewProof = async (paymentId) => {
    try {
      const response = await axios.get(
        `${API}/api/payments/${paymentId}/proof`,
        { headers: { Authorization: `Bearer ${token}` }, responseType: "blob" }
      );
      const url = URL.createObjectURL(response.data);
      setProofUrl((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return url;
      });
    } catch (error) {
      alert("Gagal membuka bukti pembayaran. Silakan login ulang jika sesi sudah habis.");
      console.error(error);
    }
  };

  const closeProof = () => {
    if (proofUrl) URL.revokeObjectURL(proofUrl);
    setProofUrl("");
  };

  const formatRupiah = (price) => {
    return new Intl.NumberFormat(
      "id-ID",
      {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }
    ).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString(
      "id-ID",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  const getStatusBadge = (status) => {
    const styles = {
      PAYMENT_REVIEW:
        "bg-yellow-100 text-yellow-700",
      PAID:
        "bg-green-100 text-green-700",
      REJECTED:
        "bg-red-100 text-red-700",
    };

    const labels = {
      PAYMENT_REVIEW:
        "Menunggu Verifikasi",
      PAID: "Dibayar",
      REJECTED: "Ditolak",
    };

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          styles[status] ||
          "bg-gray-100 text-gray-700"
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <header className="border-b bg-white px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Pembayaran
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Periksa dan verifikasi pembayaran pelanggan.
        </p>
      </header>

      {proofUrl && (
        <div role="dialog" aria-modal="true" aria-label="Bukti pembayaran" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <div className="max-h-[90vh] max-w-3xl overflow-auto rounded-xl bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-5">
              <h2 className="font-semibold">Bukti Pembayaran</h2>
              <button onClick={closeProof} className="rounded-lg border px-4 py-2 text-sm">Tutup</button>
            </div>
            <img src={proofUrl} alt="Bukti pembayaran yang dikirim pelanggan" className="max-h-[70vh] w-full object-contain" />
          </div>
        </div>
      )}

      {/* CONTENT */}
      <main className="p-8">
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">
              Memuat data pembayaran...
            </p>
          </div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center shadow-sm">
            <div className="mb-3 text-5xl">
              💳
            </div>

            <h2 className="text-lg font-semibold text-gray-800">
              Belum ada pembayaran
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Pembayaran pelanggan akan muncul di sini.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {payments.map((payment) => (
              <div
                key={payment._id}
                className="rounded-xl bg-white p-6 shadow-sm"
              >
                {/* HEADER PAYMENT */}
                <div className="flex flex-col justify-between gap-4 border-b pb-5 md:flex-row">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="font-bold text-gray-800">
                        Pembayaran #
                        {payment._id.slice(-6)}
                      </h2>

                      {getStatusBadge(
                        payment.status
                      )}
                    </div>

                    <p className="mt-2 text-sm text-gray-500">
                      {formatDate(
                        payment.createdAt
                      )}
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-sm text-gray-500">
                      Total Pembayaran
                    </p>

                    <p className="text-xl font-bold text-green-700">
                      {formatRupiah(
                        payment.totalPrice
                      )}
                    </p>
                  </div>
                </div>

                {/* CUSTOMER */}
                <div className="grid gap-6 border-b py-5 md:grid-cols-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Pelanggan
                    </p>

                    <p className="mt-1 font-medium text-gray-800">
                      {payment.customerName}
                    </p>

                    {payment.userId?.email && (
                      <p className="text-sm text-gray-500">
                        {payment.userId.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Metode
                    </p>

                    <p className="mt-1 font-medium text-gray-800">
                      {payment.paymentMethod}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-400">
                      Pengambilan
                    </p>

                    <p className="mt-1 font-medium text-gray-800">
                      {payment.fulfillment}
                    </p>

                    <p className="text-sm text-gray-500">
                      {payment.pickupDate ? `${payment.pickupDate} · ` : ""}{payment.pickupTime}
                    </p>
                  </div>
                </div>

                {/* PAYMENT PROOF */}
                {payment.paymentProof && (
                  <div className="border-b py-5">
                    <p className="mb-3 text-xs font-semibold uppercase text-gray-400">
                      Bukti Pembayaran
                    </p>

                    <button
                      onClick={() => viewProof(payment._id)}
                      className="inline-flex rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-50"
                    >
                      Lihat Bukti Pembayaran
                    </button>
                  </div>
                )}

                {/* ITEMS */}
                <div className="border-b py-5">
                  <p className="mb-3 text-xs font-semibold uppercase text-gray-400">
                    Produk
                  </p>

                  <div className="space-y-2">
                    {payment.items?.map(
                      (item, index) => (
                        <div
                          key={index}
                          className="flex justify-between rounded-lg bg-gray-50 px-4 py-3"
                        >
                          <div>
                            <p className="font-medium text-gray-800">
                              {item.name}
                            </p>

                            <p className="text-sm text-gray-500">
                              {item.quantity} x{" "}
                              {formatRupiah(
                                item.price
                              )}
                            </p>
                          </div>

                          <p className="font-semibold text-gray-800">
                            {formatRupiah(
                              item.price *
                                item.quantity
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>

                {/* ACTION */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-5">
                  <div>
                    <p className="text-sm text-gray-500">
                      Status pembayaran
                    </p>

                    <div className="mt-1">
                      {getStatusBadge(
                        payment.status
                      )}
                    </div>
                  </div>

                  {payment.status ===
                    "PAYMENT_REVIEW" && (
                    <div className="flex gap-3">
                      <button
                        onClick={() =>
                          updatePaymentStatus(
                            payment._id,
                            "REJECTED"
                          )
                        }
                        className="rounded-lg border border-red-500 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        Tolak
                      </button>

                      <button
                        onClick={() =>
                          updatePaymentStatus(
                            payment._id,
                            "PAID"
                          )
                        }
                        className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
                      >
                        Terima Pembayaran
                      </button>
                    </div>
                  )}

                  {payment.status ===
                    "PAID" && (
                    <span className="rounded-lg bg-green-50 px-5 py-2.5 text-sm font-semibold text-green-700">
                      Pembayaran Terverifikasi
                    </span>
                  )}

                  {payment.status ===
                    "REJECTED" && (
                    <span className="rounded-lg bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600">
                      Pembayaran Ditolak
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminPayments;