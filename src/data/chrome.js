export const headerDesigns = [
  {
    id: "balanced",
    label: "Balanced",
    note: "Logo left, menu center, search right",
    logo: "left",
    menu: "center",
    search: "right",
    order: ["logo", "menu", "search"],
  },
  {
    id: "classic",
    label: "Classic",
    note: "Logo and menu on the left, search on the right",
    logo: "left",
    menu: "left",
    search: "right",
    order: ["logo", "menu", "search"],
  },
  {
    id: "logo-center",
    label: "Centered logo",
    note: "Menu left, logo in the middle, search right",
    logo: "center",
    menu: "left",
    search: "right",
    order: ["menu", "logo", "search"],
  },
  {
    id: "menu-right",
    label: "Menu right",
    note: "Logo left, menu and search grouped on the right",
    logo: "left",
    menu: "right",
    search: "right",
    order: ["logo", "menu", "search"],
  },
  {
    id: "mirror",
    label: "Mirrored",
    note: "Menu and search on the left, logo on the right",
    logo: "right",
    menu: "left",
    search: "left",
    order: ["menu", "search", "logo"],
  },
  {
    id: "stacked",
    label: "Stacked",
    note: "Logo centered, menu centered on the line below",
    logo: "center",
    menu: "center",
    search: "right",
    order: ["logo", "menu", "search"],
  },
];

export const headerDesignMap = Object.fromEntries(headerDesigns.map((item) => [item.id, item]));

export const footerDesigns = [
  { id: "columns", label: "Columns", note: "Logo, link columns, and the newsletter side by side" },
  { id: "centered", label: "Centered", note: "Every column centered" },
  { id: "split", label: "Split", note: "Brand on the left, links on the right" },
  { id: "compact", label: "Compact", note: "One quieter row of logo, links, and icons" },
];
