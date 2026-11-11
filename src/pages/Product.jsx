import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { useCatalog } from "../catalog/context";
import ShimmerImage from "../components/ShimmerImage";
import PageBanner from "../components/PageBanner";
import ProductCard from "../components/ProductCard";
import SmartLink from "../components/SmartLink";
import Stars from "../components/Stars";
import { categoryById, fill, formatPrice, getProduct, mediaUrl, productAliUrl, visibleProducts } from "../data/store";
import { useSeo } from "../usePageTitle";

export default function Product() {
  const { content } = useCatalog();
  const { slug } = useParams();
  const product = getProduct(content, slug);
  const copy = content.productPage;

  const listed = product && product.visible !== false;
  useSeo(content, {
    title: listed ? product.seoTitle || `${product.name} · ${content.brand.name}` : `${copy.missingTitle} · ${content.brand.name}`,
    description: listed ? product.seoDescription || product.blurb || String(product.description || "").split(/\n+/)[0] || undefined : copy.missingText,
    image: listed ? product.seoImage || product.images?.[0] || "" : "",
    keywords: listed ? product.seoKeywords || undefined : undefined,
    path: listed ? `/product/${product.slug}` : undefined,
    type: listed ? "product" : "website",
  });

  if (!product || product.visible === false) {
    return (
      <div className="page">
        <PageBanner
          kicker={copy.missingKicker}
          title={copy.missingTitle}
          text={copy.missingText}
          crumbs={[
            { label: "Home", to: "/" },
            { label: content.shop.kicker, to: "/shop" },
          ]}
        />
        <div className="wrap empty">
          <SmartLink className="btn btn-ember" to="/shop">
            {copy.missingButton}
          </SmartLink>
        </div>
      </div>
    );
  }

  return <ProductDetail key={product.slug} product={product} />;
}

