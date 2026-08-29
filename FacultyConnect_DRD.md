FacultyConnect — Developer Requirements Document

**FacultyConnect**

*Academic Discovery, Profile **&** Collaboration Platform for College Faculty*

Developer Requirements Document (DRD) — v1.0

Prepared: July 2026

# Table of Contents

# 1. Product Overview

FacultyConnect is a B2B2C platform for college faculty across India. It aggregates verified academic opportunities (FDPs, conferences, journals, grants), gives faculty a living professional profile auto-populated from existing academic identity providers, lets colleges post faculty job openings, and provides an opt-in, search-based faculty directory for research collaboration — deliberately NOT a social feed.

## 1.1 Goals

- Become the trusted, curated source of academic opportunities for Indian faculty (UGC-CARE-verified journals, verified FDP/conference organizers).

- Reduce faculty profile-building effort to near-zero via one-click import from ORCID, Scopus, and Crossref.

- Give colleges a channel to post verified faculty openings and institutional events.

- Enable faculty-to-faculty discovery for collaboration by domain/expertise — search, not a feed.

- Avoid all minor-related compliance overhead — user base is 100% verified working professionals (18+ by definition of employment).

## 1.2 Non-Goals (explicitly out of scope for v1)

- No content feed, likes, comments, or public posting/timeline.

- No direct messaging/chat between users (connection requests only, routed through platform, no open inbox).

- No student-facing features of any kind in this product.

- No self-hosted journal publishing — this is a discovery/aggregation layer, not a publisher.

# 2. User Personas & Roles

| **Role** | **Description** |
| --- | --- |
| Faculty Member | Assistant/Associate/Full Professor at a registered institution. Builds profile, browses opportunities, applies to jobs, searches directory, sends collaboration requests. |
| College Admin | Verified institutional account. Posts FDPs/conferences/jobs on behalf of the college, manages faculty roster linkage, views applicants. |
| Opportunity Organizer | Journal publisher, conference committee, or FDP host (may or may not be a college). Must pass verification before publishing listings. |
| Platform Admin | Internal team. Approves institution/organizer verification, moderates flagged listings, manages UGC-CARE journal sync, handles grievance/takedown requests. |

# 3. Feature Modules

## 3.1 Authentication & Verification

- Signup via institutional email domain (preferred) or personal email + manual document upload for verification.

- OAuth login via ORCID (primary identity anchor for academics) in addition to email/password.

- Institution accounts verified via AISHE code / UGC/AICTE affiliation number + official domain check.

- JWT-based session with refresh tokens; role-based access control (Faculty / College Admin / Organizer / Platform Admin).

## 3.2 Faculty Profile (auto-populated)

- One-click import of publications, citation count, h-index, and co-author network from ORCID public API (no rework: faculty just authenticate with existing ORCID iD, data pulled directly).

- Optional secondary sync from Scopus Author API (if faculty provides Scopus Author ID) and Crossref (DOI-based metadata enrichment) for citation counts not captured by ORCID.

- Manual add/edit for publications not indexed anywhere (books, book chapters, patents).

- Auto-generated downloadable CV (PDF) assembled from profile + publication data.

- Editable sections: bio, designation, department, research interests/domain tags (used for directory search & recommendation matching), qualifications, FDPs attended (auto-added when faculty registers via platform).

## 3.3 Discovery Engine (FDPs, Conferences, Grants, Journals)

- Unified listing feed, filterable by type, domain, cost (free/paid), mode (online/offline), deadline, and UGC/AICTE-approval status.

- Journal opportunity listings cross-checked against the UGC-CARE list (and Scopus/Web of Science indexing where applicable) at publish time; every listing shows a verification badge.

- Personalized recommendations based on faculty's declared research domain tags.

- Bookmark/save + email/push deadline reminders.

- Organizer verification gate before any listing goes live (document/domain check, reviewed by Platform Admin).

## 3.4 College Job Postings

- Verified college accounts post openings (Assistant/Associate/Guest Professor, research positions) with structured fields (department, qualification required, experience, deadline).

- Faculty apply in-platform; application includes auto-attached profile/CV — no re-typing.

- College admin dashboard: applicant list, status pipeline (applied / shortlisted / interview / closed).

- Paid/featured listing tier for colleges (monetization).

## 3.5 Faculty Directory & Matchmaking (search-based, not a feed)

- Opt-in visibility toggle — faculty choose whether their profile is discoverable in directory search at all.

- Search/filter by research domain, institution, designation, keyword (from publication titles/abstracts).

- No public activity feed, no posts, no likes/comments — directory returns a static profile card only.

