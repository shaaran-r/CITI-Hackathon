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

The prototype includes student onboarding, multilingual voice input/output, explainable pathway
recommendations with cited next-learning steps, a source-linked official portal directory, and a
student library for facilitator-authored lessons. Students can cache pathways, opportunities,
official sources, published text lessons, and mission evidence locally. Facilitators can review
mission submissions, recommend opportunities, publish free or priced learning modules, and review
mentor/employer/NGO interest applications. Parent Trust Mode provides linked-child progress and a
Door-Opener timeline. Binary photo/audio/video evidence and actual payment processing remain out of
scope.

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

## Learning And AI

The onboarding voice controls use Android/iOS speech recognition services and device text-to-speech
for Hindi, English, Marathi, and Bengali. Recognition availability and offline language models depend
on the phone's installed speech services. Transcription is handled by the phone's selected speech
service and may use that provider's network service; KaushalSetu does not persist recorded audio.

`GET /sources` returns official reference portals for DIKSHA, SWAYAM, Skill India Digital Hub, NAPS,
the National Scholarship Portal, AISHE, and BHASHINI. Pathway cards use curated next-step guidance
and link to official resources and selected exam portals. These links are references, not live
program feeds; dates, eligibility, course availability, and costs must be confirmed on the official
site. Demo opportunity records remain fictional.

`GET /learning/advice/:studentId` returns source-linked rules-based guidance when no model is
configured. To use an OpenAI-compatible chat-completions provider, set `LLM_CHAT_COMPLETIONS_URL`,
`LLM_MODEL`, and (when required) `LLM_API_KEY` in the API environment. Only grade, interests,
strengths, selected pathway, and the curated source directory are sent; phone number and student
name are not. The model response is constrained to supplied source IDs and remains guidance, not an
eligibility decision. No LLM provider is included or configured by default.

## Facilitators And Partners

The facilitator dashboard's Learning section creates drafts with text lessons and a language label,
then publishes them to the mobile library. Pricing metadata supports free, one-time, and monthly
subscription offers. The prototype does not collect payments, enroll learners, or verify course
credentials. Partner applications are consent-based and can be reviewed by facilitator accounts;
contact details are stored in the local database, so this flow needs access controls, retention
policy, and production privacy review before deployment.

## Offline Support

Onboarding drafts and the mission evidence outbox persist in SQLite. Pathways, matched opportunities,
official source links, and published module text are cached for reading. Mutations such as pathway
selection, applications, partner submission, and module publishing still require a live API
connection; background synchronization and binary media upload are not implemented.

To build an installable Android preview APK, sign in to Expo, link this app to an EAS project when
prompted, and set `EXPO_PUBLIC_API_URL` in that project's `preview` environment to an API URL
reachable from the phone. The app is linked to the KaushalSetu EAS project in `apps/mobile/app.json`.
For a personal computer, use the personal computer's LAN address while it and the phone share a
network; do not reuse the office laptop's hotspot address. Then run:

```powershell
npm.cmd exec --yes --package=eas-cli@24.13.0 -- eas login
npm.cmd run build:android:preview --workspace=@kaushalsetu/mobile
```

This uses EAS cloud build; a local Android SDK is not required. The build cannot use `localhost` or
the Android-emulator-only `10.0.2.2` address on a physical phone. A local Wi-Fi API URL only works
if the phone can reach the development computer through that network and firewall. The API is not
publicly hosted. An EAS preview URL is embedded at build time, so update it whenever the API host
changes. A public deployment needs HTTPS, production secrets, database hosting, and OTP configuration.

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

Learning and partner routes include public `GET /sources`, `GET /learning/modules`, and
`POST /partners/applications`; student-authenticated `GET /learning/advice/:studentId`; and
facilitator-authenticated `GET/POST /facilitator/modules`, `PATCH /facilitator/modules/:moduleId/publish`,
`GET /facilitator/partner-applications`, and
`PATCH /facilitator/partner-applications/:applicationId/status`. See Swagger at `/docs` for the
request and response schemas. The source directory is reference-only, partner applications are not
verified, module pricing is metadata only, and the optional LLM endpoint must be configured
separately.

## Product flow

Discover -> Learn -> Do -> Prove -> Earn

This is a working prototype, not a production deployment. Live government feeds, verified scheme
eligibility, BHASHINI API credentials, a production LLM provider, full offline mutation sync, paid
enrollment/payment processing, organization verification, and production OTP are still required for
the complete operational experience described in the product brief.
