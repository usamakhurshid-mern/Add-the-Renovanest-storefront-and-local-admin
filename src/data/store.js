import { defaultContent } from "./defaultContent";
import { RESERVED_SLUGS, cleanPage, normalizePage, syncPageMenu } from "./pages.js";
import { themeIds } from "./themes";

export function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function mergeContent(base, override) {
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (override && typeof override === "object" && base && typeof base === "object" && !Array.isArray(override)) {
    const next = { ...base };
    Object.keys(override).forEach((key) => {
      next[key] = key in base ? mergeContent(base[key], override[key]) : override[key];
    });
    return next;
  }
  return override === undefined ? base : override;
}

export function normalize(raw) {
  const merged = mergeContent(defaultContent, raw || {});
  const source = Array.isArray(raw?.products) ? raw.products : defaultContent.products;
  merged.products = source.map((product) => ({
    visible: true,
    aliUrl: "",
    aliQuery: "",
    compareAt: 0,
    badge: "",
    colors: [],
    options: [],
    optionsSource: "",
    quotes: [],
    stars: null,
    currency: "",
    images: [],
    details: [],
    featured: false,
    isNew: false,
    rating: 0,
    reviews: 0,
    tone: "#e7dcd0",
    blurb: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    seoImage: "",
    ...product,
  }));
  const categories = Array.isArray(raw?.categories) ? raw.categories : defaultContent.categories;
  merged.categories = categories.map((category) => ({ blurb: "", ...category }));
  const pages = Array.isArray(raw?.pages) ? raw.pages : defaultContent.pages || [];
  merged.pages = pages.map(normalizePage);
  return merged;
}

export function visibleProducts(content) {
  return content.products.filter((product) => product.visible !== false);
}

export function categoryById(content, id) {
  return content.categories.find((category) => category.id === id) || null;
}

export function countInCategory(content, id) {
  return visibleProducts(content).filter((product) => product.category === id).length;
}

export function getProduct(content, slug) {
  return content.products.find((product) => product.slug === slug) || null;
}