- Collaboration Connect Request: structured request ("I'd like to collaborate on X") sent through the platform; recipient accepts/declines. No open-ended chat inbox in v1 — accepted requests reveal institutional email for faculty to continue off-platform.

- Rate-limited connect requests to prevent spam/cold-outreach abuse.

## 3.6 Admin & Trust/Safety

- Institution & organizer verification queue with document review.

- Journal blacklist sync (UGC-CARE removals) — auto-flag previously listed journals if delisted.

- Report/flag mechanism on any listing (predatory journal, fake job, fraudulent organizer) with Grievance Officer workflow and SLA (per IT Rules 2021: 24–72 hr acknowledgment).

- Audit log of all verification decisions.

# 4. Third-Party Integrations — Profile Auto-Population

The core "no rework" requirement is solved by treating ORCID as the primary identity + publication anchor, since it is the only academic identity system built specifically for OAuth-style login and free public API access. Scopus and Crossref are used as enrichment layers, not primary login.

## 4.1 ORCID (primary — login + publication import)

- Integration type: OAuth 2.0 ("ORCID Login"), free, no institutional license needed.

- Flow: faculty clicks 'Connect ORCID' → redirected to orcid.org → authorizes → platform receives ORCID iD + access token → calls ORCID Public API (/v3.0/{orcid-id}/works) to pull publication list, employment history, and education directly into the profile.

- Re-sync: scheduled nightly job re-pulls each connected ORCID iD's works so new publications appear automatically without manual re-entry.

- This single integration satisfies 'populate profile from existing portal via API login without rework' for the large majority of faculty who already maintain an ORCID record.

## 4.2 Scopus Author API (Elsevier) — citation enrichment

- Requires an Elsevier API key; full metadata access typically requires institutional Scopus subscription (API key tied to institutional IP range or token).

- Used to pull citation count, h-index, and co-author affiliations if faculty supplies their Scopus Author ID.

- Treated as optional/secondary — degrade gracefully if college has no Scopus subscription.

## 4.3 Crossref REST API — metadata enrichment

- Free, no auth required. Used to resolve DOI → full citation metadata (journal name, volume, issue, publisher) when faculty manually adds a publication by DOI, avoiding manual data entry.

## 4.4 Google Scholar — not directly integrated

- Google Scholar has no official public API; scraping violates its Terms of Service and is legally risky to build a product feature around.

- Workaround offered to faculty instead: manual CSV export from Google Scholar profile (Scholar supports this natively) → platform provides a bulk-import parser for that CSV. No scraping performed by the platform.

## 4.5 UGC-CARE List — journal verification

- UGC-CARE does not currently expose a public API; verification is done via a scheduled scraper/ingestion job against the published UGC-CARE list (refreshed periodically) maintained internally, with Platform Admin manual override capability for edge cases.

- Every journal listing stores a 'last verified against UGC-CARE on [date]' timestamp shown to users for transparency.

# 5. API Specification (REST, v1)

Base URL: https://api.facultyconnect.in/v1  |  Auth: Bearer JWT unless noted  |  All list endpoints support pagination via ?page=&limit=

## 5.1 Authentication

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| POST | /auth/signup | Create account (email + password or institutional domain). |
| POST | /auth/login | Email/password login, returns access + refresh token. |
| POST | /auth/refresh | Exchange refresh token for new access token. |
| GET | /auth/orcid/redirect | Returns ORCID OAuth authorization URL. |
| GET | /auth/orcid/callback | Handles ORCID OAuth callback, links ORCID iD to account. |
| POST | /auth/institution/verify-domain | Validates faculty email against registered institution domain. |

## 5.2 Faculty Profile

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | /faculty/{id} | Fetch full public/private profile (visibility-aware). |
| PUT | /faculty/{id} | Update profile fields (bio, domain tags, designation, etc.). |
| POST | /faculty/{id}/import/orcid | Trigger ORCID works import/re-sync. |
| POST | /faculty/{id}/import/scopus | Trigger Scopus enrichment via Author ID. |
| POST | /faculty/{id}/import/scholar-csv | Upload Google Scholar CSV export for bulk publication import. |
| GET | /faculty/{id}/publications | List all publications (paginated, filterable by year/type). |
| POST | /faculty/{id}/publications | Manually add a publication (DOI lookup via Crossref auto-fills metadata). |
| DELETE | /faculty/{id}/publications/{pubId} | Remove a publication entry. |
| GET | /faculty/{id}/metrics | Citation count, h-index, i10-index (aggregated across sources). |
| GET | /faculty/{id}/cv/export | Generate downloadable CV PDF from profile data. |
| PATCH | /faculty/{id}/visibility | Toggle directory search visibility on/off. |

