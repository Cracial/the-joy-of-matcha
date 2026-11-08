import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = sessionStorage.getItem("token");

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API}/api/orders`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setOrders(response.data.data || []);
    } catch (error) {
      console.error("Get admin orders error:", error);

      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      setError(
        error.response?.data?.message ||
          "Gagal mengambil data pesanan."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${API}/api/orders/${orderId}/status`,
        {
          orderStatus: newStatus,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      fetchOrders();
    } catch (error) {
      console.error("Update order status error:", error);

      if (error.response?.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }

      alert(
        error.response?.data?.message ||
          "Gagal mengubah status pesanan."
      );
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "bg-blue-100 text-blue-700";

      case "PREPARING":
        return "bg-yellow-100 text-yellow-700";

      case "READY":
        return "bg-purple-100 text-purple-700";

      case "COMPLETED":
        return "bg-green-100 text-green-700";

      case "CANCELLED":
        return "bg-red-100 text-red-700";

      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getNextStatus = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "PREPARING";

      case "PREPARING":
        return "READY";

      case "READY":
        return "COMPLETED";

      default:
        return null;
    }
  };

  const formatStatus = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "Dikonfirmasi";

      case "PREPARING":
        return "Diproses";

      case "READY":
        return "Siap Diambil";

      case "COMPLETED":
        return "Selesai";

      case "CANCELLED":
        return "Dibatalkan";

      default:
        return status;
    }
  };

  const formatRupiah = (value) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">
          Memuat data pesanan...
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Pesanan
        </h1>

        <p className="mt-2 text-gray-500">
          Kelola pesanan pelanggan The Joy of Matcha.
        </p>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* EMPTY */}
      {orders.length === 0 ? (
        <div className="rounded-xl border bg-white p-10 text-center">
          <div className="mb-3 text-4xl">📦</div>

          <h2 className="text-lg font-semibold text-gray-800">
            Belum ada pesanan
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Pesanan pelanggan akan muncul di halaman ini.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const nextStatus = getNextStatus(
              order.orderStatus
            );

            return (
              <div
                key={order._id}
                className="overflow-hidden rounded-xl border bg-white shadow-sm"
              >
                {/* ORDER HEADER */}
                <div className="flex flex-col gap-4 border-b bg-gray-50 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Nomor Pesanan
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-gray-800">
                      {order.orderNumber}
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                        order.orderStatus
                      )}`}
                    >
                      {formatStatus(order.orderStatus)}
                    </span>

                    {nextStatus && (
                      <button
                        onClick={() =>
                          updateStatus(
                            order._id,
                            nextStatus
                          )
                        }
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-800"
                      >
                        {nextStatus === "PREPARING" &&
                          "Proses Pesanan"}

                        {nextStatus === "READY" &&
                          "Tandai Siap"}

                        {nextStatus === "COMPLETED" &&
                          "Selesaikan"}
                      </button>
                    )}
                  </div>
                </div>

                {/* CUSTOMER & DELIVERY INFORMATION */}
                <div className="grid gap-6 border-b px-6 py-6 md:grid-cols-2">
                  {/* CUSTOMER */}
                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Informasi Pelanggan
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400">
                          Nama
                        </p>

                        <p className="font-medium text-gray-800">
                          {order.customerName ||
                            order.userId?.name ||
                            "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Email
                        </p>

                        <p className="text-sm text-gray-700">
                          {order.userId?.email || "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Nomor Telepon
                        </p>

                        <p className="text-sm text-gray-700">
                          {order.phone || "-"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* FULFILLMENT */}
                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                      Detail Pengambilan
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-400">
                          Metode
                        </p>

                        <p className="font-medium text-gray-800">
                          {order.fulfillment ===
                          "Delivery"
                            ? "🚚 Delivery"
                            : "🏪 Pickup"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Waktu
                        </p>

                        <p className="text-sm text-gray-700">
                          {order.pickupDate ? `${order.pickupDate} · ` : ""}{order.pickupTime || "-"}
                        </p>
                      </div>

                      {/* ALAMAT DELIVERY */}
                      {order.fulfillment ===
                        "Delivery" && (
                        <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                            Alamat Delivery
                          </p>

                          <p className="text-sm leading-relaxed text-gray-800">
                            {order.address?.trim()
                              ? order.address
                              : "Alamat belum tersedia."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ITEMS */}
                <div className="border-b px-6 py-6">
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400">
                    Produk
                  </h3>

                  <div className="space-y-4">
                    {order.items?.map((item, index) => (
                      <div
                        key={`${item.productId}-${index}`}
                        className="flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="font-medium text-gray-800">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.selectedStyle} •{" "}
                            {item.selectedSweetness}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {item.quantity} ×{" "}
                            {formatRupiah(item.price)}
                          </p>
                        </div>

                        <p className="font-semibold text-gray-800">
                          {formatRupiah(
                            item.price * item.quantity
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FOOTER */}
                <div className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs text-gray-400">
                      Pembayaran
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-700">
                      {order.paymentMethod || "QRIS"}{" "}
                      •{" "}
                      <span className="text-green-600">
                        {order.paymentStatus === "PAID"
                          ? "Lunas"
                          : order.paymentStatus}
                      </span>
                    </p>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-xs text-gray-400">
                      Total Pesanan
                    </p>

                    <p className="text-2xl font-bold text-green-700">
                      {formatRupiah(order.totalPrice)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminOrders;