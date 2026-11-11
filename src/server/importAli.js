const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const PAGE_HOST = /(^|\.)aliexpress\.(com|us|ru)$/i;

function allowedPage(url) {
  return url.protocol === "https:" && (PAGE_HOST.test(url.hostname) || url.hostname === "ali.express");
}

function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60)
    .replace(/-$/, "");
}

function plain(html) {
  return decode(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function asNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const match = String(value ?? "")
    .replace(/,/g, "")
    .match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function dig(source, path) {
  return path.reduce((value, key) => (value == null ? undefined : value[key]), source);
}

function extractObjectAt(html, start) {
  if (start < 0 || html[start] !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) {
      try {
        return JSON.parse(html.slice(start, i + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

function extractAssigned(html, marker) {
  const pos = html.indexOf(marker);
  if (pos < 0) return null;
  return extractObjectAt(html, html.indexOf("{", pos));
}

function meta(html, property) {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const swapped = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`, "i");
  return decode((html.match(pattern) || html.match(swapped) || [])[1] || "");
}

function cleanTitle(value) {
  return decode(value)
    .replace(/\s+-\s+AliExpress(?:\s+\d+)?\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanImage(url) {
  if (!url) return "";
  const absolute = String(url).startsWith("//") ? `https:${url}` : String(url);
  try {
    const parsed = new URL(absolute);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    parsed.protocol = "https:";
    parsed.search = "";
    parsed.hash = "";
    const path = parsed.pathname.replace(/_\d+x\d+(\.[a-z0-9]+)$/i, "$1");
    return `${parsed.origin}${path}`;
  } catch {
    return "";
  }
}

function unique(list, limit) {
  const next = [];
  for (const item of list) {
    const value = String(item || "").trim();
    if (!value || next.includes(value)) continue;
    next.push(value);
    if (next.length >= limit) break;
  }
  return next;
}

function itemIdFrom(url) {
  const path = url.pathname + url.search;
  return (path.match(/\/item\/(\d+)/) || path.match(/[?&](?:item_id|productId|itemId)=(\d+)/i) || [])[1] || "";
}

async function fetchPage(start) {
  let current = new URL(start);
  for (let hop = 0; hop < 5; hop += 1) {
    if (!allowedPage(current)) throw new Error("Paste an https AliExpress item link.");
    const response = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
      headers: {
        "user-agent": USER_AGENT,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("AliExpress redirected that link without a destination.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error("AliExpress did not return that page.");
    return { html: await response.text(), finalUrl: current };
  }
  throw new Error("That AliExpress link redirected too many times.");
}

function colorsFromSku(data) {
  const groups = dig(data, ["skuModule", "productSKUPropertyList"]) || [];
  const colors = [];
  for (const group of groups) {
    const name = String(group.skuPropertyName || group.propertyName || "");
    if (!/color|colour/i.test(name)) continue;
    for (const value of group.skuPropertyValues || group.propertyValues || []) {
      colors.push(value.propertyValueDisplayName || value.propertyValueName || value.name);
    }
  }
  return unique(colors, 12);
}

function detailsFromSpecs(data) {
  const props = dig(data, ["specsModule", "props"]) || dig(data, ["productPropComponent", "props"]) || [];
  return unique(
    props.map((prop) => {
      const name = prop.attrName || prop.name;
      const value = prop.attrValue || prop.value;
      return name && value ? `${name}: ${value}` : "";
    }),
    40,
  );
}

function optionsFromSku(data) {
  const groups = dig(data, ["skuModule", "productSKUPropertyList"]) || [];
  const lines = [];
  for (const group of groups) {
    const name = String(group.skuPropertyName || group.propertyName || "Option").trim();
    for (const value of group.skuPropertyValues || group.propertyValues || []) {
      const label = value.propertyValueDisplayName || value.propertyValueName || value.name;
      if (label) lines.push(`${name}: ${String(label).trim()}`);
    }
  }
  return unique(lines, 60);
}

function fromRich(data) {
  const name = cleanTitle(dig(data, ["titleModule", "subject"]) || dig(data, ["productInfoComponent", "subject"]) || "");
  const images = unique(
    (dig(data, ["imageModule", "imagePathList"]) || dig(data, ["imageComponent", "imagePathList"]) || []).map(cleanImage),
    12,
  );
  const price =
    asNumber(dig(data, ["priceModule", "minActivityAmount", "value"])) ||
    asNumber(dig(data, ["priceModule", "minAmount", "value"])) ||
    asNumber(dig(data, ["priceComponent", "discountPrice", "minActivityAmount", "value"]));
  const currency =
    dig(data, ["currencyModule", "currencyCode"]) ||
    dig(data, ["priceModule", "minAmount", "currency"]) ||
    "";
  const rating = asNumber(
    dig(data, ["titleModule", "feedbackRating", "averageStar"]) || dig(data, ["feedbackModule", "tradeScore"]),
  );
  const reviews = asNumber(
    dig(data, ["titleModule", "feedbackRating", "totalValidNum"]) || dig(data, ["feedbackModule", "totalValidNum"]),
  );
  const description = plain(
    dig(data, ["descriptionModule", "description"]) || dig(data, ["productDescComponent", "description"]) || "",
  ).slice(0, 4000);
  return {
    name,
    images,
    price,
    compareAt: null,
    currency: String(currency || ""),
    rating: rating && rating <= 5 ? Math.round(rating * 10) / 10 : null,
    reviews: reviews || null,
    colors: colorsFromSku(data),
    options: optionsFromSku(data),
    details: detailsFromSpecs(data),
    description,
  };
}

function skuLines(info) {
  const text = String(info || "").replace(/[;|]/g, " ").replace(/\s+/g, " ").trim();
  const marks = [...text.matchAll(/([A-Za-z]{2,30}):\s*/g)];
  const lines = [];
  for (let index = 0; index < marks.length; index += 1) {
    const name = marks[index][1].trim();
    const start = marks[index].index + marks[index][0].length;
    const end = index + 1 < marks.length ? marks[index + 1].index : text.length;
    const value = text.slice(start, end).trim();
    if (name && value) lines.push(`${name}: ${value}`);
  }
  return lines;
}

function pricesFromLink(raw) {
  let parsed;
  try {
    parsed = new URL(String(raw || ""));
  } catch {
    return [];
  }
  const packed = parsed.searchParams.get("pdp_npi");
  if (!packed) return [];
  const parts = packed.split("!");
  const prices = [];
  const localCurrency = String(parts[1] || "").trim().toUpperCase();
  const localCompare = asNumber(parts[2]);
  const localPrice = asNumber(parts[3]);
  if (/^[A-Z]{3}$/.test(localCurrency) && localPrice) {
    prices.push({ currency: localCurrency, price: localPrice, compareAt: localCompare > localPrice ? localCompare : 0 });
  }
  const usdCompare = asNumber(parts[6]);
  const usdPrice = asNumber(parts[7]);
  if (usdPrice && localCurrency !== "USD") {
    prices.push({ currency: "USD", price: usdPrice, compareAt: usdCompare > usdPrice ? usdCompare : 0 });
  }
  return prices;
}

function choosePrice(rich, linkPrices, shopCurrency) {
  if (rich.price) {
    return { price: rich.price, compareAt: rich.compareAt || 0, currency: rich.currency || shopCurrency || "" };
  }
  const wanted = String(shopCurrency || "USD").toUpperCase();
  return linkPrices.find((item) => item.currency === wanted) || linkPrices[0] || { price: null, compareAt: 0, currency: "" };
}

async function fromReviews(id) {
  try {
    const response = await fetch(
      `https://feedback.aliexpress.com/pc/searchEvaluation.do?productId=${id}&lang=en_US&country=US&page=1&pageSize=30&filter=all&sort=complex_default`,
      {
        signal: AbortSignal.timeout(12000),
        headers: {
          "user-agent": USER_AGENT,
          accept: "application/json",
          referer: `https://www.aliexpress.com/item/${id}.html`,
        },
      },
    );
    if (!response.ok) return {};
    const payload = await response.json();
    const stats = payload.data?.productEvaluationStatistic || {};
    const rating = asNumber(stats.evarageStar);
    const options = [];
    const quotes = [];
    for (const review of payload.data?.evaViewList || []) {
      for (const line of skuLines(review.skuInfo)) options.push(line);
      const text = plain(review.buyerTranslationFeedback || review.buyerFeedback || "");
      const sku = String(review.skuInfo || "").trim();
      if (text && quotes.length < 6) quotes.push(sku ? `${sku} — ${text.slice(0, 240)}` : text.slice(0, 240));
    }
    const stars = {
      5: asNumber(stats.fiveStarNum) || 0,
      4: asNumber(stats.fourStarNum) || 0,
      3: asNumber(stats.threeStarNum) || 0,
      2: asNumber(stats.twoStarNum) || 0,
      1: asNumber(stats.oneStarNum) || 0,
    };
    return {
      rating: rating && rating <= 5 ? Math.round(rating * 10) / 10 : null,
      reviews: asNumber(stats.totalNum),
      options: unique(options, 60),
      quotes,
      stars: Object.values(stars).some((count) => count > 0) ? stars : null,
    };
  } catch {
    return {};
  }
}

export async function importAliExpress(rawUrl, shopCurrency = "USD") {
  const input = String(rawUrl || "").trim();
  let parsed;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("That is not a link.");
  }
  if (!allowedPage(parsed)) throw new Error("Paste an https AliExpress item link.");

  const { html, finalUrl } = await fetchPage(parsed.toString());
  const id = itemIdFrom(finalUrl) || itemIdFrom(parsed);
  if (!id) throw new Error("That link is not an AliExpress item page. Open the product and copy its item link.");

  const runParams = extractAssigned(html, "window.runParams");
  const richSource = runParams?.data?.titleModule ? runParams.data : null;
  const rich = richSource ? fromRich(richSource) : {};
  const gallery = extractAssigned(html, "window._d_c_.DCData = ");
  const images = unique(
    [
      ...(rich.images || []),
      ...((gallery?.imagePathList || []).map(cleanImage)),
      ...((gallery?.summImagePathList || []).map(cleanImage)),
      cleanImage(meta(html, "og:image")),
    ],
    12,
  );
  const name = rich.name || cleanTitle(meta(html, "og:title"));
  if (!name && images.length === 0) {
    throw new Error("AliExpress did not include this product in the page. Try the link again in a minute.");
  }

  const reviews = await fromReviews(id);
  const rating = rich.rating || reviews.rating || null;
  const reviewCount = rich.reviews || reviews.reviews || null;
  const options = unique([...(rich.options || []), ...(reviews.options || [])], 60);
  const optionsSource = (rich.options || []).length ? "page" : options.length ? "reviews" : "";
  const colors = unique(
    [
      ...(rich.colors || []),
      ...options
        .filter((line) => /colou?r/i.test(String(line).split(":")[0] || ""))
        .map((line) => line.split(":").slice(1).join(":").trim()),
    ],
    24,
  );
  const description = rich.description && !/^https?:/i.test(rich.description) ? rich.description : "";
  const blurb = description ? description.split("\n").find(Boolean).slice(0, 180) : "";
  const priced = choosePrice(rich, pricesFromLink(input), shopCurrency);
  const details = rich.details || [];
  const quotes = reviews.quotes || [];
  const filled = [
    name ? "title" : "",
    images.length ? `${images.length} photo${images.length === 1 ? "" : "s"}` : "",
    priced.price ? `price ${priced.price} ${priced.currency}` : "",
    priced.compareAt ? "compare-at price" : "",
    rating ? "rating" : "",
    reviewCount ? "review count" : "",
    reviews.stars ? "star split" : "",
    options.length ? `${options.length} option${options.length === 1 ? "" : "s"}` : "",
    details.length ? `${details.length} specifications` : "",
    description ? "description" : "",
    quotes.length ? `${quotes.length} buyer notes` : "",
  ].filter(Boolean);
  const hidden = [priced.price ? "" : "price", description ? "" : "the written description", details.length ? "" : "the specification table"].filter(Boolean);
  let note = filled.length ? `Filled ${filled.join(", ")}.` : "The link was saved.";
  if (options.length && !(rich.options || []).length) note += " Options come from buyer reviews, not the seller's full menu.";
  if (priced.price && !rich.price) note += " Price comes from the listing link you pasted.";
  if (hidden.length) note += ` AliExpress did not include ${hidden.length > 1 ? `${hidden.slice(0, -1).join(", ")} or ${hidden.at(-1)}` : hidden[0]} in the page.`;

  return {
    name,
    slug: slugify(name),
    aliUrl: input,
    aliQuery: name.split(/\s+/).slice(0, 8).join(" "),
    images,
    colors,
    options,
    optionsSource,
    quotes,
    stars: reviews.stars || null,
    details,
    description,
    blurb,
    price: priced.price || null,
    compareAt: priced.compareAt || null,
    currency: priced.currency || "",
    rating,
    reviews: reviewCount,
    note,
  };
}
