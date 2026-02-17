import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { Request } from "express";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SubscriptionService } from "./subscription.service";

type AuthenticatedRequest = Request & {
  user: {
    sub: string;
  };
};

@Controller("subscriptions")
@ApiTags("subscriptions")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get("status")
  @ApiOperation({ summary: "Get current user's subscription status" })
  async getSubscriptionStatus(@Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    const subscription =
      await this.subscriptionService.getUserActiveSubscription(userId);

    return {
      hasActiveSubscription: !!subscription,
      subscription: subscription
        ? {
            id: subscription.id,
            provider: subscription.provider,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            isInTrial: subscription.isInTrial(),
          }
        : null,
    };
  }

  @Get("history")
  @ApiOperation({ summary: "Get subscription history for current user" })
  async getSubscriptionHistory(@Req() req: AuthenticatedRequest) {
    const subscriptions = await this.subscriptionService.getUserSubscriptions(
      req.user.sub,
    );
    return { subscriptions };
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "Cancel current user's subscription" })
  async cancelSubscription(
    @Param("id") subscriptionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const subscriptions = await this.subscriptionService.getUserSubscriptions(
      req.user.sub,
    );
    const subscription = subscriptions.find(
      (item) => item.id === subscriptionId,
    );

    if (!subscription) {
      throw new Error("Subscription not found or does not belong to user");
    }

    const updated =
      await this.subscriptionService.cancelSubscription(subscriptionId);
    return {
      success: true,
      subscription: {
        id: updated.id,
        status: updated.status,
        cancelAtPeriodEnd: updated.cancelAtPeriodEnd,
        canceledAt: updated.canceledAt,
      },
    };
  }

  @Post("webhook/stripe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Handle Stripe webhook" })
  async handleStripeWebhook(
    @Headers() headers: Record<string, string>,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const signature = headers["stripe-signature"];
    if (!signature) {
      throw new BadRequestException("Missing Stripe signature");
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException("Invalid webhook payload");
    }

    const event = this.subscriptionService.constructStripeWebhookEvent(
      rawBody,
      signature,
    );
    await this.subscriptionService.handleStripeWebhook(event);

    return { received: true };
  }
}
