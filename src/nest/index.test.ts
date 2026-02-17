import "reflect-metadata";
import { describe, expect, it } from "vitest";
import {
  AdminSubscriptionController,
  SubscriptionController,
  SubscriptionModule,
  SubscriptionService,
} from "./index";

describe("nest exports", () => {
  it("exports subscription nest surface", () => {
    expect(SubscriptionModule).toBeDefined();
    expect(SubscriptionService).toBeDefined();
    expect(SubscriptionController).toBeDefined();
    expect(AdminSubscriptionController).toBeDefined();
  });
});
