export class CreateSubscriptions1739480000000 {
  name = "CreateSubscriptions1739480000000";

  async up(queryRunner: {
    query: (sql: string) => Promise<unknown>;
  }): Promise<void> {
    const userTableRef = getUserTableReference();

    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
        CREATE TABLE "subscription"
        (
            "id"                       uuid PRIMARY KEY NOT NULL DEFAULT uuidv7(),
            "user_id"                  uuid             NOT NULL,
            "provider"                 varchar          NOT NULL,
            "provider_subscription_id" varchar          NOT NULL UNIQUE,
            "provider_customer_id"     varchar,
            "provider_price_id"        varchar,
            "status"                   varchar          NOT NULL,
            "current_period_start"     timestamp,
            "current_period_end"       timestamp,
            "cancel_at_period_end"     boolean          NOT NULL DEFAULT false,
            "canceled_at"              timestamp,
            "trial_start"              timestamp,
            "trial_end"                timestamp,
            "metadata"                 jsonb,
            "created_at"               timestamp        NOT NULL DEFAULT now(),
            "updated_at"               timestamp        NOT NULL DEFAULT now(),
            CONSTRAINT "FK_subscription_user_id" FOREIGN KEY ("user_id") REFERENCES ${userTableRef} ("id") ON DELETE CASCADE
        )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_user_id" ON "subscription" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_status" ON "subscription" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_subscription_provider" ON "subscription" ("provider")`,
    );
  }

  async down(queryRunner: {
    query: (sql: string) => Promise<unknown>;
  }): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_subscription_provider"`);
    await queryRunner.query(`DROP INDEX "IDX_subscription_status"`);
    await queryRunner.query(`DROP INDEX "IDX_subscription_user_id"`);
    await queryRunner.query(`DROP TABLE "subscription"`);
  }
}

const getUserTableReference = () => {
  const table = getSafeIdentifier(process.env.USER_TABLE, "app_user");
  const schema = process.env.USER_TABLE_SCHEMA
    ? getSafeIdentifier(process.env.USER_TABLE_SCHEMA, "")
    : "";
  return schema ? `"${schema}"."${table}"` : `"${table}"`;
};

const getSafeIdentifier = (value: string | undefined, fallback: string) => {
  const resolved = value?.trim() || fallback;
  if (!resolved || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(resolved)) {
    throw new Error(`Invalid SQL identifier: ${resolved}`);
  }
  return resolved;
};
