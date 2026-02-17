import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { SUBSCRIPTION_OPTIONS } from "./subscription.constants";
import { SubscriptionModule } from "./subscription.module";

describe("SubscriptionModule", () => {
  it("builds module with explicit options", () => {
    const module = SubscriptionModule.forRoot({
      stripeSecretKey: "sk",
      stripeWebhookSecret: "whsec",
    });

    expect(module.module).toBe(SubscriptionModule);
    expect(module.providers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provide: SUBSCRIPTION_OPTIONS }),
      ]),
    );
  });

  it("builds module with defaults", () => {
    const module = SubscriptionModule.forRoot();
    expect(module.module).toBe(SubscriptionModule);
  });
});
