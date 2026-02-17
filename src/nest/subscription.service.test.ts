import "reflect-metadata";
import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { Repository } from "typeorm";
import { SubscriptionEntity } from "./entities/subscription.entity";
import { SubscriptionService } from "./subscription.service";

const makeRepo = () => ({
  findOne: vi.fn(),
  create: vi.fn((value: unknown) => value),
  save: vi.fn((value: unknown) => Promise.resolve(value)),
  find: vi.fn(async () => [] as unknown[]),
});

describe("SubscriptionService", () => {
  it("ignores unsupported stripe event types", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    const event = {
      type: "invoice.created",
      data: { object: {} },
    } as unknown as Stripe.Event;

    await expect(service.handleStripeWebhook(event)).resolves.toBeNull();
  });

  it("returns null for non-subscription checkout session", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {
        stripeSecretKey: "sk_test",
      },
    );

    await expect(
      service.handleStripeWebhook({
        type: "checkout.session.completed",
        data: { object: { mode: "payment", subscription: null } },
      } as unknown as Stripe.Event),
    ).resolves.toBeNull();
  });

  it("upserts subscription from stripe webhook", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    const stripeSubscription = {
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      items: { data: [{ price: { id: "price_123" } }] },
      trial_start: null,
      trial_end: null,
      cancel_at: null,
      canceled_at: null,
      cancel_at_period_end: false,
      metadata: { userId: "user-1" },
      current_period_start: null,
      current_period_end: null,
    } as unknown as Stripe.Subscription;

    repo.findOne.mockResolvedValueOnce(null);

    const result = await service.handleStripeWebhook({
      type: "customer.subscription.created",
      data: { object: stripeSubscription },
    } as unknown as Stripe.Event);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        provider: "stripe",
        providerSubscriptionId: "sub_123",
        status: "active",
      }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect((result as { providerCustomerId: string }).providerCustomerId).toBe(
      "cus_123",
    );
  });

  it("returns null when no user can be resolved", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    repo.findOne.mockResolvedValue(null);

    const result = await service.handleStripeWebhook({
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_no_user",
          customer: "cus_no_user",
          status: "active",
          items: { data: [] },
          trial_start: null,
          trial_end: null,
          cancel_at: null,
          canceled_at: null,
          cancel_at_period_end: false,
          metadata: {},
        },
      },
    } as unknown as Stripe.Event);

    expect(result).toBeNull();
  });

  it("handles checkout session completed", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {
        stripeSecretKey: "sk_test",
      },
    );

    const retrievedSubscription = {
      id: "sub_from_checkout",
      customer: "cus_checkout",
      status: "trialing",
      items: { data: [{ price: { id: "price_checkout" } }] },
      trial_start: 1_700_000_000,
      trial_end: 1_700_100_000,
      cancel_at: null,
      canceled_at: null,
      cancel_at_period_end: false,
      metadata: { user_id: "user-2" },
      current_period_start: null,
      current_period_end: null,
    } as unknown as Stripe.Subscription;

    (
      service as unknown as {
        stripeClient: { subscriptions: { retrieve: ReturnType<typeof vi.fn> } };
      }
    ).stripeClient = {
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(retrievedSubscription),
      },
    };

    repo.findOne.mockResolvedValueOnce(null);

    const result = await service.handleStripeWebhook({
      type: "checkout.session.completed",
      data: {
        object: {
          mode: "subscription",
          subscription: "sub_from_checkout",
        },
      },
    } as unknown as Stripe.Event);

    expect((result as { status: string }).status).toBe("trialing");
  });

  it("marks expired active subscription as canceled", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    repo.findOne.mockResolvedValue({
      id: "sub_1",
      status: "active",
      hasExpired: vi.fn().mockReturnValue(true),
    });

    await expect(
      service.getUserActiveSubscription("user-1"),
    ).resolves.toBeNull();
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: "canceled" }),
    );
  });

  it("returns active subscription when not expired", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    const active = {
      id: "sub_1",
      status: "active",
      hasExpired: vi.fn().mockReturnValue(false),
    };
    repo.findOne.mockResolvedValue(active);

    await expect(service.getUserActiveSubscription("user-1")).resolves.toBe(
      active,
    );
    expect(repo.save).not.toHaveBeenCalled();
  });

  it("returns history and active boolean", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    repo.find.mockResolvedValue([{ id: "sub_1" }]);
    await expect(service.getUserSubscriptions("user-1")).resolves.toHaveLength(
      1,
    );

    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.hasActiveSubscription("user-1")).resolves.toBe(false);

    repo.findOne.mockResolvedValueOnce({
      id: "sub_2",
      hasExpired: vi.fn().mockReturnValue(false),
    });
    await expect(service.hasActiveSubscription("user-1")).resolves.toBe(true);
  });

  it("throws when canceling missing or non-stripe subscription", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {
        stripeSecretKey: "sk_test",
      },
    );

    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.cancelSubscription("missing")).rejects.toThrow(
      "Subscription not found",
    );

    repo.findOne.mockResolvedValueOnce({
      id: "sub_non_stripe",
      provider: "apple",
    });
    await expect(service.cancelSubscription("sub_non_stripe")).rejects.toThrow(
      "Only Stripe subscriptions can be cancelled",
    );
  });

  it("throws when reactivating missing or non-stripe subscription", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {
        stripeSecretKey: "sk_test",
      },
    );

    repo.findOne.mockResolvedValueOnce(null);
    await expect(service.reactivateSubscription("missing")).rejects.toThrow(
      "Subscription not found",
    );

    repo.findOne.mockResolvedValueOnce({
      id: "sub_non_stripe",
      provider: "apple",
    });
    await expect(
      service.reactivateSubscription("sub_non_stripe"),
    ).rejects.toThrow("Only Stripe subscriptions can be reactivated");
  });

  it("cancels and reactivates stripe subscription", async () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {
        stripeSecretKey: "sk_test",
      },
    );

    repo.findOne.mockResolvedValue({
      id: "sub_3",
      provider: "stripe",
      providerSubscriptionId: "sub_stripe_1",
      trialStart: null,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      status: "active",
      canceledAt: null,
    });

    (
      service as unknown as {
        stripeClient: { subscriptions: { update: ReturnType<typeof vi.fn> } };
      }
    ).stripeClient = {
      subscriptions: {
        update: vi.fn().mockResolvedValue({
          status: "canceled",
          trial_start: null,
          trial_end: null,
          cancel_at: 1_700_000_001,
          canceled_at: 1_700_000_002,
        }),
      },
    };

    const canceled = await service.cancelSubscription("sub_3");
    expect((canceled as { cancelAtPeriodEnd: boolean }).cancelAtPeriodEnd).toBe(
      true,
    );

    repo.findOne.mockResolvedValue({
      id: "sub_4",
      provider: "stripe",
      providerSubscriptionId: "sub_stripe_2",
      trialStart: null,
      trialEnd: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: true,
      status: "active",
      canceledAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    (
      service as unknown as {
        stripeClient: { subscriptions: { update: ReturnType<typeof vi.fn> } };
      }
    ).stripeClient = {
      subscriptions: {
        update: vi.fn().mockResolvedValue({
          status: "active",
          trial_start: null,
          trial_end: null,
          cancel_at: null,
        }),
      },
    };

    const reactivated = await service.reactivateSubscription("sub_4");
    expect(
      (reactivated as { cancelAtPeriodEnd: boolean }).cancelAtPeriodEnd,
    ).toBe(false);
  });

  it("constructs webhook event when configuration exists", () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {
        stripeWebhookSecret: "whsec_test",
      },
    );

    const constructEvent = vi.fn().mockReturnValue({ id: "evt_1" });
    (
      service as unknown as {
        stripeClient: {
          webhooks: { constructEvent: ReturnType<typeof vi.fn> };
        };
      }
    ).stripeClient = {
      webhooks: { constructEvent },
    };

    const result = service.constructStripeWebhookEvent(
      Buffer.from("{}"),
      "sig",
    );
    expect(result).toEqual({ id: "evt_1" });
    expect(constructEvent).toHaveBeenCalledWith(
      expect.any(Buffer),
      "sig",
      "whsec_test",
    );
  });

  it("validates missing webhook configuration", () => {
    const repo = makeRepo();
    const service = new SubscriptionService(
      repo as unknown as Repository<SubscriptionEntity>,
      {},
    );

    expect(() =>
      service.constructStripeWebhookEvent(Buffer.from("x"), "sig"),
    ).toThrow(BadRequestException);
  });
});
