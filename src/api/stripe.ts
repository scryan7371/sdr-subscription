import type { SubscriptionStatus } from "./contracts";

export const mapStripeStatus = (stripeStatus: string): SubscriptionStatus => {
  const statusMap: Record<string, SubscriptionStatus> = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    incomplete: "incomplete",
    incomplete_expired: "incomplete_expired",
    paused: "paused",
  };

  return statusMap[stripeStatus] ?? "incomplete";
};

export const hasActiveSubscription = (status: SubscriptionStatus): boolean => {
  return status === "active" || status === "trialing";
};
