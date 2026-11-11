import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCatalog } from "../catalog/context";
import { headerDesignMap } from "../data/chrome";
import { navItemActive } from "../data/store";
import LogoMark from "./LogoMark";
import SmartLink from "./SmartLink";

export default function Header() {
  const { content, mode, setMode } = useCatalog();
  const location = useLocation();
  const navigate = useNavigate();
  const urlQuery = new URLSearchParams(location.search).get("q") || "";
  const routeKey = `${location.pathname}${location.search}`;
  const [scrolled, setScrolled] = useState(() => window.scrollY > 8);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState(urlQuery);
  const [trackedQuery, setTrackedQuery] = useState(urlQuery);
  const [trackedRoute, setTrackedRoute] = useState(routeKey);

  if (urlQuery !== trackedQuery) {
    setTrackedQuery(urlQuery);
    setQuery(urlQuery);
  }

  if (trackedRoute !== routeKey) {
    setTrackedRoute(routeKey);
    if (menu) setMenu(false);
  }

  useEffect(() => {
    const bar = document.querySelector(".promo");
    const root = document.documentElement;
    if (!bar) {
      root.style.setProperty("--promo-h", "0px");
      return undefined;
    }
    const apply = () => root.style.setProperty("--promo-h", `${bar.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [content.announcement.show, content.announcement.text, content.announcement.linkLabel]);

  useEffect(() => {
    const node = document.querySelector(".header");
    if (!node) return undefined;
    const apply = () => document.documentElement.style.setProperty("--header-h", `${node.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [content.header.design, content.header.bar, content.header.logoPlace, content.header.menuPlace]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") setMenu(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSearch(event) {
    event.preventDefault();
    const term = query.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
  }

  const items = content.header.items.filter((item) => item.show !== false);
  const { announcement, brand, header } = content;
  const design = headerDesignMap[header.design] || headerDesignMap.balanced;

  function placed(key) {
    const choice = header[`${key}Place`];
    if (choice === "left" || choice === "center" || choice === "right") return choice;
    return design[key];
  }

  const slots = { left: [], center: [], right: [] };
  (design.order || ["logo", "menu", "search"]).forEach((key) => {
    if (key === "search" && !header.showSearch) return;
    slots[placed(key)].push(key);
  });
  const stacked = header.design === "stacked" && placed("logo") === "center" && placed("menu") === "center";

  const pieces = {
    logo: <LogoMark key="logo" brand={brand} />,
    menu: (
      <nav key="menu" className="desk-nav" aria-label="Primary">
        {items.map((item) => {
          const active = navItemActive(item, location);
          if (item.type === "dropdown") {
            const children = (item.children || []).filter((child) => child.show !== false);
            return (
              <div className="nav-drop" key={item.id}>
                <SmartLink to={item.to || "/shop"} className={active ? "nav-link active" : "nav-link"}>
                  {item.label}
                  <Caret />
                </SmartLink>
                <div className="menu">
                  {children.map((child) => (
                    <SmartLink key={child.id} to={child.to}>
                      <span>{child.label}</span>
                    </SmartLink>
                  ))}
                </div>
              </div>
            );
          }
          return (
            <SmartLink key={item.id} to={item.to} className={active ? "nav-link active" : "nav-link"}>
              {item.label}
            </SmartLink>
          );
        })}
      </nav>
    ),
    search: (
      <form key="search" className="search desk-search" role="search" onSubmit={onSearch}>
        <label className="sr-only" htmlFor="site-search">
          Search products
        </label>
        <input
          id="site-search"
          type="search"
          name="q"
          placeholder={header.searchPlaceholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          autoComplete="off"
        />
        <button type="submit" aria-label="Search">
          <SearchIcon />
        </button>
      </form>
    ),
  };

  const modeButton = (
    <button
      type="button"
      className="mode-toggle"
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={mode === "dark"}
      onClick={() => setMode(mode === "dark" ? "light" : "dark")}
    >
      {mode === "dark" ? <SunIcon /> : <MoonIcon />}
    </button>
  );

  const headerClass = ["header", scrolled ? "scrolled" : "", `bar-${header.bar || "glass"}`, `links-${header.links || "underline"}`, stacked ? "is-stack" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="top-stack">
      {announcement.show && (
        <div className="promo">
          <p>{announcement.text}</p>
          {announcement.linkLabel && announcement.linkUrl && (
            <SmartLink to={announcement.linkUrl}>{announcement.linkLabel}</SmartLink>
          )}
        </div>
      )}
      <header className={headerClass}>
        {stacked ? (
          <>
            <div className="header-slot slot-left" />
            <div className="header-slot slot-center">{pieces.logo}</div>
            <div className="header-slot slot-right">
              {header.showSearch ? pieces.search : null}
              {modeButton}
            </div>
            <div className="header-slot slot-span">{pieces.menu}</div>
          </>
        ) : (
          <>
            <div className="header-slot slot-left">{slots.left.map((key) => pieces[key])}</div>
            <div className="header-slot slot-center">{slots.center.map((key) => pieces[key])}</div>
            <div className="header-slot slot-right">
              {slots.right.map((key) => pieces[key])}
              {modeButton}
            </div>
          </>
        )}

        <button
          type="button"
          className={menu ? "burger open" : "burger"}
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          onClick={() => setMenu((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {menu && (
        <>
          <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setMenu(false)} />
          <div className="mobile-panel" id="mobile-menu">
            {header.showSearch && (
              <form className="search" role="search" onSubmit={onSearch}>
                <label className="sr-only" htmlFor="mobile-search">
                  Search products
                </label>
                <input
                  id="mobile-search"
                  type="search"
                  placeholder={header.searchPlaceholder}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                />
                <button type="submit" aria-label="Search">
                  <SearchIcon />
                </button>
              </form>
            )}
            <div className="mobile-links">
              {items.map((item) => {
                if (item.type === "dropdown") {
                  const children = (item.children || []).filter((child) => child.show !== false);
                  return (
                    <div key={item.id}>
                      <p className="kicker">{item.label}</p>
                      {children.map((child) => (
                        <SmartLink key={child.id} to={child.to}>
                          {child.label}
                        </SmartLink>
                      ))}
                    </div>
                  );
                }
                return (
                  <SmartLink key={item.id} to={item.to}>
                    {item.label}
                  </SmartLink>
                );
              })}
              {announcement.linkUrl && (
                <SmartLink to={announcement.linkUrl}>{announcement.linkLabel || brand.handle}</SmartLink>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="11" cy="11" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function Caret() {
  return (
    <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true" className="caret">
      <path d="M2 4.2 6 8l4-3.8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M16 3.2A8.5 8.5 0 1 0 20.8 16 7 7 0 0 1 16 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
