import { authHandler } from "@/lib/account/auth-handlers";
import { authProvider } from "@/lib/account/auth-provider";
export const POST = authHandler("register", authProvider);
