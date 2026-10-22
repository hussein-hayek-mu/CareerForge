import { AuthForm } from "@/components/auth-form";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ confirmation?: string }> }) {
  const query = await searchParams;
  return <>{query.confirmation === "failed" && <p className="callback-message" role="alert">The confirmation link could not complete sign-in. Try signing in below, or register again if your email is not confirmed.</p>}<AuthForm mode="login" /></>;
}
