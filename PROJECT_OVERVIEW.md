# FacultyConnect — Project Overview

A non-technical walkthrough of what's built, who it's for, and how each user flows through the platform.

---

## 1. What FacultyConnect is

A B2B2C platform for Indian college faculty that brings together three things they currently juggle across a dozen websites:

- **A living professional profile** auto-populated from ORCID, Scopus, Crossref, and Google Scholar — no re-typing publications every year.
- **A verified opportunity feed** of FDPs, conferences, grants, and journal calls-for-papers — cross-checked against UGC-CARE and Scopus so predatory listings are filtered out.
- **A peer directory + structured collaboration flow** — search by research area, send a purpose-tagged connect request, take the conversation off-platform once contact is revealed.

It's deliberately **not** LinkedIn/Twitter for academics. There's no public content feed, no likes, no open chat.

---

## 2. Who uses it — four roles

| Role | Who they are | Where they land after login |
|---|---|---|
| **Faculty** | Individual professor at any Indian college/university | Faculty portal — top-nav (Home / Profile / Discover / Jobs / Directory / Requests) |
| **College Admin** | Verified representative of an institution (Dean, Registrar, HR head) | Purple sidebar console at `/admin/college` |
| **Opportunity Organizer** | Standalone publisher — journal, conference committee, grants agency, FDP host | Similar console to College Admin (posting + verification only, no faculty roster) |
| **Platform Admin** | FacultyConnect internal trust & safety team | Navy sidebar console at `/admin/platform` |

---

## 3. What each role can do

### Faculty

**Their identity**
- Sign up with email + password + pick institution from dropdown, OR complete onboarding from an invitation link, OR connect ORCID for auto-populated publications.
- Build a rich profile: bio, department, phone, employment history, education, awards, grants received, external links (LinkedIn, Google Scholar, GitHub, X, personal website).
- Manage research domain tags — these drive discovery and recommendations.
- Import publications from ORCID, Scopus, Crossref, or a Google Scholar CSV export; add manually via DOI or free-form entry.
- Export a formatted CV as PDF anytime.

**Their privacy controls**
- **Directory visibility toggle** — when on, other logged-in faculty can find you by domain/institution.
- **Public profile toggle** — when on, your profile becomes indexable by Google at a shareable vanity URL like `/f/ananya-krishnan`. Great for CVs, LinkedIn, and paper submissions.
- Contact details (email, phone) are always hidden until a connect request is mutually accepted.

**Their discovery**
- Four dedicated pages under the Discover menu — FDPs, Conferences, Grants, Journals — each with type-appropriate filters and sort options.
- Every listing shows a verification badge: UGC-CARE listed / Scopus indexed / Unverified. Last-verified date is always visible for transparency.
- Bookmark for later; report predatory listings for platform review.

**Their networking**
- Search the directory by research domain, designation, institution. Sort by citations, h-index, publications, or best match.
- Send a **structured connect request**: pick a purpose (co-author / PhD advisory / joint FDP / guest lecture / grant collab), write a 300-character note. Rate-limited to prevent spam.
- Recipient accepts or declines. On accept, both parties see each other's email — the conversation continues off-platform.
- **My Network** tab lists everyone you've connected with, searchable by name/institution/purpose.

**Their jobs**
- Browse faculty openings across all verified colleges.
- One-click apply — the college's hiring team receives your full ORCID-populated profile.
- Track application status: Applied → Shortlisted → Interview → Closed. In-app notifications on every status change.

**Their notifications**
- Bell icon in the header with an unread badge.
- Full `/notifications` inbox covering: connect requests, application updates, verification decisions, invitation acceptances.

---

### College Admin

