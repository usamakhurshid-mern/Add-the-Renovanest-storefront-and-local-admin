import { Link } from "react-router-dom";

export default function PageBanner({ kicker, title, text, crumbs, className = "" }) {
  return (
    <section className={`page-banner ${className}`.trim()}>
      <div className="banner-inner">
        {crumbs && (
          <nav className="crumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`}>
                {index > 0 && <span aria-hidden="true"> / </span>}
                {crumb.to ? <Link to={crumb.to}>{crumb.label}</Link> : <span>{crumb.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {kicker && <p className="eyebrow">{kicker}</p>}
        <h1>{title}</h1>
        {text && <p className="banner-text">{text}</p>}
      </div>
    </section>
  );
}
