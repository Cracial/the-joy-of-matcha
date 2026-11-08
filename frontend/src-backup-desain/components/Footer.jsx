import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="joy-footer mt-auto">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-11 md:grid-cols-2 md:items-end">
        <div>
          <p className="joy-display text-3xl text-[#455039]">the joy of matcha</p>
          <p className="mt-2 max-w-md text-sm leading-7 text-[#736d60]">
            Temukan minuman favoritmu, cari informasi menu bersama Joy, lalu pesan dengan mudah tanpa membuat akun.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#6a6858] md:justify-end">
          <Link to="/products">Lihat menu</Link>
          <Link to="/track">Lacak pesanan</Link>
          <Link to="/about">Tentang kami</Link>
        </div>
      </div>
      <div className="border-t border-[#dcd1c3] px-6 py-4 text-center text-xs text-[#81796c]">
        © {new Date().getFullYear()} The Joy of Matcha · Enjoy your little moment
      </div>
    </footer>
  );
}