- Overview of institution's activity (postings, applicants, roster).
- Institution profile card + verification status.
- **Invite Faculty** — add one at a time via a form, or bulk-upload a CSV of up to 500 rows. Each invitee gets an onboarding email with a 7-day link; the admin sees per-row results (invited / already-member / at-another-institution / skipped).
- **Faculty Roster** with four tabs: Pending Approval / Verified / Rejected / All. When a faculty self-signs-up and picks the college, they land here for approval — with a red badge on the sidebar so nothing gets missed.
- Approve or reject with optional reason; rejected faculty gets notified and detached.
- **Post Opportunity** (FDP, conference, grant, journal). Type-specific fields — ISSN required for journals.
- **My Opportunities** — everything the institution has posted, with live/pending/delisted status.
- **Post Job** with full spec: title, department, qualifications, description, location, experience, salary, deadline, research tags.
- **My Jobs** with pipeline counters + a Close-job button.
- **Applicants Kanban** — move candidates between Applied → Shortlisted → Interview → Closed. Each move fires a notification to the applicant.

---

### Opportunity Organizer

- All posting features from College Admin (Post Opportunity, My Opportunities).
- Not scoped to a college — for entities like IEEE, DST-SERB, or Springer that publish across institutions.
- Same verification requirement: institution/organizer must be verified before listings go live.

---

### Platform Admin (Trust & Safety)

- Overview dashboard with platform-wide numbers.
- **Verifications queue** — approve or reject institution and organizer verification requests.
- **Reports & Grievances** — review flagged content within the DPDP Act 2023 mandated SLA (24–72 hours). Each report shows target, reporter, reason, and remaining time.
- UGC-CARE Sync — nightly cron already refreshes journal verification badges (dedicated UI tab is placeholder).
- Users tab — placeholder; role changes done via scripts today.

---

## 4. Key user journeys — end to end

### Journey A · Faculty onboarding (three paths)

**Invited by their college admin**
1. Admin uploads CSV of the department roster or adds a single faculty by name + email.
2. Faculty receives an onboarding email with a link (valid 7 days).
3. Clicks link → sees email + institution pre-filled → sets a password.
4. Account is auto-verified — they're a verified member from day one. Immediately logged in.
5. Optionally connects ORCID to auto-populate their publication history.

**Self-signup**
1. Faculty visits the signup page, picks their institution from a dropdown.
2. Account is created with `pending` status. They're logged in but not yet marked verified.
3. College admin sees them in the Pending Approval queue.
4. Admin approves → faculty gets an in-app notification, the VERIFIED badge appears on their profile.
5. If admin rejects (with optional reason), faculty is notified and their institution link is removed.

**Solo (no institution)**
1. Skip the institution dropdown at signup.
2. Verified immediately — full use of the platform except institution-visible features (no institutional CFPs, no institutional job filtering by "my college").

### Journey B · College Admin's daily loop

1. Login → sidebar surfaces pending approvals and new applicants as badges.
2. Faculty Roster → approve pending self-signups.
3. Invite Faculty → new hires this month bulk-uploaded via CSV.
4. Post Opportunity or Post Job as needed.
5. Applicants Kanban → move candidates through the pipeline; each move notifies the applicant.

### Journey C · Faculty finding an opportunity

1. Discover menu → picks FDPs (or Conferences / Grants / Journals).
2. Filters by domain, deadline range, mode (online/offline/hybrid), cost.
3. Sorts by Newest first (default), soonest deadline, or latest.
4. Card → detail page with full description, verification badge, last-verified date.
5. Bookmarks it, or clicks Visit Organizer Page to register on the organizer's own site.

### Journey D · Faculty applying for a job

1. Jobs menu → filters by designation, location, domain.
2. Clicks a listing → detail page → Apply.
3. Confirmation modal — the college's hiring team will receive the ORCID-populated profile.
4. Application card in Job Board flips to "Applied" permanently.
5. College admin moves the applicant through the kanban; every stage change fires a notification.

### Journey E · Faculty connecting with a peer

