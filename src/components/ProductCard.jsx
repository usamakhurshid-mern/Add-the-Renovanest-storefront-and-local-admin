import { useRef } from "react";
import { Link } from "react-router-dom";
import { useCatalog } from "../catalog/context";
import { categoryById, formatPrice, mediaUrl, productAliUrl } from "../data/store";
import ShimmerImage from "../components/ShimmerImage";
import Stars from "./Stars";

export default function ProductCard({ product }) {
  const { content } = useCatalog();
  const card = content.shop.card;
  const cardRef = useRef(null);
  const category = categoryById(content, product.category);

  function onMove(event) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const node = cardRef.current;
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    node.style.transform = `rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-3px)`;
  }

  function onLeave() {
    if (cardRef.current) cardRef.current.style.transform = "";
  }

  const price = formatPrice(product.price, content.brand.currency);

  return (
    <article
      className="pcard"
      ref={cardRef}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ "--tone": product.tone }}
    >
      <Link to={`/product/${product.slug}`} className="pcard-media">
        {card.showBadge && product.badge ? <span className="badge">{product.badge}</span> : null}
        <span className="ph" aria-hidden="true">
          {product.name}
        </span>
        {product.images[0] && (
          <ShimmerImage fill src={mediaUrl(product.images[0])} alt={product.name} />
        )}
      </Link>
      <div className="pcard-body">
        {card.showCategory && <p className="kicker">{category?.name}</p>}
        <h3>
          <Link to={`/product/${product.slug}`}>{product.name}</Link>
        </h3>
        {card.showBlurb && <p className="blurb">{product.blurb || "\u00a0"}</p>}
        {card.showRating && (
          <div className="pcard-meta">
            <Stars rating={product.rating} />
            <span>{Number(product.reviews || 0).toLocaleString()} reviews</span>
          </div>
        )}
        <div className="pcard-row">
          <p className="price">
            {Number(product.price) > 0 ? price : "On AliExpress"}
            {card.showCompare && Number(product.price) > 0 && product.compareAt > product.price && (
              <s>{formatPrice(product.compareAt, content.brand.currency)}</s>
            )}
          </p>
          {card.showBuy && (
            <a
              className="buy-mini"
              href={productAliUrl(product, content.brand.affiliateSuffix)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Buy ${product.name} on AliExpress`}
            >
              {card.buyLabel || "Buy"}
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
