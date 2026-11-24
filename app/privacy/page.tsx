import Link from "next/link";
export const metadata = { title: "Privacy policy" };
export default function Privacy() {
  return (
    <main className="max-w-3xl mx-auto p-6 space-y-5">
      <h1 className="text-3xl font-bold">GrantFlow privacy policy</h1>
      <p>
        NoCapsAI LLC operates GrantFlow. Contact:{" "}
        <a href="mailto:njwhitt@nocapsai.com">njwhitt@nocapsai.com</a>.
      </p>
      <p>Effective date: November 24, 2026.</p>
      <h2 className="text-xl font-bold">Information you provide</h2>
      <p>
        We process your name, email address, account identifier and password
        hash; organization profile and contact details; grant searches,
        applications, budgets, tasks and uploaded documents; records of AI
        requests and responses; and content reports you submit, including the
        saved draft and your note. Documents may contain financial information,
        photos, or other personal information you choose to upload. Do not
        upload information you do not have permission to use.
      </p>
      <h2 className="text-xl font-bold">How information is used</h2>
      <p>
        We use this information to authenticate you, provide grant search and
        drafting tools, store your work, manage access and subscriptions, send
        requested reminders and password reset messages, troubleshoot problems,
        and protect the service. Organization members with access can see the
        work shared in their organization.
      </p>
      <h2 className="text-xl font-bold">Service providers</h2>
      <p>
        GrantFlow uses Vercel for hosting and a PostgreSQL database for stored
        application data. AI drafting sends relevant profile, application, and
        prompt content to OpenAI. Resend processes email addresses and message
        content when email is configured. Stripe handles web subscriptions.
        Google Play handles Android subscription purchases; we verify purchase
        tokens and retain encrypted tokens and entitlement records. Payment
        providers process payment details under their own policies; GrantFlow
        does not store your full payment card number. Public grant searches use
        government and funding data sources.
      </p>
      <h2 className="text-xl font-bold">Security and retention</h2>
      <p>
        Connections use HTTPS. Access to account and organization data requires
        authentication and authorization. Service providers may process
        technical request data, including IP addresses and diagnostic logs. We
        retain account and workspace data while needed to provide the service
        and process deletion requests. Some records may need to be retained for
        legal, accounting, fraud prevention, or security purposes. Shared
        organization records may remain for other authorized members. Contact us
        for details of any applicable retention.
      </p>
      <h2 className="text-xl font-bold">Your choices and deletion</h2>
      <p>
        You can change reminder preferences in Settings. You can request
        deletion of your account and associated personal data from the{" "}
        <Link className="underline" href="/delete-account">
          account deletion page
        </Link>
        , including without signing in. We verify account ownership before
        deleting data. Account deletion does not automatically cancel a
        subscription; cancel through your payment provider to prevent future
        charges.
      </p>
      <h2 className="text-xl font-bold">Advertising and children</h2>
      <p>
        GrantFlow does not include advertising SDKs or sell your personal
        information. It is intended for adults managing grant applications and
        organizations, not children. Contact us if a child has provided personal
        information.
      </p>
      <p>We will update this policy when our data practices change.</p>
      <Link className="underline" href="/">
        Return to GrantFlow
      </Link>
    </main>
  );
}