## 5.3 Institutions

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| POST | /institutions | Register a new institution account. |
| POST | /institutions/{id}/verify-documents | Submit AISHE/UGC/AICTE affiliation docs for review. |
| GET | /institutions/{id} | Institution profile (name, domain, verification status). |
| POST | /institutions/{id}/faculty-roster | Bulk-link faculty accounts to institution (CSV upload). |

## 5.4 Discovery — Opportunities

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | /opportunities | List/search FDPs, conferences, grants, journals. Query: type, domain, mode, cost, deadline_before. |
| GET | /opportunities/{id} | Full detail of a single opportunity. |
| POST | /opportunities | Create listing (organizer role, requires verified status). |
| PUT | /opportunities/{id} | Edit listing (owner/admin only). |
| POST | /opportunities/{id}/bookmark | Save opportunity to faculty's bookmarks. |
| GET | /opportunities/recommended | Personalized feed based on faculty domain tags. |
| GET | /journals/verify | Query: issn — returns UGC-CARE/Scopus verification status. |

## 5.5 Jobs

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| POST | /jobs | College posts an opening. |
| GET | /jobs | Search/filter openings by domain, designation, location. |
| GET | /jobs/{id} | Job detail. |
| POST | /jobs/{id}/apply | Faculty applies (auto-attaches profile/CV). |
| GET | /jobs/{id}/applicants | College admin: view applicant pipeline. |
| PATCH | /jobs/{id}/applicants/{appId} | Update applicant status (shortlisted/interview/rejected). |

## 5.6 Faculty Directory & Collaboration

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | /directory/search | Query: domain, keyword, institution, designation — returns visible profiles only. |
| POST | /directory/connect-requests | Send a structured collaboration request to another faculty member. |
| GET | /directory/connect-requests | List sent/received requests. |
| PATCH | /directory/connect-requests/{id} | Accept or decline a request. |

## 5.7 Admin & Trust/Safety

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | /admin/verifications | Pending institution/organizer verification queue. |
| PATCH | /admin/verifications/{id} | Approve/reject verification, with reason. |
| POST | /reports | Flag a listing/user (predatory journal, fake job, spam). |
| GET | /admin/reports | Queue of open reports for Grievance Officer review. |
| GET | /admin/journals/ugc-care-sync | Trigger/inspect status of UGC-CARE list ingestion job. |

## 5.8 Notifications

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | /notifications | List in-app notifications. |
| POST | /notifications/preferences | Set email/push alert preferences (deadlines, new opportunities, connect requests). |

# 6. Core Data Models

### Faculty

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| id | UUID | Primary key |
| name, email, phone | string | Basic identity |
| institution_id | FK → Institution | Current affiliation |
| designation | enum | Assistant/Associate/Professor/Guest/Research |
| domain_tags | string[] | Research areas — drives recommendations & directory search |
| orcid_id, scopus_author_id | string, nullable | External identity anchors |
| citation_count, h_index, i10_index | int | Cached aggregate metrics, refreshed on sync |
| directory_visible | boolean | Opt-in flag for directory search |
| verification_status | enum | pending / verified / rejected |

### Publication

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| id | UUID | Primary key |
| faculty_id | FK → Faculty |  |
| title, authors, year, venue | string/int | Core citation fields |
| doi | string, nullable | Used for Crossref enrichment |
| source | enum | orcid / scopus / scholar_csv / manual |
| citation_count | int | Per-publication citations where available |

### Institution

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| id | UUID | Primary key |
| name, domain, aishe_code | string | Identity & verification fields |
| verification_status | enum | pending / verified / rejected |
| subscription_tier | enum | free / paid — controls featured listing access |

### Opportunity

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| id | UUID | Primary key |
| type | enum | fdp / conference / grant / journal |
| title, description, domain_tags | string/array |  |
| organizer_id | FK → Institution/Organizer |  |
| mode, cost, deadline | enum/decimal/date |  |
| verification_badge | enum | ugc_care_verified / scopus_indexed / unverified |
| status | enum | draft / pending_review / live / delisted |

### Job

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| id | UUID | Primary key |
| institution_id | FK → Institution |  |
| title, department, designation, qualifications | string |  |
| deadline | date |  |
| status | enum | open / closed |

### ConnectRequest

| **Field** | **Type** | **Notes** |
| --- | --- | --- |
| id | UUID | Primary key |
| from_faculty_id, to_faculty_id | FK → Faculty |  |
| message | text | Structured collaboration purpose |
| status | enum | pending / accepted / declined |

# 7. Screens & Wireframe Descriptions

A visual mockup of the two highest-priority screens (Faculty Profile and Directory Search) has been generated separately and shared inline in chat. Written wireframe specs for all core screens follow.

