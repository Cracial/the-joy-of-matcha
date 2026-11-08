import { useState } from "react";
import axios from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const QRIS_IMAGE = import.meta.env.VITE_QRIS_IMAGE_URL || "";
const DEMO_PAYMENTS = import.meta.env.VITE_DEMO_PAYMENTS === "true";
const CAN_PAY = Boolean(QRIS_IMAGE) || DEMO_PAYMENTS;

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { formData, cartItems, totalPrice } = location.state || {};
  const [paymentProof, setPaymentProof] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!formData || !Array.isArray(cartItems) || cartItems.length === 0) {
    return (
      <section className="joy-page joy-narrow text-center">
        <h1 className="text-2xl font-bold">Data pembayaran tidak ditemukan</h1>
        <p className="mt-2 text-gray-500">Silakan kembali ke keranjang dan lakukan checkout lagi.</p>
        <Link to="/cart" className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 font-medium text-white">Kembali ke Keranjang</Link>
      </section>
    );
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    setError("");
    if (!file) { setPaymentProof(null); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Bukti pembayaran harus JPG, PNG, atau WebP.");
      setPaymentProof(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran gambar maksimal 5 MB.");
      setPaymentProof(null);
      return;
    }
    setPaymentProof(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!CAN_PAY) { setError("QRIS merchant belum disiapkan. Pembayaran belum dibuka."); return; }
    if (!paymentProof) { setError("Silakan pilih bukti pembayaran terlebih dahulu."); return; }

    setLoading(true);
    setError("");
    try {
      const payload = new FormData();
      payload.append("customerName", formData.name);
      payload.append("fulfillment", formData.fulfillment);
      payload.append("pickupTime", formData.pickupTime);
      payload.append("pickupDate", formData.pickupDate);
      payload.append("address", formData.address || "");
      payload.append("phone", formData.phone || "");
      payload.append("totalPrice", String(totalPrice));
      payload.append("paymentMethod", "QRIS");
      payload.append("items", JSON.stringify(cartItems.map((item) => ({
        productId: item._id,
        quantity: item.quantity,
        selectedStyle: item.selectedStyle,
        selectedSweetness: item.selectedSweetness,
      }))));
      payload.append("paymentProof", paymentProof);

      const response = await axios.post(`${API}/api/payments`, payload);
      const { _id } = response.data.data;
      const trackingToken = response.data.trackingToken;
      clearCart();
      navigate(`/track/${_id}#key=${trackingToken}`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengirim bukti pembayaran. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="joy-page joy-narrow">
      <Link to="/review" state={{ formData, cartItems, totalPrice }} className="joy-text-link">← Kembali ke review</Link>
      <h1 className="joy-page-title mt-6">Pembayaran QRIS</h1>
      <p className="mt-2 text-gray-600">Unggah bukti setelah melakukan pembayaran. Admin akan memeriksanya sebelum pesanan dibuat.</p>
      <div className="mt-8 rounded-2xl bg-green-50 p-6">
        <p className="text-sm text-gray-600">Total pembayaran</p>
        <p className="mt-2 text-3xl font-bold text-green-800">Rp{totalPrice.toLocaleString("id-ID")}</p>
      </div>

      <div className="joy-checkout-panel mt-6">
        <h2 className="text-xl font-bold">QRIS The Joy of Matcha</h2>
        {QRIS_IMAGE ? (
          <div className="mt-5 flex justify-center rounded-xl bg-white p-5">
            <img src={QRIS_IMAGE} alt="Kode QRIS resmi The Joy of Matcha" className="h-auto max-h-72 w-auto object-contain" />
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-3xl">▦</p>
            <p className="mt-3 font-semibold text-amber-900">QRIS belum dikonfigurasi</p>
            <p className="mt-2 text-sm text-amber-800">Ini masih mode demo. Jangan melakukan transfer sampai pengelola memasang QRIS merchant resmi.</p>
          </div>
        )}
      </div>

      {DEMO_PAYMENTS && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">MODE DEMO: Tidak ada pembayaran sungguhan. Gunakan bukti uji saja.</p>}
      <form onSubmit={handleSubmit} className="joy-checkout-panel mt-6">
        <h2 className="text-xl font-bold">Upload Bukti Pembayaran</h2>
        <p className="mt-2 text-sm text-gray-500">Pilih gambar JPG, PNG, atau WebP (maksimal 5 MB).</p>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange}
          className="mt-5 block w-full rounded-xl border bg-white px-4 py-3 text-sm" />
        {paymentProof && <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">File dipilih: {paymentProof.name}</p>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button disabled={loading || !paymentProof || !CAN_PAY} type="submit"
          className="joy-button mt-6 w-full disabled:cursor-not-allowed">
          {loading ? "Mengirim bukti..." : !CAN_PAY ? "QRIS belum tersedia" : "Kirim Bukti Pembayaran"}
        </button>
      </form>
      <p className="mt-6 rounded-xl bg-yellow-50 p-5 text-sm leading-6 text-yellow-900">
        Pembayaran berstatus <strong>Menunggu Verifikasi</strong> sampai disetujui admin. Simpan tautan pelacakan yang muncul setelah bukti dikirim agar kamu bisa melihat status pesanan tanpa login.
      </p>
    </section>
  );
}

export default Payment;
