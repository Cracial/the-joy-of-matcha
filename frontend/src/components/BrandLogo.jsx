/** Official The Joy of Matcha artwork supplied by the brand owner. */
export default function BrandLogo({ variant = "nav", className = "" }) {
  return (
    <img
      src="/brand/joy-logo.png"
      alt="The Joy of Matcha"
      className={`joy-logo joy-logo--${variant} ${className}`.trim()}
      draggable="false"
      decoding="async"
    />
  );
}
