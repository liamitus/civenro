import { execSync } from "node:child_process";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

let container: StartedPostgreSqlContainer | undefined;

export async function setup() {
  if (process.env.TEST_DATABASE_URL) {
    console.log("[integration] Reusing TEST_DATABASE_URL from environment");
  } else {
    console.log("[integration] Starting Postgres 16 testcontainer...");
    container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("govroll_test")
      .withUsername("govroll")
      .withPassword("govroll")
      .start();
    process.env.TEST_DATABASE_URL = container.getConnectionUri();
    console.log(
      `[integration] Postgres ready on ${container.getHost()}:${container.getMappedPort(5432)}`,
    );
  }

  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
    stdio: "inherit",
  });
  console.log("[integration] Migrations applied");
}

export async function teardown() {
  if (container) {
    await container.stop();
    console.log("[integration] Postgres container stopped");
  }
}
