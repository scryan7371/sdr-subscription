import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import { mapStripeStatus } from "../api/stripe";
import { SubscriptionEntity } from "./entities/subscription.entity";
import { SUBSCRIPTION_OPTIONS } from "./subscription.constants";
import { SubscriptionModuleOptions } from "./subscription.options";

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private stripeClient: Stripe | null = null;

  constructor(
    @InjectRepository(SubscriptionEntity)
    private readonly subscriptionRepository: Repository<SubscriptionEntity>,
    @Inject(SUBSCRIPTION_OPTIONS)
    private readonly options: SubscriptionModuleOptions,
  ) {}

  async handleStripeWebhook(
    event: Stripe.Event,
  ): Promise<SubscriptionEntity | null> {
    this.logger.log(`Handling Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return this.upsertFromStripeSubscription(
          event.data.object as Stripe.Subscription,
        );
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (
          session.mode !== "subscription" ||
          typeof session.subscription !== "string"
        ) {
          return null;
        }
        const stripeSubscription =
          await this.getStripeClient().subscriptions.retrieve(
            session.subscription,
          );
        return this.upsertFromStripeSubscription(stripeSubscription);
      }
      default:
        this.logger.debug(`Ignoring Stripe event type: ${event.type}`);
        return null;
    }
  }

  constructStripeWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Stripe.Event {
    const secret = this.getStripeWebhookSecret();
    return this.getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      secret,
    );
  }

  async getUserActiveSubscription(
    userId: string,
  ): Promise<SubscriptionEntity | null> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId,
        status: "active",
      },
      order: {
        createdAt: "DESC",
      },
    });

    if (subscription && subscription.hasExpired()) {
      subscription.status = "canceled";
      await this.subscriptionRepository.save(subscription);
      return null;
    }

    return subscription;
  }

  async getUserSubscriptions(userId: string): Promise<SubscriptionEntity[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
    });
  }

  async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await this.getUserActiveSubscription(userId);
    return !!subscription;
  }

  async cancelSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.provider !== "stripe") {
      throw new Error("Only Stripe subscriptions can be cancelled");
    }

    const updatedStripeSubscription =
      await this.getStripeClient().subscriptions.update(
        subscription.providerSubscriptionId,
        { cancel_at_period_end: true },
      );

    subscription.cancelAtPeriodEnd = true;
    subscription.status = mapStripeStatus(updatedStripeSubscription.status);
    subscription.trialStart = updatedStripeSubscription.trial_start
      ? new Date(updatedStripeSubscription.trial_start * 1000)
      : subscription.trialStart;
    subscription.trialEnd = updatedStripeSubscription.trial_end
      ? new Date(updatedStripeSubscription.trial_end * 1000)
      : subscription.trialEnd;
    subscription.currentPeriodEnd = updatedStripeSubscription.cancel_at
      ? new Date(updatedStripeSubscription.cancel_at * 1000)
      : subscription.currentPeriodEnd;

    if (updatedStripeSubscription.canceled_at) {
      subscription.canceledAt = new Date(
        updatedStripeSubscription.canceled_at * 1000,
      );
    }

    return this.subscriptionRepository.save(subscription);
  }

  async reactivateSubscription(
    subscriptionId: string,
  ): Promise<SubscriptionEntity> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    if (subscription.provider !== "stripe") {
      throw new Error("Only Stripe subscriptions can be reactivated");
    }

    const updatedStripeSubscription =
      await this.getStripeClient().subscriptions.update(
        subscription.providerSubscriptionId,
        { cancel_at_period_end: false },
      );

    subscription.cancelAtPeriodEnd = false;
    subscription.status = mapStripeStatus(updatedStripeSubscription.status);
    subscription.trialStart = updatedStripeSubscription.trial_start
      ? new Date(updatedStripeSubscription.trial_start * 1000)
      : subscription.trialStart;
    subscription.trialEnd = updatedStripeSubscription.trial_end
      ? new Date(updatedStripeSubscription.trial_end * 1000)
      : subscription.trialEnd;
    subscription.currentPeriodEnd = updatedStripeSubscription.cancel_at
      ? new Date(updatedStripeSubscription.cancel_at * 1000)
      : subscription.currentPeriodEnd;

    if (subscription.status !== "canceled" && subscription.canceledAt) {
      subscription.canceledAt = null;
    }

    return this.subscriptionRepository.save(subscription);
  }

  private getStripeClient(): Stripe {
    if (this.stripeClient) {
      return this.stripeClient;
    }

    const stripeSecretKey =
      this.options.stripeSecretKey ?? process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY must be configured");
    }

    this.stripeClient = new Stripe(stripeSecretKey);
    return this.stripeClient;
  }

  private getStripeWebhookSecret(): string {
    const webhookSecret =
      this.options.stripeWebhookSecret ?? process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new BadRequestException("Webhook is not configured");
    }
    return webhookSecret;
  }

  private async upsertFromStripeSubscription(
    stripeSubscription: Stripe.Subscription,
  ): Promise<SubscriptionEntity | null> {
    const subscriptionId = stripeSubscription.id;
    const customerId =
      typeof stripeSubscription.customer === "string"
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id;
    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const metadata = stripeSubscription.metadata ?? {};
    const metadataUserId = metadata.userId ?? metadata.user_id;

    let subscription = await this.subscriptionRepository.findOne({
      where: {
        providerSubscriptionId: subscriptionId,
        provider: "stripe",
      },
    });

    let userId: string | undefined = metadataUserId ?? subscription?.userId;

    if (!userId && customerId) {
      const existingForCustomer = await this.subscriptionRepository.findOne({
        where: {
          providerCustomerId: customerId,
          provider: "stripe",
        },
        order: { createdAt: "DESC" },
      });
      userId = existingForCustomer?.userId;
    }

    if (!subscription && !userId) {
      this.logger.warn(
        `Skipping Stripe subscription ${subscriptionId}: unable to resolve userId`,
      );
      return null;
    }

    if (!subscription) {
      subscription = this.subscriptionRepository.create({
        userId,
        provider: "stripe",
        providerSubscriptionId: subscriptionId,
        status: mapStripeStatus(stripeSubscription.status),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
        metadata,
      });
    }

    subscription.userId = userId ?? subscription.userId;
    subscription.provider = "stripe";
    subscription.providerCustomerId = customerId ?? null;
    subscription.providerPriceId = priceId ?? null;
    subscription.status = mapStripeStatus(stripeSubscription.status);
    const stripePeriod = stripeSubscription as Stripe.Subscription & {
      current_period_start?: number | null;
      current_period_end?: number | null;
    };
    subscription.currentPeriodStart = stripePeriod.current_period_start
      ? new Date(stripePeriod.current_period_start * 1000)
      : null;
    subscription.currentPeriodEnd = stripePeriod.current_period_end
      ? new Date(stripePeriod.current_period_end * 1000)
      : null;
    subscription.cancelAtPeriodEnd =
      stripeSubscription.cancel_at_period_end ?? false;
    subscription.canceledAt = stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000)
      : null;
    subscription.trialStart = stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000)
      : null;
    subscription.trialEnd = stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null;
    subscription.metadata = metadata;

    return this.subscriptionRepository.save(subscription);
  }
}
