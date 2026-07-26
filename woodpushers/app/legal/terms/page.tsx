import { APP } from "@/lib/config";

export const metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10 text-sm leading-relaxed">
      <h1 className="text-2xl font-semibold">Terms of use</h1>
      <p className="mt-4 text-muted-foreground">
        {APP.name} helps people find places to play over-the-board chess and
        other players nearby. By using it you agree to the following.
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-5">
        <li>Be a decent person. No harassment, spam, or illegal activity.</li>
        <li>
          You are responsible for arranging and attending games safely. We do
          not vet other users.
        </li>
        <li>
          Place information is community and machine sourced and may be wrong.
          Check before you travel.
        </li>
        <li>
          We can suspend accounts that abuse the service or other people.
        </li>
      </ul>
      <p className="mt-6 text-muted-foreground">
        This is a plain-language summary for an early product, not a contract
        drafted by lawyers. It will grow up as the product does.
      </p>
    </main>
  );
}
