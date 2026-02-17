export type SubscriptionProvider = "stripe";

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

export type SubscriptionSummary = {
  id: string;
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  currentPeriodEnd?: string | Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string | Date | null;
  isInTrial?: boolean;
};

export type SubscriptionStatusResponse = {
  hasActiveSubscription: boolean;
  subscription: SubscriptionSummary | null;
};

export type SubscriptionHistoryResponse = {
  subscriptions: SubscriptionSummary[];
};

export type AdminUpdateSubscriptionResponse = {
  success: true;
  subscription: Pick<
    SubscriptionSummary,
    "id" | "status" | "cancelAtPeriodEnd" | "canceledAt"
  >;
};

export type StripeWebhookConfig = {
  stripeSecretKey: string;
  stripeWebhookSecret: string;
};
