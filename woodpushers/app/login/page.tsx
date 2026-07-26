import { LoginForm } from "@/components/auth/LoginForm";
import { APP } from "@/lib/config";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span
          aria-hidden
          className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-2xl text-primary-foreground"
        >
          ♞
        </span>
        <h1 className="text-2xl font-semibold">{APP.name}</h1>
        <p className="text-sm text-muted-foreground">{APP.tagline}.</p>
      </div>
      <LoginForm />
      <p className="max-w-xs text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <a href="/legal/terms" className="underline">
          terms
        </a>{" "}
        and{" "}
        <a href="/legal/privacy" className="underline">
          privacy policy
        </a>
        .
      </p>
    </main>
  );
}
