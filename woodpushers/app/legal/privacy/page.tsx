import { APP } from "@/lib/config";

export const metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Privacy</h1>
      <p className="mt-4 text-muted-foreground">
        The short version: we collect the minimum needed to help you find games,
        and we never show your precise location to anyone.
      </p>
      <h2 className="mt-6 font-semibold">What we store</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5">
        <li>Your handle, display name, and anything you add to your profile.</li>
        <li>
          A coarse location derived from your home city, rounded so it cannot
          point to where you live. Others only ever see a distance band like
          &quot;~2 km&quot; or &quot;same city&quot;.
        </li>
        <li>Linked chess accounts and their public ratings, if you add them.</li>
        <li>Messages you send, so we can deliver them.</li>
      </ul>
      <h2 className="mt-6 font-semibold">What we never collect</h2>
      <p className="mt-2 text-muted-foreground">
        No age, no gender, no relationship status. {APP.name} is for chess, not
        dating, and the data model reflects that on purpose.
      </p>
      <h2 className="mt-6 font-semibold">Processors</h2>
      <p className="mt-2 text-muted-foreground">
        We use Supabase (database, auth, storage) and Vercel (hosting) to run
        the service. Your data is processed on their infrastructure.
      </p>
      <h2 className="mt-6 font-semibold">Your controls</h2>
      <p className="mt-2 text-muted-foreground">
        You can hide your profile, block other users, and ask us to delete your
        account at any time.
      </p>
    </main>
  );
}
