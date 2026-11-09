// What our scanner reports for each rule that failed. Trimmed so it fits in the model's context.

import type { Validations } from "express-rate-limit";

export type Violation = {
  ruleId: string;
  impact: "critical" | "serious" | "moderate" | "minor" | null;
  description: string;
  wcagTags: string[];
  helpUrl: string;
  examples: string[];
  count: number;
};

export interface Scanner {
  scan(html: string): Promise<Violation[]>;
}
