import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import Admin from "./admin/Admin";
import { CatalogProvider, ApplyChrome } from "./catalog/CatalogContext";
import { useCatalog } from "./catalog/context";
import Layout from "./components/Layout";
import About from "./pages/About";
import Home from "./pages/Home";
import CustomPage from "./pages/CustomPage";
import NotFound from "./pages/NotFound";
import Product from "./pages/Product";
import Shop from "./pages/Shop";
import SiteSkeleton from "./components/SiteSkeleton";
import { useEffect } from "react";

export default function App() {
  return (
    <CatalogProvider>
      <BrowserRouter>
        <ApplyChrome />
        <PreviewBridge />
        <PreviewGate />
      </BrowserRouter>
    </CatalogProvider>
  );
}

function PreviewGate() {
  const { content } = useCatalog();
  if (!content) return <SiteSkeleton />;
  return (
    <Routes>
      <Route path="admin" element={<Admin />} />
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="product/:slug" element={<Product />} />
        <Route path="about" element={<About />} />
        <Route path="page/:slug" element={<CustomPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function PreviewBridge() {
  const { setPreviewContent } = useCatalog();
  const navigate = useNavigate();

  useEffect(() => {
    if (window.parent === window) return undefined;
    function onMessage(event) {
      if (event.origin !== window.location.origin || !event.data) return;
      if (event.data.type === "renovanest-preview") setPreviewContent(event.data.content);
      if (event.data.type === "renovanest-preview-go" && typeof event.data.path === "string") navigate(event.data.path);
    }
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "renovanest-preview-ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate, setPreviewContent]);

  return null;
}