export function formatPrice(value, currency = "USD") {
  const amount = Number(value) || 0;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

const aliImageHost = /(^|\.)((?:aliexpress-media|alicdn|aliexpress|aliimg)\.com)$/i;

export function mediaUrl(src) {
  const value = String(src || "").trim();
  if (!/^https:\/\//i.test(value)) return value;
  try {
    if (!aliImageHost.test(new URL(value).hostname)) return value;
  } catch {
    return value;
  }
  return `/api/img?u=${encodeURIComponent(value)}`;
}

export function productAliUrl(product, suffix = "") {
  const base = product.aliUrl
    ? product.aliUrl
    : product.aliQuery
      ? `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(product.aliQuery)}`
      : "https://www.aliexpress.com/";
  if (!suffix) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}${String(suffix).replace(/^[?&]/, "")}`;
}

export function matchesPrice(product, band) {
  if (band === "u15") return product.price < 15;
  if (band === "15-25") return product.price >= 15 && product.price <= 25;
  if (band === "25plus") return product.price > 25;
  return true;
}

export function fill(template, vars) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, key) => (vars[key] == null ? "" : String(vars[key])));
}

export function brandVars(content, extra = {}) {
  return {
    name: content.brand.name,
    tagline: content.brand.tagline,
    handle: content.brand.handle,
    email: content.brand.email,
    instagram: content.brand.instagramUrl,
    currency: content.brand.currency,
    products: visibleProducts(content).length,
    categories: content.categories.length,
    ...extra,
  };
}

export function navItemActive(item, location) {
  if (!item) return false;
  if (item.type === "dropdown") {
    return matchTo(item.to, location) || (item.children || []).some((child) => matchTo(child.to, location));
  }
  return matchTo(item.to, location);
}

function matchTo(to, location) {
  if (!to || /^https?:/i.test(to)) return false;
  const url = new URL(to, "http://mirra.local");
  if (url.pathname === "/") return location.pathname === "/";
  if (url.pathname === "/shop" && !url.search) {
    const params = new URLSearchParams(location.search);
    if (params.get("new") === "1" || params.get("category") || params.get("q") || params.get("price")) return false;
    return location.pathname === "/shop" || location.pathname.startsWith("/product");
  }
  if (location.pathname !== url.pathname) return false;
  if (!url.search) return true;
  const have = new URLSearchParams(location.search);
  for (const [key, value] of url.searchParams) {
    if (have.get(key) !== value) return false;
  }
  return true;
}

function cleanList(list) {
  return (list || []).map((item) => String(item).trim()).filter(Boolean);
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function cleanStars(stars) {
  if (!stars || typeof stars !== "object") return null;
  const next = {};
  for (const key of [1, 2, 3, 4, 5]) next[key] = Number(stars[key] ?? stars[String(key)]) || 0;
  return Object.values(next).some((count) => count > 0) ? next : null;
}

export function prepareContent(draft) {
  const content = structuredClone(draft);
  content.products = content.products.map((product) => ({
    ...product,
    name: String(product.name || "").trim(),
    slug: slugify(product.slug || product.name),
    seoTitle: String(product.seoTitle || "").trim(),
    seoDescription: String(product.seoDescription || "").replace(/\s+/g, " ").trim(),
    seoKeywords: String(product.seoKeywords || "").trim(),
    seoImage: String(product.seoImage || "").trim(),
    images: cleanList(product.images),
    details: cleanList(product.details),
    colors: cleanList(product.colors),
    options: cleanList(product.options),
    optionsSource: product.optionsSource === "reviews" || product.optionsSource === "page" ? product.optionsSource : "",
    quotes: cleanList(product.quotes),
    currency: String(product.currency || "").trim().toUpperCase(),
    stars: cleanStars(product.stars),
    price: Number(product.price) || 0,
    compareAt: Number(product.compareAt) || 0,
    rating: Number(product.rating) || 0,
    reviews: Number(product.reviews) || 0,
    visible: product.visible !== false,
    featured: Boolean(product.featured),
    isNew: Boolean(product.isNew),
  }));
  content.categories = content.categories.map((category) => ({
    ...category,
    name: String(category.name || "").trim(),
    id: slugify(category.id || category.name),
  }));
  content.pages = (content.pages || []).map((page) => cleanPage(page, slugify));
  content.seo = {
    title: String(content.seo?.title || "").trim(),
    description: String(content.seo?.description || "").replace(/\s+/g, " ").trim(),
    keywords: String(content.seo?.keywords || "").trim(),
    image: String(content.seo?.image || "").trim(),
    siteUrl: String(content.seo?.siteUrl || "").trim().replace(/\/$/, ""),
    robots: content.seo?.robots === "noindex,nofollow" ? "noindex,nofollow" : "index,follow",
  };
  content.layout = {
    contentWidth: oneOf(content.layout?.contentWidth, ["narrow", "standard", "wide", "full"], "standard"),
    bodyAlign: oneOf(content.layout?.bodyAlign, ["left", "center", "right"], "left"),
    headerWidth: oneOf(content.layout?.headerWidth, ["full", "contained"], "full"),
    headerContent: oneOf(content.layout?.headerContent, ["fill", "column"], "fill"),
    promoWidth: oneOf(content.layout?.promoWidth, ["full", "contained"], "full"),
    promoAlign: oneOf(content.layout?.promoAlign, ["left", "center", "right"], "center"),
    bannerWidth: oneOf(content.layout?.bannerWidth, ["contained", "full"], "contained"),
    bannerContent: oneOf(content.layout?.bannerContent, ["fill", "column"], "fill"),
    bannerAlign: oneOf(content.layout?.bannerAlign, ["left", "center", "right"], "left"),
    footerWidth: oneOf(content.layout?.footerWidth, ["full", "contained"], "full"),
    footerAlign: oneOf(content.layout?.footerAlign, ["left", "center", "right"], "left"),
  };
  content.header.design = oneOf(content.header?.design, ["balanced", "classic", "logo-center", "menu-right", "mirror", "stacked"], "balanced");
  content.header.logoPlace = oneOf(content.header?.logoPlace, ["design", "left", "center", "right"], "design");
  content.header.menuPlace = oneOf(content.header?.menuPlace, ["design", "left", "center", "right"], "design");
  content.header.searchPlace = oneOf(content.header?.searchPlace, ["design", "left", "center", "right"], "design");
  content.header.bar = oneOf(content.header?.bar, ["glass", "solid", "ink", "line"], "glass");
  content.header.links = oneOf(content.header?.links, ["underline", "pills", "plain"], "underline");
  content.footer.design = oneOf(content.footer?.design, ["columns", "centered", "split", "compact"], "columns");
  content.footer.align = oneOf(content.footer?.align, ["layout", "left", "center", "right"], "layout");
  content.footer.tone = oneOf(content.footer?.tone, ["ink", "paper", "contrast"], "ink");
  content.theme.preset = themeIds.includes(content.theme?.preset) || content.theme?.preset === "custom" ? content.theme.preset : "gloss";
  content.theme.surface = oneOf(content.theme?.surface, ["light", "dark"], "light");
  content.theme.stageMode = oneOf(content.theme?.stageMode, ["light", "dark"], "dark");
  syncPageMenu(content);
  content.header.items = (content.header.items || []).map((item) => ({
    ...item,
    id: item.id || `nav-${slugify(item.label)}`,
    children: (item.children || []).map((child) => ({
      ...child,
      id: child.id || `nav-${slugify(child.label)}`,
    })),
  }));
  return content;
}

export function validateContent(content) {
  const errors = [];
  const slugs = new Set();
  content.products.forEach((product, index) => {
    if (!product.name) errors.push(`Product ${index + 1} needs a name.`);
    if (!product.slug) errors.push(`${product.name || `Product ${index + 1}`} needs a slug.`);
    if (product.slug && slugs.has(product.slug)) errors.push(`Slug “${product.slug}” is used twice.`);
    slugs.add(product.slug);
    if (product.category && !content.categories.some((category) => category.id === product.category)) {
      errors.push(`${product.name} points at a category that does not exist.`);
    }
  });
  const ids = new Set();
  content.categories.forEach((category, index) => {
    if (!category.name) errors.push(`Category ${index + 1} needs a name.`);
    if (category.id && ids.has(category.id)) errors.push(`Category id “${category.id}” is used twice.`);
    ids.add(category.id);
  });
  const pageSlugs = new Set();
  (content.pages || []).forEach((page, index) => {
    if (!page.title) errors.push(`Page ${index + 1} needs a title.`);
    if (!page.slug) errors.push(`${page.title || `Page ${index + 1}`} needs a slug.`);
    if (RESERVED_SLUGS.includes(page.slug)) errors.push(`“${page.slug}” is reserved. Pick another page slug.`);
    if (page.slug && pageSlugs.has(page.slug)) errors.push(`Page slug “${page.slug}” is used twice.`);
    pageSlugs.add(page.slug);
  });
  return errors;
}

export function syncCategoryNav(content) {
  const next = structuredClone(content);
  const menu = next.header.items.find((item) => item.type === "dropdown");
  if (!menu) return next;
  const kept = (menu.children || []).filter((child) => !String(child.to || "").includes("category="));
  const links = next.categories.map((category) => ({
    id: `cat-${category.id}`,
    label: category.name,
    to: `/shop?category=${category.id}`,
    show: true,
  }));
  menu.children = [...kept, ...links];
  return next;
}

export function emptyProduct(categoryId) {
  return {
    slug: "",
    name: "",
    category: categoryId || "",
    price: 0,
    compareAt: 0,
    rating: 5,
    reviews: 0,
    badge: "",
    featured: false,
    isNew: true,
    visible: true,
    tone: "#e7dcd0",
    colors: [],
    options: [],
    optionsSource: "",
    quotes: [],
    stars: null,
    currency: "",
    images: [],
    aliUrl: "",
    aliQuery: "",
    blurb: "",
    description: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    seoImage: "",
    details: [],
  };
}

export function moveItem(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
