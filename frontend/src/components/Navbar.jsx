import BrandLogo from "./BrandLogo";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

const navigation = [
  { to: "/", label: "Beranda", end: true },
  { to: "/products", label: "Menu" },
  { to: "/about", label: "Tentang" },
  { to: "/track", label: "Lacak Pesanan" },
];

export default function Navbar() {
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <header className="joy-header">
      <nav className="joy-nav-container" aria-label="Navigasi utama">
        <Link to="/" className="joy-brand" aria-label="The Joy of Matcha, kembali ke beranda">
          <BrandLogo variant="nav" />
        </Link>
        <button type="button" aria-label="Buka menu navigasi" aria-expanded={mobileOpen} aria-controls="joy-nav-links" className="joy-mobile-menu md:hidden" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? "Tutup ×" : "Menu ☰"}
        </button>
        <div id="joy-nav-links" className={`${mobileOpen ? "flex" : "hidden"} joy-nav-links md:flex`}>
          {navigation.map(({ to, label, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `joy-nav-link ${isActive ? "is-active" : ""}`}>{label}</NavLink>)}
          <NavLink to="/cart" className={({ isActive }) => `joy-nav-link ${isActive ? "is-active" : ""}`}>
            Keranjang {totalItems > 0 && <span className="joy-cart-count" aria-label={`${totalItems} produk di keranjang`}>{totalItems}</span>}
          </NavLink>
          <NavLink to="/login" className="joy-nav-admin">Admin</NavLink>
        </div>
      </nav>
    </header>
  );
}