1. Directory → searches by research domain (e.g., "Machine Learning").
2. Filters and sorts results (most cited, highest h-index, most publications).
3. Opens a peer's profile — sees publications, employment, awards, research areas. No email or phone.
4. Clicks Send Connect Request → structured modal with purpose dropdown + 300-character message.
5. Recipient gets an in-app notification.
6. Recipient accepts → email revealed to both parties → conversation moves off-platform.
7. Both now see each other in the My Network tab, searchable and filterable by connection purpose.

### Journey F · Faculty publishing their public profile for SEO

1. Profile → Visibility & privacy section → toggles Public profile on.
2. System auto-generates a vanity URL (e.g., `/f/ananya-krishnan`).
3. Card shows a copy-to-clipboard link and a preview button.
4. The profile becomes publicly viewable — bio, publications, employment, education, awards, grants, external links. Email and phone stay hidden.
5. Google indexes the page (JSON-LD Person schema and OpenGraph tags are injected server-side).
6. URL auto-added to the sitemap. Faculty can paste it on their CV, LinkedIn headline, or paper submissions.

### Journey G · Platform Admin's trust workflow

1. Login → overview shows unresolved reports, pending verifications, and their SLA remaining.
2. Verifications → review submitted institution or organizer applications, approve or reject with reason.
3. Reports & Grievances → resolve flagged content within the DPDP SLA counter shown on each row.
4. UGC-CARE and expired-opportunity delisting run automatically via nightly cron.

---

## 5. What runs on autopilot

- **Nightly at 02:00 IST** — ORCID re-sync for every faculty with a linked ORCID iD. New publications appear on their profile automatically.
- **Nightly at 02:30 IST** — UGC-CARE re-verification for every journal listing. Badges get promoted/demoted based on the latest UGC-CARE list. Expired opportunities are delisted.
- **Every minute** — the notification bell polls for new events so users see updates without refreshing.

---

## 6. Trust & safety — what makes this different from a Google search

- Every institution and organizer must be verified before their listings go live. Unverified accounts see their posts parked in a review queue.
- Every journal listing shows the last date it was cross-checked against the UGC-CARE list — a transparency signal to users.
- DPDP Act 2023 compliance: explicit consent at signup and again when enabling public profile. No public profile by default. Contact details never surface without a mutual connect.
- Rate limits on directory search, connect requests, reports, and invitations to prevent scraping and abuse.
- Faculty can report any listing or profile; Platform Admin has a 24–72 hour SLA per IT Rules 2021.

---

## 7. What the platform intentionally does NOT do

These were explicit product decisions per the PRD:

- No content feed, timeline, likes, comments, or public posting by faculty
- No direct messaging or chat — connect requests are single-message, purpose-tagged
- No student, K-12, or corporate features
- Faculty cannot publish opportunities directly (would collapse the verification model) — only verified organizers can. A moderated "Suggest an opportunity" flow can be added if the team chooses.

---

## 8. Status snapshot

**Ready and tested end-to-end**

- Faculty portal (profile, publications, discover, jobs, directory, connect requests, notifications, CV export, public profile)
- College Admin portal (invite faculty single + CSV, faculty roster with approve/reject, post opportunity, post job, applicants kanban)
- Platform Admin portal (verifications, reports & grievances)
- Public SEO profiles with server-side rendered meta tags and JSON-LD
- Auto-generated sitemap
- Nightly cron for ORCID re-sync + UGC-CARE re-verification
- In-app notification system

**Pending external inputs**

- Email SMTP credentials — waiting on either a Google Workspace App Password or a Resend account. Every email-firing flow works but currently prints to the backend console. The moment credentials arrive, emails go live with a four-line env change.
- Production infrastructure — MongoDB Atlas cluster, ORCID production credentials, VPS access, domain DNS. All plug-in points are ready.

**Deliberately deferred**

- "Suggest an opportunity" flow for faculty (awaiting team decision)
- User-management UI on the Platform Admin console (scripts + Mongo work today)

Once email + infra are provisioned, deployment itself is a one-day exercise.
