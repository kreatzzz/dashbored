import { describe, expect, it } from "vitest";
import { backoffDelayMs, mapWithConcurrency } from "./polling";

describe("low-resource polling helpers", () => {
  it("uses capped exponential backoff with bounded jitter", () => {
    expect(backoffDelayMs(0, 1_000, 60_000, () => 0)).toBe(900);
    expect(backoffDelayMs(3, 1_000, 60_000, () => 0.5)).toBe(8_000);
    expect(backoffDelayMs(20, 1_000, 60_000, () => 1)).toBe(66_000);
  });

  it("does not run more work than the configured concurrency", async () => {
    let active = 0;
    let peak = 0;
    const values = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active -= 1;
      return value * 2;
    });
    expect(values).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});
