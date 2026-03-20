import { PATH_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AdminSubscriptionController } from "./admin-subscription.controller";

const routePath = (methodName: keyof AdminSubscriptionController) =>
  Reflect.getMetadata(
    PATH_METADATA,
    AdminSubscriptionController.prototype[methodName] as object,
  );

describe("AdminSubscriptionController route metadata", () => {
  it("defines the expected controller base path", () => {
    expect(
      Reflect.getMetadata(PATH_METADATA, AdminSubscriptionController),
    ).toBe("admin/subscriptions");
  });

  it("defines the expected admin subscription routes", () => {
    expect(routePath("cancelSubscription")).toBe(":id/cancel");
    expect(routePath("reactivateSubscription")).toBe(":id/reactivate");
  });
});
