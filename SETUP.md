# GrantFlow AI — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Fill in your .env:
#    DATABASE_URL — your PostgreSQL connection string
#    AUTH_SECRET  — run: openssl rand -base64 32
#    OPENAI_API_KEY — from platform.openai.com

# 4. Generate Prisma client
npm run db:generate

# 5. Run migrations
npm run db:migrate

# 6. Seed the database (creates demo user + sample grants)
npm run db:seed

# 7. Start development server
npm run dev
```

Open http://localhost:3000

Demo login: **demo@grantflow.ai** / **demo1234!**

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `AUTH_SECRET` | ✅ | Random secret for JWT signing |
| `OPENAI_API_KEY` | ✅ | OpenAI API key for all agents |
| `OPENAI_MODEL` | Optional | Default: `gpt-4o` |
| `AUTH_GOOGLE_ID` | Optional | For Google OAuth login |
| `AUTH_GOOGLE_SECRET` | Optional | For Google OAuth login |
| `RESEND_API_KEY` | Optional | For email notifications |

---

## What's Built (Phase 1 + 2)

### ✅ Complete
- PostgreSQL database with 18 Prisma models
- NextAuth authentication (email + Google)
- Organization profile (multi-step form + document upload)
- Grant Search page with seed data
- Grant Detail page with fit score
- Application Workspace (section list + AI generation button)
- Grant Tracker (table view with status)
- Documents Library
- Dashboard with stats
- LLM provider abstraction (swap models in one file)
- Agent Run audit logger
- Grant Writer Agent (all 11 narrative sections)

### 🔜 Next Phases
- **Phase 3**: Live Grant Search (Grants.gov API + eligibility agent)
- **Phase 4**: Full Writer + Budget + Document agent UIs
- **Phase 5**: Compliance agent + export (PDF, DOCX, plain text)
- **Phase 6**: Tracking agent + email reminders + Reporting agent

---

## Architecture Notes

**LLM swapping**: All agent code calls `lib/llm/provider.ts`. To switch from OpenAI
to Anthropic or another provider, update only that file.

**File storage**: Documents are stored locally in `/public/uploads/` during development.
For production, update `app/api/organizations/documents/route.ts` to use S3 or UploadThing.

**Background jobs**: The writer agent currently runs synchronously in the API route.
For production, wrap agent calls with `pg-boss` or `BullMQ` so long generations don't
time out HTTP requests.

**Submission safety**: The system never sets status=`SUBMITTED` without a
`isConfirmedByUser: true` on the `GrantSubmission` record. This is enforced in the
Submission Agent and the status update logic.
