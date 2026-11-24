import Link from "next/link";
export const metadata = { title: "Delete your account" };
export default function DeleteAccount() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-5">
      <h1 className="text-3xl font-bold">Delete your GrantFlow account</h1>
      <p>You can request deletion from NoCapsAI LLC without signing in.</p>
      <ol className="list-decimal pl-6 space-y-2">
        <li>
          Send an email to njwhitt@nocapsai.com from the email address on your
          GrantFlow account.
        </li>
        <li>
          Use the subject “GrantFlow account deletion” and state that you want
          your account and associated personal data deleted. Do not include your
          password or payment details.
        </li>
        <li>
          We will verify ownership and clarify any organization records that are
          shared with other members before processing the request.
        </li>
      </ol>
      <a
        className="inline-block underline font-semibold"
        href="mailto:njwhitt@nocapsai.com?subject=GrantFlow%20account%20deletion"
      >
        Request account and data deletion by email
      </a>
      <p>
        The request covers your account profile, authentication records,
        personal notifications and associated personal data. Shared organization
        work may remain for other authorized members. Records required for
        legal, accounting, security or fraud prevention purposes may be
        retained; we will explain applicable exceptions when processing your
        request.
      </p>
      <p>
        Cancel any paid subscription separately with Google Play or Stripe to
        prevent future charges. Deleting your account alone does not cancel
        payments.
      </p>
      <Link className="underline" href="/privacy">
        Privacy policy
      </Link>
    </main>
  );
}
