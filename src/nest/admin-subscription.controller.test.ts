import { describe, expect, it, vi } from "vitest";
import { AdminSubscriptionController } from "./admin-subscription.controller";

const makeService = () => ({
  cancelSubscription: vi.fn(),
  reactivateSubscription: vi.fn(),
});

describe("AdminSubscriptionController", () => {
  it("cancels and reactivates subscriptions", async () => {
    const service = makeService();
    const controller = new AdminSubscriptionController(service as never);

    service.cancelSubscription.mockResolvedValue({
      id: "sub-1",
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: null,
    });
    service.reactivateSubscription.mockResolvedValue({
      id: "sub-1",
      status: "active",
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });

    const canceled = await controller.cancelSubscription("sub-1");
    expect(canceled.success).toBe(true);

    const reactivated = await controller.reactivateSubscription("sub-1");
    expect(reactivated.success).toBe(true);
  });
});
