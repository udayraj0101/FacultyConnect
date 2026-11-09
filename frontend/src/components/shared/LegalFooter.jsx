import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Thin footer with the three legal links required by DPDP Act 2023 +
 * IT Rules 2021. Dropped into the landing, auth, public-profile and
 * legal pages. Deliberately small — doesn't steal attention on content
 * pages but guarantees the privacy / grievance route is reachable from
 * every anonymous surface.
 */
export default function LegalFooter() {
  return (
    <footer className="border-t border-border bg-white/60 mt-8">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4 flex-wrap text-xs text-text-muted">
        <div>
          © FacultyConnect · Operated by iGurus · Made for Indian academia
        </div>
        <nav className="flex items-center gap-4">
          <Link to="/privacy" className="hover:text-primary hover:underline">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-primary hover:underline">
            Terms
          </Link>
          <Link to="/grievance" className="hover:text-primary hover:underline">
            Grievance Officer
          </Link>
        </nav>
      </div>
    </footer>
  );
}
