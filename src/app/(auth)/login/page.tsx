import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Sign in | CareerForge" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ confirmation?: string; reason?: string }> }) {
  const query = await searchParams;
  const message = query.confirmation !== "failed" ? undefined : query.reason === "expired"
    ? "This email link expired or was already used. Try signing in, reset your password, or request a new confirmation below."
    : query.reason === "browser"
      ? "Open the newest email link in the browser where you requested it. Your email may already be confirmed; try signing in or reset your password."
      : "The email link could not finish sign-in. Your email may already be confirmed. Try signing in or use the recovery links below.";
  return <AuthForm key="login" mode="login" callbackMessage={message} />;
}
