import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const user = JSON.parse(sessionStorage.getItem("user") || "null");

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.dispatchEvent(new Event("matchaku:auth-changed"));

    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r bg-white">
        {/* LOGO */}
        <div className="border-b px-6 py-5">
          <Link to="/admin/orders">
            <h1 className="text-2xl font-bold text-green-700">
              🍵 The Joy of Matcha
            </h1>

            <p className="mt-1 text-xs text-gray-500">
              Admin Panel
            </p>
          </Link>
        </div>

        {/* ADMIN INFO */}
        <div className="border-b px-6 py-5">
          <p className="text-xs text-gray-500">
            Login sebagai
          </p>

          <p className="mt-1 font-semibold text-gray-800">
            {user?.name || "Administrator"}
          </p>

          <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            ADMIN
          </span>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-4 py-6">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Menu
          </p>

          <div className="space-y-2">
            <Link
              to="/admin/orders"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive("/admin/orders")
                  ? "bg-green-700 text-white"
                  : "text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <span>📦</span>
              <span>Pesanan</span>
            </Link>

            <Link
              to="/admin/products"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive("/admin/products")
                  ? "bg-green-700 text-white"
                  : "text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <span>🍵</span>
              <span>Produk & Stok</span>
            </Link>

            <Link
              to="/admin/payments"
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive("/admin/payments")
                  ? "bg-green-700 text-white"
                  : "text-gray-700 hover:bg-green-50 hover:text-green-700"
              }`}
            >
              <span>💳</span>
              <span>Pembayaran</span>
            </Link>
          </div>
        </nav>

        {/* FOOTER */}
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <span>🚪</span>
            <span>Keluar</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="ml-64 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;