import { CreateAppUser1739479000000 } from "./1739479000000-create-app-user";
import { CreateSubscriptions1739480000000 } from "./1739480000000-create-subscriptions";

export const allMigrations = [
  CreateAppUser1739479000000,
  CreateSubscriptions1739480000000,
];

export const subscriptionMigrations = allMigrations.filter(
  (migration) => migration !== CreateAppUser1739479000000,
);

export { CreateAppUser1739479000000, CreateSubscriptions1739480000000 };
