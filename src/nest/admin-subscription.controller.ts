import { Controller, Param, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { SubscriptionService } from "./subscription.service";

@Controller("admin/subscriptions")
@ApiTags("admin-subscriptions")
export class AdminSubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Patch(":id/cancel")
  @ApiOperation({ summary: "Cancel subscription as admin" })
  async cancelSubscription(@Param("id") subscriptionId: string) {
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

  @Patch(":id/reactivate")
  @ApiOperation({ summary: "Reactivate subscription as admin" })
  async reactivateSubscription(@Param("id") subscriptionId: string) {
    const updated =
      await this.subscriptionService.reactivateSubscription(subscriptionId);
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
}
