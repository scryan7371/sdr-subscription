export class CreateAppUser1739479000000 {
  name = "CreateAppUser1739479000000";

  async up(queryRunner: {
    query: (sql: string) => Promise<unknown>;
  }): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_user" (
        "id" uuid PRIMARY KEY NOT NULL DEFAULT uuidv7(),
        "email" varchar NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: {
    query: (sql: string) => Promise<unknown>;
  }): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "app_user"`);
  }
}
