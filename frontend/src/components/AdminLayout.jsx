import BrandLogo from "./BrandLogo";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const menu = [
  { path: "/admin/orders", label: "Pesanan", icon: "▣" },
  { path: "/admin/products", label: "Produk & Stok", icon: "❧" },
  { path: "/admin/payments", label: "Pembayaran", icon: "◈" },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = JSON.parse(sessionStorage.getItem("user") || "null");

  function handleLogout() {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    window.dispatchEvent(new Event("matchaku:auth-changed"));
    navigate("/login");
  }

  return (
    <div className="joy-admin-shell">
      <aside className="joy-admin-sidebar" aria-label="Panel navigasi admin">
        <Link to="/admin/orders" className="joy-admin-brand">
          <BrandLogo variant="admin" />
          <span className="joy-admin-brand-sub">ADMINISTRATOR</span>
        </Link>
        <div className="joy-admin-profile">
          <span className="joy-admin-profile-label">Login sebagai</span>
          <strong>{user?.name || "Administrator"}</strong>
        </div>
        <nav className="joy-admin-menu" aria-label="Menu administrator">
          {menu.map(({ path, label, icon }) => (
            <Link key={path} to={path} aria-current={location.pathname === path || (path === "/admin/orders" && location.pathname === "/admin") ? "page" : undefined}
              className={`joy-admin-nav-link ${location.pathname === path || (path === "/admin/orders" && location.pathname === "/admin") ? "is-active" : ""}`}>
              <span aria-hidden="true">{icon}</span><span>{label}</span>
            </Link>
          ))}
        </nav>
        <div className="joy-admin-exit">
          <button type="button" onClick={handleLogout}>Keluar dari admin</button>
        </div>
      </aside>
      <div className="joy-admin-main"><Outlet /></div>
    </div>
  );
}
