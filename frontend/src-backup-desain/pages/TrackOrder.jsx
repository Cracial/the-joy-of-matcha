import { useEffect, useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STATUS = {
  PAYMENT_REVIEW: "Menunggu verifikasi bukti pembayaran",
  PAID: "Pembayaran disetujui admin",
  REJECTED: "Pembayaran ditolak",
  WAITING_PAYMENT: "Menunggu pembayaran",
};
const ORDER_STATUS = {
  CONFIRMED: "Pesanan dikonfirmasi",
  PREPARING: "Sedang disiapkan",
  READY: "Siap diambil / diantar",
  COMPLETED: "Pesanan selesai",
  CANCELLED: "Pesanan dibatalkan",
};

export default function TrackOrder() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [linkInput, setLinkInput] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [proof, setProof] = useState(null);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const token = new URLSearchParams(location.hash.slice(1)).get("key") || "";

  useEffect(() => {
    if (!id) return;
    let active = true;
    if (!/^[a-f0-9]{24}$/i.test(id) || !/^[a-f0-9]{64}$/.test(token)) {
      setError("Tautan pelacakan tidak lengkap atau tidak valid.");
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    axios.get(`${API}/api/payments/guest/${id}`, { headers: { "x-guest-token": token } })
      .then(({ data: result }) => { if (active) setData(result.data); })
      .catch(() => {
        if (active) {
          setData(null);
          setError("Pesanan tidak ditemukan atau tautan pelacakan tidak valid. Pastikan kamu menggunakan tautan lengkap dari checkout.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, token, refreshKey]);

  useEffect(() => {
    if (!id || !token) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") setRefreshKey((n) => n + 1); }, 30000);
    return () => clearInterval(timer);
  }, [id, token]);

  async function reupload(event) {
    event.preventDefault();
    if (!proof) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(proof.type) || proof.size > 5 * 1024 * 1024) {
      setFeedback("Bukti harus JPG/PNG/WebP dan maksimal 5 MB."); return;
    }
    setSending(true); setFeedback("");
    try {
      const form = new FormData(); form.append("paymentProof", proof);
      await axios.post(`${API}/api/payments/guest/${id}/reupload`, form, { headers: { "x-guest-token": token } });
      setProof(null); setFeedback("Bukti baru diterima dan menunggu verifikasi admin.");
      setRefreshKey((v) => v + 1);
    } catch (err) {
      setFeedback(err.response?.data?.message || "Gagal mengirim bukti. Coba lagi.");
    } finally { setSending(false); }
  }

  function openLink(event) {
    event.preventDefault();
    try {
      const value = linkInput.trim();
      const url = new URL(value, window.location.origin);
      const match = url.pathname.match(/^\/track\/([a-f\d]{24})\/?$/i);
      const key = new URLSearchParams(url.hash.slice(1)).get("key") || "";
      if (url.origin !== window.location.origin || !match || !/^[a-f\d]{64}$/.test(key)) throw new Error();
      navigate(`/track/${match[1]}#key=${key}`);
      setLinkInput("");
      setError("");
    } catch {
      setError("Tempel tautan pelacakan lengkap yang didapat setelah checkout, bukan kode pesanan saja.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setError("Tidak dapat menyalin otomatis. Salin alamat lengkap dari bilah alamat browser.");
    }
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-bold text-gray-900">Lacak Pesanan</h1>
      {!id ? (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-gray-600">Tempel tautan pribadi yang kamu terima setelah mengunggah bukti QRIS. Kode pesanan saja tidak bisa membuka data pelanggan.</p>
          <form onSubmit={openLink} className="mt-5 space-y-3">
            <label htmlFor="tracking-link" className="block text-sm font-semibold">Tautan pelacakan</label>
            <input id="tracking-link" type="text" value={linkInput} onChange={(e) => setLinkInput(e.target.value)}
              placeholder="http://localhost:5173/track/...#key=..."
              required className="w-full rounded-lg border p-3" />
            <button className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white hover:bg-green-800">Buka pesanan saya</button>
          </form>
          <p className="mt-4 text-sm text-gray-500">Jika tautan hilang, hubungi admin toko untuk bantuan. Pesanan lama sebelum fitur guest checkout tidak dapat dilacak melalui halaman ini.</p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap gap-3">
            <button onClick={copyLink} className="rounded-lg bg-green-700 px-4 py-2 text-white">{copied ? "Tautan tersalin" : "Salin tautan pelacakan"}</button>
            <button onClick={() => setRefreshKey((v) => v + 1)} className="rounded-lg border px-4 py-2">Perbarui status</button>
          </div>
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Simpan tautan ini secara pribadi. Siapa pun yang memiliki tautan lengkap dapat memantau pesanan ini. Jangan bagikan ke orang lain.</p>
          {loading && <p className="mt-6 text-gray-500">Memuat status pesanan...</p>}
          {error && <p role="alert" className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">{error}</p>}
          {data && !loading && (
            <div className="mt-6 space-y-5">
              <div className="rounded-xl bg-green-50 p-5">
                <p className="text-sm text-gray-600">Status pembayaran</p>
                <p className="mt-1 text-xl font-bold text-green-800">{STATUS[data.status] || data.status}</p>
                {data.status === "PAYMENT_REVIEW" && <p className="mt-2 text-sm text-gray-600">Admin akan memeriksa bukti pembayaran sebelum pesanan dibuat.</p>}
                {data.status === "REJECTED" && <>
                  <p className="mt-2 text-sm text-red-800">Alasan: {data.rejectionReason || "Silakan hubungi admin toko."}</p>
                  <form onSubmit={reupload} className="mt-4 rounded-lg border border-red-200 bg-white p-4">
                    <p className="mb-2 font-semibold">Kirim ulang bukti pembayaran</p>
                    <p className="mb-3 text-xs text-gray-500">Pastikan pembayaran sudah dilakukan melalui QRIS resmi. Jangan membayar dua kali hanya karena bukti ditolak.</p>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setProof(e.target.files?.[0] || null)} className="block w-full text-sm" />
                    {feedback && <p role="status" className="mt-2 text-sm text-gray-700">{feedback}</p>}
                    <button disabled={!proof || sending} type="submit" className="mt-3 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400">{sending ? "Mengirim..." : "Kirim bukti baru"}</button>
                  </form>
                </>}
              </div>
              {data.order && <div className="rounded-xl border p-5">
                <p className="text-sm text-gray-500">Nomor pesanan: {data.order.orderNumber}</p>
                <p className="mt-2 text-lg font-bold">{ORDER_STATUS[data.order.orderStatus] || data.order.orderStatus}</p>
              </div>}
              <div>
                <p className="font-semibold">Pelanggan: {data.customerName}</p>
                <p className="text-sm text-gray-600">{data.fulfillment} • {data.pickupDate ? `${data.pickupDate} ` : ""}{data.pickupTime}</p>
                <ul className="mt-4 space-y-2">
                  {data.items?.map((item, index) => <li key={index} className="rounded-lg border p-3 text-sm">
                    {item.quantity}× {item.name} — {item.selectedStyle}, {item.selectedSweetness}
                  </li>)}
                </ul>
                <p className="mt-4 text-xl font-bold text-green-800">Total Rp{Number(data.totalPrice).toLocaleString("id-ID")}</p>
              </div>
            </div>
          )}
        </div>
      )}
      <Link to="/products" className="mt-6 inline-block text-green-700 hover:underline">← Kembali ke katalog</Link>
    </section>
  );
}
