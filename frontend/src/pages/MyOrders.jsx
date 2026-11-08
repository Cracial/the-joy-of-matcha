import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const token = sessionStorage.getItem("token");

      if (!token) {
        alert("Silakan login terlebih dahulu.");
        navigate("/login");
        return;
      }

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
      console.error("Gagal mengambil order:", error);

      if (error.response?.status === 401) {
        alert("Sesi login sudah tidak valid. Silakan login kembali.");

        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");

        navigate("/login");
        return;
      }

      alert("Gagal mengambil data pesanan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusText = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "Pesanan Dikonfirmasi";

      case "PREPARING":
        return "Sedang Diproses";

      case "READY":
        return "Siap Diambil";

      case "COMPLETED":
        return "Pesanan Selesai";

      case "CANCELLED":
        return "Pesanan Dibatalkan";

      default:
        return status;
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

  const getProgressWidth = (status) => {
    switch (status) {
      case "CONFIRMED":
        return "25%";

      case "PREPARING":
        return "50%";

      case "READY":
        return "75%";

      case "COMPLETED":
        return "100%";

      default:
        return "0%";
    }
  };

  return (
    <section className="mx-auto max-w-5xl px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Pesanan Saya
        </h1>

        <p className="mt-2 text-gray-500">
          Lihat status dan detail pesanan The Joy of Matcha kamu.
        </p>
      </div>

      {loading ? (
        <div className="mt-10 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            Memuat pesanan...
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            Belum ada pesanan.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
            >
              {/* HEADER */}
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {order.orderNumber}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {new Date(
                      order.createdAt
                    ).toLocaleString("id-ID")}
                  </p>
                </div>

                <div
                  className={`rounded-full px-4 py-2 text-sm font-medium ${getStatusClass(
                    order.orderStatus
                  )}`}
                >
                  {getStatusText(
                    order.orderStatus
                  )}
                </div>
              </div>

              {/* PROGRESS */}
              {order.orderStatus !== "CANCELLED" && (
                <div className="mt-8">
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full rounded-full bg-green-600 transition-all"
                      style={{
                        width: getProgressWidth(
                          order.orderStatus
                        ),
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-xs text-gray-500">
                    <span>Dikonfirmasi</span>
                    <span>Diproses</span>
                    <span>Siap</span>
                    <span>Selesai</span>
                  </div>
                </div>
              )}

              {/* PAYMENT */}
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Pembayaran
                  </p>

                  <p className="mt-1 font-semibold text-green-700">
                    {order.paymentStatus}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Metode
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {order.paymentMethod}
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Total
                  </p>

                  <p className="mt-1 font-semibold text-green-700">
                    Rp
                    {Number(
                      order.totalPrice
                    ).toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* FULFILLMENT */}
              <div className="mt-4 rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">
                  {order.fulfillment}
                </p>

                <p className="mt-1 font-semibold text-gray-900">
                  Jam: {order.pickupTime}
                </p>

                {order.fulfillment === "Delivery" && (
                  <>
                    <p className="mt-2 text-sm text-gray-700">
                      {order.address}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      No. Telp: {order.phone}
                    </p>
                  </>
                )}
              </div>

              {/* PRODUCTS */}
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900">
                  Produk
                </h3>

                <div className="mt-3 space-y-3">
                  {order.items.map(
                    (item, index) => (
                      <div
                        key={`${order._id}-${index}`}
                        className="rounded-xl border border-gray-100 p-4"
                      >
                        <div className="flex justify-between gap-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.name}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              {item.quantity} × Rp
                              {Number(
                                item.price
                              ).toLocaleString(
                                "id-ID"
                              )}
                            </p>

                            <p className="mt-1 text-sm text-gray-500">
                              Style:{" "}
                              {item.selectedStyle}
                            </p>

                            <p className="text-sm text-gray-500">
                              Sweetness:{" "}
                              {item.selectedSweetness}
                            </p>
                          </div>

                          <p className="font-medium text-gray-900">
                            Rp
                            {Number(
                              item.price *
                                item.quantity
                            ).toLocaleString(
                              "id-ID"
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default MyOrders;