import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Mail, Clock, FileText, Flag } from 'lucide-react';
import LegalFooter from '../../components/shared/LegalFooter';

export default function GrievanceOfficer() {
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
            <div className="font-bold">DRAFT — pending designation</div>
            <p className="mt-1 text-xs leading-relaxed">
              The Grievance Officer's name and direct phone line will be published before
              the public launch. The email address below is active now and is monitored
              daily. For urgent matters email first; we will route to the designated
              officer immediately.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-border p-6 md:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-extrabold text-secondary">Grievance Officer</h1>
            <p className="text-sm text-text-muted mt-2 leading-relaxed">
              In accordance with the Information Technology (Intermediary Guidelines and
              Digital Media Ethics Code) Rules, 2021 and the Digital Personal Data
              Protection Act 2023, FacultyConnect publishes a Grievance Officer contact.
              Use the channels below to escalate privacy concerns, abuse reports,
              takedown requests, or any matter you feel has not been resolved through the
              in-app Report flow.
            </p>
          </div>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-primary">
              Contact
            </div>
            <div className="space-y-2 text-sm text-text-light">
              <div>
                <strong>Name:</strong>{' '}
                <span className="text-text-muted italic">
                  To be designated (iGurus — Operator of FacultyConnect)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-primary shrink-0" />
                <strong>Email:</strong>{' '}
                <a
                  href="mailto:grievance@digifusion.in"
                  className="text-primary underline font-semibold"
                >
                  grievance@digifusion.in
                </a>
              </div>
              <div>
                <strong>Address:</strong>{' '}
                <span className="text-text-muted italic">
                  Published at launch alongside the designated officer's name
                </span>
              </div>
              <div>
                <strong>Working hours:</strong> Monday–Friday, 10:00 to 18:00 IST
                (excluding Indian public holidays). Grievances received outside these
                hours are acknowledged on the next working day.
              </div>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} /> Timelines
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>
                <strong>Acknowledgment within 24 hours</strong> of receiving your
                grievance (per IT Rules 2021, Rule 3(2)(a)).
              </li>
              <li>
                <strong>Resolution within 15 days</strong> of acknowledgment. Complex
                matters requiring investigation may extend; we will keep you informed of
                status in writing.
              </li>
              <li>
                Account deletion requests under the DPDP Act are handled within 7 days of
                the self-service grace period ending.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <FileText size={14} /> What you can escalate
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>Privacy or data-protection concerns under the DPDP Act 2023.</li>
              <li>Takedown requests for content that infringes your rights or impersonates you.</li>
              <li>Abuse, harassment, or stalking by another user that the in-app Report flow did not resolve.</li>
              <li>Fraudulent job postings or predatory journal listings.</li>
              <li>Platform security vulnerabilities (we welcome responsible disclosure).</li>
              <li>Any matter where an earlier in-app Report has gone unanswered past the SLA.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <Flag size={14} /> Preferred first step
            </h2>
            <p className="text-sm text-text-light leading-relaxed">
              For most matters the in-app Report flow is faster — it attaches the exact
              posting / profile / job you are flagging, which helps us investigate without
              a back-and-forth. Look for the flag icon next to any opportunity, job, or
              faculty profile. The Grievance Officer channel above is for escalations and
              formal complaints.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-secondary uppercase tracking-wider">
              What to include in a grievance email
            </h2>
            <ul className="text-sm text-text-light space-y-1 list-disc pl-5 leading-relaxed">
              <li>Your registered email and full name (so we can verify you).</li>
              <li>The URL of the content or account you are complaining about.</li>
              <li>A clear description of the issue and the remedy you want.</li>
              <li>Any supporting documents (screenshots, correspondence).</li>
              <li>Confirmation that the facts are true to your knowledge.</li>
            </ul>
          </section>
        </div>
      </main>

      <LegalFooter />
    </div>
  );
}
