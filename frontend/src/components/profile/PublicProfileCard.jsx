import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Globe, Copy, Check, ExternalLink, ShieldCheck, EyeOff } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { useToast } from '../ui/Toast';

/**
 * Consent gate for the public/SEO profile at /f/{id}. Distinct from
 * DirectoryVisibilityCard because DPDP Act 2023 requires explicit consent
 * for public display + search-engine indexing — that's a bigger commitment
 * than "logged-in faculty can find me". Copy is deliberately blunt about
 * what's exposed and what isn't.
 */
export default function PublicProfileCard({ faculty, onToggle, onError }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const enabled = Boolean(faculty.publicProfileEnabled);
  // Prefer the vanity handle for the shareable URL — it survives even if
  // the faculty later toggles off/on (handle is set once and kept).
  const segment = faculty.publicHandle || faculty.id;
  const url = `${window.location.origin}/f/${segment}`;

  const change = async e => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await onToggle(e.target.checked);
      const newSeg = updated?.publicHandle || faculty.publicHandle || faculty.id;
      toast({
        title: e.target.checked ? 'Public profile enabled' : 'Public profile disabled',
        description: e.target.checked
          ? `Your profile is now publicly viewable at /f/${newSeg}`
          : 'Your profile is no longer accessible from outside FacultyConnect.',
        variant: e.target.checked ? 'success' : 'info',
      });
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not update public profile setting');
    } finally {
      setSaving(false);
    }
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      onError('Could not copy URL');
    }
  };

  return (
    <Card className={enabled ? 'border-primary/30' : ''}>
      <CardContent className="p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                enabled
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-text-muted'
              }`}
            >
              <Globe size={18} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text-light">Public profile & SEO</div>
              <p className="text-sm text-text-muted mt-1 max-w-xl">
                When on, your profile becomes publicly viewable at a shareable link and can be
                indexed by search engines. Great for citing in publications, listing on your CV,
                or portfolio use.
              </p>
            </div>
          </div>
          <label className="inline-flex items-center cursor-pointer shrink-0 pt-1">
            <input
              type="checkbox"
              checked={enabled}
              onChange={change}
              disabled={saving}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-checked:bg-primary rounded-full peer transition-colors relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="rounded-md border border-success/20 bg-success/5 p-3">
            <div className="flex items-center gap-1.5 font-semibold text-success">
              <ShieldCheck size={13} /> Visible publicly
            </div>
            <ul className="mt-1.5 text-text-muted space-y-0.5 list-disc pl-4">
              <li>Name, designation, department, institution</li>
              <li>Bio, research areas, ORCID iD</li>
              <li>Publications, employment, education, awards, grants</li>
              <li>External links (LinkedIn, Scholar, website, etc.)</li>
            </ul>
          </div>
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <div className="flex items-center gap-1.5 font-semibold text-text-light">
              <EyeOff size={13} /> Always hidden
            </div>
            <ul className="mt-1.5 text-text-muted space-y-0.5 list-disc pl-4">
              <li>Email address</li>
              <li>Phone number</li>
              <li>Connect-request history</li>
              <li>Bookmarks and applications</li>
            </ul>
            <div className="text-[11px] text-text-muted mt-2 italic">
              Contact stays locked. Others must go through a connect request.
            </div>
          </div>
        </div>

        {enabled && (
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3 flex items-center justify-between gap-3 flex-wrap">
            <code className="text-xs sm:text-sm text-text-light font-mono break-all">{url}</code>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyUrl}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-white px-3 py-1.5 text-xs font-semibold text-text-light hover:border-primary/40 hover:text-primary"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <Link
                to={`/f/${segment}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-primary text-white px-3 py-1.5 text-xs font-semibold hover:bg-primary/90"
              >
                View <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        )}

        <p className="text-[11px] text-text-muted leading-relaxed">
          By enabling this, you consent under the DPDP Act 2023 to public display of the
          fields listed above. You can disable anytime — search engines typically drop deindexed
          pages within a few days.
        </p>
      </CardContent>
    </Card>
  );
}
