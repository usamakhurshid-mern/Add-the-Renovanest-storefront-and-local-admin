export const RESERVED_SLUGS = ["shop", "product", "about", "admin", "page"];

export const blockTypes = [
  ["text", "Text"],
  ["split", "Text and image"],
  ["image", "Image"],
  ["gallery", "Gallery"],
  ["products", "Products"],
  ["buttons", "Buttons"],
  ["faq", "Questions"],
  ["steps", "Steps"],
  ["stats", "Numbers"],
  ["quote", "Quote"],
  ["band", "Dark band"],
  ["video", "Video"],
  ["spacer", "Space"],
];

function blockId() {
  return `block-${Math.random().toString(36).slice(2, 8)}`;
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function emptyBlock(type = "text") {
  const id = blockId();
  const base = { id, type, show: true, width: "page", align: "page", mediaSize: "fill" };
  if (type === "split") {
    return { ...base, kicker: "", title: "", body: "", linkLabel: "", linkTo: "", image: "", alt: "", imageLeft: false };
  }
  if (type === "image") return { ...base, image: "", alt: "", caption: "", linkTo: "" };
  if (type === "gallery") return { ...base, kicker: "", title: "", images: [] };
  if (type === "products") {
    return { ...base, kicker: "", title: "", source: "featured", category: "", picks: [], limit: 4, linkLabel: "", linkTo: "" };
  }
  if (type === "buttons") {
    return { ...base, items: [{ id: blockId(), label: "Shop the edit", to: "/shop", style: "ember" }] };
  }
  if (type === "faq") return { ...base, kicker: "", title: "", items: [{ id: blockId(), q: "New question", a: "" }] };
  if (type === "steps") return { ...base, kicker: "", title: "", items: [{ id: blockId(), title: "First step", text: "" }] };
  if (type === "stats") return { ...base, items: [{ id: blockId(), value: "01", label: "Label" }] };
  if (type === "quote") return { ...base, text: "", credit: "" };
  if (type === "band") return { ...base, eyebrow: "", title: "", label: "", url: "" };
  if (type === "video") return { ...base, title: "", url: "", caption: "" };
  if (type === "spacer") return { ...base, size: "md" };
  return { ...base, type: "text", kicker: "", title: "", body: "", linkLabel: "", linkTo: "" };
}

export function emptyPage() {
  return {
    id: `page-${Math.random().toString(36).slice(2, 8)}`,
    title: "New page",
    slug: "",
    kicker: "",
    intro: "",
    showBanner: true,
    published: true,
    showInMenu: false,
    menuLabel: "",
    bannerWidth: "site",
    bannerContent: "site",
    bannerAlign: "site",
    bodyWidth: "site",
    bodyAlign: "left",
    blocks: [emptyBlock("text")],
  };
}

function cleanLines(list) {
  return (list || []).map((item) => String(item).trim()).filter(Boolean);
}

export function normalizePage(page) {
  const blocks = (page?.blocks || []).map((block) => {
    const type = blockTypes.some(([id]) => id === block.type) ? block.type : "text";
    return { ...emptyBlock(type), ...block, id: block.id || blockId(), type, show: block.show !== false, width: oneOf(block.width, ["page", "narrow", "contained", "wide", "full"], "page"), align: oneOf(block.align, ["page", "left", "center", "right"], "page"), mediaSize: oneOf(block.mediaSize, ["fill", "medium", "small"], "fill") };
  });
  return {
    id: page?.id || `page-${Math.random().toString(36).slice(2, 8)}`,
    title: page?.title || "",
    slug: page?.slug || "",
    kicker: page?.kicker || "",
    intro: page?.intro || "",
    showBanner: page?.showBanner !== false,
    published: page?.published !== false,
    showInMenu: Boolean(page?.showInMenu),
    menuLabel: page?.menuLabel || "",
    bannerWidth: oneOf(page?.bannerWidth, ["site", "contained", "full"], "site"),
    bannerContent: oneOf(page?.bannerContent, ["site", "fill", "column"], "site"),
    bannerAlign: oneOf(page?.bannerAlign, ["site", "left", "center", "right"], "site"),
    bodyWidth: oneOf(page?.bodyWidth, ["site", "narrow", "contained", "wide", "full"], "site"),
    bodyAlign: oneOf(page?.bodyAlign, ["left", "center", "right"], "left"),
    blocks,
  };
}

export function cleanPage(page, slugify) {
  const cleaned = normalizePage(page);
  cleaned.title = String(cleaned.title || "").trim();
  cleaned.slug = slugify(cleaned.slug || cleaned.title);
  cleaned.menuLabel = String(cleaned.menuLabel || "").trim();
  cleaned.blocks = cleaned.blocks.map((block) => {
    const next = { ...block };
    if (Array.isArray(next.images)) next.images = cleanLines(next.images);
    if (Array.isArray(next.picks)) next.picks = cleanLines(next.picks);
    if (next.limit != null) next.limit = Math.min(12, Math.max(1, Number(next.limit) || 4));
    ["body", "title", "kicker", "image", "alt", "caption", "linkLabel", "linkTo", "url", "text", "credit", "eyebrow", "label"].forEach((key) => {
      if (typeof next[key] === "string") next[key] = next[key].trim();
    });
    if (Array.isArray(next.items)) {
      next.items = next.items.map((item, index) => ({
        id: item.id || `item-${index + 1}`,
        label: String(item.label || "").trim(),
        to: String(item.to || "").trim(),
        style: item.style === "light" ? "light" : "ember",
        q: String(item.q || "").trim(),
        a: String(item.a || "").trim(),
        title: String(item.title || "").trim(),
        text: String(item.text || "").trim(),
        value: String(item.value || "").trim(),
      }));
    }
    return next;
  });
  return cleaned;
}

export function syncPageMenu(content) {
  const pages = content.pages || [];
  const wanted = new Map(
    pages
      .filter((page) => page.showInMenu && page.slug && page.published !== false)
      .map((page) => [`page-${page.slug}`, page]),
  );
  content.header.items = (content.header.items || []).filter((item) => {
    if (!String(item.id || "").startsWith("page-")) return true;
    return wanted.has(item.id);
  });
  wanted.forEach((page, id) => {
    const label = page.menuLabel || page.title;
    const to = `/page/${page.slug}`;
    const existing = content.header.items.find((item) => item.id === id);
    if (existing) {
      existing.label = label;
      existing.to = to;
      existing.type = "link";
      existing.show = true;
    } else {
      content.header.items.push({ id, label, type: "link", to, show: true, children: [] });
    }
  });
}
