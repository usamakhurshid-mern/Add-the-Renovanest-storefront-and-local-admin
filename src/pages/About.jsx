import { useState } from "react";
import { useCatalog } from "../catalog/context";
import PageBanner from "../components/PageBanner";
import SmartLink from "../components/SmartLink";
import { brandVars, fill } from "../data/store";
import { useSeo } from "../usePageTitle";

export default function About() {
  const { content } = useCatalog();
  const about = content.about;
  const vars = brandVars(content);
  const [sent, setSent] = useState(false);
  useSeo(content, {
    title: fill(about.pageTitle, vars),
    description: fill(about.text, vars),
    path: "/about",
  });

  function onSubmit(event) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <div className="page">
      <PageBanner
        kicker={about.kicker}
        title={fill(about.title, vars)}
        text={fill(about.text, vars)}
        crumbs={[
          { label: "Home", to: "/" },
          { label: about.kicker },
        ]}
      />

      {about.sections.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className={section.layout === "split" ? "wrap split anchor" : "wrap prose anchor"}
        >
          <div>
            {section.kicker && <p className="kicker">{section.kicker}</p>}
            {section.title && <h2>{fill(section.title, vars)}</h2>}
            {section.layout !== "split" &&
              (section.paragraphs || []).map((paragraph) => <p key={paragraph}>{fill(paragraph, vars)}</p>)}
            {section.layout !== "split" && section.linkLabel && (
              <SmartLink className="text-link" to={section.linkTo}>
                {section.linkLabel}
              </SmartLink>
            )}
          </div>
          {section.layout === "split" && (
            <div>
              {(section.paragraphs || []).map((paragraph) => (
                <p key={paragraph}>{fill(paragraph, vars)}</p>
              ))}
              {section.linkLabel && (
                <SmartLink className="text-link" to={section.linkTo}>
                  {section.linkLabel}
                </SmartLink>
              )}
            </div>
          )}
        </section>
      ))}

      <section className="wrap anchor" id="faq">
        {about.faqKicker && <p className="kicker">{about.faqKicker}</p>}
        {about.faqTitle && <h2>{about.faqTitle}</h2>}
        <div className="faq">
          {about.faqs.map((item) => (
            <details key={item.q}>
              <summary>{item.q}</summary>
              <p>{fill(item.a, vars)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="wrap contact-block anchor" id="contact">
        <div>
          {about.contact.kicker && <p className="kicker">{about.contact.kicker}</p>}
          {about.contact.title && <h2>{about.contact.title}</h2>}
          <p>{fill(about.contact.text, vars)}</p>
        </div>
        {sent ? (
          <p className="thanks">{fill(about.contact.thanks, vars)}</p>
        ) : (
          <form className="contact-form" onSubmit={onSubmit}>
            <label>
              Name
              <input name="name" type="text" required autoComplete="name" />
            </label>
            <label>
              Email
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              Message
              <textarea name="message" rows="5" required />
            </label>
            <button className="btn btn-ember" type="submit">
              {about.contact.button}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
