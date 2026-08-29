# FacultyConnect — Test Credentials

Demo accounts for local development. Passwords are shared per role for easy testing.
Everything below is provisioned by:

```powershell
cd backend
npm run seed:demo-accounts
```

The script is idempotent — safe to re-run to reset drifted data.

---

## Platform Admin

Password: `PlatformAdmin@2026`
Lands on: `/admin/platform` (navy sidebar console)

| Email | Notes |
|---|---|
| `admin@facultyconnect.in` | Primary Trust & Safety account |
| `trustandsafety@facultyconnect.in` | Second reviewer — for testing multi-admin flows |

---

## College Admin

Password: `CollegeAdmin@2026`
Lands on: `/admin/college` (purple sidebar console)

| Email | Institution | Data on file |
|---|---|---|
| `admin@iitm.ac.in` | Indian Institute of Technology Madras | Verified · paid tier · **5 seeded jobs** · 2 applicants in pipeline |
| `admin@iisc.ac.in` | Indian Institute of Science | Verified · paid tier |
| `admin@nitt.edu` | NIT Trichy | Verified · free tier |

---

## Faculty

Password: `Faculty@2026`
Lands on: `/profile` (top nav Faculty portal)

| Email | Institution | Data on file |
|---|---|---|
| `ananya.krishnan@iitm.ac.in` | IIT Madras | 3 domain tags · **ORCID 0000-0002-1825-0097** · 1284 citations · h-18 · i10-27 |
| `rajesh.iyer@nitt.edu` | NIT Trichy | 3 domain tags · 2140 citations · h-24 · i10-41 |
| `priya.menon@iisc.ac.in` | IISc | 2 domain tags · 340 citations · h-9 · i10-12 |
| `newbie.faculty@example.edu` | *(none)* | Empty account — good for testing the onboarding empty-state UX |

---

## Other pre-existing test accounts

Not managed by `seed:demo-accounts` but still valid:

| Email | Password | Role | Purpose |
|---|---|---|---|
| `m10-enrich-test@example.edu` | `password12345` | Faculty | Pre-loaded with 3 real DOIs (Deep learning · Attention Is All You Need · Adam) for testing Crossref/Scopus enrichment |
| `test@iit.ac.in` | *(whatever you set at signup)* | Faculty | The account you first signed up with |

Any account you `POST /v1/auth/signup` also persists — the demo seed doesn't touch those.

---

## Verification queue seed data

To repopulate the Platform Admin's pending queue with test rows:

```powershell
cd backend
npm run seed:institutions
```

This resets **Anna University** (`annauniv.edu`) and **Vellore Institute of Technology** (`vit.ac.in`) back to `pending` and clears any old audit trail — you get 2 fresh pending requests each time.

---

## Quick reference

```
Platform Admin  →  admin@facultyconnect.in         · PlatformAdmin@2026
College Admin   →  admin@iitm.ac.in                · CollegeAdmin@2026
Faculty (rich)  →  ananya.krishnan@iitm.ac.in      · Faculty@2026
Faculty (empty) →  newbie.faculty@example.edu      · Faculty@2026
Enrichment test →  m10-enrich-test@example.edu     · password12345
```
