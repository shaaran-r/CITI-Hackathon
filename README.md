# KaushalSetu

Offline-first opportunity platform for students in rural India.

## Workspace

```text
apps/
  api/       NestJS API
  mobile/    Expo + React Native student and facilitator app
  web/       Next.js dashboards
packages/
  ai/        Explainable recommendations and AI integrations
  config/    Shared tooling and runtime configuration
  database/  Prisma schema, migrations, and seed data
  types/     Shared TypeScript contracts
  ui/        Shared web UI components
  utils/     Shared utilities
```

The first vertical slice includes a NestJS API, Prisma schema and SQLite migration, seeded demo
records, Expo onboarding with local SQLite draft persistence, deterministic pathway scoring, and
a Next.js facilitator review queue. The mission flow now supports facilitator assignment, student
submission, offline-queued note/checklist evidence, facilitator decisions, idempotent badge issuance,
and a student Skill Wallet. The Opportunity Locker adds profile-and-wallet-based eligibility,
explainable ranking, bookmarks, application tracking, help requests, and facilitator referrals.
Parent Trust Mode provides linked-child progress, pathway and opportunity explanations, and a
Door-Opener timeline. Binary photo/audio/video workflows remain deferred.

## Requirements

- Node.js 22.14 or newer
- npm 11.17 or newer

## Setup

```powershell
npm.cmd install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run db:migrate
npm.cmd run db:seed
```

The local database is SQLite at `packages/database/prisma/dev.db`, which is ignored by Git. The
first runnable slice uses it so no database service is needed; production PostgreSQL configuration
is a deployment follow-up. OTP is mock-only: request a code and use `123456` locally. Never use the
mock OTP provider in production. Do not put real credentials in `.env.example` or commit local
`.env` files.

Start each app in a separate terminal from the repository root:

```powershell
npm.cmd run dev:api
npm.cmd run dev:web
npm.cmd run dev:mobile
```

The API listens on `http://localhost:3001`; Swagger is at `/docs`. The facilitator shell is at
`http://localhost:3000`. For a physical phone, set `EXPO_PUBLIC_API_URL` to the computer's LAN
address before starting Expo; Android emulators can use `http://10.0.2.2:3001`.

To build an installable Android preview APK, sign in to Expo, link this app to an EAS project when
prompted, and set `EXPO_PUBLIC_API_URL` in that project's `preview` environment to an API URL
reachable from the phone. Then run:

```powershell
npm.cmd exec --yes --package=eas-cli@24.13.0 -- eas login
npm.cmd run build:android:preview --workspace=@kaushalsetu/mobile
```

This uses EAS cloud build; a local Android SDK is not required. The build cannot use `localhost` or
the Android-emulator-only `10.0.2.2` address on a physical phone. A local Wi-Fi API URL only works
if the phone can reach the laptop through that network and firewall. The default API is not publicly
hosted, and this workspace is not currently linked to an EAS project.

Demo student: `+919000000001`. Onboarding answers are saved locally while entering them, then
submitted to the API to persist the student profile and three ranked pathway recommendations.
Demo facilitator: `+919100000001`. Both use the mock OTP `123456`. The first student has three seeded
`[DEMO]` mission assignments. Evidence submissions accept note/checklist text only, are stored in the
mobile SQLite outbox before sending, and can be retried with the same idempotency key. Pathway,
mission, and opportunity sample records are explicitly marked as demo data.
Demo family account: `+919200000001` with mock OTP `123456`, explicitly linked to the first student.
Family View only exposes linked children and uses a separate parent token/session.

Mission endpoints are documented in Swagger: `GET /missions/assigned/:studentId`,
`POST /missions/assign` (facilitator role), `POST /missions/submissions` (student role),
`GET /facilitator/review-queue`, and `PATCH /missions/submissions/:id/review` (facilitator role).
The student wallet is available at `GET /wallet/:studentId`; review history is at
`GET /wallet/:studentId/history`. Readiness scoring uses approved mission ratio and verified badge
count; lesson progress is not yet tracked. See [docs/security-risk-register.md](docs/security-risk-register.md)
for the audit exposure summary and deferred actions.

Opportunity routes include `GET /opportunities/matched/:studentId`,
`GET /opportunities/:id`, and `POST /opportunities/bookmark`. Student applications use
`POST /applications`, `GET /applications/student/:studentId`,
`PATCH /applications/:id/status`, and `POST /applications/:id/help`. Facilitators can recommend
opportunities to assigned students with `POST /facilitator/opportunities/recommend`, inspect a
student’s fit at `GET /facilitator/students/:studentId/opportunities`, and support submissions in
`GET /facilitator/applications` / `PATCH /facilitator/applications/:id/status`. All opportunity and
application examples are fictional demo records, not real openings or offers.

Parent Trust Mode routes are `GET /parent/children`,
`GET /parent/children/:studentId/summary`, and
`GET /parent/children/:studentId/timeline`. Cost guidance is intentionally non-numeric because the
demo data has no verified local cost estimates; families should confirm safety, travel, eligibility,
and current costs with their facilitator and provider.

## Product flow

Discover -> Learn -> Do -> Prove -> Earn

The implementation is planned in phases: foundation and data model; student onboarding and
recommendations; learning and missions; wallet and opportunities; facilitator, parent, and admin
workflows; offline synchronization; then AI enhancements. The implemented slices currently cover
student onboarding/pathways, mission review/wallet, opportunities/applications, and Parent Trust.
