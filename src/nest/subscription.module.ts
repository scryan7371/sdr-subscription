import { DynamicModule, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SubscriptionEntity } from "./entities/subscription.entity";
import { SubscriptionController } from "./subscription.controller";
import { SubscriptionService } from "./subscription.service";
import { SUBSCRIPTION_OPTIONS } from "./subscription.constants";
import { SubscriptionModuleOptions } from "./subscription.options";
import { AdminSubscriptionController } from "./admin-subscription.controller";

@Module({})
export class SubscriptionModule {
  static forRoot(options?: SubscriptionModuleOptions): DynamicModule {
    return {
      module: SubscriptionModule,
      imports: [TypeOrmModule.forFeature([SubscriptionEntity])],
      controllers: [SubscriptionController, AdminSubscriptionController],
      providers: [
        {
          provide: SUBSCRIPTION_OPTIONS,
          useValue: options ?? {},
        },
        SubscriptionService,
      ],
      exports: [SubscriptionService],
    };
  }
}