## 7.1 Faculty Profile Screen

Primary personal dashboard. Private-by-default; directory-visible fields are a subset controlled by the visibility toggle.

- Header band: name, designation, institution logo, department, 'Connect ORCID' button (shows green check once linked) and last-synced timestamp.

- Metrics strip: Citation count, h-index, i10-index, total publications — each showing source (ORCID/Scopus) as a small tag.

- Research Domain Tags: editable chip list, drives directory search and personalized recommendations.

- Publications list: table/card view, filterable by year/type, each row shows source badge (ORCID/Scopus/Scholar CSV/Manual) and 'Add via DOI' quick-add box.

- FDPs & Conferences Attended: auto-populated when faculty registers for a listing through the platform; manually addable for historical records.

- CV Export button — generates PDF from all above sections.

- Directory Visibility toggle with explainer text: 'When on, other faculty can find you by research domain in Directory Search. Your contact details stay hidden until you accept a connect request.'

## 7.2 Directory Search Screen

Search-first layout, explicitly not a feed — no chronological stream, no posts.

- Top search bar: keyword + filters (domain, institution, designation).

- Results as static profile cards: name, designation, institution, top 3 domain tags, publication count — click opens read-only profile.

- 'Send Connect Request' button on each card opens a structured modal (purpose dropdown + short message, 300 char limit) — no open chat.

- No infinite scroll feed, no activity timestamps, no likes/comments anywhere on this screen.

## 7.3 Discovery Feed Screen

Opportunity listings — FDPs, conferences, grants, journals.

- Left filter rail: type, domain, mode (online/offline), cost, deadline range.

- Card grid: title, organizer, verification badge (UGC-CARE / Scopus-indexed / Unverified — grey warning icon), deadline countdown, Bookmark icon.

- 'Recommended for you' rail at top, driven by faculty's domain tags.

## 7.4 Job Board Screen (Faculty view)

Faculty-facing job search.

- Filter by domain, designation, location.

- Job card: title, institution, deadline, 'Apply' button — application auto-attaches current profile/CV, single confirm step, no re-typing.

## 7.5 College Admin Dashboard

Institutional control panel.

- Tabs: Post Opportunity, Post Job, Faculty Roster, Applicant Pipeline, Verification Status.

- Applicant Pipeline: kanban-style columns (Applied → Shortlisted → Interview → Closed).

## 7.6 Platform Admin Console

Internal trust & safety tooling.

- Verification queue (institutions/organizers) with document viewer and Approve/Reject + reason field.

- Reports queue (flagged journals/jobs/users) with SLA timer per IT Rules 2021 (24–72 hr acknowledgment).

- UGC-CARE sync status panel with manual override table.

# 8. Non-Functional Requirements

- Security: OAuth 2.0 for ORCID, JWT + refresh tokens for platform auth, encryption at rest for PII, rate limiting on directory search & connect requests to prevent scraping/spam.

- Compliance: DPDP Act 2023 (adult user base, but still requires clear consent, purpose-limited data use, and a published privacy policy); IT Rules 2021 intermediary obligations (Grievance Officer, 24–72 hr complaint SLA).

- Performance: Discovery search P95 < 400ms; ORCID sync jobs run asynchronously (queue-based), not inline with user requests.

- Availability: 99.5% target for v1; nightly sync jobs scheduled during low-traffic windows.

- Scalability: Directory search should use a dedicated search index (e.g., Elasticsearch/OpenSearch) once profile count exceeds ~10k, given free-text domain/keyword search requirements.

# 9. Suggested Tech Stack

- Backend: Node.js (NestJS) or Django REST Framework — either supports OAuth integrations and async job queues cleanly.

- Database: PostgreSQL (relational core) + Elasticsearch/OpenSearch (directory & opportunity search index).

- Job queue: BullMQ (Node) or Celery (Python) for ORCID/Scopus sync jobs and UGC-CARE ingestion.

- Frontend: React + Tailwind (web), React Native later if a mobile app is needed.

- File storage: S3-compatible bucket for verification documents and generated CVs.

- Auth: OAuth2 provider integration for ORCID; Auth0/Cognito or custom JWT service for platform login.

# 10. Phased Delivery Plan

- Phase 1 (MVP): Auth + ORCID login/import, Faculty Profile, Discovery Engine (FDP/journal/conference listings with UGC-CARE verification badge).

- Phase 2: College institutional accounts, Job Board, CV export, Scopus/Crossref enrichment, Scholar CSV import.

- Phase 3: Faculty Directory search + Connect Request flow, Admin trust & safety console, notification preferences.