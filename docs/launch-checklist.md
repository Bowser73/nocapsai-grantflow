# GrantFlow launch checklist

Everything below is optional except step 1. Each feature stays switched off, and the app keeps working, until its settings are added in Vercel (Project → Settings → Environment Variables).

## 1. Database (required, do this before deploying the code)

Run both new migrations against the production database:

```
npx prisma migrate deploy
```

They only add things (new columns and two new tables), so the currently deployed version keeps working after they run. Accounts that already exist are marked `COMP` (full access, never billed).

## 2. Scheduled jobs

| Setting | Value |
|---|---|
| `CRON_SECRET` | any long random string |

`vercel.json` schedules two jobs: deadline reminders every day at 13:00 UTC, and a foundation data refresh on the 2nd of each month.

## 3. Reminder emails (Resend)

| Setting | Value |
|---|---|
| `RESEND_API_KEY` | from resend.com |
| `EMAIL_FROM` | for example `GrantFlow <reminders@nocapsai.com>`; the domain must be verified in Resend |

Without these, reminders still show up on the Notifications page; no email is sent.

## 4. Billing (Stripe)

1. In Stripe, create a product with a recurring price of $29/month. Copy its price ID.
2. Add a webhook endpoint at `https://<your-domain>/api/billing/webhook` for `checkout.session.completed`, `customer.subscription.updated` and `customer.subscription.deleted`. Copy its signing secret.

| Setting | Value |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PRICE_ID` | the $29/month price ID |
| `STRIPE_WEBHOOK_SECRET` | the webhook signing secret |

Until the first two are set, nobody is limited or charged and the landing page says "Free during early access". Once set, new accounts are on the Free plan (1 organization, 2 applications, 25 AI-written sections a month) and can upgrade from Settings.

## 5. Foundation Finder

| Setting | Value |
|---|---|
| `ADMIN_EMAILS` | your login email; lets you load foundation data from the Foundation Finder page |
| `FOUNDATION_STATES` | optional, default `IN`; comma separated, for example `IN,OH,KY` |

After deploying, open Foundation Finder and load Indiana once. The monthly job keeps it current.

## 6. Demo account

The log-in page no longer shows demo credentials. If the seeded demo account (`demo@grantflow.ai`) exists in production, delete it or change its password.
