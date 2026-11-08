import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

const nav = [
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
      <nav aria-label="Navigasi utama" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
        <Link to="/" className="joy-brand" aria-label="The Joy of Matcha, beranda">
          <svg className="joy-brand-symbol" viewBox="0 0 36 42" fill="none" aria-hidden="true">
            <path d="M17 39C19 26 19 17 25 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M18 28C5 27 4 18 7 14c9 0 14 5 11 14ZM22 20c9 0 14-6 13-13-7 0-13 5-13 13ZM19 34C9 36 4 32 2 26c9-2 16 1 17 8Z" fill="currentColor" />
          </svg>
          <span><span className="joy-brand-title">the joy of matcha</span><span className="joy-brand-sub">a little joy in every sip</span></span>
        </Link>
        <button type="button" aria-label="Buka menu" aria-expanded={mobileOpen} aria-controls="joy-nav-links" className="joy-mobile-menu md:hidden" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? "Tutup ✕" : "Menu ☰"}
        </button>
        <div id="joy-nav-links" className={`${mobileOpen ? "flex" : "hidden"} w-full flex-col gap-3 border-t border-[#e7dccf] pt-3 md:flex md:w-auto md:flex-row md:items-center md:gap-6 md:border-t-0 md:pt-0`}>
          {nav.map((item) => (
            <NavLink key={item.to} end={item.end} to={item.to} className={({ isActive }) => `joy-nav-link ${isActive ? "is-active" : ""}`}>
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/cart" className={({ isActive }) => `joy-nav-link ${isActive ? "is-active" : ""}`}>
            Keranjang {totalItems > 0 && <span className="joy-cart-count">{totalItems}</span>}
          </NavLink>
          <NavLink to="/login" className="joy-nav-admin">Admin</NavLink>
        </div>
      </nav>
    </header>
  );
}
