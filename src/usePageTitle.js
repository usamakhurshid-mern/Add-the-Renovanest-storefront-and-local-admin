import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { brandVars, fill } from "./data/store";

export function usePageTitle(title) {
  useSeo(null, { title, description: "" });
}

export function useSeo(content, { title, description, image, path, type = "website", robots, keywords } = {}) {
  const location = useLocation();
  const route = path || `${location.pathname}${location.search}`;

  useEffect(() => {
    const seo = content?.seo || {};
    const vars = content ? brandVars(content) : {};
    const pageTitle = title || (content ? fill(seo.title, vars) : "") || content?.brand?.name || "Renovanest";
    const pageDescription = (description != null ? description : fill(seo.description, vars)).replace(/\s+/g, " ").trim();
    const pageImage = absoluteUrl(image || seo.image || "", seo.siteUrl);
    const pageUrl = absoluteUrl(route, seo.siteUrl);
    const pageRobots = robots || seo.robots || "index,follow";
    const pageKeywords = String(keywords != null && keywords !== "" ? keywords : seo.keywords || "").trim();

    document.title = pageTitle;
    setMeta("description", pageDescription);
    setMeta("keywords", pageKeywords);
    setMeta("robots", pageRobots);
    setMeta("og:title", pageTitle, "property");
    setMeta("og:description", pageDescription, "property");
    setMeta("og:type", type, "property");
    setMeta("og:url", pageUrl, "property");
    setMeta("og:image", pageImage, "property");
    setMeta("twitter:card", pageImage ? "summary_large_image" : "summary");
    setMeta("twitter:title", pageTitle);
    setMeta("twitter:description", pageDescription);
    setMeta("twitter:image", pageImage);
    setLink("canonical", pageUrl);
  }, [content, title, description, image, route, type, robots, keywords]);
}

function absoluteUrl(value, siteUrl) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = String(siteUrl || (typeof window === "undefined" ? "" : window.location.origin)).replace(/\/$/, "");
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function setMeta(name, content, attr = "name") {
  const selector = `meta[${attr}="${name}"]`;
  let node = document.head.querySelector(selector);
  if (!content) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function setLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`);
  if (!href) {
    node?.remove();
    return;
  }
  if (!node) {
    node = document.createElement("link");
    node.rel = rel;
    document.head.appendChild(node);
  }
  node.href = href;
}
