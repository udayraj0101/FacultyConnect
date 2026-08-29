# CLAUDE.md — FacultyConnect Working Guide

This file gives future Claude sessions everything they need to be productive in this project from the first message. Read it end-to-end before taking any action.

---

## 1. What this project is

**FacultyConnect** is a B2B2C platform for Indian college faculty. It aggregates verified academic opportunities (FDPs, conferences, journals, grants), gives faculty a living professional profile auto-populated from ORCID/Scopus/Crossref, lets colleges post faculty job openings, and provides an opt-in, search-based faculty directory for research collaboration.

**Source of truth:** [FacultyConnect_DRD.md](FacultyConnect_DRD.md) — the PRD. Anything in this file that conflicts with the PRD is wrong; PRD wins.

## 2. What this project explicitly IS NOT (do not build these)

Per PRD §1.2, these are hard non-goals for v1:

- No student-facing features of any kind
- No K-12 / school features
- No content feed, likes, comments, timeline, or public posting
- No direct messaging or chat (connection requests only, no open inbox)
- No self-hosted journal publishing (this is discovery/aggregation, not a publisher)
- No corporate/employer/HR features (this is not DigiFusion)

If the user asks for any of the above, **push back and cite the PRD** — do not silently build it.

## 3. Roles (only these four exist)

| Role | Description |
|---|---|
| **Faculty Member** | Assistant/Associate/Full Professor at a registered institution. Builds profile, browses opportunities, applies to jobs, searches directory, sends collaboration requests. |
| **College Admin** | Verified institutional account. Posts FDPs/conferences/jobs on behalf of the college, manages faculty roster, views applicants. |
| **Opportunity Organizer** | Journal publisher, conference committee, or FDP host. Must pass verification before publishing. May or may not be a college. |
| **Platform Admin** | Internal team. Approves institution/organizer verifications, moderates flagged listings, manages UGC-CARE journal sync, handles grievance/takedown per IT Rules 2021. |

No other roles. No students. No teachers. No employees.

---

## 4. Tech stack decisions (already made — do not re-open without asking)

- **Backend**: Node.js + Express 5 (ES modules), Mongoose 9, JWT auth (access + refresh tokens), bcryptjs
- **Database**: MongoDB — **local install** for dev, Atlas for prod. PRD §9 suggests PostgreSQL + Elasticsearch, but we stay on MongoDB for Phase 1-2 and revisit at Phase 3 when directory search grows past ~10k profiles. For directory text search in dev, use Mongo's built-in `$text` indexes; migrate to Atlas Search when moving to Atlas.
- **Frontend**: React 19 + Vite 7 + Tailwind 3 + Radix UI + Framer Motion + React Router 7 + Axios + react-hook-form + zod
- **Auth OAuth**: ORCID (primary), plain email/password fallback. Do NOT add Google/GitHub/etc.
- **File storage**: S3-compatible bucket for verification docs and CV PDFs (deferred to when we build it — for now, local disk fine)
- **PDF generation**: `pdfkit` (server-side) — decision deferred until Phase 2 CV export
- **Job queue**: `node-cron` for scheduled jobs in Phase 1-2; move to BullMQ if load justifies
- **Logging**: JSON structured logs, ported from DigiFusion's `utils/logger.js` pattern

**Do not add**: Three.js / React Three Fiber (DigiFusion had them; FacultyConnect has no 3D), Rapier physics, OpenAI SDK (no AI in the PRD).

---

## 5. Relationship to DigiFusion

DigiFusion is the previous project at `d:\Programming\iGurus\DigiFusion`. FacultyConnect is a **new, independent product** — not a fork.

We copy **specific primitives** from DigiFusion but rebuild the domain code fresh, because ~55% of FacultyConnect is genuinely new (ORCID, publications, opportunities, directory, verification) and the "reusable" DigiFusion patterns are mostly infrastructure, not domain.

### Files to copy from DigiFusion (verbatim or near-verbatim)

