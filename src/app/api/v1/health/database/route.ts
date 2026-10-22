import { getPrismaClient } from "@/lib/prisma";
import { databaseHealthHandler } from "@/lib/database-health";

export const runtime = "nodejs";

export const GET = databaseHealthHandler(() => getPrismaClient().$queryRaw`SELECT 1`);
