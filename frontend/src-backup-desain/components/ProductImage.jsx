import { useEffect, useState } from "react";

/** Product photos use the `image` field returned by the products API. */
function ProductImage({ image, name, detail = false, thumbnail = false, small = false }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = typeof image === "string" ? image.trim() : "";

  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  return (
    <div
      className={
        small
          ? "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#f7f3ee]"
          : thumbnail
          ? "flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f7f3ee]"
          : detail
            ? "flex min-h-96 items-center justify-center overflow-hidden rounded-3xl bg-[#f7f3ee]"
            : "flex h-56 items-center justify-center overflow-hidden bg-[#f7f3ee]"
      }
    >
      {imageUrl && !failed ? (
        <img
          src={imageUrl}
          alt={`Foto produk ${name}`}
          loading="lazy"
          className={
            detail && !thumbnail
              ? "h-auto max-h-[540px] w-full object-contain"
              : "h-full w-full object-contain"
          }
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={small ? "text-2xl" : thumbnail ? "text-4xl" : detail ? "text-8xl" : "text-6xl"} role="img" aria-label="Gambar produk belum tersedia">
          🍵
        </span>
      )}
    </div>
  );
}

export default ProductImage;
