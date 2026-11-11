import { useState } from "react";
import { useCatalog } from "../catalog/context";
import { brandVars, fill } from "../data/store";
import LogoMark from "./LogoMark";
import SmartLink from "./SmartLink";

const year = new Date().getFullYear();

export default function Footer() {
  const { content } = useCatalog();
  const [joined, setJoined] = useState(false);
  const { brand, footer } = content;
  const vars = brandVars(content);

  if (footer.show === false) return null;

  function onJoin(event) {
    event.preventDefault();
    setJoined(true);
  }

  return (
    <footer className={`footer design-${footer.design || "columns"} tone-${footer.tone || "ink"} ${footer.align && footer.align !== "layout" ? `align-${footer.align}` : ""}`}>
      <div className="wrap footer-grid">
        <div>
          <LogoMark brand={brand} className="logo footer-logo" />
          <p className="footer-lead">{fill(footer.lead, vars)}</p>
          {footer.showSocials && (
            <div className="socials">
              {footer.socials
                .filter((social) => social.show !== false && social.href)
                .map((social) => (
                  <a key={social.id} href={social.href} target="_blank" rel="noreferrer" aria-label={social.label}>
                    <SocialIcon id={social.icon || social.id} />
                  </a>
                ))}
            </div>
          )}
        </div>

        {footer.columns.map((column) => (
          <div key={column.id}>
            <p className="footer-title">{column.title}</p>
            <ul>
              {(column.links || []).map((link) => (
                <li key={link.id}>
                  <SmartLink to={link.to}>{link.label}</SmartLink>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {footer.newsletter.show && (
          <div>
            <p className="footer-title">{footer.newsletter.title}</p>
            {joined ? (
              <p className="footer-lead">{fill(footer.newsletter.thanks, vars)}</p>
            ) : (
              <form className="news" onSubmit={onJoin}>
                <label className="sr-only" htmlFor="footer-email">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  placeholder={footer.newsletter.placeholder}
                  autoComplete="email"
                />
                <button className="btn btn-ember" type="submit">
                  {footer.newsletter.button}
                </button>
              </form>
            )}
            <p className="fine light">{fill(footer.newsletter.note, vars)}</p>
          </div>
        )}
      </div>
      <div className="wrap footer-bottom">
        <p>
          © {year} {brand.name}. {fill(footer.copyright, vars)}
        </p>
        {footer.showHandle && <p>{brand.handle}</p>}
      </div>
    </footer>
  );
}

function SocialIcon({ id }) {
  const common = {
    viewBox: "0 0 24 24",
    width: 18,
    height: 18,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  if (id === "instagram") {
    return (
      <svg {...common}>
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.5" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (id === "tiktok") {
    return (
      <svg {...common}>
        <path d="M14 6.5c.7 2.2 2.2 3.6 4.4 3.9v2.4c-1.5 0-2.9-.5-4.2-1.4v5.2a5.1 5.1 0 1 1-5.1-5.1c.3 0 .6 0 .9.1v2.5a2.6 2.6 0 1 0 1.8 2.5V6.5H14Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (id === "pinterest") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M11 17.5 12.2 13c.4.7 1.3 1.2 2.2 1.2 2 0 3.4-1.8 3.4-4.1C17.8 7.8 16 6.5 13.6 6.5c-2.8 0-4.6 2-4.6 4.6 0 1.3.5 2.4 1.5 2.8.2.1.3 0 .4-.2l.2-.7c0-.2 0-.3-.1-.4-.3-.4-.5-.9-.5-1.6 0-2 1.5-3.9 4-3.9 2.2 0 3.4 1.3 3.4 3.3 0 2.2-1 3.8-2.4 3.8-.8 0-1.4-.6-1.2-1.4l.5-1.8c.1-.5-.2-1-.8-1-.6 0-1.1.6-1.1 1.5 0 .5.2 1 .2 1" />
      </svg>
    );
  }

  if (id === "youtube") {
    return (
      <svg {...common}>
        <rect x="3.5" y="6.5" width="17" height="12" rx="3" />
        <path d="m10 10 5 2.5-5 2.5v-5Z" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2" />
    </svg>
  );
}
