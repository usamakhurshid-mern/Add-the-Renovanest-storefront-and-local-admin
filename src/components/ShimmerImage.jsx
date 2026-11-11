import { useState } from "react";

export default function ShimmerImage({ src, alt = "", className = "", fill = false }) {
  const [ready, setReady] = useState(false);
  if (!src) return null;

  const image = (
    <img
      className={className}
      src={src}
      alt={alt}
      style={ready ? undefined : { opacity: 0 }}
      onLoad={() => setReady(true)}
      onError={(event) => {
        event.currentTarget.style.opacity = "0";
        setReady(true);
      }}
    />
  );

  if (fill) {
    return (
      <>
        {!ready && <span className="sk-shine" aria-hidden="true" />}
        {image}
      </>
    );
  }

  return (
    <span className="sk-frame">
      {!ready && <span className="sk-shine" aria-hidden="true" />}
      {image}
    </span>
  );
}
