import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import ProductImage from "./ProductImage";

const formatPrice = (value) => `Rp${Number(value || 0).toLocaleString("id-ID")}`;

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const available = Number(product.stock) > 0;
  return (
    <article className="joy-product-card">
      <Link to={`/products/${product._id}`} className="joy-product-image block" aria-label={`Lihat detail ${product.name}`}>
        <ProductImage image={product.image} name={product.name} />
      </Link>
      <div className="joy-card-content">
        <span className="joy-card-category">{product.category}</span>
        <h3 className="joy-card-name">{product.name}</h3>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="joy-card-price">{formatPrice(product.price)}</span>
          <span className={`joy-stock ${available ? "" : "is-empty"}`}>{available ? "Tersedia" : "Stok habis"}</span>
        </div>
        <div className="joy-card-actions">
          <Link to={`/products/${product._id}`} className="joy-card-link flex-1">Lihat detail</Link>
          <button type="button" onClick={() => addToCart(product)} disabled={!available} className="joy-card-link joy-card-primary flex-1">
            {available ? "+ Keranjang" : "Habis"}
          </button>
        </div>
      </div>
    </article>
  );
}
