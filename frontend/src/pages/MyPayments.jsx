import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const statusLabels = {
  PAYMENT_REVIEW: "Menunggu verifikasi admin",
  PAID: "Pembayaran diterima",
  REJECTED: "Pembayaran ditolak",
  WAITING_PAYMENT: "Menunggu pembayaran",
};

function MyPayments() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    axios.get(`${API}/api/payments/mine`, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => setPayments(response.data.data || []))
      .catch((err) => {
        if (err.response?.status === 401) navigate("/login");
        else setError(err.response?.data?.message || "Gagal memuat riwayat pembayaran.");
      }).finally(() => setLoading(false));
  }, [navigate]);

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-bold">Riwayat Pembayaran</h1>
      <p className="mt-2 text-gray-600">Status bukti QRIS yang sudah kamu kirim. Pesanan baru muncul setelah admin menyetujui pembayaran.</p>
      {loading && <p className="mt-8 text-gray-500">Memuat pembayaran...</p>}
      {error && <p className="mt-8 text-red-600">{error}</p>}
      {!loading && !error && payments.length === 0 && <p className="mt-8 rounded-xl bg-white p-6">Belum ada pembayaran yang dikirim.</p>}
      <div className="mt-8 space-y-4">
        {payments.map((payment) => (
          <article key={payment._id} className="rounded-2xl border bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">Pembayaran #{payment._id.slice(-8).toUpperCase()}</h2>
                <p className="mt-1 text-sm text-gray-500">{new Date(payment.createdAt).toLocaleString("id-ID")}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${payment.status === "PAID" ? "bg-green-100 text-green-800" : payment.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-800"}`}>
                {statusLabels[payment.status] || payment.status}
              </span>
            </div>
            <p className="mt-4 text-lg font-bold text-green-800">Rp{payment.totalPrice.toLocaleString("id-ID")}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-600">
              {payment.items?.map((item, index) => <li key={index}>{item.quantity}× {item.name} — {item.selectedStyle} / {item.selectedSweetness}</li>)}
            </ul>
            {payment.status === "REJECTED" && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">Alasan: {payment.rejectionReason || "Hubungi admin untuk informasi lebih lanjut."}</p>}
            {payment.status === "PAID" && <Link to="/orders" className="mt-4 inline-block font-semibold text-green-700 hover:underline">Lihat pesanan saya</Link>}
          </article>
        ))}
      </div>
    </section>
  );
}

export default MyPayments;
