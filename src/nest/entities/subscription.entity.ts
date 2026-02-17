import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("subscription")
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "user_id", type: "varchar" })
  userId!: string;

  @Column({ type: "varchar" })
  provider!: string;

  @Column({ name: "provider_subscription_id", unique: true, type: "varchar" })
  providerSubscriptionId!: string;

  @Column({ name: "provider_customer_id", nullable: true, type: "varchar" })
  providerCustomerId!: string | null;

  @Column({ name: "provider_price_id", nullable: true, type: "varchar" })
  providerPriceId!: string | null;

  @Column({ type: "varchar" })
  status!: string;

  @Column({ name: "current_period_start", type: "timestamp", nullable: true })
  currentPeriodStart!: Date | null;

  @Column({ name: "current_period_end", type: "timestamp", nullable: true })
  currentPeriodEnd!: Date | null;

  @Column({ name: "cancel_at_period_end", type: "boolean", default: false })
  cancelAtPeriodEnd!: boolean;

  @Column({ name: "canceled_at", type: "timestamp", nullable: true })
  canceledAt!: Date | null;

  @Column({ name: "trial_start", type: "timestamp", nullable: true })
  trialStart!: Date | null;

  @Column({ name: "trial_end", type: "timestamp", nullable: true })
  trialEnd!: Date | null;

  @Column({ type: "jsonb", nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;

  isInTrial(): boolean {
    if (!this.trialEnd) {
      return false;
    }
    return this.status === "trialing" && new Date() < this.trialEnd;
  }

  hasExpired(): boolean {
    if (!this.currentPeriodEnd) {
      return false;
    }
    return new Date() > this.currentPeriodEnd;
  }
}
