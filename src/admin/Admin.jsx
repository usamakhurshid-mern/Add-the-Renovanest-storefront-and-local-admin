import { useEffect, useRef, useState } from "react";
import { useCatalog } from "../catalog/context";
import { emptyPage } from "../data/pages";
import { emptyProduct, moveItem, prepareContent, slugify, syncCategoryNav, uid, validateContent } from "../data/store";
import { footerDesigns, headerDesigns } from "../data/chrome";
import { themes } from "../data/themes";
import { useSeo } from "../usePageTitle";
import { Area, BlockList, Check, Choice, ColorField, Lines, Text } from "./fields";
import Icon from "./icons";
import PagesPanel from "./PagesPanel";

const siteSections = [
  ["brand", "Brand", "tag"],
  ["theme", "Themes", "swatch"],
  ["announcement", "Announcement", "megaphone"],
  ["navigation", "Navigation", "menu"],
  ["footer", "Footer", "footer"],
  ["home", "Home page", "home"],
  ["shop", "Shop & cards", "grid"],
  ["product", "Product page", "box"],
  ["about", "About page", "info"],
  ["seo", "SEO", "search"],
  ["layout", "Layout", "layout"],
];

const networks = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "pinterest", label: "Pinterest" },
  { value: "youtube", label: "YouTube" },
  { value: "link", label: "Link" },
];

export default function Admin() {
  const [authed, setAuthed] = useState(() => Boolean(sessionStorage.getItem("mirra-admin-key")));
  if (!authed) return <Login onSuccess={() => setAuthed(true)} />;
  return <Editor onLogout={() => setAuthed(false)} />;
}

