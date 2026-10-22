import type { Page } from "@playwright/test";

export type ContrastSample = {
  selector: string;
  text: string;
  foreground: string;
  background: number[];
  ratio: number;
  required: number;
  passes: boolean;
};
export function textContrast(page: Page): Promise<{ samples: ContrastSample[]; skipped: string[] }>;
