import { useParams } from "react-router-dom";
import { useCatalog } from "../catalog/context";
import ShimmerImage from "../components/ShimmerImage";
import PageBanner from "../components/PageBanner";
import ProductCard from "../components/ProductCard";
import SmartLink from "../components/SmartLink";
import { brandVars, categoryById, fill, visibleProducts } from "../data/store";
import { useSeo } from "../usePageTitle";

export default function CustomPage() {
  const { content } = useCatalog();
  const { slug } = useParams();
  const page = (content.pages || []).find((item) => item.slug === slug && (document.documentElement.dataset.preview === "1" || item.published !== false));
  const missing = content.notFound;

  useSeo(content, {
    title: page ? `${page.title} · ${content.brand.name}` : `${missing.title} · ${content.brand.name}`,
    path: page ? `/page/${page.slug}` : undefined,
  });

  if (!page) {
    return (
      <div className="page">
        <PageBanner kicker={missing.kicker} title={missing.title} text={missing.text} />
        <div className="wrap empty">
          <SmartLink className="btn btn-ember" to="/shop">
            {missing.button}
          </SmartLink>
        </div>
      </div>
    );
  }

  const vars = brandVars(content);
  const blocks = (page.blocks || []).filter((block) => block.show !== false);

  return (
    <div className="page">
      {page.showBanner !== false && (
        <PageBanner
          className={[
            page.bannerWidth !== "site" ? `is-${page.bannerWidth}` : "",
            page.bannerContent && page.bannerContent !== "site" ? `is-content-${page.bannerContent}` : "",
            page.bannerAlign !== "site" ? `is-align-${page.bannerAlign}` : "",
          ].filter(Boolean).join(" ")}
          kicker={fill(page.kicker, vars)}
          title={fill(page.title, vars)}
          text={fill(page.intro, vars)}
          crumbs={[
            { label: "Home", to: "/" },
            { label: page.title },
          ]}
        />
      )}
      {blocks.map((block) => (
        <PageBlock key={block.id} block={block} page={page} content={content} vars={vars} />
      ))}
    </div>
  );
}

function sectionClass(block, page, extra = "section") {
  const width = block.width && block.width !== "page" ? block.width : page?.bodyWidth && page.bodyWidth !== "site" ? page.bodyWidth : "contained";
  const align = block.align && block.align !== "page" ? block.align : page?.bodyAlign || "left";
  const frame = width === "full" || width === "narrow" || width === "wide" ? width : "contained";
  const side = align === "center" || align === "right" ? align : "left";
  const media = block.mediaSize && block.mediaSize !== "fill" ? `media-${block.mediaSize}` : "";
  return ["page-frame", `frame-${frame}`, `align-${side}`, media, extra].filter(Boolean).join(" ");
}

