import "dotenv/config";
import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts"
  },
  datasource: {
    // Prisma client generation during CI does not need a live database connection,
    // only a syntactically valid datasource URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? fallbackDatabaseUrl
  }
});
