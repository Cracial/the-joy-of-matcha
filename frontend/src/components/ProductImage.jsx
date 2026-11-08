import { useEffect, useState } from "react";

/** Foto dari field `image` katalog; media portrait tidak dipotong agar poster tetap utuh. */
export default function ProductImage({ image, name, detail = false, thumbnail = false, chat = false }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = typeof image === "string" ? image.trim() : "";
  useEffect(() => setFailed(false), [imageUrl]);

  const variant = chat ? "joy-media-chat" : thumbnail ? "joy-media-thumb" : detail ? "joy-media-detail" : "joy-media-card";
  return (
    <div className={`joy-media ${variant}`}>
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={`Foto produk ${name}`}
          loading={detail ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="joy-media-fallback" role="img" aria-label="Foto produk belum tersedia">🍵</span>
      )}
    </div>
  );
}
