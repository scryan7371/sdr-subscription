import { describe, expect, it } from "vitest";
import { hasActiveSubscription, mapStripeStatus } from "./stripe";

describe("mapStripeStatus", () => {
  it("maps known stripe statuses", () => {
    expect(mapStripeStatus("active")).toBe("active");
    expect(mapStripeStatus("trialing")).toBe("trialing");
    expect(mapStripeStatus("past_due")).toBe("past_due");
    expect(mapStripeStatus("canceled")).toBe("canceled");
    expect(mapStripeStatus("incomplete")).toBe("incomplete");
    expect(mapStripeStatus("incomplete_expired")).toBe("incomplete_expired");
    expect(mapStripeStatus("paused")).toBe("paused");
  });

  it("falls back to incomplete for unknown statuses", () => {
    expect(mapStripeStatus("weird_status")).toBe("incomplete");
  });
});

describe("hasActiveSubscription", () => {
  it("returns true for active/trialing", () => {
    expect(hasActiveSubscription("active")).toBe(true);
    expect(hasActiveSubscription("trialing")).toBe(true);
  });

  it("returns false for non-active statuses", () => {
    expect(hasActiveSubscription("past_due")).toBe(false);
    expect(hasActiveSubscription("canceled")).toBe(false);
    expect(hasActiveSubscription("incomplete")).toBe(false);
    expect(hasActiveSubscription("incomplete_expired")).toBe(false);
    expect(hasActiveSubscription("paused")).toBe(false);
  });
});