function ProductDetail({ product }) {
  const { content } = useCatalog();
  const copy = content.productPage;
  const [active, setActive] = useState(0);
  const [color, setColor] = useState(product.colors[0] || "");
  const category = categoryById(content, product.category);
  const related = visibleProducts(content)
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 3);
  const aliUrl = productAliUrl(product, content.brand.affiliateSuffix);
  const money = product.currency || content.brand.currency;
  const groups = optionGroups(product.options);
  const [picked, setPicked] = useState(() => Object.fromEntries(groups.map((group) => [group.name, group.values[0]])));
  const pickedText = groups
    .map((group) => picked[group.name])
    .filter(Boolean)
    .join(" · ");
  const vars = {
    currency: content.brand.currency,
    category: category?.name || "",
    color,
    query: product.aliQuery,
  };

  const photos = uniquePhotos(product.images);
  const image = photos[active] || photos[0];
  const specRows = (product.details || []).filter((line) => String(line).includes(":"));
  const notes = (product.details || []).filter((line) => !String(line).includes(":"));
  const buyerNotes = (product.quotes || []).map(presentQuote).filter((item) => item.body);
  const hasStory = Boolean(product.description || specRows.length || notes.length);
  const hasReviews = Boolean(buyerNotes.length || product.stars);
  const sale = Number(product.price) > 0 ? Number(product.price) : 0;
  const was = Number(product.compareAt) > sale ? Number(product.compareAt) : 0;
  const off = sale && was ? Math.round((1 - sale / was) * 100) : 0;
  const buyRef = useRef(null);
  const [dock, setDock] = useState(false);

  useEffect(() => {
    const node = buyRef.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setDock(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={dock ? "page page-product has-dock" : "page page-product"}>
      <PageBanner
        kicker={category?.name || content.shop.kicker}
        title={product.name}
        text={product.blurb}
        crumbs={[
          { label: "Home", to: "/" },
          { label: content.shop.kicker, to: "/shop" },
          { label: category?.name || content.shop.kicker, to: `/shop?category=${product.category}` },
          { label: product.name },
        ]}
      />

      <div className="wrap pdp">
        <div className="gallery">
          <div className="gallery-main" style={{ "--tone": product.tone }}>
            <span className="ph" aria-hidden="true">
              {product.name}
            </span>
            {image && <ShimmerImage fill src={mediaUrl(image)} alt={`${product.name}, photo ${active + 1}`} />}
          </div>
          {photos.length > 1 && (
            <div className="thumbs">
              {photos.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  className={index === active ? "active" : ""}
                  onClick={() => setActive(index)}
                  aria-label={`Show photo ${index + 1}`}
                >
                  <ShimmerImage fill src={mediaUrl(src)} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="buy-panel">
          {copy.showRating && (
            <div className="pcard-meta">
              <Stars rating={product.rating} />
              <span>
                {Number(product.rating || 0).toFixed(1)} · {Number(product.reviews || 0).toLocaleString()} reviews
              </span>
            </div>
          )}
          <p className="pdp-price">
            {sale ? formatPrice(sale, money) : "Price on AliExpress"}
            {copy.showCompare && was > 0 && <s>{formatPrice(was, money)}</s>}
            {copy.showCompare && off > 0 && <span className="pdp-off">{off}% off</span>}
          </p>
          {copy.priceNote && <p className="fine">{fill(copy.priceNote, vars)}</p>}

          {groups.length > 0 ? (
            groups.map((group) => (
              <fieldset className="swatches" key={group.name}>
                <legend>
                  {group.name}
                  {picked[group.name] ? ` · ${picked[group.name]}` : ""}
                </legend>
                <div>
                  {group.values.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={picked[group.name] === item ? "swatch on" : "swatch"}
                      aria-pressed={picked[group.name] === item}
                      onClick={() => setPicked((current) => ({ ...current, [group.name]: item }))}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))
          ) : null}
          {groups.length === 0 && (
            copy.showColors && product.colors.length > 0 && (
              <fieldset className="swatches">
                <legend>
                  {copy.colorLabel}
                  {color ? ` · ${color}` : ""}
                </legend>
                <div>
                  {product.colors.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={item === color ? "swatch on" : "swatch"}
                      aria-pressed={item === color}
                      onClick={() => setColor(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </fieldset>
            )
          )}

          <a ref={buyRef} className="btn btn-ember btn-block" href={aliUrl} target="_blank" rel="noreferrer">
            {copy.buyLabel}
            <ExternalIcon />
          </a>
          {copy.buyNote && (
            <p className="fine">
              {fill(copy.buyNote, vars)}
              {product.aliUrl ? "" : product.aliQuery ? ` Search: “${product.aliQuery}”.` : ""}
              {groups.length > 0 && product.optionsSource === "reviews" ? " Options here are the ones buyers mentioned, not the seller’s full menu." : ""}
              {pickedText ? ` Noted on this page: ${pickedText}.` : color ? ` Noted on this page: ${color}.` : ""}
            </p>
          )}

          {copy.assurances.length > 0 && (
            <ul className="assurance">
              {copy.assurances.filter(Boolean).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {(hasStory || hasReviews) && (
        <section className="wrap pdp-lower">
          {hasStory && (
            <div className={specRows.length && (product.description || notes.length) ? "pdp-panels is-split" : "pdp-panels"}>
              {(product.description || notes.length > 0) && (
                <article className="pdp-card">
                  {copy.notesKicker && <p className="kicker">{copy.notesKicker}</p>}
                  {copy.notesTitle && <h2>{copy.notesTitle}</h2>}
                  {product.description &&
                    product.description.split(/\n{2,}/).map((paragraph) => (
                      <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                    ))}
                  {notes.length > 0 && (
                    <ul className="detail-list">
                      {notes.map((note) => (
                        <li key={note}>{note}</li>
                      ))}
                    </ul>
                  )}
                </article>
              )}
              {specRows.length > 0 && (
                <article className="pdp-card">
                  <p className="kicker">Specifications</p>
                  <h2>From the listing.</h2>
                  <dl className="spec-table">
                    {specRows.map((detail) => {
                      const [name, ...rest] = String(detail).split(":");
                      return (
                        <div key={detail}>
                          <dt>{name.trim()}</dt>
                          <dd>{rest.join(":").trim()}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </article>
              )}
            </div>
          )}

          {hasReviews && (
            <article className="pdp-card pdp-reviews">
              <p className="kicker">Reviews</p>
              <h2>
                {Number(product.rating || 0).toFixed(1)} from {Number(product.reviews || buyerNotes.length).toLocaleString()} buyers
              </h2>
              <div className="pdp-reviews-body">
                {product.stars && <StarBars stars={product.stars} />}
                {buyerNotes.length > 0 && (
                  <ul className="quote-list">
                    {buyerNotes.map((note) => (
                      <li key={`${note.about}-${note.body}`}>
                        {note.about && <small>{note.about}</small>}
                        <p>{note.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {product.optionsSource === "reviews" && (
                <p className="fine">Buyer notes are a sample. The full review list stays on AliExpress.</p>
              )}
            </article>
          )}
        </section>
      )}

      {copy.showRelated && related.length > 0 && (
        <section className="section wrap">
          <div className="section-head">
            <div>
              {copy.relatedKicker && <p className="kicker">{copy.relatedKicker}</p>}
              <h2>{fill(copy.relatedTitle, vars)}</h2>
            </div>
            <SmartLink to={`/shop?category=${product.category}`} className="text-link">
              {copy.relatedLink}
            </SmartLink>
          </div>
          <div className="product-grid">
            {related.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      )}
      {createPortal(
        <div className={dock ? "pdp-dock is-on" : "pdp-dock"} role="region" aria-label="Buy this piece" aria-hidden={dock ? undefined : true}>
          {image ? <img className="pdp-dock-thumb" src={mediaUrl(image)} alt="" /> : <span className="pdp-dock-thumb" style={{ background: product.tone }} />}
          <p className="pdp-dock-name">{product.name}</p>
          <p className="pdp-dock-price">
            {sale ? formatPrice(sale, money) : "AliExpress"}
            {was > 0 && <s>{formatPrice(was, money)}</s>}
          </p>
        <a className="btn btn-ember" href={aliUrl} target="_blank" rel="noreferrer" tabIndex={dock ? 0 : -1}>
          Buy now
        </a>
        </div>,
        document.body,
      )}
    </div>
  );
}

function uniquePhotos(images) {
  const seen = new Set();
  const next = [];
  for (const src of images || []) {
    const id = String(src).match(/\/kf\/([A-Za-z0-9]+)/)?.[1] || src;
    if (!src || seen.has(id)) continue;
    seen.add(id);
    next.push(src);
  }
  return next;
}

function presentQuote(raw) {
  const clean = String(raw || "").replace(/\s+/g, " ").trim();
  const cut = clean.indexOf(" — ");
  const sku = cut >= 0 ? clean.slice(0, cut) : "";
  const body = (cut >= 0 ? clean.slice(cut + 3) : clean).trim();
  const marks = [...sku.matchAll(/([A-Za-z]{2,30}):\s*/g)];
  const values = marks
    .map((mark, index) => {
      const start = mark.index + mark[0].length;
      const end = index + 1 < marks.length ? marks[index + 1].index : sku.length;
      return sku.slice(start, end).trim();
    })
    .filter(Boolean);
  return { about: values.join(" · "), body };
}

function StarBars({ stars }) {
  const counts = [5, 4, 3, 2, 1].map((score) => Number(stars[score] || stars[String(score)] || 0));
  const peak = Math.max(...counts, 1);
  return (
    <ul className="star-bars">
      {[5, 4, 3, 2, 1].map((score, index) => (
        <li key={score}>
          <span>{score} star</span>
          <i>
            <span style={{ width: `${Math.round((counts[index] / peak) * 100)}%` }} />
          </i>
          <b>{counts[index].toLocaleString()}</b>
        </li>
      ))}
    </ul>
  );
}

function optionGroups(lines) {
  const groups = [];
  for (const line of lines || []) {
    const [name, ...rest] = String(line).split(":");
    const value = rest.join(":").trim();
    const label = name.trim();
    if (!label || !value) continue;
    const group = groups.find((item) => item.name.toLowerCase() === label.toLowerCase());
    if (group) {
      if (!group.values.some((item) => item.toLowerCase() === value.toLowerCase())) group.values.push(value);
    } else {
      groups.push({ name: label, values: [value] });
    }
  }
  return groups;
}

function ExternalIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path d="M14 5h5v5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 5 10 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19 13.5V19H5V5h5.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
