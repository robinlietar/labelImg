import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { SubmitForm } from "@/components/submit/SubmitForm";

export const metadata = { title: "Add a place" };

export default async function SubmitPage() {
  const user = await getUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto w-full max-w-md px-5 pb-28 pt-8">
      <Link href="/" className="text-sm text-muted-foreground">
        ← Back to map
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Add a place to play</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A club, a chess cafe, a park with tables, anywhere people play over the
        board. We check submissions before they go live.
      </p>
      <div className="mt-6">
        <SubmitForm />
      </div>
    </main>
  );
}