**Backend** (from `d:\Programming\iGurus\DigiFusion\backend\`):

- `config/db.js` — Mongo connection pattern
- `middleware/auth.middleware.js` — JWT validation (will extend for refresh tokens)
- `middleware/requireRole.js` — RBAC
- `middleware/requestLogger.js` — request logging
- `utils/logger.js` — structured logger
- `.env.example` — as a template; contents will differ

**Frontend** (from `d:\Programming\iGurus\DigiFusion\frontend\`):

- `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `eslint.config.js`
- `src/services/api.js` — axios client
- `src/components/ui/` — all Radix wrappers (Button, Card, Input, Label, Alert, etc.)
- `src/components/shared/DashboardLayout.jsx` — layout shell
- `src/components/ProtectedRoute.jsx` — route guard
- `src/context/AuthContext.jsx` — will extend for refresh tokens
- `src/lib/`, `src/utils/` — helpers, frontend logger
- `.env.example`

### Files to explicitly NOT copy from DigiFusion

Do not copy any model, route, controller, page, or service that touches: `Student`, `Teacher`, `Employee`, `Company`, `School`, `Pathfinder`, `FTM`, `Task`, `Team`, `Certificate`, `Job` (rebuild fresh — different semantics), `Application` (rebuild fresh), `Event` (rebuild as `Opportunity`), or the landing page.

### package.json deps (backend)

Start with: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`, `uuid`, `axios` (for ORCID/Scopus/Crossref calls), `zod` (server-side validation).

Drop from DigiFusion's list: `openai`.

### package.json deps (frontend)

Start with DigiFusion's list minus: `@react-three/drei`, `@react-three/fiber`, `@react-three/rapier`, `meshline`, `three`.

---

## 6. Modules to build (PRD §3) — mapped to Phase

| # | Module | PRD ref | Phase |
|---|---|---|---|
| M1 | Auth (email/password) + JWT access+refresh + role-based middleware | §3.1, §5.1 | 1 |
| M2 | ORCID OAuth flow | §3.1, §4.1, §5.1 | 1 |
| M3 | Faculty Profile screen + editable sections | §3.2, §5.2, §7.1 | 1 |
| M4 | Publication model + ORCID import | §3.2, §4.1, §5.2 | 1 |
| M5 | Opportunity model + Discovery Engine (list/search/filter) | §3.3, §5.4, §7.3 | 1 |
| M6 | UGC-CARE verification badge (manual data first, ingest job later) | §3.3, §4.5 | 1 |
| M7 | Institution model + College Admin dashboard shell | §3.1, §5.3, §7.5 | 2 |
| M8 | Institution verification queue (Platform Admin) | §3.6, §5.7, §7.6 | 2 |
| M9 | Job postings (College Admin) + applicant kanban | §3.4, §5.5, §7.4, §7.5 | 2 |
| M10 | Scopus enrichment + Crossref DOI lookup | §3.2, §4.2, §4.3 | 2 |
| M11 | Google Scholar CSV importer | §4.4 | 2 |
| M12 | CV PDF export | §3.2, §5.2 | 2 |
| M13 | Directory Search + opt-in visibility | §3.5, §5.6, §7.2 | 3 |
| M14 | Connect Requests (structured, rate-limited) | §3.5, §5.6 | 3 |
| M15 | Reports/flag + Grievance workflow (24-72hr SLA) | §3.6, §5.7 | 3 |
| M16 | Notifications + preferences | §5.8 | 3 |
| M17 | Nightly ORCID re-sync + UGC-CARE ingest jobs | §4.1, §4.5 | 3 |

Do not jump ahead. Do not skip verification/trust-safety work — it is a compliance requirement (DPDP Act 2023, IT Rules 2021).

---

## 7. Data models to build (PRD §6)

Mongoose schemas. Rebuild these fresh — do not port DigiFusion schemas:

- **Faculty** — `name, email, phone, institutionId, designation (enum: Assistant/Associate/Professor/Guest/Research), domainTags[], orcidId, scopusAuthorId, citationCount, hIndex, i10Index, directoryVisible (bool), verificationStatus (enum), passwordHash, lastLogin`
- **Publication** — `facultyId, title, authors[], year, venue, doi, source (enum: orcid/scopus/scholar_csv/manual), citationCount`
- **Institution** — `name, domain, aisheCode, verificationStatus, subscriptionTier (enum: free/paid), branding (logo/colors)`
- **Opportunity** — `type (enum: fdp/conference/grant/journal), title, description, domainTags[], organizerId, mode (online/offline), cost, deadline, verificationBadge (enum: ugc_care_verified/scopus_indexed/unverified), status (enum: draft/pending_review/live/delisted)`
- **Job** — `institutionId, title, department, designation, qualifications, deadline, status (open/closed)`
- **Application** — `jobId, facultyId, status (enum: applied/shortlisted/interview/closed), appliedAt`
- **ConnectRequest** — `fromFacultyId, toFacultyId, message (max 300 chars), status (pending/accepted/declined), createdAt`
- **Report** — `targetType (opportunity/job/faculty), targetId, reporterId, reason, status (open/acknowledged/resolved), acknowledgedAt, slaDeadline`
- **Notification** — `facultyId, type, payload, readAt`
- **VerificationRequest** — `entityType (institution/organizer), entityId, submittedDocs[], status, reviewedBy, reviewedAt, reason`

Use string enums, not numeric codes. Add `createdAt`, `updatedAt` timestamps to all collections.

---

## 8. API surface (PRD §5)

Build routes in the order shown in Section 6 above. Full endpoint list is in PRD §5.1-§5.8 — treat it as the authoritative surface. Do not invent endpoints not listed there without asking the user.

Base URL locally: `http://localhost:5000/v1` (note `/v1` prefix per PRD §5 — DigiFusion used `/api`, we're changing to `/v1`).

Auth: Bearer JWT unless the endpoint is explicitly public (signup, login, ORCID redirect/callback, public opportunity list).

---

## 9. Env setup

**backend/.env** (create from `.env.example`):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/facultyconnect_dev
JWT_ACCESS_SECRET=<48-byte hex — run: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
JWT_REFRESH_SECRET=<different 48-byte hex, same command>
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
ORCID_CLIENT_ID=<from orcid.org/developer-tools sandbox>
ORCID_CLIENT_SECRET=<from orcid.org/developer-tools sandbox>
ORCID_REDIRECT_URI=http://localhost:5000/v1/auth/orcid/callback
ORCID_API_BASE=https://sandbox.orcid.org  # switch to https://orcid.org in prod
LOG_LEVEL=debug
```

**Local MongoDB prerequisite:** Install MongoDB Community Server (Windows: winget install MongoDB.Server, or download from mongodb.com/try/download/community). Run `mongod` service — on Windows it usually installs as an auto-starting service on port 27017. Verify with `mongosh` — a connection to `mongodb://localhost:27017` should succeed. No auth setup needed for dev.

Do **not** add `OPENAI_API_KEY` — no AI features in this product.

**frontend/.env** (create from `.env.example`):

```env
API_PROXY_TARGET=http://localhost:5000
VITE_API_URL=
```

Leave `VITE_API_URL` empty in dev; Vite proxy forwards `/v1` to the backend.

**Boot:**
```
Terminal 1: cd backend && npm install && npm run dev
Terminal 2: cd frontend && npm install && npm run dev
```

Backend on `:5000`, frontend on `:5173`.

---

## 10. Coding conventions

- **ES modules** everywhere on backend (`"type": "module"` in `package.json`)
- **Structured JSON logs** via `utils/logger.js` — every request, every DB call, every external API call
- **Zod validation at boundaries** — request bodies validated with zod, DB models validated with Mongoose. Do not skip either layer.
- **No `any` in shared types** — this is JS but be strict about shape at the boundary
- **Route → Controller → Service → Model** — do not put business logic in routes; do not put DB calls in controllers
- **Error responses**: `{ error: { code, message } }` — no leaking stack traces
- **Rate limiting**: applies to directory search and connect requests per PRD §8. Use `express-rate-limit`.
- **Do not commit `.env`** — `.gitignore` handles this
- **Comments** — only when the WHY is non-obvious (compliance rule, external API quirk, spec citation). Don't narrate the code.
- **No emojis in code or logs** unless the user asks

---

## 11. Compliance guardrails (from PRD §8 and §3.6)

- **DPDP Act 2023**: clear consent, purpose-limited data use, published privacy policy. When building signup, add an explicit consent checkbox for data processing.
- **IT Rules 2021**: Grievance Officer contact must be surfaced in the app, and any flagged content report must be acknowledged within 24-72 hours. The Report model has an `slaDeadline` field — enforce it.
- **UGC-CARE integrity**: every journal listing shows a `lastVerifiedAgainstUgcCareOn` timestamp. Do not fake or skip this — it's a trust signal to users.
- **Rate limits on directory search & connect requests** to prevent scraping and cold-outreach abuse.

---

## 12. Screens to build (PRD §7)

Priority order:

1. **Faculty Profile Screen** (§7.1) — the personal dashboard
2. **Discovery Feed Screen** (§7.3) — opportunity listings
3. **Job Board Screen (Faculty view)** (§7.4) — apply-in-one-click
4. **College Admin Dashboard** (§7.5) — post opportunity/job, applicant pipeline
5. **Directory Search Screen** (§7.2) — Phase 3
6. **Platform Admin Console** (§7.6) — Phase 2-3

Design notes for every screen:
- No infinite scroll feeds
- No like/comment/share buttons anywhere
- No activity timestamps on directory results (per §7.2 — this is deliberate, prevents feed feel)

---

## 13. Open decisions to clear before scaffolding

Ask the user these on session start if not yet resolved:

1. **Repo pushed to GitHub yet?** — if not, do `git init` first and confirm remote before writing much code
2. **Local MongoDB installed and running?** — Windows service `mongod` on port 27017; test with `mongosh`. URI is `mongodb://localhost:27017/facultyconnect_dev`. Atlas is only for production later.
3. **ORCID sandbox app registered?** — need `ORCID_CLIENT_ID` and `ORCID_CLIENT_SECRET`. User signs up at [orcid.org/developer-tools](https://orcid.org/developer-tools). Sandbox is free and separate from production.
4. **Which module first?** — recommended order: (a) auth scaffold with email/password, (b) Faculty model + profile screen with hardcoded data, (c) ORCID OAuth, (d) publication import, (e) Opportunity model + Discovery feed. Confirm before deviating.
5. **Deployment target** — same VPS as DigiFusion (on different ports) or new host? Affects `.github/workflows/deploy.yml` when we build it.

---

## 14. What "done" looks like for Phase 1

- User can sign up / log in with email + password
- User can connect ORCID, get redirected, come back with profile auto-populated (name, publications, employment history)
- User sees their Faculty Profile screen with metrics strip, publications list, domain tags editable, directory visibility toggle
- User can browse Discovery Feed of opportunities (FDPs, conferences, grants, journals) with filters
- Each opportunity listing shows a verification badge (UGC-CARE verified / Scopus indexed / Unverified)
- Faculty can bookmark opportunities
- Backend has nightly ORCID re-sync stub (does not need to be scheduled yet — just the endpoint)
- All routes have zod validation, all responses are structured, all requests are logged

Not required for Phase 1:
- CV PDF export
- Job postings (Phase 2)
- Directory search (Phase 3)
- Connect requests (Phase 3)
- Actual UGC-CARE ingestion job (manual seed OK for now)

---

## 15. Session-start checklist for future Claude

When a new session starts:

1. Re-read this file
2. Re-read [FacultyConnect_DRD.md](FacultyConnect_DRD.md) to refresh product context
3. Run `git status` and `git log --oneline -20` to see current state
4. Check `backend/.env` and `frontend/.env` exist (do not read them — just confirm they exist)
5. Ask which module the user wants to work on if not stated
6. If about to build a screen, cross-check the PRD §7 spec first
7. If about to build a route, cross-check PRD §5 for exact method + path

Do not skip these steps. The PRD is dense and easy to drift from.