function paragraphs(body, vars) {
  return String(body || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 24)}`}>{fill(paragraph, vars)}</p>);
}

function videoEmbed(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : "";
    }
  } catch {
    return "";
  }
  return "";
}

function PageBlock({ block, page, content, vars }) {
  if (block.type === "spacer") {
    return <div className={`page-spacer ${block.size || "md"}`} id={block.id} />;
  }

  if (block.type === "band") {
    return (
      <section className={sectionClass(block, page, "ig-band")} id={block.id}>
        <div>
          {block.eyebrow && <p className="eyebrow">{fill(block.eyebrow, vars)}</p>}
          {block.title && <h2>{fill(block.title, vars)}</h2>}
        </div>
        {block.label && block.url && (
          <SmartLink className="btn btn-light" to={fill(block.url, vars)}>
            {fill(block.label, vars)}
          </SmartLink>
        )}
      </section>
    );
  }

  if (block.type === "quote") {
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <blockquote className="page-quote">
          <p>{fill(block.text, vars)}</p>
          {block.credit && <cite>{fill(block.credit, vars)}</cite>}
        </blockquote>
      </section>
    );
  }

  if (block.type === "stats") {
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <ul className="page-stats">
          {(block.items || []).map((item) => (
            <li key={item.id || item.label}>
              <strong>{fill(item.value, vars)}</strong>
              <span>{fill(item.label, vars)}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  if (block.type === "buttons") {
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <div className="hero-actions">
          {(block.items || [])
            .filter((item) => item.label && item.to)
            .map((item) => (
              <SmartLink key={item.id || item.label} className={item.style === "light" ? "btn btn-light" : "btn btn-ember"} to={fill(item.to, vars)}>
                {fill(item.label, vars)}
              </SmartLink>
            ))}
        </div>
      </section>
    );
  }

  if (block.type === "image") {
    const figure = (
      <figure className="page-figure">
        {block.image && <ShimmerImage src={block.image} alt={block.alt || ""} />}
        {block.caption && <figcaption>{fill(block.caption, vars)}</figcaption>}
      </figure>
    );
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        {block.linkTo ? <SmartLink to={fill(block.linkTo, vars)}>{figure}</SmartLink> : figure}
      </section>
    );
  }

  if (block.type === "gallery") {
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <BlockHead kicker={block.kicker} title={block.title} vars={vars} />
        <div className="page-gallery">
          {(block.images || []).map((src) => (
            <ShimmerImage key={src} src={src} alt="" />
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "video") {
    const embed = videoEmbed(block.url || "");
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        {block.title && <h2>{fill(block.title, vars)}</h2>}
        {embed ? (
          <iframe className="page-video" src={embed} title={block.title || "Video"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          block.url && (
            <SmartLink className="text-link" to={block.url}>
              {block.caption || block.url}
            </SmartLink>
          )
        )}
        {embed && block.caption && <p className="fine">{fill(block.caption, vars)}</p>}
      </section>
    );
  }

  if (block.type === "products") {
    const visible = visibleProducts(content);
    let list = visible.filter((product) => product.featured);
    if (block.source === "new") list = visible.filter((product) => product.isNew);
    if (block.source === "category") list = visible.filter((product) => product.category === block.category);
    if (block.source === "picks") {
      const order = block.picks || [];
      list = order.map((slug) => visible.find((product) => product.slug === slug)).filter(Boolean);
    }
    list = list.slice(0, Number(block.limit) || 4);
    const category = categoryById(content, block.category);
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <div className="section-head">
          <div>
            {block.kicker && <p className="kicker">{fill(block.kicker, vars)}</p>}
            {block.title && <h2>{fill(block.title || category?.name, vars)}</h2>}
          </div>
          {block.linkLabel && block.linkTo && (
            <SmartLink to={fill(block.linkTo, vars)} className="text-link">
              {fill(block.linkLabel, vars)}
            </SmartLink>
          )}
        </div>
        <div className="product-grid">
          {list.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "faq") {
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <BlockHead kicker={block.kicker} title={block.title} vars={vars} />
        <div className="faq">
          {(block.items || []).map((item) => (
            <details key={item.id || item.q}>
              <summary>{fill(item.q, vars)}</summary>
              <p>{fill(item.a, vars)}</p>
            </details>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "steps") {
    return (
      <section className={sectionClass(block, page)} id={block.id}>
        <BlockHead kicker={block.kicker} title={block.title} vars={vars} />
        <ol className="steps">
          {(block.items || []).map((item, index) => (
            <li key={item.id || item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{fill(item.title, vars)}</h3>
              <p>{fill(item.text, vars)}</p>
            </li>
          ))}
        </ol>
      </section>
    );
  }

  const copy = (
    <div>
      {block.kicker && <p className="kicker">{fill(block.kicker, vars)}</p>}
      {block.title && <h2>{fill(block.title, vars)}</h2>}
      {paragraphs(block.body, vars)}
      {block.linkLabel && block.linkTo && (
        <SmartLink className="text-link" to={fill(block.linkTo, vars)}>
          {fill(block.linkLabel, vars)}
        </SmartLink>
      )}
    </div>
  );

  if (block.type === "split") {
    const media = block.image ? (
      <ShimmerImage className="page-split-photo" src={block.image} alt={block.alt || ""} />
    ) : (
      <div />
    );
    return (
      <section className={sectionClass(block, page, "split anchor")} id={block.id}>
        {block.imageLeft ? media : copy}
        {block.imageLeft ? copy : media}
      </section>
    );
  }

  return (
    <section className={sectionClass(block, page, "section prose")} id={block.id}>
      {copy}
    </section>
  );
}

function BlockHead({ kicker, title, vars }) {
  if (!kicker && !title) return null;
  return (
    <div className="section-head">
      <div>
        {kicker && <p className="kicker">{fill(kicker, vars)}</p>}
        {title && <h2>{fill(title, vars)}</h2>}
      </div>
    </div>
  );
}
