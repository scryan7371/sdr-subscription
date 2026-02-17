import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionController } from "./subscription.controller";

const makeService = () => ({
  getUserActiveSubscription: vi.fn(),
  getUserSubscriptions: vi.fn(),
  cancelSubscription: vi.fn(),
  constructStripeWebhookEvent: vi.fn(),
  handleStripeWebhook: vi.fn(),
});

describe("SubscriptionController", () => {
  it("returns status and history for authenticated user", async () => {
    const service = makeService();
    const controller = new SubscriptionController(service as never);

    service.getUserActiveSubscription.mockResolvedValue({
      id: "sub-1",
      provider: "stripe",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      isInTrial: () => false,
    });
    service.getUserSubscriptions.mockResolvedValue([{ id: "sub-1" }]);

    const status = await controller.getSubscriptionStatus({
      user: { sub: "u1" },
    } as never);
    expect(status.hasActiveSubscription).toBe(true);

    const history = await controller.getSubscriptionHistory({
      user: { sub: "u1" },
    } as never);
    expect(history.subscriptions).toHaveLength(1);
  });

  it("returns null status when no active subscription", async () => {
    const service = makeService();
    const controller = new SubscriptionController(service as never);
    service.getUserActiveSubscription.mockResolvedValue(null);

    const status = await controller.getSubscriptionStatus({
      user: { sub: "u1" },
    } as never);
    expect(status).toEqual({
      hasActiveSubscription: false,
      subscription: null,
    });
  });

  it("cancels owned subscription", async () => {
    const service = makeService();
    const controller = new SubscriptionController(service as never);

    service.getUserSubscriptions.mockResolvedValue([{ id: "sub-1" }]);
    service.cancelSubscription.mockResolvedValue({
      id: "sub-1",
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: null,
    });

    const result = await controller.cancelSubscription("sub-1", {
      user: { sub: "u1" },
    } as never);

    expect(result.success).toBe(true);
  });

  it("rejects cancel when subscription is not owned", async () => {
    const service = makeService();
    const controller = new SubscriptionController(service as never);
    service.getUserSubscriptions.mockResolvedValue([{ id: "sub-2" }]);

    await expect(
      controller.cancelSubscription("sub-1", { user: { sub: "u1" } } as never),
    ).rejects.toThrow("Subscription not found or does not belong to user");
  });

  it("accepts valid webhook", async () => {
    const service = makeService();
    const controller = new SubscriptionController(service as never);

    service.constructStripeWebhookEvent.mockReturnValue({
      id: "evt_1",
      type: "customer.subscription.updated",
      object: "event",
      data: { object: {} },
    });

    const result = await controller.handleStripeWebhook(
      { "stripe-signature": "sig" },
      { rawBody: Buffer.from("{}") } as never,
    );

    expect(result).toEqual({ received: true });
    expect(service.constructStripeWebhookEvent).toHaveBeenCalled();
    expect(service.handleStripeWebhook).toHaveBeenCalled();
  });

  it("rejects webhook without required fields", async () => {
    const service = makeService();
    const controller = new SubscriptionController(service as never);

    await expect(
      controller.handleStripeWebhook({}, {
        rawBody: Buffer.from("a"),
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.handleStripeWebhook({ "stripe-signature": "sig" }, {
        rawBody: undefined,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
