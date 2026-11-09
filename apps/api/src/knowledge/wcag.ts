// A small, hand-written slice of WCAG 2.2 the agent can look things up in.
// Version 1 uses keyword search. Later this becomes real retrieval (embeddings + Postgres).
// Source: https://www.w3.org/TR/WCAG22/

export type Criterion = {
  id: string;
  title: string;
  level: "A" | "AA";
  summary: string;
  commonFixes: string;
  keywords: string[];
};

export const WCAG: Criterion[] = [
  {
    id: "1.1.1",
    title: "Non-text Content",
    level: "A",
    summary:
      "Images, icons and other non-text content need a text alternative that serves the same purpose.",
    commonFixes:
      'Add meaningful alt text; use alt="" for decorative images; give icon buttons an accessible name. In React Native, set accessibilityLabel on images and icon buttons.',
    keywords: [
      "image",
      "img",
      "alt",
      "icon",
      "svg",
      "picture",
      "logo",
      "accessibilitylabel",
    ],
  },
  {
    id: "1.3.1",
    title: "Info and Relationships",
    level: "A",
    summary:
      "Structure shown visually (headings, lists, tables, form labels) must also be in the markup.",
    commonFixes:
      "Use real <h1>-<h6>, <ul>/<li>, <table> with <th>, and <label for>. Don't fake headings with bold text.",
    keywords: [
      "heading",
      "list",
      "table",
      "structure",
      "semantic",
      "label",
      "th",
    ],
  },
  {
    id: "1.3.5",
    title: "Identify Input Purpose",
    level: "AA",
    summary:
      "Inputs that collect personal data should declare their purpose so browsers can autofill.",
    commonFixes:
      'Add autocomplete attributes such as autocomplete="email", "given-name", "postal-code". In React Native, use autoComplete and textContentType.',
    keywords: [
      "autocomplete",
      "input",
      "email",
      "name",
      "address",
      "postal",
      "form",
      "textcontenttype",
    ],
  },
  {
    id: "1.4.3",
    title: "Contrast (Minimum)",
    level: "AA",
    summary:
      "Normal text needs a contrast ratio of at least 4.5:1 against its background; large text 3:1.",
    commonFixes:
      "Darken text or lighten backgrounds. Check with a contrast checker. Placeholder text counts too.",
    keywords: [
      "contrast",
      "color",
      "colour",
      "grey",
      "gray",
      "text",
      "placeholder",
    ],
  },
  {
    id: "1.4.4",
    title: "Resize Text",
    level: "AA",
    summary: "Text can be zoomed to 200% without losing content or function.",
    commonFixes:
      "Use relative units (rem); don't disable zoom with user-scalable=no or maximum-scale=1. In React Native, don't set allowFontScaling={false}.",
    keywords: [
      "zoom",
      "resize",
      "font",
      "scale",
      "viewport",
      "maximum-scale",
      "allowfontscaling",
    ],
  },
  {
    id: "1.4.11",
    title: "Non-text Contrast",
    level: "AA",
    summary:
      "Borders of inputs, focus indicators and meaningful icons need 3:1 contrast.",
    commonFixes:
      "Give input borders and focus rings enough contrast against the background.",
    keywords: ["border", "focus", "icon", "contrast", "outline"],
  },
  {
    id: "2.1.1",
    title: "Keyboard",
    level: "A",
    summary: "Everything that works with a mouse must work with a keyboard.",
    commonFixes:
      "Use <button> and <a href> instead of clickable <div>s. If you must use a div, add role, tabIndex=0 and key handlers.",
    keywords: [
      "keyboard",
      "click",
      "onclick",
      "div",
      "tab",
      "tabindex",
      "button",
    ],
  },
  {
    id: "2.4.2",
    title: "Page Titled",
    level: "A",
    summary: "Each page has a title that describes its topic or purpose.",
    commonFixes: "Add a descriptive <title> inside <head>.",
    keywords: ["title", "page", "head"],
  },
  {
    id: "2.4.4",
    title: "Link Purpose (In Context)",
    level: "A",
    summary: "The purpose of each link is clear from its text or context.",
    commonFixes:
      "Replace 'click here' and 'read more' with descriptive text, or add an accessible name.",
    keywords: ["link", "anchor", "href", "click here", "read more"],
  },
  {
    id: "2.4.6",
    title: "Headings and Labels",
    level: "AA",
    summary: "Headings and labels describe their topic or purpose.",
    commonFixes:
      "Write labels that say what to enter, e.g. 'Monthly donation amount' rather than 'Amount'.",
    keywords: ["heading", "label", "descriptive"],
  },
  {
    id: "2.4.7",
    title: "Focus Visible",
    level: "AA",
    summary: "Keyboard users can see which element has focus.",
    commonFixes:
      "Never remove outlines without a visible replacement; use :focus-visible styles.",
    keywords: ["focus", "outline", "keyboard", "visible"],
  },
  {
    id: "2.5.8",
    title: "Target Size (Minimum)",
    level: "AA",
    summary:
      "Touch targets are at least 24 by 24 CSS pixels, or have enough spacing.",
    commonFixes:
      "Increase button padding. On mobile, aim for 44x44 points; in React Native use hitSlop for small icons.",
    keywords: ["touch", "target", "size", "tap", "button", "mobile", "hitslop"],
  },
  {
    id: "3.1.1",
    title: "Language of Page",
    level: "A",
    summary:
      "The page's default language is set in code so screen readers pronounce it correctly.",
    commonFixes: 'Add lang="en" (or the right language) on the <html> element.',
    keywords: ["lang", "language", "html", "screen reader", "pronounce"],
  },
  {
    id: "3.3.1",
    title: "Error Identification",
    level: "A",
    summary:
      "When an input error is detected, the field is identified and the error is described in text.",
    commonFixes:
      'Show a text error next to the field, link it with aria-describedby, set aria-invalid="true". Don\'t rely on red borders alone.',
    keywords: ["error", "validation", "invalid", "form", "message"],
  },
  {
    id: "3.3.2",
    title: "Labels or Instructions",
    level: "A",
    summary: "Form inputs have labels or instructions.",
    commonFixes:
      "Every input needs a visible <label>. Placeholder text is not a label. In React Native, set accessibilityLabel on TextInput.",
    keywords: ["label", "input", "form", "placeholder", "textinput", "field"],
  },
  {
    id: "4.1.2",
    title: "Name, Role, Value",
    level: "A",
    summary:
      "Custom controls expose their name, role and state to assistive technology.",
    commonFixes:
      "Prefer native elements. Otherwise add role, aria-label and aria-expanded/aria-checked. In React Native, set accessibilityRole and accessibilityState.",
    keywords: [
      "aria",
      "role",
      "name",
      "state",
      "custom",
      "toggle",
      "switch",
      "accessibilityrole",
      "accessibilitystate",
      "pressable",
      "touchableopacity",
    ],
  },
  {
    id: "4.1.3",
    title: "Status Messages",
    level: "AA",
    summary:
      "Status messages (saved, errors, loading) are announced without moving focus.",
    commonFixes:
      'Use role="status" or aria-live="polite". In React Native, use accessibilityLiveRegion or AccessibilityInfo.announceForAccessibility.',
    keywords: [
      "status",
      "live",
      "toast",
      "loading",
      "announce",
      "aria-live",
      "message",
    ],
  },
];

// Rank criteria by how many query words appear in their id, title, keywords and summary.
export function searchWcag(query: string, limit = 3): Criterion[] {
  const q = query.toLowerCase().trim();
  const exact = WCAG.find((c) => c.id === q);
  if (exact) return [exact];

  const words = q.split(/[^a-z0-9.-]+/).filter((w) => w.length > 2);
  return WCAG.map((c) => {
    const haystack =
      `${c.title} ${c.keywords.join(" ")} ${c.summary}`.toLowerCase();
    const score = words.reduce(
      (sum, w) =>
        sum + (c.keywords.includes(w) ? 3 : haystack.includes(w) ? 1 : 0),
      0,
    );
    return { c, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.c);
}
