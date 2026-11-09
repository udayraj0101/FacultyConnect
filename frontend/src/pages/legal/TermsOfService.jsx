import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import LegalFooter from '../../components/shared/LegalFooter';

export default function TermsOfService() {
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
              This copy is a placeholder drafted for discussion. It has not been reviewed
              by a lawyer and is not binding. The final terms will be published before the
              public launch.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-border p-6 md:p-8 space-y-5">
          <div>
            <h1 className="text-2xl font-extrabold text-secondary">Terms of Service</h1>
            <p className="text-xs text-text-muted mt-1">
              Effective date to be notified at launch · Governed by Indian law
            </p>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              1. Acceptance
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              By creating an account, you agree to these terms and the{' '}
              <Link to="/privacy" className="text-primary underline font-semibold">
                Privacy Policy
              </Link>
              . If you do not agree, do not create an account.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              2. Who can use FacultyConnect
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>You are a faculty member, researcher, or administrator at an Indian higher-education institution (university, college, research institute).</li>
              <li>You are 18 or older.</li>
              <li>
                You provide truthful information. Impersonating another person, inventing
                credentials, or falsifying institutional affiliation is grounds for
                immediate account termination.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              3. Account types
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Faculty Member:</strong> builds a profile, browses opportunities,
                applies to jobs, uses the directory and connect-request flow.
              </li>
              <li>
                <strong>College Admin:</strong> posts FDPs / conferences / jobs for a
                verified institution, manages faculty roster, reviews applicants. Must be
                authorised by the institution.
              </li>
              <li>
                <strong>Opportunity Organizer:</strong> journal publishers, conference
                committees, FDP hosts. Must pass verification before publishing.
              </li>
              <li>
                <strong>Platform Admin:</strong> internal moderation and support.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              4. Permitted use
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>Use the platform for its intended academic and professional purposes.</li>
              <li>
                Respect other users: no harassment, hate speech, cold-sales pitches, or
                mass outreach. Connect requests are structured and rate-limited for this
                reason.
              </li>
              <li>
                Do not scrape, mirror, or republish data from the Directory, public
                profiles, or opportunity listings without written permission.
              </li>
              <li>
                Do not post fraudulent job listings, predatory journal invitations, or
                content that misrepresents an institution's hiring intent.
              </li>
              <li>
                Do not attempt to probe, reverse-engineer, or disrupt the platform's
                security controls.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              5. Content you provide
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              You own what you put on your profile — bio, publication list, grants,
              awards, and so on. By publishing it you grant us a non-exclusive licence to
              store, display, and index it to the extent necessary to run the service
              (serving your profile to visitors, rendering the directory, generating PDFs
              you request). When you delete content or your account, our licence to use
              that content ends.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              6. Verification badges
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              Verification badges on institutions, journals, and faculty profiles reflect
              our best-effort checks against public records and third-party sources (ORCID,
              Scopus, AISHE, etc.). They are indicators, not guarantees. You remain
              responsible for your own due diligence before accepting a job offer, paying
              a journal submission fee, or responding to a connect request.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              7. Suspension and termination
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              We may suspend or remove an account that violates these terms, abuses the
              platform, or poses a safety risk to other users. Material violations may be
              handled without prior notice. You may terminate your account at any time
              from Profile → Privacy &amp; data → <em>Delete my account</em>, subject to
              the 7-day grace period.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              8. Disclaimers
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              The platform is provided on an "as is" basis. We do not guarantee that every
              opportunity listed is current, that every institution listed is actively
              hiring, or that every faculty profile is complete and up to date.
              Third-party data pulled from ORCID, Scopus, Crossref, or UGC sources is
              subject to those sources' own accuracy.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              9. Limitation of liability
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              To the maximum extent permitted by Indian law, our aggregate liability for
              any claim arising out of your use of the platform is limited to ₹10,000 or
              the fees you have paid us in the twelve months preceding the claim
              (whichever is higher). We are not liable for lost opportunities, lost
              profits, or consequential damages arising from platform downtime or
              third-party content.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              10. Governing law and disputes
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              These terms are governed by the laws of India. Disputes will be subject to
              the exclusive jurisdiction of the courts at Bengaluru, Karnataka. Before
              going to court, please escalate via the{' '}
              <Link to="/grievance" className="text-primary underline font-semibold">
                Grievance Officer
              </Link>{' '}
              so we have a chance to resolve the matter.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              11. Changes to these terms
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              When these terms change materially, we will notify you by email and require
              re-acceptance on your next sign-in. Continued use after the effective date
              of a change constitutes acceptance.
            </p>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
