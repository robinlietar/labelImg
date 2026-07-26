import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  const profile = await getProfile();
  if (profile) redirect("/me");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 py-8">
      <h1 className="text-2xl font-semibold">Set up your profile</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Two minutes. You can change all of this later.
      </p>
      <div className="mt-6">
        <OnboardingForm />
      </div>
    </main>
  );
}
