import { useState } from "react";
import { blockTypes, emptyBlock } from "../data/pages";
import { moveItem, slugify, uid } from "../data/store";
import { Area, BlockList, Check, Choice, Lines, Text } from "./fields";
import Icon from "./icons";

export default function PagesPanel({ draft, setDraft, pageId, setPageId, onAdd }) {
  const [nextType, setNextType] = useState("text");
  const pages = draft.pages || [];
  const index = pages.findIndex((item) => item.id === pageId);
  const page = index >= 0 ? pages[index] : null;

  function replace(nextPages) {
    setDraft((current) => ({ ...current, pages: nextPages }));
  }

  function patch(partial) {
    const next = pages.slice();
    next[index] = { ...next[index], ...partial };
    replace(next);
  }

  function removePage() {
    if (!page) return;
    if (!window.confirm(`Remove ${page.title}?`)) return;
    const next = pages.filter((_, itemIndex) => itemIndex !== index);
    replace(next);
    setPageId(next[Math.min(index, next.length - 1)]?.id || "");
  }

  function updateBlock(blockIndex, next) {
    const blocks = page.blocks.slice();
    blocks[blockIndex] = next;
    patch({ blocks });
  }

  return (
    <section className="apanel">
      <div className="panel-head">
        <div>
          <h2>{page ? page.title || "Untitled" : "Pages"}</h2>
          <p>Pick a page from the menu, or add a new one. The address is /page/your-slug. Save changes when the page looks right.</p>
        </div>
        <button type="button" className="panel-add" onClick={onAdd}>
          <Icon name="plus" />
          <span>New page</span>
        </button>
      </div>
      {page ? (
          <div className="page-editor">
            <div className="ablock-bar">
              <button type="button" onClick={removePage}>
                Delete page
              </button>
              {page.slug && (
                <a className="text-link" href={`/page/${slugify(page.slug)}`} target="_blank" rel="noreferrer">
                  Open /page/{slugify(page.slug)}
                </a>
              )}
            </div>
            <div className="agrid">
              <Text label="Title" value={page.title} onChange={(title) => patch({ title, slug: page.slug || slugify(title) })} />
              <Text label="Slug" value={page.slug} onChange={(slug) => patch({ slug: slugify(slug) })} hint="Address: /page/this-slug. shop, about, and admin are reserved." />
              <Text label="Banner kicker" value={page.kicker} onChange={(kicker) => patch({ kicker })} />
              <Text label="Menu label" value={page.menuLabel} onChange={(menuLabel) => patch({ menuLabel })} hint="Used when the menu link is on. Blank uses the title." />
            </div>
            <Area label="Intro under the banner" value={page.intro} onChange={(intro) => patch({ intro })} hint="{name}, {handle}, and {email} fill in from Brand." />
            <div className="achecks">
              <Check label="Show the banner" checked={page.showBanner !== false} onChange={(showBanner) => patch({ showBanner })} />
              <Check label="Published" checked={page.published !== false} onChange={(published) => patch({ published })} />
              <Check label="Add a navigation link" checked={page.showInMenu} onChange={(showInMenu) => patch({ showInMenu })} />
            </div>
            <h3>Page layout</h3>
            <p className="fine">Site default follows Layout. A block can still set its own width and alignment.</p>
            <div className="agrid">
              <Choice label="Banner width" value={page.bannerWidth || "site"} onChange={(bannerWidth) => patch({ bannerWidth })} options={[{ value: "site", label: "Site default" }, { value: "contained", label: "In the column" }, { value: "full", label: "Edge to edge" }]} />
              <Choice label="Banner content" value={page.bannerContent || "site"} onChange={(bannerContent) => patch({ bannerContent })} options={[{ value: "site", label: "Site default" }, { value: "fill", label: "Fill the banner" }, { value: "column", label: "Keep in the column" }]} />
              <Choice label="Banner text" value={page.bannerAlign || "site"} onChange={(bannerAlign) => patch({ bannerAlign })} options={[{ value: "site", label: "Site default" }, { value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
              <Choice label="Body width" value={page.bodyWidth || "site"} onChange={(bodyWidth) => patch({ bodyWidth })} options={[{ value: "site", label: "Site default" }, { value: "narrow", label: "Narrow" }, { value: "contained", label: "Standard column" }, { value: "wide", label: "Wide" }, { value: "full", label: "Edge to edge" }]} />
              <Choice label="Body alignment" value={page.bodyAlign || "left"} onChange={(bodyAlign) => patch({ bodyAlign })} options={[{ value: "left", label: "Left" }, { value: "center", label: "Center" }, { value: "right", label: "Right" }]} />
            </div>

            <h3>Blocks</h3>
            <div className="ablock-bar">
              <Choice label="Block" value={nextType} onChange={setNextType} options={blockTypes.map(([value, label]) => ({ value, label }))} />
              <button
                type="button"
                className="btn btn-light"
                onClick={() => patch({ blocks: [...(page.blocks || []), emptyBlock(nextType)] })}
              >
                Add block
              </button>
            </div>
            {(page.blocks || []).map((block, blockIndex) => (
              <div className="ablock" key={block.id}>
                <div className="ablock-bar">
                  <strong>{blockTypes.find(([id]) => id === block.type)?.[1] || "Block"}</strong>
                  <button type="button" onClick={() => patch({ blocks: moveItem(page.blocks, blockIndex, -1) })}>
                    Up
                  </button>
                  <button type="button" onClick={() => patch({ blocks: moveItem(page.blocks, blockIndex, 1) })}>
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const copy = structuredClone(block);
                      copy.id = uid("block");
                      const blocks = page.blocks.slice();
                      blocks.splice(blockIndex + 1, 0, copy);
                      patch({ blocks });
                    }}
                  >
                    Duplicate
                  </button>
                  <button type="button" onClick={() => patch({ blocks: page.blocks.filter((_, itemIndex) => itemIndex !== blockIndex) })}>
                    Remove
                  </button>
                </div>
                <div className="agrid">
                  <Choice
                    label="Type"
                    value={block.type}
                    onChange={(type) => updateBlock(blockIndex, { ...emptyBlock(type), id: block.id })}
                    options={blockTypes.map(([value, label]) => ({ value, label }))}
                  />
                  <Check label="Visible" checked={block.show !== false} onChange={(show) => updateBlock(blockIndex, { ...block, show })} />
                </div>
                <BlockFields
                  block={block}
                  categories={draft.categories}
                  onChange={(next) => updateBlock(blockIndex, next)}
                />
                <p className="fine">Anchor: #{block.id}</p>
              </div>
            ))}
            {(page.blocks || []).length === 0 && <p>This page has no blocks yet.</p>}
          </div>
      ) : (
        <p>Choose a page from the menu, or add a new one. Its title, text, and blocks show up here.</p>
      )}
    </section>
  );
}

function BlockFields({ block, categories, onChange }) {
  function patch(partial) {
    onChange({ ...block, ...partial });
  }

  const placement = block.type === "spacer" ? null : (
    <div className="agrid">
      <Choice
        label="Width"
        value={block.width || "page"}
        onChange={(width) => patch({ width })}
        options={[
          { value: "page", label: "Page default" },
          { value: "narrow", label: "Narrow" },
          { value: "contained", label: "Standard column" },
          { value: "wide", label: "Wide" },
          { value: "full", label: "Edge to edge" },
        ]}
      />
      <Choice
        label="Align"
        value={block.align || "page"}
        onChange={(align) => patch({ align })}
        options={[
          { value: "page", label: "Page default" },
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]}
      />
      {(block.type === "image" || block.type === "split" || block.type === "gallery" || block.type === "video") && (
        <Choice
          label="Media size"
          value={block.mediaSize || "fill"}
          onChange={(mediaSize) => patch({ mediaSize })}
          options={[
            { value: "fill", label: "Fill the block" },
            { value: "medium", label: "Medium" },
            { value: "small", label: "Small" },
          ]}
        />
      )}
    </div>
  );

  function show(node) {
    return (
      <>
        {placement}
        {node}
      </>
    );
  }

  if (block.type === "spacer") {
    return show(
      <Choice
        label="Size"
        value={block.size || "md"}
        onChange={(size) => patch({ size })}
        options={[
          { value: "sm", label: "Small" },
          { value: "md", label: "Medium" },
          { value: "lg", label: "Large" },
        ]}
      />
    );
  }

  if (block.type === "image") {
    return show(
      <>
        <Text label="Image URL" value={block.image} onChange={(image) => patch({ image })} />
        <div className="agrid">
          <Text label="Alt text" value={block.alt} onChange={(alt) => patch({ alt })} />
          <Text label="Caption" value={block.caption} onChange={(caption) => patch({ caption })} />
          <Text label="Optional link" value={block.linkTo} onChange={(linkTo) => patch({ linkTo })} />
        </div>
      </>
    );
  }

  if (block.type === "gallery") {
    return show(
      <>
        <div className="agrid">
          <Text label="Kicker" value={block.kicker} onChange={(kicker) => patch({ kicker })} />
          <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
        </div>
        <Lines label="Image URLs" value={block.images} onChange={(images) => patch({ images })} hint="One photo URL per line." />
      </>
    );
  }

  if (block.type === "products") {
    return show(
      <>
        <div className="agrid">
          <Text label="Kicker" value={block.kicker} onChange={(kicker) => patch({ kicker })} />
          <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
          <Choice
            label="Which products"
            value={block.source || "featured"}
            onChange={(source) => patch({ source })}
            options={[
              { value: "featured", label: "Featured" },
              { value: "new", label: "Marked new" },
              { value: "category", label: "One category" },
              { value: "picks", label: "Chosen slugs" },
            ]}
          />
          <Text label="How many" type="number" value={block.limit} onChange={(limit) => patch({ limit })} />
          {block.source === "category" && (
            <Choice
              label="Category"
              value={block.category}
              onChange={(category) => patch({ category })}
              options={categories.map((category) => ({ value: category.id, label: category.name }))}
            />
          )}
          <Text label="Link label" value={block.linkLabel} onChange={(linkLabel) => patch({ linkLabel })} />
          <Text label="Link" value={block.linkTo} onChange={(linkTo) => patch({ linkTo })} />
        </div>
        {block.source === "picks" && (
          <Lines label="Product slugs" value={block.picks} onChange={(picks) => patch({ picks })} hint="One slug per line, in the order you want. Example: halo-buds" />
        )}
      </>
    );
  }

  if (block.type === "buttons") {
    return show(
      <BlockList
        items={block.items || []}
        onChange={(items) => patch({ items })}
        addLabel="Add button"
        blank={() => ({ id: uid("btn"), label: "Button", to: "/", style: "ember" })}
        render={(item, update) => (
          <div className="agrid">
            <Text label="Label" value={item.label} onChange={(label) => update({ label })} />
            <Text label="Goes to" value={item.to} onChange={(to) => update({ to })} />
            <Choice
              label="Style"
              value={item.style || "ember"}
              onChange={(style) => update({ style })}
              options={[
                { value: "ember", label: "Red button" },
                { value: "light", label: "Light button" },
              ]}
            />
          </div>
        )}
      />
    );
  }

  if (block.type === "faq") {
    return show(
      <>
        <div className="agrid">
          <Text label="Kicker" value={block.kicker} onChange={(kicker) => patch({ kicker })} />
          <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
        </div>
        <BlockList
          items={block.items || []}
          onChange={(items) => patch({ items })}
          addLabel="Add question"
          blank={() => ({ id: uid("q"), q: "New question", a: "" })}
          render={(item, update) => (
            <>
              <Text label="Question" value={item.q} onChange={(q) => update({ q })} />
              <Area label="Answer" value={item.a} onChange={(a) => update({ a })} />
            </>
          )}
        />
      </>
    );
  }

  if (block.type === "steps") {
    return show(
      <>
        <div className="agrid">
          <Text label="Kicker" value={block.kicker} onChange={(kicker) => patch({ kicker })} />
          <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
        </div>
        <BlockList
          items={block.items || []}
          onChange={(items) => patch({ items })}
          addLabel="Add step"
          blank={() => ({ id: uid("step"), title: "New step", text: "" })}
          render={(item, update) => (
            <>
              <Text label="Title" value={item.title} onChange={(title) => update({ title })} />
              <Area label="Text" value={item.text} onChange={(text) => update({ text })} />
            </>
          )}
        />
      </>
    );
  }

  if (block.type === "stats") {
    return show(
      <BlockList
        items={block.items || []}
        onChange={(items) => patch({ items })}
        addLabel="Add number"
        blank={() => ({ id: uid("stat"), value: "0", label: "Label" })}
        render={(item, update) => (
          <div className="agrid">
            <Text label="Value" value={item.value} onChange={(value) => update({ value })} hint="{products} counts visible products." />
            <Text label="Label" value={item.label} onChange={(label) => update({ label })} />
          </div>
        )}
      />
    );
  }

  if (block.type === "quote") {
    return show(
      <>
        <Area label="Quote" value={block.text} onChange={(text) => patch({ text })} />
        <Text label="Credit" value={block.credit} onChange={(credit) => patch({ credit })} />
      </>
    );
  }

  if (block.type === "band") {
    return show(
      <div className="agrid">
        <Text label="Eyebrow" value={block.eyebrow} onChange={(eyebrow) => patch({ eyebrow })} />
        <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
        <Text label="Button" value={block.label} onChange={(label) => patch({ label })} />
        <Text label="Button link" value={block.url} onChange={(url) => patch({ url })} />
      </div>
    );
  }

  if (block.type === "video") {
    return show(
      <>
        <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
        <Text label="YouTube or Vimeo URL" value={block.url} onChange={(url) => patch({ url })} hint="Other links become a text link instead of an embed." />
        <Text label="Caption" value={block.caption} onChange={(caption) => patch({ caption })} />
      </>
    );
  }

  return show(
    <>
      <div className="agrid">
        <Text label="Kicker" value={block.kicker} onChange={(kicker) => patch({ kicker })} />
        <Text label="Title" value={block.title} onChange={(title) => patch({ title })} />
        <Text label="Link label" value={block.linkLabel} onChange={(linkLabel) => patch({ linkLabel })} />
        <Text label="Link" value={block.linkTo} onChange={(linkTo) => patch({ linkTo })} />
      </div>
      <Area label="Text" value={block.body} onChange={(body) => patch({ body })} hint="Separate paragraphs with a blank line." />
      {block.type === "split" && (
        <div className="agrid">
          <Text label="Image URL" value={block.image} onChange={(image) => patch({ image })} />
          <Text label="Alt text" value={block.alt} onChange={(alt) => patch({ alt })} />
          <Check label="Image on the left" checked={block.imageLeft} onChange={(imageLeft) => patch({ imageLeft })} />
        </div>
      )}
    </>
  );
}
