import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { normalize } from "../data/store";
import { isDark, themeForMode } from "../data/color";
import SiteSkeleton from "../components/SiteSkeleton";
import { CatalogContext, useCatalog } from "./context";

const themeVars = {
  bg: "--bg",
  ink: "--ink",
  muted: "--muted",
  gold: "--gold",
  ember: "--ember",
  stage: "--stage",
  promoBg: "--promo-bg",
  promoText: "--promo-text",
  footerBg: "--footer-bg",
  footerText: "--footer-text",
  paper: "--paper",
};

export function ApplyChrome() {
  const { content, mode } = useCatalog();
  const location = useLocation();

  useEffect(() => {
    if (!content) return;
    const root = document.documentElement;
    const admin = location.pathname.startsWith("/admin");
    const stageMode = content.theme.stageMode === "light" ? "light" : "dark";
    const wantDark = mode === "dark" && !admin;
    const palette = themeForMode(content.theme, wantDark ? "dark" : "light");
    Object.entries(themeVars).forEach(([key, cssVar]) => {
      if (palette[key]) root.style.setProperty(cssVar, palette[key]);
    });
    const darkSurface = !admin && (wantDark || isDark(palette.bg));
    root.style.setProperty("--line", darkSurface ? "rgba(246, 239, 230, 0.16)" : "rgba(27, 22, 18, 0.12)");
    root.style.colorScheme = darkSurface ? "dark" : "light";
    root.dataset.mode = wantDark ? "dark" : "light";
    root.dataset.surface = darkSurface ? "dark" : "light";
    root.dataset.stage = !admin && !wantDark && stageMode === "light" ? "light" : "dark";
    if (!content.announcement.show) root.style.setProperty("--promo-h", "0px");
    const layout = content.layout || {};
    const columns = { narrow: "760px", standard: "1180px", wide: "1360px", full: "100%" };
    root.style.setProperty("--wrap", columns[layout.contentWidth] || "1180px");
    root.dataset.header = layout.headerWidth || "full";
    root.dataset.headerContent = layout.headerContent || "fill";
    root.dataset.promo = layout.promoAlign || "center";
    root.dataset.promoWidth = layout.promoWidth || "full";
    root.dataset.banner = layout.bannerWidth || "contained";
    root.dataset.bannerContent = layout.bannerContent || "fill";
    root.dataset.bannerAlign = layout.bannerAlign || "left";
    root.dataset.bodyAlign = layout.bodyAlign || "left";
    root.dataset.footer = layout.footerWidth || "full";
    root.dataset.footerAlign = layout.footerAlign || "left";
    const icon = document.querySelector("link[rel='icon']");
    if (icon) {
      const href = content.brand.logo || "/brand/renovanest-logo.png";
      icon.href = href;
      const type = href.endsWith(".svg") ? "image/svg+xml" : href.endsWith(".png") ? "image/png" : href.endsWith(".webp") ? "image/webp" : "";
      if (type) icon.type = type;
    }
  }, [content, mode, location.pathname]);

  return null;
}

export function CatalogProvider({ children }) {
  const [preview, setPreview] = useState(() => new URLSearchParams(window.location.search).get("preview") === "1");
  const [content, setContent] = useState(null);
  const [mode, setModeState] = useState(() => (localStorage.getItem("renovanest-mode") === "dark" ? "dark" : "light"));

  const setPreviewContent = useCallback((data) => {
    setPreview(true);
    document.documentElement.dataset.preview = "1";
    setContent(normalize(data));
  }, []);

  useEffect(() => {
    if (preview) return undefined;
    let cancel = false;
    fetch("/content.json", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancel) setContent(normalize(data));
      })
      .catch(() => {
        if (!cancel) setContent(normalize(null));
      });
    return () => {
      cancel = true;
    };
  }, [preview]);

  function setMode(next) {
    const value = next === "dark" ? "dark" : "light";
    if (!preview) localStorage.setItem("renovanest-mode", value);
    setModeState(value);
  }

  async function save(next) {
    const key = sessionStorage.getItem("mirra-admin-key") || "";
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": key },
      body: JSON.stringify(next),
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Save failed. Keep npm run dev running, then try again.");
    }
    setContent(normalize(next));
  }

  if (!content && !preview) {
    return <SiteSkeleton />;
  }

  return (
    <CatalogContext.Provider value={{ content, save, mode, setMode, setPreviewContent }}>
      {children}
    </CatalogContext.Provider>
  );
}
