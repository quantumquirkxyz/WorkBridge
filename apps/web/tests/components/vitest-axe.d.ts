import type { AxeMatchers } from "vitest-axe/matchers";

declare module "vitest" {
  // These empty interface extensions are required for Vitest module augmentation.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T = unknown> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
