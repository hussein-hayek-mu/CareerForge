import { recoveryHandler } from "@/lib/account/recovery-handlers";
import { recoveryProvider } from "@/lib/account/recovery-provider";
export const POST = recoveryHandler("password", recoveryProvider);
