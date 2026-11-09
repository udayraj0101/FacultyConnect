import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import LegalFooter from '../../components/shared/LegalFooter';

export const PRIVACY_POLICY_VERSION = '2026-11-dpdp-v2';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-bg-dark">
      <header className="sticky top-0 z-30 border-b border-border bg-white/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm font-medium text-text-muted hover:text-text-light inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={16} /> Back to home
          </Link>
          <div className="font-extrabold text-secondary text-base tracking-tight">
            FacultyConnect
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div className="rounded-lg border-2 border-yellow-300 bg-yellow-50 p-4 flex items-start gap-3">
          <ShieldAlert size={20} className="text-yellow-700 shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-900">
            <div className="font-bold">DRAFT — pending legal review</div>
            <p className="mt-1 text-xs leading-relaxed">
              This copy is a placeholder drafted against the Digital Personal Data
              Protection Act 2023 and the IT Rules 2021. It has not been reviewed by a
              lawyer and is not binding. For clarifications contact{' '}
              <a href="mailto:grievance@digifusion.in" className="underline font-semibold">
                grievance@digifusion.in
              </a>
              . The final policy will be published before the public launch.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-border p-6 md:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-secondary">Privacy Policy</h1>
            <p className="text-xs text-text-muted mt-1">
              Version {PRIVACY_POLICY_VERSION} · Effective date to be notified at launch
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              1. Who we are
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              FacultyConnect is a discovery and collaboration platform for Indian college
              faculty, operated by iGurus (the "Operator"). We process your personal data
              as a Data Fiduciary under the Digital Personal Data Protection Act 2023
              ("DPDP Act").
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              2. What we collect
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Account data:</strong> name, institutional email, phone (optional),
                hashed password, your institution.
              </li>
              <li>
                <strong>Professional profile:</strong> designation, department, bio,
                research domain tags, employment + education history, awards, grants,
                external profile links (ORCID, Scopus, LinkedIn, Google Scholar).
              </li>
              <li>
                <strong>Research output:</strong> publications you add manually or import
                from ORCID / Scopus / Crossref / Google Scholar CSV.
              </li>
              <li>
                <strong>Activity:</strong> job applications you submit, connect requests
                you send or receive, notifications, saved searches, bookmarks.
              </li>
              <li>
                <strong>System logs:</strong> IP address, device user-agent, access
                timestamps — retained for security and abuse prevention, not profiled for
                advertising.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              3. How we use it
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>Render your profile to you and (if opted in) to other faculty.</li>
              <li>
                Surface relevant opportunities — FDPs, conferences, grants, journal CFPs —
                matched to your research domains.
              </li>
              <li>Route your job applications to the posting institution.</li>
              <li>Deliver connect requests, notifications, and transactional email.</li>
              <li>
                Keep the platform secure (rate limits, fraud detection, grievance
                workflow).
              </li>
            </ul>
            <p className="text-sm text-text-light leading-relaxed">
              We do <strong>not</strong> profile you for advertising. We do{' '}
              <strong>not</strong> sell your data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              4. Who sees your data
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Your email and phone stay hidden by default.</strong> They are
                revealed to another faculty member only after they send a connect request
                and you accept it, or when you apply to a college's job posting.
              </li>
              <li>
                Your name, designation, institution, bio, and research tags appear in the
                Directory only if you turn on <em>Directory visibility</em>.
              </li>
              <li>
                Your full profile appears on a public URL (<code>/f/your-handle</code>)
                only if you turn on <em>Public profile</em>. Even then, email and phone
                remain hidden.
              </li>
              <li>
                Your college administrator sees applicants to their postings, roster
                membership, and aggregate institution analytics — not your private CAS
                inputs or personal messages.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              5. Your rights under DPDP Act 2023
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Access:</strong> download all data we hold about you as JSON from
                Profile → Privacy &amp; data → <em>Download my data</em>.
              </li>
              <li>
                <strong>Correction:</strong> edit any profile field directly, or write to
                us for fields you cannot edit.
              </li>
              <li>
                <strong>Erasure:</strong> request account deletion from Profile →
                Privacy &amp; data → <em>Delete my account</em>. A 7-day grace period
                applies; the delete is final after that and purges your profile,
                publications, applications, saved searches, notifications, and connect
                requests.
              </li>
              <li>
                <strong>Grievance:</strong> escalate privacy concerns to our Grievance
                Officer — see the{' '}
                <Link to="/grievance" className="text-primary underline font-semibold">
                  Grievance Officer page
                </Link>
                .
              </li>
              <li>
                <strong>Withdraw consent:</strong> you may withdraw consent at any time by
                deleting your account. Processing already completed remains lawful.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              6. Retention
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              Profile data is retained as long as your account is active. On deletion we
              purge within 7 days of the grace period ending. System logs (IP, user-agent,
              access timestamps) are retained for 90 days for security auditing and then
              auto-expired.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              7. Security
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              Passwords are hashed with bcrypt. Session tokens are short-lived and kept in
              memory only; the long-lived refresh token sits in an httpOnly cookie that
              browser scripts cannot read. All traffic to the production site is encrypted
              with TLS. We rate-limit auth and connect-request endpoints to blunt
              credential stuffing and cold-outreach abuse.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              8. Cookies
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              We use a single httpOnly session cookie for authentication and a
              localStorage entry for your profile summary (name + role, so the header
              renders without a round-trip). We do not run third-party analytics,
              advertising, or tracking cookies.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              9. Children
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              FacultyConnect is for faculty at Indian higher-education institutions. We do
              not knowingly collect data from anyone under 18. If you believe a minor has
              created an account, please notify the Grievance Officer.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              10. Changes
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              When the policy materially changes we will bump the version string (shown at
              the top of this page) and prompt you to re-consent on your next sign-in. We
              will not retroactively apply a new policy to data collected under a prior
              version.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              11. Contact
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              Privacy questions or data-rights requests:{' '}
              <a
                href="mailto:grievance@digifusion.in"
                className="text-primary underline font-semibold"
              >
                grievance@digifusion.in
              </a>
              . Grievance escalations: see the{' '}
              <Link to="/grievance" className="text-primary underline font-semibold">
                Grievance Officer page
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
