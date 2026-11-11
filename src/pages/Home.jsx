import { useCatalog } from "../catalog/context";
import ProductCard from "../components/ProductCard";
import ShimmerImage from "../components/ShimmerImage";
import SmartLink from "../components/SmartLink";
import { brandVars, countInCategory, fill, mediaUrl, visibleProducts } from "../data/store";
import { useSeo } from "../usePageTitle";

export default function Home() {
  const { content } = useCatalog();
  const vars = brandVars(content);
  const home = content.home;
  useSeo(content, {
    title: fill(content.seo?.title || home.pageTitle, vars),
    description: fill(content.seo?.description || "", vars),
    image: content.seo?.image || "",
    path: "/",
  });

  const products = visibleProducts(content);
  const featured = products.filter((product) => product.featured);
  const stage = featured.slice(0, 6);
  const phrases = home.marquee.phrases.filter(Boolean);

  return (
    <div className="page home">
      {home.hero.show && (
        <section className="hero">
          <div className="hero-copy">
            {home.hero.eyebrow && <p className="eyebrow">{fill(home.hero.eyebrow, vars)}</p>}
            <h1>
              {fill(home.hero.title, vars)
                .split("\n")
                .map((line, index) => (
                  <span key={`${index}-${line}`}>
                    {index > 0 && <br />}
                    {line}
                  </span>
                ))}
            </h1>
            {home.hero.lede && <p className="lede">{fill(home.hero.lede, vars)}</p>}
            <div className="hero-actions">
              {home.hero.primaryLabel && (
                <SmartLink className="btn btn-ember" to={home.hero.primaryTo}>
                  {home.hero.primaryLabel}
                </SmartLink>
              )}
              {home.hero.secondaryLabel && (
                <SmartLink className="btn btn-light" to={home.hero.secondaryTo}>
                  {home.hero.secondaryLabel}
                </SmartLink>
              )}
            </div>
            {home.hero.showStats && (
              <ul className="hero-stats">
                {home.hero.stats.map((stat) => (
                  <li key={stat.label}>
                    <strong>{fill(stat.value, vars)}</strong>
                    <span>{stat.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {home.hero.showStage && stage.length > 0 && (
            <div className="stage-wrap" aria-label="Featured pieces">
              <div className="stage-glow" aria-hidden="true" />
              <div className="ring">
                {stage.map((product, index) => (
                  <SmartLink
                    key={product.slug}
                    to={`/product/${product.slug}`}
                    className="tile"
                    style={{ "--i": index, "--n": stage.length, "--tone": product.tone }}
                  >
                    {product.images[0] && <ShimmerImage fill src={mediaUrl(product.images[0])} alt="" />}
                    <span>{product.name}</span>
                  </SmartLink>
                ))}
              </div>
              <div className="stage-floor" aria-hidden="true" />
            </div>
          )}
        </section>
      )}

      {home.marquee.show && phrases.length > 0 && (
        <div className="marquee" aria-hidden="true">
          <div className="marquee-track">
            {[...phrases, ...phrases].map((phrase, index) => (
              <span key={`${phrase}-${index}`}>{fill(phrase, vars)}</span>
            ))}
          </div>
        </div>
      )}

      {home.categories.show && (
        <section className="section wrap">
          <SectionHead kicker={home.categories.kicker} title={home.categories.title} label={home.categories.linkLabel} to={home.categories.linkTo} />
          <div className="cat-grid">
            {content.categories.map((category) => {
              const cover = products.find((product) => product.category === category.id);
              return (
                <SmartLink key={category.id} to={`/shop?category=${category.id}`} className="cat-card">
                  <span className="cat-media" style={{ "--tone": cover?.tone || "#e7dcd0" }}>
                    {cover?.images[0] && <ShimmerImage fill src={mediaUrl(cover.images[0])} alt="" />}
                  </span>
                  <span className="cat-copy">
                    <strong>{category.name}</strong>
                    <em>
                      {countInCategory(content, category.id)} pieces · {category.blurb}
                    </em>
                  </span>
                </SmartLink>
              );
            })}
          </div>
        </section>
      )}

      {home.featured.show && (
        <section className="section wrap">
          <SectionHead kicker={home.featured.kicker} title={home.featured.title} label={home.featured.linkLabel} to={home.featured.linkTo} />
          <div className="product-grid">
            {featured.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </section>
      )}

      {home.steps.show && home.steps.items.length > 0 && (
        <section className="section wrap">
          <SectionHead kicker={home.steps.kicker} title={home.steps.title} />
          <ol className="steps">
            {home.steps.items.map((step, index) => (
              <li key={step.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {home.instagram.show && (
        <section className="ig-band wrap">
          <div>
            {home.instagram.eyebrow && <p className="eyebrow">{fill(home.instagram.eyebrow, vars)}</p>}
            <h2>{fill(home.instagram.title, vars)}</h2>
          </div>
          <SmartLink className="btn btn-light" to={fill(home.instagram.url, vars)}>
            {fill(home.instagram.label, vars)}
          </SmartLink>
        </section>
      )}
    </div>
  );
}

function SectionHead({ kicker, title, label, to }) {
  return (
    <div className="section-head">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        {title && <h2>{title}</h2>}
      </div>
      {label && to && (
        <SmartLink to={to} className="text-link">
          {label}
        </SmartLink>
      )}
    </div>
  );
}
