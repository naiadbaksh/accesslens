import type { AuditRequest } from "@accesslens/shared";

// Pages and components with problems we planted on purpose, and the answer key.
// A finding counts as a match if it cites any of the listed WCAG criteria and,
// when `element` is given, quotes code containing that text.
// One page has no problems at all: it catches an agent that invents issues.

export type Expected = {
  label: string; // what the planted problem is, for the results table
  wcag: string[]; // any of these criteria is an acceptable answer
  element?: string; // the quoted code must contain this
};

export type Fixture = {
  name: string;
  request: AuditRequest;
  expected: Expected[];
};

const page = (body: string, head = "") => `<!doctype html>
<html lang="en">
  <head><title>Fixture</title>${head}</head>
  <body>
    <main>
${body}
    </main>
  </body>
</html>`;

export const FIXTURES: Fixture[] = [
  {
    name: "donation-form",
    request: {
      kind: "html",
      html: `<!doctype html>
<html>
  <body>
    <img src="logo.png">
    <h3>Become a monthly donor</h3>
    <input type="email" placeholder="Email">
    <div class="btn" onclick="submit()">Give now</div>
    <a href="/more">Click here</a>
  </body>
</html>`,
    },
    expected: [
      { label: "Logo has no alt text", wcag: ["1.1.1"], element: "logo.png" },
      {
        label: "Email field has only a placeholder",
        wcag: ["1.3.1", "3.3.2", "4.1.2", "2.4.6"],
        element: "email",
      },
      {
        label: "Clickable div isn't a button",
        wcag: ["2.1.1", "4.1.2"],
        element: "onclick",
      },
      { label: "Vague link text", wcag: ["2.4.4"], element: "click here" },
      { label: "Page language missing", wcag: ["3.1.1"] },
      { label: "Page title missing", wcag: ["2.4.2"] },
    ],
  },
  {
    name: "accessible-signup",
    request: {
      kind: "html",
      html: page(`      <h1>Join the newsletter</h1>
      <img src="team.jpg" alt="Our team at the 2025 summit">
      <form>
        <label for="email">Email address</label>
        <input id="email" type="email" autocomplete="email" required>
        <button type="submit">Subscribe</button>
      </form>`),
    },
    expected: [], // nothing planted: every finding here is a false positive
  },
  {
    name: "low-contrast",
    request: {
      kind: "html",
      html: page(
        `      <h1>Pricing</h1>
      <p class="fine-print">Prices exclude tax and are billed yearly.</p>`,
        `<style>body { background: #ffffff; } .fine-print { color: #b0b0b0; font-size: 14px; }</style>`,
      ),
    },
    expected: [{ label: "Light grey text on white", wcag: ["1.4.3"] }],
  },
  {
    name: "silent-error",
    request: {
      kind: "html",
      html: page(`      <h1>Sign in</h1>
      <form>
        <label for="pw">Password</label>
        <input id="pw" type="password">
        <span class="error" style="color: red">Too short</span>
        <button type="submit">Sign in</button>
      </form>`),
    },
    expected: [
      {
        label: "Error message isn't tied to the field or announced",
        wcag: ["3.3.1", "4.1.3", "1.3.1"],
      },
    ],
  },
  {
    name: "rn-icon-button",
    request: {
      kind: "react-native",
      code: `export function ShareButton({ onShare }) {
  return (
    <TouchableOpacity onPress={onShare} style={{ width: 24, height: 24 }}>
      <Image source={require("./share.png")} />
    </TouchableOpacity>
  );
}`,
    },
    expected: [
      { label: "Icon button has no accessible name", wcag: ["1.1.1", "4.1.2"] },
      { label: "Touch target is 24 by 24", wcag: ["2.5.8"] },
    ],
  },
];
