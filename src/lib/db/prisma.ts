import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function prismaLogLevels(): Prisma.LogLevel[] {
  return process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];
}

function isCloudflareWorkersRuntime() {
  return globalThis.navigator?.userAgent === "Cloudflare-Workers";
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (isCloudflareWorkersRuntime()) {
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required in the Cloudflare Workers runtime.");
    }

    return new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
      log: prismaLogLevels()
    });
  }

  return new PrismaClient({
    log: prismaLogLevels()
  });
}

export const prisma = global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
