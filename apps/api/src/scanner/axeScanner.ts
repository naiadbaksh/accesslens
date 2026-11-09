import axe from "axe-core";
import { JSDOM } from "jsdom";
import type { Scanner, Violation } from "./types.ts";

// Runs axe-core (the industry-standard accessibility engine) against HTML in a fake browser (jsdom).
// Limitation: jsdom doesn't render or lay out pages, so colour-contrast can't be checked here.
// The agent is told this, and reviews contrast by reading the CSS instead.
export class AxeScanner implements Scanner {
  async scan(html: string): Promise<Violation[]> {
    const dom = new JSDOM(html, { runScripts: "outside-only" }); // page scripts never run
    try {
      dom.window.eval(axe.source); // load axe into the fake browser
      const results = await (
        dom.window as unknown as { axe: typeof axe }
      ).axe.run(dom.window.document, {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
        rules: { "color-contrast": { enabled: false } },
      });

      return results.violations.map((v) => ({
        ruleId: v.id,
        impact: v.impact ?? null,
        description: v.help,
        wcagTags: v.tags.filter((t) => /^wcag\d{3,4}$/.test(t)), // e.g. "wcag111" = 1.1.1
        helpUrl: v.helpUrl,
        examples: v.nodes.slice(0, 3).map((n) => n.html.slice(0, 300)),
        count: v.nodes.length,
      }));
    } finally {
      dom.window.close(); // free memory
    }
  }
}
