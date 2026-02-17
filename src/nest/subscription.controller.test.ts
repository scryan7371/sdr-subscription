import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";

const makeService = () => ({
  getUserActiveSubscription: vi.fn(),
  getUserSubscriptions: vi.fn(),
  cancelSubscription: vi.fn(),
  constructStripeWebhookEvent: vi.fn(),
  handleStripeWebhook: vi.fn(),
});

describe("SubscriptionController", () => {
  type StatusRequest = Parameters<
    SubscriptionController["getSubscriptionStatus"]
  >[0];
  type HistoryRequest = Parameters<
    SubscriptionController["getSubscriptionHistory"]
  >[0];
  type CancelRequest = Parameters<
    SubscriptionController["cancelSubscription"]
  >[1];
  type WebhookRequest = Parameters<
    SubscriptionController["handleStripeWebhook"]
  >[1];

  it("returns status and history for authenticated user", async () => {
    const service = makeService();
    const controller = new SubscriptionController(
      service as unknown as SubscriptionService,
    );

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
    } as unknown as StatusRequest);
    expect(status.hasActiveSubscription).toBe(true);

    const history = await controller.getSubscriptionHistory({
      user: { sub: "u1" },
    } as unknown as HistoryRequest);
    expect(history.subscriptions).toHaveLength(1);
  });

  it("returns null status when no active subscription", async () => {
    const service = makeService();
    const controller = new SubscriptionController(
      service as unknown as SubscriptionService,
    );
    service.getUserActiveSubscription.mockResolvedValue(null);

    const status = await controller.getSubscriptionStatus({
      user: { sub: "u1" },
    } as unknown as StatusRequest);
    expect(status).toEqual({
      hasActiveSubscription: false,
      subscription: null,
    });
  });

  it("cancels owned subscription", async () => {
    const service = makeService();
    const controller = new SubscriptionController(
      service as unknown as SubscriptionService,
    );

    service.getUserSubscriptions.mockResolvedValue([{ id: "sub-1" }]);
    service.cancelSubscription.mockResolvedValue({
      id: "sub-1",
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: null,
    });

    const result = await controller.cancelSubscription("sub-1", {
      user: { sub: "u1" },
    } as unknown as CancelRequest);

    expect(result.success).toBe(true);
  });

  it("rejects cancel when subscription is not owned", async () => {
    const service = makeService();
    const controller = new SubscriptionController(
      service as unknown as SubscriptionService,
    );
    service.getUserSubscriptions.mockResolvedValue([{ id: "sub-2" }]);

    await expect(
      controller.cancelSubscription("sub-1", {
        user: { sub: "u1" },
      } as unknown as CancelRequest),
    ).rejects.toThrow("Subscription not found or does not belong to user");
  });

  it("accepts valid webhook", async () => {
    const service = makeService();
    const controller = new SubscriptionController(
      service as unknown as SubscriptionService,
    );

    service.constructStripeWebhookEvent.mockReturnValue({
      id: "evt_1",
      type: "customer.subscription.updated",
      object: "event",
      data: { object: {} },
    });

    const result = await controller.handleStripeWebhook(
      { "stripe-signature": "sig" },
      { rawBody: Buffer.from("{}") } as unknown as WebhookRequest,
    );

    expect(result).toEqual({ received: true });
    expect(service.constructStripeWebhookEvent).toHaveBeenCalled();
    expect(service.handleStripeWebhook).toHaveBeenCalled();
  });

  it("rejects webhook without required fields", async () => {
    const service = makeService();
    const controller = new SubscriptionController(
      service as unknown as SubscriptionService,
    );

    await expect(
      controller.handleStripeWebhook({}, {
        rawBody: Buffer.from("a"),
      } as unknown as WebhookRequest),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.handleStripeWebhook({ "stripe-signature": "sig" }, {
        rawBody: undefined,
      } as unknown as WebhookRequest),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
