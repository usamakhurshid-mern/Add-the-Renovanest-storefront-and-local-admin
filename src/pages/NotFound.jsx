import { useCatalog } from "../catalog/context";
import PageBanner from "../components/PageBanner";
import SmartLink from "../components/SmartLink";
import { useSeo } from "../usePageTitle";

export default function NotFound() {
  const { content } = useCatalog();
  const page = content.notFound;
  useSeo(content, {
    title: `${page.title} · ${content.brand.name}`,
    description: page.text,
    robots: "noindex,follow",
  });

  return (
    <div className="page">
      <PageBanner kicker={page.kicker} title={page.title} text={page.text} />
      <div className="wrap empty">
        <SmartLink className="btn btn-ember" to="/shop">
          {page.button}
        </SmartLink>
      </div>
    </div>
  );
}
