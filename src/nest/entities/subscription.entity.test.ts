import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { SubscriptionEntity } from "./subscription.entity";

describe("SubscriptionEntity", () => {
  it("evaluates trial status correctly", () => {
    const sub = new SubscriptionEntity();
    sub.status = "trialing";
    sub.trialEnd = new Date(Date.now() + 60_000);
    expect(sub.isInTrial()).toBe(true);

    sub.trialEnd = new Date(Date.now() - 60_000);
    expect(sub.isInTrial()).toBe(false);

    sub.trialEnd = null;
    expect(sub.isInTrial()).toBe(false);
  });

  it("evaluates expiration correctly", () => {
    const sub = new SubscriptionEntity();

    sub.currentPeriodEnd = null;
    expect(sub.hasExpired()).toBe(false);

    sub.currentPeriodEnd = new Date(Date.now() + 60_000);
    expect(sub.hasExpired()).toBe(false);

    sub.currentPeriodEnd = new Date(Date.now() - 60_000);
    expect(sub.hasExpired()).toBe(true);
  });
});
