// Shared catalogue: planning and contract validation use the same choices.
export const LISTS = {
  nav: {
    software: "nav-mega|nav-cards|nav-centre",
    gaming: "nav-mega|nav-centre|nav-cards",
    tech: "nav-cards|nav-split|nav-mega",
    product: "nav-cards|nav-split|nav-mega",
    service: "nav-mega|nav-split|nav-centre",
    place: "nav-split|nav-cards|nav-centre",
  },
  footer: {
    software: "footer-dark|footer-statement|footer-columns",
    gaming: "footer-dark|footer-statement",
    tech: "footer-columns|footer-dark",
    product: "footer-columns|footer-dark",
    service: "footer-visit|footer-dark|footer-columns",
    place: "footer-visit|footer-columns",
  },
  close: {
    software: "close-type|close-word|close-split",
    gaming: "close-word|close-type|close-split",
    tech: "close-photo|close-type|close-word|close-split",
    product: "close-photo|close-type|close-word|close-split",
    service: "close-type|close-photo|close-split|close-word",
    place: "close-photo|close-split|close-word|close-type",
  },
  buttons: {
    software: "solid|pill|tonal|arrow",
    gaming: "solid|pill|block",
    tech: "arrow|solid|block|pill",
    product: "arrow|solid|block|pill",
    service: "solid|tonal|block|arrow",
    place: "block|solid|arrow",
  },
  mark: { place: "dots|arc|ring|petal|leaf|stack", "*": "wordmark|initial|arc|ring|stack|dots" },
  // grounds: one or two bands from the palette on every page (tint: .ground-surface; dark: .ground-inverse; brand: .ground-brand)
  bands: {
    software: "dark|tint|dark+tint",
    gaming: "dark|dark+brand",
    tech: "dark|brand|tint+dark",
    product: "brand|dark|tint+brand|tint+dark",
    service: "tint|dark|tint+dark|brand",
    place: "tint|brand|tint+brand|tint+dark",
  },
};
// section compositions (system.css, compositions; sections-library.md, Compositions), a pool per section type
export const COMPS = {
  offer: "list-tall|split-6-6|strip|offset-pair", // a menu, prices, services, repairs
  showcase: "bleed-panel|offset-pair|three-up|mirrored|wall|story", // the place, the work, the house, the product in use
  rooms: "row|side|list-tall", // rooms, goods, bouquets, models
  feature: "split-6-6|mirrored|bleed-panel|offset-pair|three-up", // a product's or a service's point (splits on the page's one split line)
  visit: "split-6-6|mirrored|street-large|bleed-panel",
  form: "form-photo|form-band|close-form",
  statement: "statement-type|statement-short",
};
export const KIND_COMPS = {
  software: ["feature", "statement", "form"],
  gaming: ["showcase", "statement", "form"],
  tech: ["feature", "showcase", "statement"],
  product: ["feature", "showcase", "rooms", "statement"],
  service: ["offer", "showcase", "feature", "visit", "form"],
  place: ["visit", "offer", "showcase", "rooms", "form"],
};