function Login({ onSuccess }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError("Wrong password. The starter password is mirra.");
        return;
      }
      sessionStorage.setItem("mirra-admin-key", password);
      onSuccess();
    } catch {
      setError("The admin save service is not running. Start the site with npm run dev.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="admin-login">
      <form onSubmit={submit}>
        <p className="kicker">Renovanest admin</p>
        <h1>Edit the edit.</h1>
        <p>Products, menu, announcement bar, footer, and page copy. Nothing here needs a database.</p>
        <Text label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="aerror">{error}</p>}
        <button className="btn btn-ember" type="submit" disabled={pending}>
          {pending ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

function Editor({ onLogout }) {
  const { content, save } = useCatalog();
  const [draft, setDraft] = useState(() => structuredClone(content));
  const [baseline, setBaseline] = useState(() => JSON.stringify(content));
  const [section, setSection] = useState("products");
  const [pageId, setPageId] = useState("");
  const [productIndex, setProductIndex] = useState(-1);
  const [errors, setErrors] = useState([]);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const dirty = JSON.stringify(draft) !== baseline;

  useSeo(content, {
    title: `${draft.brand?.name || "Renovanest"} admin`,
    description: "",
    robots: "noindex,nofollow",
    path: "/admin",
  });

  useEffect(() => {
    const onLeave = (event) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  async function onSave() {
    const next = prepareContent(draft);
    const problems = validateContent(next);
    setErrors(problems);
    if (problems.length) return;
    setPending(true);
    setStatus("");
    try {
      await save(next);
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setStatus("Saved. The preview and the live site now match.");
    } catch (error) {
      if (String(error.message).toLowerCase().includes("password")) {
        sessionStorage.removeItem("mirra-admin-key");
        onLogout();
        return;
      }
      setStatus(error.message);
    } finally {
      setPending(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("mirra-admin-key");
    onLogout();
  }

  function addPage() {
    const fresh = emptyPage();
    fresh.slug = `page-${Date.now().toString().slice(-4)}`;
    setDraft((current) => ({ ...current, pages: [...(current.pages || []), fresh] }));
    setPageId(fresh.id);
    setSection("pages");
  }

  function addProduct() {
    const fresh = emptyProduct(draft.categories[0]?.id);
    fresh.name = "New piece";
    fresh.slug = `piece-${Date.now()}`;
    setDraft((current) => ({ ...current, products: [...(current.products || []), fresh] }));
    setProductIndex((draft.products || []).length);
    setSection("products");
  }

  const pages = draft.pages || [];
  const selectedPageId = pages.some((page) => page.id === pageId) ? pageId : "";
  const products = draft.products || [];
  const selectedProduct = productIndex >= 0 && productIndex < products.length ? String(productIndex) : "";

  return (
    <div className="admin-app">
      <aside className="admin-side">
        <p className="logo-name admin-mark">
          {draft.brand.logo ? <img className="logo-image" src={draft.brand.logo} alt="" /> : draft.brand.name}
        </p>
        <p className="side-label">Catalog</p>
        <SideItem id="products" label="Products" icon="bag" section={section} onClick={() => setSection("products")} />
        <SidePicker
          label="Choose a product"
          value={selectedProduct}
          placeholder="Choose a product"
          onChange={(value) => {
            setProductIndex(value === "" ? -1 : Number(value));
            setSection("products");
          }}
          onAdd={addProduct}
          addLabel="New product"
          options={products.map((product, index) => (
            <option key={`${product.slug}-${index}`} value={String(index)}>
              {product.name || "Untitled"}
              {product.visible === false ? " (deactivated)" : ""}
            </option>
          ))}
        />
        <SideItem id="categories" label="Categories" icon="folder" section={section} onClick={() => setSection("categories")} />
        <SideItem id="pages" label="Pages" icon="file" section={section} onClick={() => setSection("pages")} />
        <SidePicker
          label="Choose a page"
          value={selectedPageId}
          placeholder="Choose a page"
          onChange={(value) => {
            setPageId(value);
            setSection("pages");
          }}
          onAdd={addPage}
          addLabel="New page"
          options={pages.map((page) => (
            <option key={page.id} value={page.id}>
              {page.title || "Untitled"}
              {page.published === false ? " (hidden)" : ""}
            </option>
          ))}
        />
        <p className="side-label">Site</p>
        {siteSections.map(([id, label, icon]) => (
          <SideItem key={id} id={id} label={label} icon={icon} section={section} onClick={() => setSection(id)} />
        ))}
        <div className="side-foot">
          <a className="nav-item" href="/" target="_blank" rel="noreferrer">
            <Icon name="external" />
            <span>View site</span>
          </a>
          <button type="button" className="nav-item" onClick={logout}>
            <Icon name="logout" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      <div className="admin-main">
        {section === "brand" && <BrandPanel draft={draft} setDraft={setDraft} />}
        {section === "theme" && <ThemePanel draft={draft} setDraft={setDraft} />}
        {section === "announcement" && <AnnouncementPanel draft={draft} setDraft={setDraft} />}
        {section === "navigation" && <NavPanel draft={draft} setDraft={setDraft} />}
        {section === "footer" && <FooterPanel draft={draft} setDraft={setDraft} />}
        {section === "home" && <HomePanel draft={draft} setDraft={setDraft} />}
        {section === "shop" && <ShopPanel draft={draft} setDraft={setDraft} />}
        {section === "product" && <ProductPagePanel draft={draft} setDraft={setDraft} />}
        {section === "about" && <AboutPanel draft={draft} setDraft={setDraft} />}
        {section === "seo" && <SeoPanel draft={draft} setDraft={setDraft} />}
        {section === "layout" && <LayoutPanel draft={draft} setDraft={setDraft} />}
        {section === "pages" && <PagesPanel draft={draft} setDraft={setDraft} pageId={selectedPageId} setPageId={setPageId} onAdd={addPage} />}
        {section === "categories" && <CategoriesPanel draft={draft} setDraft={setDraft} />}
        {section === "products" && (
          <ProductsPanel draft={draft} setDraft={setDraft} productIndex={selectedProduct === "" ? -1 : Number(selectedProduct)} setProductIndex={setProductIndex} onAdd={addProduct} />
        )}

        {errors.length > 0 && (
          <ul className="aerrors">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <div className="asave">
          <button className="btn btn-ember" type="button" onClick={onSave} disabled={pending || !dirty}>
            {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
          {status && <p>{status}</p>}
        </div>
      </div>
      <PreviewPane draft={draft} section={section} productIndex={selectedProduct === "" ? -1 : Number(selectedProduct)} pageId={selectedPageId} dirty={dirty} />
    </div>
  );
}

function PreviewPane({ draft, section, productIndex, pageId, dirty }) {
  const frameRef = useRef(null);
  const stageRef = useRef(null);
  const draftRef = useRef(draft);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState("desk");
  const [view, setView] = useState("auto");
  const [box, setBox] = useState({ width: 640, height: 800 });

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "renovanest-preview-ready") setReady(true);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const apply = () => setBox({ width: node.clientWidth, height: node.clientHeight });
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!ready) return;
    frameRef.current?.contentWindow?.postMessage({ type: "renovanest-preview", content: draft }, window.location.origin);
  }, [draft, ready]);

  useEffect(() => {
    if (!ready) return;
    const path = previewPath(draftRef.current, section, productIndex, pageId, view);
    frameRef.current?.contentWindow?.postMessage({ type: "renovanest-preview-go", path }, window.location.origin);
  }, [ready, section, productIndex, pageId, view]);

  const frameWidth = device === "phone" ? 390 : 1280;
  const scale = Math.min(1, Math.max(0.2, (box.width - 28) / frameWidth));
  const frameHeight = Math.max(640, box.height / scale);

  return (
    <aside className="admin-preview">
      <div className="preview-bar">
        <div>
          <strong>Preview</strong>
          <span>{dirty ? "Not saved yet" : "Matches the live site"}</span>
        </div>
        <div className="preview-switch">
          {[
            ["auto", "This section"],
            ["home", "Home"],
            ["shop", "Shop"],
            ["product", "Product"],
            ["about", "About"],
          ].map(([id, label]) => (
            <button key={id} type="button" className={view === id ? "on" : ""} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="preview-switch">
          <button type="button" className={device === "desk" ? "on" : ""} onClick={() => setDevice("desk")}>
            Desktop
          </button>
          <button type="button" className={device === "phone" ? "on" : ""} onClick={() => setDevice("phone")}>
            Phone
          </button>
        </div>
      </div>
      <div className="preview-stage" ref={stageRef}>
        <div className="preview-scaler" style={{ width: frameWidth * scale, height: Math.min(box.height - 8, frameHeight * scale) }}>
          <iframe
            ref={frameRef}
            title="Site preview"
            src="/?preview=1"
            style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})` }}
            onLoad={() => {
              frameRef.current?.contentWindow?.postMessage({ type: "renovanest-preview", content: draftRef.current }, window.location.origin);
            }}
          />
        </div>
      </div>
    </aside>
  );
}

function previewPath(draft, section, productIndex, pageId, view) {
  const products = draft.products || [];
  const product = products[productIndex] || products.find((item) => item.visible !== false) || products[0];
  const page = (draft.pages || []).find((item) => item.id === pageId);
  if (view === "home") return "/";
  if (view === "shop") return "/shop";
  if (view === "about") return "/about";
  if (view === "product") return product?.slug ? `/product/${product.slug}` : "/shop";
  if (section === "shop" || section === "categories") return "/shop";
  if (section === "about") return "/about";
  if (section === "pages" && page?.slug) return `/page/${page.slug}`;
  if (section === "products" && productIndex >= 0 && products[productIndex]?.slug) return `/product/${products[productIndex].slug}`;
  if (section === "product" && product?.slug) return `/product/${product.slug}`;
  if (section === "products") return "/shop";
  return "/";
}

function setPart(setDraft, key, value) {
  setDraft((current) => ({ ...current, [key]: value }));
}

function SeoPanel({ draft, setDraft }) {
  const seo = draft.seo || {};
  function patch(partial) {
    setPart(setDraft, "seo", { ...seo, ...partial });
  }

  return (
    <section className="apanel">
      <h2>Search and sharing</h2>
      <p>Site-wide defaults for the page title, the search snippet, and the link preview. A product can replace the title, description, and image.</p>
      <Text
        label="Default title"
        value={seo.title}
        onChange={(title) => patch({ title })}
        hint="{name} and {tagline} come from Brand. This is the home page title."
      />
      <Area
        label="Default description"
        value={seo.description}
        onChange={(description) => patch({ description })}
        hint="Shown in search results and link previews when a page does not set its own. Aim for one or two sentences."
      />
      <Text
        label="Keywords"
        value={seo.keywords}
        onChange={(keywords) => patch({ keywords })}
        hint="Optional. A short comma-separated list."
      />
      <Text
        label="Share image URL"
        value={seo.image}
        onChange={(image) => patch({ image })}
        hint="Used when a page has no photo of its own. A full https link is the reliable choice."
      />
      <Text
        label="Public site address"
        value={seo.siteUrl}
        onChange={(siteUrl) => patch({ siteUrl })}
        hint="https://yourdomain.com — builds the canonical link. Leave this blank on localhost."
      />
      <Choice
        label="Search visibility"
        value={seo.robots || "index,follow"}
        onChange={(robots) => patch({ robots })}
        options={[
          { value: "index,follow", label: "Allow search engines" },
          { value: "noindex,nofollow", label: "Hide the site from search" },
        ]}
      />
    </section>
  );
}

function LayoutPanel({ draft, setDraft }) {
  const layout = draft.layout || {};
  function patch(partial) {
    setPart(setDraft, "layout", { ...layout, ...partial });
  }
  const width = [
    { value: "full", label: "Edge to edge" },
    { value: "contained", label: "In the column" },
  ];
  const align = [
    { value: "left", label: "Left" },
    { value: "center", label: "Center" },
    { value: "right", label: "Right" },
  ];

  return (
    <section className="apanel">
      <h2>Layout</h2>
      <p>Each band has its own width, and the content inside that band has its own alignment. A full-width banner can still keep its text in the column, and the page body can be centered on its own.</p>
      <LayoutGroup title="Announcement" text="The thin bar above the header.">
        <Choice label="Section width" value={layout.promoWidth || "full"} onChange={(promoWidth) => patch({ promoWidth })} options={width} />
        <Choice label="Content alignment" value={layout.promoAlign || "center"} onChange={(promoAlign) => patch({ promoAlign })} options={align} />
      </LayoutGroup>
      <LayoutGroup title="Header" text="The bar can run edge to edge while the logo and menu stay in the column.">
        <Choice label="Section width" value={layout.headerWidth || "full"} onChange={(headerWidth) => patch({ headerWidth })} options={width} />
        <Choice label="Content width" value={layout.headerContent || "fill"} onChange={(headerContent) => patch({ headerContent })} options={[{ value: "fill", label: "Fill the bar" }, { value: "column", label: "Keep in the column" }]} />
      </LayoutGroup>
      <LayoutGroup title="Banner" text="Shop, about, product, and the home hero. Full width is the colored band. The text inside can stay in the column and sit left, center, or right.">
        <Choice label="Section width" value={layout.bannerWidth || "contained"} onChange={(bannerWidth) => patch({ bannerWidth })} options={[{ value: "contained", label: "In the column" }, { value: "full", label: "Edge to edge" }]} />
        <Choice label="Content width" value={layout.bannerContent || "fill"} onChange={(bannerContent) => patch({ bannerContent })} options={[{ value: "fill", label: "Fill the banner" }, { value: "column", label: "Keep in the column" }]} />
        <Choice label="Content alignment" value={layout.bannerAlign || "left"} onChange={(bannerAlign) => patch({ bannerAlign })} options={align} />
      </LayoutGroup>
      <LayoutGroup title="Body" text="The page under the banner: home sections, the shop grid, and product copy.">
        <Choice label="Section width" value={layout.contentWidth || "standard"} onChange={(contentWidth) => patch({ contentWidth })} options={[{ value: "narrow", label: "Narrow" }, { value: "standard", label: "Standard" }, { value: "wide", label: "Wide" }, { value: "full", label: "Edge to edge" }]} />
        <Choice label="Content alignment" value={layout.bodyAlign || "left"} onChange={(bodyAlign) => patch({ bodyAlign })} options={align} />
      </LayoutGroup>
      <LayoutGroup title="Footer" text="The closing band. Its width and the alignment of the columns are separate.">
        <Choice label="Section width" value={layout.footerWidth || "full"} onChange={(footerWidth) => patch({ footerWidth })} options={width} />
        <Choice label="Content alignment" value={layout.footerAlign || "left"} onChange={(footerAlign) => patch({ footerAlign })} options={align} />
      </LayoutGroup>
    </section>
  );
}

function LayoutGroup({ title, text, children }) {
  return (
    <div className="layout-group">
      <h3>{title}</h3>
      <p className="fine">{text}</p>
      <div className="agrid">{children}</div>
    </div>
  );
}

function BrandPanel({ draft, setDraft }) {
  const brand = draft.brand;
  const [nextPassword, setNextPassword] = useState("");
  const [note, setNote] = useState("");

  function patch(partial) {
    setPart(setDraft, "brand", { ...brand, ...partial });
  }

  async function changePassword(event) {
    event.preventDefault();
    const response = await fetch("/api/admin/password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": sessionStorage.getItem("mirra-admin-key") || "",
      },
      body: JSON.stringify({ password: nextPassword }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNote(payload.error || "Could not change the password.");
      return;
    }
    sessionStorage.setItem("mirra-admin-key", nextPassword.trim());
    setNextPassword("");
    setNote("Password updated for this computer.");
  }

  async function onLogo(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2_000_000) {
      setNote("Use a PNG, JPG, WEBP, GIF, or SVG under 2 MB.");
      return;
    }
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
    setNote("");
    const response = await fetch("/api/admin/logo", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": sessionStorage.getItem("mirra-admin-key") || "",
      },
      body: JSON.stringify({ dataUrl }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setNote(payload.error || "Could not store the logo. Keep npm run dev running.");
      return;
    }
    patch({ logo: payload.url });
    setNote("Logo added. Save changes so the site keeps it.");
  }

  return (
    <section className="apanel">
      <h2>Brand</h2>
      <label className="afield">
        <span>Logo</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={onLogo} />
        <small>Shows in the header, footer, and browser tab. PNG, JPG, WEBP, GIF, or SVG, under 2 MB.</small>
      </label>
      {brand.logo && (
        <div className="logo-preview">
          <img src={brand.logo} alt="" />
          <button type="button" onClick={() => patch({ logo: "" })}>
            Remove logo
          </button>
        </div>
      )}
      <Text label="Or paste a logo URL" value={brand.logo || ""} onChange={(logo) => patch({ logo })} />
      <Check label="Show the shop name beside the logo" checked={brand.showName !== false} onChange={(showName) => patch({ showName })} />
      <div className="agrid">
        <Text label="Shop name" value={brand.name} onChange={(name) => patch({ name })} />
        <Text label="Tagline" value={brand.tagline} onChange={(tagline) => patch({ tagline })} />
        <Text label="Instagram handle" value={brand.handle} onChange={(handle) => patch({ handle })} />
        <Text label="Instagram URL" value={brand.instagramUrl} onChange={(instagramUrl) => patch({ instagramUrl })} />
        <Text label="Email" value={brand.email} onChange={(email) => patch({ email })} />
        <Text label="Currency code" value={brand.currency} onChange={(currency) => patch({ currency: currency.toUpperCase() })} hint="USD, PKR, EUR…" />
        <Text
          label="Affiliate suffix"
          value={brand.affiliateSuffix}
          onChange={(affiliateSuffix) => patch({ affiliateSuffix })}
          hint="Added to every AliExpress link. No leading ? or &."
        />
      </div>
      <form className="agrid" onSubmit={changePassword}>
        <Text label="New admin password" type="password" value={nextPassword} onChange={setNextPassword} hint="Starter password is mirra. This only locks the form." />
        <button className="btn btn-light" type="submit">
          Update password
        </button>
      </form>
      {note && <p>{note}</p>}
    </section>
  );
}

function ThemePanel({ draft, setDraft }) {
  const theme = draft.theme;
  function patch(partial) {
    setPart(setDraft, "theme", { ...theme, ...partial, preset: "custom" });
  }
  function applyTheme(item) {
    setDraft((current) => ({
      ...current,
      theme: { ...item.colors, preset: item.id, surface: item.surface, stageMode: item.stageMode },
      header: {
        ...current.header,
        design: item.header.design,
        bar: item.header.bar,
        links: item.header.links,
        logoPlace: "design",
        menuPlace: "design",
        searchPlace: "design",
      },
      footer: {
        ...current.footer,
        design: item.footer.design,
        align: item.footer.align,
        tone: item.footer.tone,
      },
      layout: { ...current.layout, ...item.layout },
    }));
  }
  const fields = [
    ["bg", "Page background"],
    ["ink", "Text"],
    ["muted", "Muted text"],
    ["gold", "Gold"],
    ["ember", "Buttons"],
    ["stage", "Hero and banners"],
    ["promoBg", "Announcement background"],
    ["promoText", "Announcement text"],
    ["footerBg", "Footer background"],
    ["footerText", "Footer text"],
  ];
  return (
    <section className="apanel">
      <h2>Themes</h2>
      <p>Light and dark themes each set the colors and the layout. Save to publish one. The moon in the header is a separate switch for shoppers.</p>
      <h3>Light</h3>
      <div className="theme-grid">
        {themes.filter((item) => item.surface !== "dark").map((item) => (
          <ThemeCard key={item.id} item={item} active={theme.preset === item.id} onApply={applyTheme} />
        ))}
      </div>
      <h3>Dark</h3>
      <div className="theme-grid">
        {themes.filter((item) => item.surface === "dark").map((item) => (
          <ThemeCard key={item.id} item={item} active={theme.preset === item.id} onApply={applyTheme} />
        ))}
      </div>
      <h3>Fine tune</h3>
      <div className="agrid">
        {fields.map(([key, label]) => (
          <ColorField key={key} label={label} value={theme[key]} onChange={(value) => patch({ [key]: value })} />
        ))}
      </div>
    </section>
  );
}

function ThemeCard({ item, active, onApply }) {
  return (
    <button type="button" className={active ? "theme-card on" : "theme-card"} onClick={() => onApply(item)}>
      <span className="theme-swatches" aria-hidden="true">
        <i style={{ background: item.colors.bg }} />
        <i style={{ background: item.colors.ink }} />
        <i style={{ background: item.colors.ember }} />
        <i style={{ background: item.colors.gold }} />
        <i style={{ background: item.colors.stage }} />
      </span>
      <strong>{item.name}</strong>
      <span>{item.note}</span>
    </button>
  );
}

function AnnouncementPanel({ draft, setDraft }) {
  const bar = draft.announcement;
  function patch(partial) {
    setPart(setDraft, "announcement", { ...bar, ...partial });
  }
  return (
    <section className="apanel">
      <h2>Announcement bar</h2>
      <Check label="Show the bar above the navigation" checked={bar.show} onChange={(show) => patch({ show })} />
      <Text label="Message" value={bar.text} onChange={(text) => patch({ text })} />
      <div className="agrid">
        <Text label="Link label" value={bar.linkLabel} onChange={(linkLabel) => patch({ linkLabel })} />
        <Text label="Link URL" value={bar.linkUrl} onChange={(linkUrl) => patch({ linkUrl })} />
      </div>
    </section>
  );
}

const placeOptions = [
  { value: "design", label: "Follow the design" },
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

function NavPanel({ draft, setDraft }) {
  const header = draft.header;
  function patch(partial) {
    setPart(setDraft, "header", { ...header, ...partial });
  }
  return (
    <section className="apanel">
      <h2>Navigation</h2>
      <p>Start from a built-in arrangement, or place the logo, menu, and search yourself. A link is one item. A dropdown holds its own list.</p>
      <div className="design-grid">
        {headerDesigns.map((item) => (
          <button
            key={item.id}
            type="button"
            className={header.design === item.id ? "design-card on" : "design-card"}
            onClick={() => patch({ design: item.id, logoPlace: "design", menuPlace: "design", searchPlace: "design" })}
          >
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </button>
        ))}
      </div>
      <div className="agrid">
        <Choice label="Logo" value={header.logoPlace || "design"} onChange={(logoPlace) => patch({ logoPlace })} options={placeOptions} />
        <Choice label="Menu" value={header.menuPlace || "design"} onChange={(menuPlace) => patch({ menuPlace })} options={placeOptions} />
        <Choice label="Search" value={header.searchPlace || "design"} onChange={(searchPlace) => patch({ searchPlace })} options={placeOptions} />
        <Choice
          label="Bar"
          value={header.bar || "glass"}
          onChange={(bar) => patch({ bar })}
          options={[
            { value: "glass", label: "Frosted glass" },
            { value: "solid", label: "Solid" },
            { value: "ink", label: "Dark bar" },
            { value: "line", label: "Transparent, hairline" },
          ]}
        />
        <Choice
          label="Links"
          value={header.links || "underline"}
          onChange={(links) => patch({ links })}
          options={[
            { value: "underline", label: "Underline" },
            { value: "pills", label: "Pills" },
            { value: "plain", label: "Plain" },
          ]}
        />
      </div>
      <Check label="Show search" checked={header.showSearch} onChange={(showSearch) => patch({ showSearch })} />
      <Text label="Search placeholder" value={header.searchPlaceholder} onChange={(searchPlaceholder) => patch({ searchPlaceholder })} />
      <BlockList
        items={header.items}
        onChange={(items) => patch({ items })}
        addLabel="Add menu item"
        blank={() => ({ id: uid("nav"), label: "New link", type: "link", to: "/", show: true, children: [] })}
        render={(item, update) => (
          <>
            <div className="agrid">
              <Text label="Label" value={item.label} onChange={(label) => update({ label })} />
              <Choice
                label="Type"
                value={item.type}
                onChange={(type) => update({ type })}
                options={[
                  { value: "link", label: "Single link" },
                  { value: "dropdown", label: "Dropdown" },
                ]}
              />
              <Text label="Goes to" value={item.to} onChange={(to) => update({ to })} />
              <Check label="Visible" checked={item.show !== false} onChange={(show) => update({ show })} />
            </div>
            {item.type === "dropdown" && (
              <BlockList
                items={item.children || []}
                onChange={(children) => update({ children })}
                addLabel="Add dropdown link"
                blank={() => ({ id: uid("sub"), label: "New item", to: "/shop", show: true })}
                render={(child, updateChild) => (
                  <div className="agrid">
                    <Text label="Label" value={child.label} onChange={(label) => updateChild({ label })} />
                    <Text label="Goes to" value={child.to} onChange={(to) => updateChild({ to })} />
                    <Check label="Visible" checked={child.show !== false} onChange={(show) => updateChild({ show })} />
                  </div>
                )}
              />
            )}
          </>
        )}
      />
    </section>
  );
}

function FooterPanel({ draft, setDraft }) {
  const footer = draft.footer;
  function patch(partial) {
    setPart(setDraft, "footer", { ...footer, ...partial });
  }
  return (
    <section className="apanel">
      <h2>Footer</h2>
      <p>Pick a built-in footer, then set alignment and tone. Column links stay the same in every design.</p>
      <div className="design-grid">
        {footerDesigns.map((item) => (
          <button key={item.id} type="button" className={footer.design === item.id ? "design-card on" : "design-card"} onClick={() => patch({ design: item.id })}>
            <strong>{item.label}</strong>
            <span>{item.note}</span>
          </button>
        ))}
      </div>
      <div className="agrid">
        <Choice
          label="Alignment"
          value={footer.align || "layout"}
          onChange={(align) => patch({ align })}
          options={[
            { value: "layout", label: "Follow Layout" },
            { value: "left", label: "Left" },
            { value: "center", label: "Center" },
            { value: "right", label: "Right" },
          ]}
        />
        <Choice
          label="Tone"
          value={footer.tone || "ink"}
          onChange={(tone) => patch({ tone })}
          options={[
            { value: "ink", label: "Dark" },
            { value: "paper", label: "Light" },
            { value: "contrast", label: "Button color" },
          ]}
        />
      </div>
      <Check label="Show footer" checked={footer.show !== false} onChange={(show) => patch({ show })} />
      <Area label="Intro under the logo" value={footer.lead} onChange={(lead) => patch({ lead })} />
      <Check label="Show social icons" checked={footer.showSocials} onChange={(showSocials) => patch({ showSocials })} />
      <BlockList
        items={footer.socials}
        onChange={(socials) => patch({ socials })}
        addLabel="Add social link"
        blank={() => ({ id: uid("social"), icon: "instagram", label: "Instagram", href: "https://instagram.com/", show: true })}
        render={(social, update) => (
          <div className="agrid">
            <Choice
              label="Icon"
              value={social.icon || (networks.some((item) => item.value === social.id) ? social.id : "link")}
              onChange={(icon) => update({ icon })}
              options={networks}
            />
            <Text label="Label" value={social.label} onChange={(label) => update({ label })} />
            <Text label="URL" value={social.href} onChange={(href) => update({ href })} />
            <Check label="Visible" checked={social.show !== false} onChange={(show) => update({ show })} />
          </div>
        )}
      />
      <h3>Columns</h3>
      <BlockList
        items={footer.columns}
        onChange={(columns) => patch({ columns })}
        addLabel="Add column"
        blank={() => ({ id: uid("col"), title: "New column", links: [] })}
        render={(column, update) => (
          <>
            <Text label="Column title" value={column.title} onChange={(title) => update({ title })} />
            <BlockList
              items={column.links || []}
              onChange={(links) => update({ links })}
              addLabel="Add link"
              blank={() => ({ id: uid("link"), label: "New link", to: "/" })}
              render={(link, updateLink) => (
                <div className="agrid">
                  <Text label="Label" value={link.label} onChange={(label) => updateLink({ label })} />
                  <Text label="Goes to" value={link.to} onChange={(to) => updateLink({ to })} />
                </div>
              )}
            />
          </>
        )}
      />
      <h3>Newsletter</h3>
      <Check label="Show newsletter" checked={footer.newsletter.show} onChange={(show) => patch({ newsletter: { ...footer.newsletter, show } })} />
      <div className="agrid">
        <Text label="Title" value={footer.newsletter.title} onChange={(title) => patch({ newsletter: { ...footer.newsletter, title } })} />
        <Text label="Placeholder" value={footer.newsletter.placeholder} onChange={(placeholder) => patch({ newsletter: { ...footer.newsletter, placeholder } })} />
        <Text label="Button" value={footer.newsletter.button} onChange={(button) => patch({ newsletter: { ...footer.newsletter, button } })} />
      </div>
      <Area label="Note" value={footer.newsletter.note} onChange={(note) => patch({ newsletter: { ...footer.newsletter, note } })} hint="{currency} becomes the currency code." />
      <Area label="Thanks message" value={footer.newsletter.thanks} onChange={(thanks) => patch({ newsletter: { ...footer.newsletter, thanks } })} />
      <Text label="Copyright line" value={footer.copyright} onChange={(copyright) => patch({ copyright })} />
      <Check label="Show the handle beside the copyright" checked={footer.showHandle} onChange={(showHandle) => patch({ showHandle })} />
    </section>
  );
}

function HomePanel({ draft, setDraft }) {
  const home = draft.home;
  function patch(partial) {
    setPart(setDraft, "home", { ...home, ...partial });
  }
  function hero(partial) {
    patch({ hero: { ...home.hero, ...partial } });
  }
  return (
    <section className="apanel">
      <h2>Home page</h2>
      <Text label="Browser title" value={home.pageTitle} onChange={(pageTitle) => patch({ pageTitle })} hint="{name} and {tagline} are filled in." />
      <h3>Hero</h3>
      <Check label="Show hero" checked={home.hero.show} onChange={(show) => hero({ show })} />
      <Check label="Show the 3D product ring" checked={home.hero.showStage} onChange={(showStage) => hero({ showStage })} />
      <Check label="Show the numbers" checked={home.hero.showStats} onChange={(showStats) => hero({ showStats })} />
      <Text label="Eyebrow" value={home.hero.eyebrow} onChange={(eyebrow) => hero({ eyebrow })} />
      <Area label="Headline" value={home.hero.title} onChange={(title) => hero({ title })} hint="Put a line break where the headline should split." />
      <Area label="Intro" value={home.hero.lede} onChange={(lede) => hero({ lede })} />
      <div className="agrid">
        <Text label="Primary button" value={home.hero.primaryLabel} onChange={(primaryLabel) => hero({ primaryLabel })} />
        <Text label="Primary link" value={home.hero.primaryTo} onChange={(primaryTo) => hero({ primaryTo })} />
        <Text label="Secondary button" value={home.hero.secondaryLabel} onChange={(secondaryLabel) => hero({ secondaryLabel })} />
        <Text label="Secondary link" value={home.hero.secondaryTo} onChange={(secondaryTo) => hero({ secondaryTo })} />
      </div>
      <BlockList
        items={home.hero.stats}
        onChange={(stats) => hero({ stats })}
        addLabel="Add stat"
        blank={() => ({ value: "0", label: "Label" })}
        render={(stat, update) => (
          <div className="agrid">
            <Text label="Value" value={stat.value} onChange={(value) => update({ value })} hint="{products} or {categories} count themselves." />
            <Text label="Label" value={stat.label} onChange={(label) => update({ label })} />
          </div>
        )}
      />
      <h3>Marquee</h3>
      <Check label="Show the moving line" checked={home.marquee.show} onChange={(show) => patch({ marquee: { ...home.marquee, show } })} />
      <Lines label="Phrases" value={home.marquee.phrases} onChange={(phrases) => patch({ marquee: { ...home.marquee, phrases } })} hint="One phrase per line." />
      <SectionFields title="Category row" value={home.categories} onChange={(categories) => patch({ categories })} />
      <SectionFields title="Featured row" value={home.featured} onChange={(featured) => patch({ featured })} />
      <h3>Steps</h3>
      <Check label="Show the steps" checked={home.steps.show} onChange={(show) => patch({ steps: { ...home.steps, show } })} />
      <div className="agrid">
        <Text label="Kicker" value={home.steps.kicker} onChange={(kicker) => patch({ steps: { ...home.steps, kicker } })} />
        <Text label="Title" value={home.steps.title} onChange={(title) => patch({ steps: { ...home.steps, title } })} />
      </div>
      <BlockList
        items={home.steps.items}
        onChange={(items) => patch({ steps: { ...home.steps, items } })}
        addLabel="Add step"
        blank={() => ({ title: "New step", text: "" })}
        render={(step, update) => (
          <>
            <Text label="Title" value={step.title} onChange={(title) => update({ title })} />
            <Area label="Text" value={step.text} onChange={(text) => update({ text })} />
          </>
        )}
      />
      <h3>Instagram band</h3>
      <Check label="Show the band" checked={home.instagram.show} onChange={(show) => patch({ instagram: { ...home.instagram, show } })} />
      <Text label="Eyebrow" value={home.instagram.eyebrow} onChange={(eyebrow) => patch({ instagram: { ...home.instagram, eyebrow } })} />
      <Text label="Title" value={home.instagram.title} onChange={(title) => patch({ instagram: { ...home.instagram, title } })} />
      <div className="agrid">
        <Text label="Button label" value={home.instagram.label} onChange={(label) => patch({ instagram: { ...home.instagram, label } })} hint="{handle} uses the brand handle." />
        <Text label="Button URL" value={home.instagram.url} onChange={(url) => patch({ instagram: { ...home.instagram, url } })} hint="{instagram} uses the brand URL." />
      </div>
    </section>
  );
}

function SectionFields({ title, value, onChange }) {
  function patch(partial) {
    onChange({ ...value, ...partial });
  }
  return (
    <>
      <h3>{title}</h3>
      <Check label={`Show ${title.toLowerCase()}`} checked={value.show} onChange={(show) => patch({ show })} />
      <div className="agrid">
        <Text label="Kicker" value={value.kicker} onChange={(kicker) => patch({ kicker })} />
        <Text label="Title" value={value.title} onChange={(titleText) => patch({ title: titleText })} />
        <Text label="Link label" value={value.linkLabel} onChange={(linkLabel) => patch({ linkLabel })} />
        <Text label="Link" value={value.linkTo} onChange={(linkTo) => patch({ linkTo })} />
      </div>
    </>
  );
}

function ShopPanel({ draft, setDraft }) {
  const shop = draft.shop;
  function patch(partial) {
    setPart(setDraft, "shop", { ...shop, ...partial });
  }
  function card(partial) {
    patch({ card: { ...shop.card, ...partial } });
  }
  return (
    <section className="apanel">
      <h2>Shop and listing cards</h2>
      <div className="agrid">
        <Text label="Banner kicker" value={shop.kicker} onChange={(kicker) => patch({ kicker })} />
        <Text label="Default title" value={shop.defaultTitle} onChange={(defaultTitle) => patch({ defaultTitle })} />
        <Text label="New-in title" value={shop.newTitle} onChange={(newTitle) => patch({ newTitle })} />
        <Text label="All-products label" value={shop.allLabel} onChange={(allLabel) => patch({ allLabel })} />
      </div>
      <Area label="Intro under the banner" value={shop.intro} onChange={(intro) => patch({ intro })} />
      <div className="achecks">
        <Check label="Filters" checked={shop.showFilters} onChange={(showFilters) => patch({ showFilters })} />
        <Check label="Price filter" checked={shop.showPrice} onChange={(showPrice) => patch({ showPrice })} />
        <Check label="New-only filter" checked={shop.showNew} onChange={(showNew) => patch({ showNew })} />
        <Check label="Sort" checked={shop.showSort} onChange={(showSort) => patch({ showSort })} />
        <Check label="Search on the shop" checked={shop.showSearch} onChange={(showSearch) => patch({ showSearch })} />
      </div>
      <div className="agrid">
        <Text label="Category heading" value={shop.categoryLabel} onChange={(categoryLabel) => patch({ categoryLabel })} />
        <Text label="Price heading" value={shop.priceLabel} onChange={(priceLabel) => patch({ priceLabel })} />
        <Text label="New toggle" value={shop.newToggle} onChange={(newToggle) => patch({ newToggle })} />
        <Text label="Clear label" value={shop.clearLabel} onChange={(clearLabel) => patch({ clearLabel })} />
        <Text label="Show filters" value={shop.showLabel} onChange={(showLabel) => patch({ showLabel })} />
        <Text label="Hide filters" value={shop.hideLabel} onChange={(hideLabel) => patch({ hideLabel })} />
        <Text label="Search placeholder" value={shop.searchPlaceholder} onChange={(searchPlaceholder) => patch({ searchPlaceholder })} />
        <Text label="One result" value={shop.resultSingular} onChange={(resultSingular) => patch({ resultSingular })} />
        <Text label="Many results" value={shop.resultPlural} onChange={(resultPlural) => patch({ resultPlural })} />
      </div>
      <Text label="Empty title" value={shop.emptyTitle} onChange={(emptyTitle) => patch({ emptyTitle })} />
      <Area label="Empty text" value={shop.emptyText} onChange={(emptyText) => patch({ emptyText })} />
      <Text label="Empty button" value={shop.emptyButton} onChange={(emptyButton) => patch({ emptyButton })} />
      <h3>Price labels</h3>
      {shop.bands.map((band, index) => (
        <Text
          key={band.id}
          label={band.id}
          value={band.label}
          onChange={(label) => {
            const bands = shop.bands.slice();
            bands[index] = { ...band, label };
            patch({ bands });
          }}
        />
      ))}
      <h3>Sort labels</h3>
      {shop.sorts.map((option, index) => (
        <Text
          key={option.id}
          label={option.id}
          value={option.label}
          onChange={(label) => {
            const sorts = shop.sorts.slice();
            sorts[index] = { ...option, label };
            patch({ sorts });
          }}
        />
      ))}
      <h3>What a card shows</h3>
      <div className="achecks">
        <Check label="Badge" checked={shop.card.showBadge} onChange={(showBadge) => card({ showBadge })} />
        <Check label="Category" checked={shop.card.showCategory} onChange={(showCategory) => card({ showCategory })} />
        <Check label="Short description" checked={shop.card.showBlurb} onChange={(showBlurb) => card({ showBlurb })} />
        <Check label="Rating" checked={shop.card.showRating} onChange={(showRating) => card({ showRating })} />
        <Check label="Compare-at price" checked={shop.card.showCompare} onChange={(showCompare) => card({ showCompare })} />
        <Check label="Buy button" checked={shop.card.showBuy} onChange={(showBuy) => card({ showBuy })} />
      </div>
      <Text label="Card buy label" value={shop.card.buyLabel} onChange={(buyLabel) => card({ buyLabel })} />
    </section>
  );
}

function ProductPagePanel({ draft, setDraft }) {
  const page = draft.productPage;
  function patch(partial) {
    setPart(setDraft, "productPage", { ...page, ...partial });
  }
  return (
    <section className="apanel">
      <h2>Product detail page</h2>
      <p>Each product still has its own photos, price, colors, and AliExpress link. These settings are the shared wording and which blocks appear.</p>
      <div className="achecks">
        <Check label="Rating" checked={page.showRating} onChange={(showRating) => patch({ showRating })} />
        <Check label="Compare-at price" checked={page.showCompare} onChange={(showCompare) => patch({ showCompare })} />
        <Check label="Color choices" checked={page.showColors} onChange={(showColors) => patch({ showColors })} />
        <Check label="Related products" checked={page.showRelated} onChange={(showRelated) => patch({ showRelated })} />
      </div>
      <div className="agrid">
        <Text label="Color label" value={page.colorLabel} onChange={(colorLabel) => patch({ colorLabel })} />
        <Text label="Buy button" value={page.buyLabel} onChange={(buyLabel) => patch({ buyLabel })} />
        <Text label="Notes kicker" value={page.notesKicker} onChange={(notesKicker) => patch({ notesKicker })} />
        <Text label="Notes title" value={page.notesTitle} onChange={(notesTitle) => patch({ notesTitle })} />
        <Text label="Related kicker" value={page.relatedKicker} onChange={(relatedKicker) => patch({ relatedKicker })} />
        <Text label="Related title" value={page.relatedTitle} onChange={(relatedTitle) => patch({ relatedTitle })} hint="{category} becomes the category name." />
        <Text label="Related link" value={page.relatedLink} onChange={(relatedLink) => patch({ relatedLink })} />
      </div>
      <Area label="Price note" value={page.priceNote} onChange={(priceNote) => patch({ priceNote })} hint="{currency} becomes the currency code." />
      <Area label="Buy note" value={page.buyNote} onChange={(buyNote) => patch({ buyNote })} />
      <Lines label="Assurance chips" value={page.assurances} onChange={(assurances) => patch({ assurances })} hint="One chip per line." />
      <h3>Missing product</h3>
      <div className="agrid">
        <Text label="Kicker" value={page.missingKicker} onChange={(missingKicker) => patch({ missingKicker })} />
        <Text label="Button" value={page.missingButton} onChange={(missingButton) => patch({ missingButton })} />
      </div>
      <Text label="Title" value={page.missingTitle} onChange={(missingTitle) => patch({ missingTitle })} />
      <Area label="Text" value={page.missingText} onChange={(missingText) => patch({ missingText })} />
    </section>
  );
}

function AboutPanel({ draft, setDraft }) {
  const about = draft.about;
  function patch(partial) {
    setPart(setDraft, "about", { ...about, ...partial });
  }
  return (
    <section className="apanel">
      <h2>About page</h2>
      <Text label="Browser title" value={about.pageTitle} onChange={(pageTitle) => patch({ pageTitle })} hint="{name} becomes the shop name." />
      <div className="agrid">
        <Text label="Banner kicker" value={about.kicker} onChange={(kicker) => patch({ kicker })} />
        <Text label="Banner title" value={about.title} onChange={(title) => patch({ title })} />
      </div>
      <Area label="Banner text" value={about.text} onChange={(text) => patch({ text })} />
      <BlockList
        items={about.sections}
        onChange={(sectionsList) => patch({ sections: sectionsList })}
        addLabel="Add section"
        blank={() => ({ id: uid("section"), layout: "stack", kicker: "", title: "New section", paragraphs: [""], linkLabel: "", linkTo: "" })}
        render={(section, update) => (
          <>
            <div className="agrid">
              <Text label="Anchor id" value={section.id} onChange={(id) => update({ id: slugify(id) })} hint="Used in links like /about#buying." />
              <Choice
                label="Layout"
                value={section.layout}
                onChange={(layout) => update({ layout })}
                options={[
                  { value: "stack", label: "Single column" },
                  { value: "split", label: "Two columns" },
                ]}
              />
              <Text label="Kicker" value={section.kicker} onChange={(kicker) => update({ kicker })} />
              <Text label="Title" value={section.title} onChange={(title) => update({ title })} />
              <Text label="Link label" value={section.linkLabel} onChange={(linkLabel) => update({ linkLabel })} />
              <Text label="Link" value={section.linkTo} onChange={(linkTo) => update({ linkTo })} />
            </div>
            <Area
              label="Paragraphs"
              value={(section.paragraphs || []).join("\n\n")}
              onChange={(text) => update({ paragraphs: text.split(/\n\s*\n/) })}
              hint="Separate paragraphs with a blank line. {email} and {handle} are filled in."
            />
          </>
        )}
      />
      <h3>FAQ</h3>
      <div className="agrid">
        <Text label="Kicker" value={about.faqKicker} onChange={(faqKicker) => patch({ faqKicker })} />
        <Text label="Title" value={about.faqTitle} onChange={(faqTitle) => patch({ faqTitle })} />
      </div>
      <BlockList
        items={about.faqs}
        onChange={(faqs) => patch({ faqs })}
        addLabel="Add question"
        blank={() => ({ q: "New question", a: "" })}
        render={(item, update) => (
          <>
            <Text label="Question" value={item.q} onChange={(q) => update({ q })} />
            <Area label="Answer" value={item.a} onChange={(a) => update({ a })} />
          </>
        )}
      />
      <h3>Contact</h3>
      <div className="agrid">
        <Text label="Kicker" value={about.contact.kicker} onChange={(kicker) => patch({ contact: { ...about.contact, kicker } })} />
        <Text label="Title" value={about.contact.title} onChange={(title) => patch({ contact: { ...about.contact, title } })} />
        <Text label="Button" value={about.contact.button} onChange={(button) => patch({ contact: { ...about.contact, button } })} />
      </div>
      <Area label="Text" value={about.contact.text} onChange={(text) => patch({ contact: { ...about.contact, text } })} />
      <Area label="Thanks" value={about.contact.thanks} onChange={(thanks) => patch({ contact: { ...about.contact, thanks } })} />
    </section>
  );
}

function CategoriesPanel({ draft, setDraft }) {
  return (
    <section className="apanel">
      <h2>Categories</h2>
      <p>These drive the shop filters and the home category tiles. Menu links stay as you set them until you sync.</p>
      <button type="button" className="btn btn-light" onClick={() => setDraft(syncCategoryNav(draft))}>
        Put categories in the Shop dropdown
      </button>
      <BlockList
        items={draft.categories}
        onChange={(categories) => setPart(setDraft, "categories", categories)}
        addLabel="Add category"
        blank={() => ({ id: uid("cat"), name: "New category", blurb: "" })}
        render={(category, update) => (
          <div className="agrid">
            <Text label="Name" value={category.name} onChange={(name) => update({ name, id: category.id || slugify(name) })} />
            <Text label="Id" value={category.id} onChange={(id) => update({ id: slugify(id) })} hint="Used in /shop?category=this-id" />
            <Text label="Short line" value={category.blurb} onChange={(blurb) => update({ blurb })} />
          </div>
        )}
      />
    </section>
  );
}

function starLines(stars) {
  if (!stars) return [];
  return [5, 4, 3, 2, 1].map((score) => `${score}: ${Number(stars[score] ?? stars[String(score)]) || 0}`);
}

function starsFromLines(lines) {
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const line of lines || []) {
    const match = String(line).match(/^([1-5])\s*:\s*(\d+)/);
    if (match) stars[match[1]] = Number(match[2]) || 0;
  }
  return Object.values(stars).some((count) => count > 0) ? stars : null;
}

function fieldsFromImport(payload) {
  const next = {};
  if (payload.aliUrl) next.aliUrl = payload.aliUrl;
  if (payload.name) {
    next.name = payload.name;
    next.slug = payload.slug || slugify(payload.name);
  }
  if (payload.aliQuery) next.aliQuery = payload.aliQuery;
  if (payload.images?.length) next.images = payload.images;
  if (payload.colors?.length) next.colors = payload.colors;
  if (payload.options?.length) next.options = payload.options;
  if (payload.optionsSource) next.optionsSource = payload.optionsSource;
  if (payload.quotes?.length) next.quotes = payload.quotes;
  if (payload.stars) next.stars = payload.stars;
  if (payload.details?.length) next.details = payload.details;
  if (payload.description) next.description = payload.description;
  if (payload.blurb) next.blurb = payload.blurb;
  if (payload.rating) next.rating = payload.rating;
  if (payload.reviews) next.reviews = payload.reviews;
  if (payload.price) next.price = payload.price;
  if (payload.compareAt) next.compareAt = payload.compareAt;
  if (payload.currency) next.currency = payload.currency;
  return next;
}

function SideItem({ id, label, icon, section, onClick }) {
  return (
    <button type="button" className={section === id ? "nav-item on" : "nav-item"} onClick={onClick}>
      <Icon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function SidePicker({ label, value, onChange, placeholder, options, addLabel, onAdd }) {
  return (
    <div className="side-pick">
      <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options}
      </select>
      <button type="button" className="side-add" onClick={onAdd}>
        <Icon name="plus" />
        <span>{addLabel}</span>
      </button>
    </div>
  );
}

function aliItemUrl(value) {
  const text = String(value || "").trim();
  let url;
  try {
    url = new URL(text);
  } catch {
    return "";
  }
  const host = url.hostname.replace(/^www\./, "");
  const allowed = /(^|\.)aliexpress\.(com|us|ru)$/i.test(host) || host === "ali.express";
  if (!/^https?:$/.test(url.protocol) || !allowed) return "";
  if (!/\/item\/\d+|\/i\/\d+/.test(url.pathname)) return "";
  return text;
}

function ProductsPanel({ draft, setDraft, productIndex, setProductIndex, onAdd }) {
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  const index = productIndex;
  const product = index >= 0 ? draft.products[index] : null;
  const indexRef = useRef(index);
  const timer = useRef(0);
  const requestId = useRef(0);
  const lastFetched = useRef("");

  useEffect(() => {
    indexRef.current = productIndex;
    window.clearTimeout(timer.current);
    lastFetched.current = "";
  }, [productIndex]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  function replace(products) {
    setPart(setDraft, "products", products);
  }

  function patch(partial) {
    const products = draft.products.slice();
    products[index] = { ...products[index], ...partial };
    replace(products);
  }

  function patchAt(partial) {
    setDraft((current) => {
      const currentIndex = indexRef.current;
      if (currentIndex < 0 || !current.products[currentIndex]) return current;
      const products = current.products.slice();
      products[currentIndex] = { ...products[currentIndex], ...partial };
      return { ...current, products };
    });
  }

  async function readLink(url) {
    const response = await fetch("/api/admin/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": sessionStorage.getItem("mirra-admin-key") || "",
      },
      body: JSON.stringify({ url, currency: draft.brand.currency }),
    });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("Wrong password. Log out and enter again.");
    if (!response.ok) throw new Error(payload.error || "Could not read that link. Keep npm run dev running.");
    return payload;
  }

  function scheduleScrape(url) {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const item = aliItemUrl(url);
      if (item) {
        scrape(item);
        return;
      }
      if (/aliexpress|ali\.express/i.test(url)) setImportNote("Use the product link, the one with /item/ in it.");
    }, 400);
  }

  async function scrape(item) {
    if (!item || item === lastFetched.current) return;
    const id = requestId.current + 1;
    requestId.current = id;
    lastFetched.current = item;
    setImporting(true);
    setImportNote("");
    try {
      const payload = await readLink(item);
      if (id !== requestId.current) return;
      const filled = fieldsFromImport(payload);
      if (indexRef.current >= 0) {
        patchAt(filled);
      } else {
        const fresh = { ...emptyProduct(draft.categories[0]?.id), ...filled, visible: true, isNew: true };
        const nextIndex = draft.products.length;
        setDraft((current) => ({ ...current, products: [...(current.products || []), fresh] }));
        setProductIndex(nextIndex);
      }
      setImportUrl("");
      setImportNote(payload.note || "Filled from the AliExpress link.");
    } catch (error) {
      if (id !== requestId.current) return;
      lastFetched.current = "";
      setImportNote(error.message);
    } finally {
      if (id === requestId.current) setImporting(false);
    }
  }

  function fillFromLink(event) {
    event.preventDefault();
    event.stopPropagation();
    const item = aliItemUrl(product?.aliUrl || importUrl);
    if (!item) {
      setImportNote("Use the product link, the one with /item/ in it.");
      return;
    }
    if (product && product.aliUrl !== item) patch({ aliUrl: item });
    lastFetched.current = "";
    scrape(item);
  }

  function duplicate() {
    if (!product) return;
    const copy = structuredClone(product);
    copy.name = `${product.name} copy`;
    copy.slug = `${product.slug}-copy`;
    const products = draft.products.slice();
    products.splice(index + 1, 0, copy);
    replace(products);
    setProductIndex(index + 1);
  }

  function remove() {
    if (!product) return;
    const name = product.name || "this product";
    if (!window.confirm(`Delete ${name}? It leaves the catalog after you save.`)) return;
    const next = draft.products.filter((_, itemIndex) => itemIndex !== index);
    replace(next);
    setProductIndex(next.length ? Math.min(index, next.length - 1) : -1);
  }

  return (
    <section className="apanel">
      <div className="panel-head">
        <div>
          <h2>{product ? product.name || "Untitled" : "Products"}</h2>
          <p>Paste an AliExpress product link and the fields fill in on their own. The card uses the short line, price, badge, and first photo.</p>
        </div>
        <button type="button" className="panel-add" onClick={onAdd}>
          <Icon name="plus" />
          <span>New product</span>
        </button>
      </div>
      {importing && (
        <p className="import-loading" role="status">
          <span className="import-spin" aria-hidden="true" />
          Reading the AliExpress page…
        </p>
      )}
      {importNote && !importing && <p className="import-note">{importNote}</p>}
      <div className="import-row">
        <input
          value={importUrl}
          placeholder="Paste an AliExpress product link"
          aria-label="AliExpress item link"
          onChange={(event) => {
            setImportUrl(event.target.value);
            scheduleScrape(event.target.value);
          }}
          onPaste={(event) => {
            const text = event.clipboardData?.getData("text") || "";
            if (!aliItemUrl(text)) return;
            window.clearTimeout(timer.current);
            setImportUrl(text.trim());
            lastFetched.current = "";
            scrape(text.trim());
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") fillFromLink(event);
          }}
        />
        <button type="button" className="btn btn-light" onClick={fillFromLink} disabled={importing}>
          {importing ? "Reading…" : "Fill from this link"}
        </button>
      </div>
      {product ? (
          <div className={importing ? "page-editor is-importing" : "page-editor"}>
            <div className="ablock-bar">
              <button
                type="button"
                onClick={() => {
                  replace(moveItem(draft.products, index, -1));
                  setProductIndex(Math.max(0, index - 1));
                }}
              >
                Move up
              </button>
              <button
                type="button"
                onClick={() => {
                  replace(moveItem(draft.products, index, 1));
                  setProductIndex(Math.min(draft.products.length - 1, index + 1));
                }}
              >
                Move down
              </button>
              <button type="button" onClick={duplicate}>
                Duplicate
              </button>
              <button type="button" onClick={() => patch({ visible: product.visible === false })}>
                {product.visible === false ? "Activate" : "Deactivate"}
              </button>
              <button type="button" className="is-danger" onClick={remove}>
                Delete
              </button>
            </div>
            {product.visible === false && (
              <p className="fine">Deactivated. It stays out of the shop, the home page, and its own link until you activate it and save.</p>
            )}
            <div className="agrid">
              <Text label="Name" value={product.name} onChange={(name) => patch({ name })} />
              <Text label="Slug" value={product.slug} onChange={(slug) => patch({ slug })} hint="The page address: /product/this-slug" />
              <Choice
                label="Category"
                value={product.category}
                onChange={(category) => patch({ category })}
                options={draft.categories.map((category) => ({ value: category.id, label: category.name }))}
              />
              <Text label="Badge" value={product.badge} onChange={(badge) => patch({ badge })} hint="Shown on the card. Leave empty to hide." />
              <Text label="Price" type="number" value={product.price} onChange={(price) => patch({ price })} />
              <Text label="Compare-at price" type="number" value={product.compareAt} onChange={(compareAt) => patch({ compareAt })} hint="Shows struck through when it is higher than the price." />
              <Text label="Price currency" value={product.currency} onChange={(currency) => patch({ currency })} hint="USD, PKR, EUR. Blank uses the shop currency." />
              <Text label="Rating" type="number" value={product.rating} onChange={(rating) => patch({ rating })} />
              <Text label="Review count" type="number" value={product.reviews} onChange={(reviews) => patch({ reviews })} />
              <ColorField label="Fallback color" value={product.tone} onChange={(tone) => patch({ tone })} />
            </div>
            <div className="achecks">
              <Check label="Active on the site" checked={product.visible !== false} onChange={(visible) => patch({ visible })} />
              <Check label="Featured on the home page" checked={product.featured} onChange={(featured) => patch({ featured })} />
              <Check label="Mark as new" checked={product.isNew} onChange={(isNew) => patch({ isNew })} />
            </div>
            <h3>SEO</h3>
            <p className="fine">This product’s own search title, snippet, keywords, and share image. Leave a field blank and the shop uses the product name, the short line, the first photo, and the site keywords.</p>
            <Text label="Search title" value={product.seoTitle || ""} onChange={(seoTitle) => patch({ seoTitle })} hint="Blank uses the product name plus the shop name." />
            <Area label="Search description" value={product.seoDescription || ""} onChange={(seoDescription) => patch({ seoDescription })} hint="Blank uses the short line, then the detail story." />
            <Text label="Keywords" value={product.seoKeywords || ""} onChange={(seoKeywords) => patch({ seoKeywords })} hint="Comma separated. Blank uses the site keywords." />
            <Text label="Share image URL" value={product.seoImage || ""} onChange={(seoImage) => patch({ seoImage })} hint="Blank uses the first product photo." />
            <Text
              label="AliExpress item URL"
              value={product.aliUrl}
              onChange={(aliUrl) => {
                patch({ aliUrl });
                scheduleScrape(aliUrl);
              }}
              hint="Stays on this admin page. Fill from this link reads it here and fills the fields."
            />
            <button type="button" className="btn btn-light" onClick={fillFromLink} disabled={importing || !product.aliUrl}>
              {importing ? "Reading the link…" : "Fill from this link"}
            </button>
            <Text label="Search words, if there is no item URL" value={product.aliQuery} onChange={(aliQuery) => patch({ aliQuery })} />
            <Lines label="Photo URLs" value={product.images} onChange={(images) => patch({ images })} hint="One URL per line. The first photo is the card and the main detail image. AliExpress images sometimes refuse to load on other sites." />
            <Area label="Short line for the card" value={product.blurb} onChange={(blurb) => patch({ blurb })} />
            <Area label="Detail story" value={product.description} onChange={(description) => patch({ description })} />
            <Lines label="Colors" value={product.colors} onChange={(colors) => patch({ colors })} hint="One color per line. The shopper picks a reference; AliExpress still has the real options." />
            <Lines label="Options" value={product.options} onChange={(options) => patch({ options })} hint="One Name: value per line. Example: Model: Galaxy S24 Ultra" />
            <Lines label="Specifications" value={product.details} onChange={(details) => patch({ details })} hint="One Name: value per line, matching the AliExpress specification table." />
            <Lines label="Buyer notes" value={product.quotes} onChange={(quotes) => patch({ quotes })} hint="Short lines from buyers. One per line." />
            <Lines label="Star split" value={starLines(product.stars)} onChange={(lines) => patch({ stars: starsFromLines(lines) })} hint="One score per line, like 5: 22. These are the AliExpress review counts." />
          </div>
      ) : (
        <p>Choose a product from the menu, or add a new one. Its price, photos, and AliExpress link show up here.</p>
      )}
    </section>
  );
}
