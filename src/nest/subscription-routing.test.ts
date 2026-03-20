import { PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { SubscriptionController } from "./subscription.controller";

const routePath = (methodName: keyof SubscriptionController) =>
  Reflect.getMetadata(
    PATH_METADATA,
    SubscriptionController.prototype[methodName] as object,
  );

describe("SubscriptionController route metadata", () => {
  it("defines the expected controller base path", () => {
    expect(Reflect.getMetadata(PATH_METADATA, SubscriptionController)).toBe(
      "subscriptions",
    );
  });

  it("defines the expected subscription routes", () => {
    expect(routePath("getSubscriptionStatus")).toBe("status");
    expect(routePath("getSubscriptionHistory")).toBe("history");
    expect(routePath("cancelSubscription")).toBe(":id/cancel");
    expect(routePath("handleStripeWebhook")).toBe("webhook/stripe");
  });
});
