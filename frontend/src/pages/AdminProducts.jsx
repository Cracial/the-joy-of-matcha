import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyForm = {
  name: "", price: "", category: "Matcha Powder", stock: "20", description: "", image: "",
  availableStyles: "Hot Whisked, Cold Whisked",
  availableSweetness: "No Sweet, Less Sweet, Normal",
};

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const token = sessionStorage.getItem("token");
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  async function fetchProducts() {
    try {
      const response = await axios.get(`${API}/api/products`);
      setProducts(response.data.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat produk. Periksa backend.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchProducts(); }, []);

  function startCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError("");
    setMessage("");
  }

  function startEdit(product) {
    setForm({
      name: product.name || "",
      price: String(product.price ?? ""),
      stock: String(product.stock ?? 0),
      category: product.category || "",
      description: product.description || "",
      image: product.image || "",
      availableStyles: (product.availableStyles || []).join(", "),
      availableSweetness: (product.availableSweetness || []).join(", "),
    });
    setEditingId(product._id);
    setShowForm(true);
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event) {
    event.preventDefault();
    const styleList = form.availableStyles.split(",").map((item) => item.trim()).filter(Boolean);
    const sweetnessList = form.availableSweetness.split(",").map((item) => item.trim()).filter(Boolean);
    if (styleList.length === 0 || sweetnessList.length === 0) {
      setError("Setiap produk harus punya minimal satu pilihan style dan tingkat manis.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(), category: form.category.trim(), description: form.description.trim(),
        price: Number(form.price), stock: Number(form.stock), image: form.image.trim(),
        availableStyles: styleList, availableSweetness: sweetnessList,
      };
      if (editingId) {
        await axios.put(`${API}/api/products/${editingId}`, payload, auth);
      } else {
        await axios.post(`${API}/api/products`, payload, auth);
      }
      setMessage(editingId ? "Produk berhasil diperbarui." : "Produk baru berhasil ditambahkan.");
      setShowForm(false);
      setEditingId(null);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Hapus ${product.name} dari katalog? Produk yang sudah ada pada pesanan lama tetap tercatat.`)) return;
    setError("");
    setMessage("");
    try {
      await axios.delete(`${API}/api/products/${product._id}`, auth);
      setMessage(`${product.name} berhasil dihapus.`);
      await fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal menghapus produk.");
    }
  }

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b bg-white px-8 py-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kelola Produk</h1>
          <p className="mt-1 text-sm text-gray-500">Perbarui katalog dan stok untuk pelanggan The Joy of Matcha.</p>
        </div>
        <button onClick={startCreate} className="rounded-lg bg-green-700 px-5 py-3 text-sm font-semibold text-white hover:bg-green-800">+ Tambah Produk</button>
      </header>
      <main className="space-y-6 p-8">
        {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
        {message && <p className="rounded-xl bg-green-50 p-4 text-sm text-green-700">{message}</p>}

        {showForm && (
          <form onSubmit={saveProduct} className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Produk" : "Tambah Produk"}</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {[
                ["name", "Nama Produk", "text"],
                ["category", "Kategori", "text"],
                ["price", "Harga (Rp)", "number"],
                ["stock", "Stok", "number"],
                ["image", "URL Gambar (opsional)", "text"],
                ["availableStyles", "Pilihan style (pisahkan koma)", "text"],
                ["availableSweetness", "Tingkat manis (pisahkan koma)", "text"],
              ].map(([key, label, type]) => (
                <label key={key} className="block text-sm font-medium text-gray-700">
                  {label}
                  <input required={key !== "image"} type={type} min={type === "number" ? 0 : undefined}
                    step={type === "number" ? 1 : undefined}
                    value={form[key]} onChange={(event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))}
                    className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-3 font-normal focus:border-green-700 focus:outline-none" />
                </label>
              ))}
              <label className="block text-sm font-medium text-gray-700 md:col-span-2">
                Deskripsi
                <textarea required value={form.description} rows={3} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="mt-2 block w-full rounded-lg border border-gray-300 px-3 py-3 font-normal focus:border-green-700 focus:outline-none" />
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button disabled={saving} type="submit" className="rounded-lg bg-green-700 px-5 py-3 font-semibold text-white disabled:bg-gray-400">{saving ? "Menyimpan..." : "Simpan Produk"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border px-5 py-3 font-semibold text-gray-700">Batal</button>
            </div>
          </form>
        )}

        {loading ? <p>Memuat produk...</p> : (
          <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full min-w-[650px] border-collapse text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr><th className="p-4">Produk</th><th className="p-4">Kategori</th><th className="p-4">Harga</th><th className="p-4">Stok</th><th className="p-4">Tindakan</th></tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="border-t">
                    <td className="p-4 font-semibold text-gray-900">{product.name}</td>
                    <td className="p-4 text-gray-600">{product.category}</td>
                    <td className="p-4">Rp{product.price.toLocaleString("id-ID")}</td>
                    <td className="p-4"><span className={product.stock <= 0 ? "font-semibold text-red-600" : "text-gray-700"}>{product.stock}</span></td>
                    <td className="p-4">
                      <div className="flex gap-3">
                        <button onClick={() => startEdit(product)} className="font-semibold text-green-700 hover:underline">Edit</button>
                        <button onClick={() => deleteProduct(product)} className="font-semibold text-red-600 hover:underline">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">Belum ada produk.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminProducts;
