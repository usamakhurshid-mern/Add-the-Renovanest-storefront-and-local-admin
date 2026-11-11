import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCatalog } from "../catalog/context";
import PageBanner from "../components/PageBanner";
import ProductCard from "../components/ProductCard";
import { brandVars, categoryById, countInCategory, fill, matchesPrice, visibleProducts } from "../data/store";
import { useSeo } from "../usePageTitle";

export default function Shop() {
  const { content } = useCatalog();
  const shop = content.shop;
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const q = (params.get("q") || "").trim();
  const category = params.get("category") || "";
  const price = params.get("price") || "all";
  const sort = params.get("sort") || shop.sorts[0]?.id || "featured";
  const onlyNew = params.get("new") === "1";
  const currentCategory = categoryById(content, category);
  const products = visibleProducts(content);

  function setParam(key, value) {
    const next = new URLSearchParams(params);
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  }

  const list = useMemo(() => {
    const filtered = products.filter((product) => {
      if (category && product.category !== category) return false;
      if (onlyNew && !product.isNew) return false;
      if (!matchesPrice(product, price)) return false;
      if (!q) return true;
      const haystack = [product.name, product.blurb, product.category, product.description, ...(product.details || [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "newest") return Number(b.isNew) - Number(a.isNew) || b.rating - a.rating;
      return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
    });
  }, [products, category, onlyNew, price, q, sort]);

  const title = [onlyNew ? shop.newTitle : null, currentCategory ? currentCategory.name : null, !currentCategory && !onlyNew ? shop.defaultTitle : null]
    .filter(Boolean)
    .join(" · ");

  useSeo(content, {
    title: `${q ? `${q} · ` : ""}${title} · ${content.brand.name}`,
    description: currentCategory?.blurb || shop.intro || fill(content.seo?.description || "", brandVars(content)),
  });

  const filtering = Boolean(category || onlyNew || q || price !== "all");

  return (
    <div className="page">
      <PageBanner
        kicker={shop.kicker}
        title={title}
        text={currentCategory?.blurb || shop.intro}
        crumbs={[
          { label: "Home", to: "/" },
          { label: shop.kicker, to: "/shop" },
          ...(currentCategory ? [{ label: currentCategory.name }] : []),
          ...(!currentCategory && onlyNew ? [{ label: shop.newTitle }] : []),
        ]}
      />

      <div className={shop.showFilters ? "wrap shop-layout" : "wrap shop-layout shop-open"}>
        {shop.showFilters && (
          <aside className={filtersOpen ? "filters open" : "filters"}>
            <button
              type="button"
              className="filters-toggle"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              {filtersOpen ? shop.hideLabel : shop.showLabel}
              <span>{list.length}</span>
            </button>
            <div className="filters-body">
              <p className="kicker">{shop.categoryLabel}</p>
              <div className="filter-list">
                <button
                  type="button"
                  className={!category ? "filter-link active" : "filter-link"}
                  onClick={() => setParam("category", "")}
                >
                  <span>{shop.allLabel}</span>
                  <em>{products.length}</em>
                </button>
                {content.categories.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={category === item.id ? "filter-link active" : "filter-link"}
                    onClick={() => setParam("category", item.id)}
                  >
                    <span>{item.name}</span>
                    <em>{countInCategory(content, item.id)}</em>
                  </button>
                ))}
              </div>

              {shop.showPrice && (
                <>
                  <p className="kicker">{shop.priceLabel}</p>
                  <div className="price-bands">
                    {shop.bands.map((band) => (
                      <button
                        key={band.id}
                        type="button"
                        aria-pressed={price === band.id}
                        className={price === band.id ? "band on" : "band"}
                        onClick={() => setParam("price", band.id)}
                      >
                        {band.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {shop.showNew && (
                <button
                  type="button"
                  className={onlyNew ? "band on new-toggle" : "band new-toggle"}
                  aria-pressed={onlyNew}
                  onClick={() => setParam("new", onlyNew ? "" : "1")}
                >
                  {shop.newToggle}
                </button>
              )}

              {filtering && (
                <Link to="/shop" className="text-link clear-link">
                  {shop.clearLabel}
                </Link>
              )}
            </div>
          </aside>
        )}

        <div>
          <div className="toolbar">
            <p className="result-count" aria-live="polite">
              {list.length} {list.length === 1 ? shop.resultSingular : shop.resultPlural}
            </p>
            {shop.showSort && (
              <label className="sort">
                <span className="sr-only">Sort</span>
                <select
                  value={sort}
                  onChange={(event) => setParam("sort", event.target.value === "featured" ? "" : event.target.value)}
                >
                  {shop.sorts.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {shop.showSearch && (
              <form className="search shop-search" role="search" onSubmit={(event) => event.preventDefault()}>
                <label className="sr-only" htmlFor="shop-search">
                  Search this edit
                </label>
                <input
                  id="shop-search"
                  type="search"
                  placeholder={shop.searchPlaceholder}
                  value={q}
                  autoComplete="off"
                  onChange={(event) => setParam("q", event.target.value)}
                />
              </form>
            )}
          </div>

          {filtering && (
            <div className="chips">
              {currentCategory && (
                <button type="button" onClick={() => setParam("category", "")}>
                  {currentCategory.name} ×
                </button>
              )}
              {onlyNew && (
                <button type="button" onClick={() => setParam("new", "")}>
                  {shop.newTitle} ×
                </button>
              )}
              {price !== "all" && (
                <button type="button" onClick={() => setParam("price", "all")}>
                  {shop.bands.find((band) => band.id === price)?.label} ×
                </button>
              )}
              {q && (
                <button type="button" onClick={() => setParam("q", "")}>
                  “{q}” ×
                </button>
              )}
            </div>
          )}

          {list.length === 0 ? (
            <div className="empty">
              <h2>{shop.emptyTitle}</h2>
              <p>{shop.emptyText}</p>
              <Link className="btn btn-ember" to="/shop">
                {shop.emptyButton}
              </Link>
            </div>
          ) : (
            <div className="product-grid" id="products">
              {list.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
