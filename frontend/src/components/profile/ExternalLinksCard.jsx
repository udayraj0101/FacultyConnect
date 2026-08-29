import React, { useState } from 'react';
import { Link as LinkIcon, Globe, Linkedin, BookOpen, Github, Twitter } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EditableSectionCard from './EditableSectionCard';

const FIELDS = [
  { key: 'website', label: 'Personal website', placeholder: 'https://yourname.in', icon: Globe },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/yourname', icon: Linkedin },
  { key: 'googleScholar', label: 'Google Scholar', placeholder: 'https://scholar.google.com/citations?user=...', icon: BookOpen },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/yourname', icon: Github },
  { key: 'twitter', label: 'X / Twitter', placeholder: 'https://x.com/yourname', icon: Twitter },
];

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function ExternalLinksCard({ links = {}, onSave, onError }) {
  const [draft, setDraft] = useState({
    website: links.website || '',
    linkedin: links.linkedin || '',
    googleScholar: links.googleScholar || '',
    github: links.github || '',
    twitter: links.twitter || '',
  });
  const [saving, setSaving] = useState(false);

  const populated = FIELDS.filter(f => links[f.key]);
  const isEmpty = populated.length === 0;

  const readView = isEmpty ? (
    <p className="text-sm text-text-muted italic">
      Add your website, LinkedIn, Google Scholar, and other public profiles.
    </p>
  ) : (
    <ul className="flex flex-wrap gap-2">
      {populated.map(f => {
        const Icon = f.icon;
        const url = links[f.key];
        return (
          <li key={f.key}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-full bg-muted hover:bg-primary/10 hover:text-primary transition-colors border border-border px-3 py-1.5 text-xs font-medium text-text-light"
            >
              <Icon size={13} />
              <span>{f.label}</span>
              <span className="text-text-muted">·</span>
              <span className="text-text-muted truncate max-w-[180px]">{domainOf(url)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );

  const editView = ({ onCancel }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(f => {
          const Icon = f.icon;
          return (
            <div key={f.key}>
              <Label htmlFor={`link-${f.key}`} className="flex items-center gap-1.5">
                <Icon size={13} /> {f.label}
              </Label>
              <Input
                id={`link-${f.key}`}
                type="url"
                value={draft[f.key]}
                onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft({
              website: links.website || '',
              linkedin: links.linkedin || '',
              googleScholar: links.googleScholar || '',
              github: links.github || '',
              twitter: links.twitter || '',
            });
            onCancel();
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const payload = Object.fromEntries(
                Object.entries(draft).map(([k, v]) => [k, (v || '').trim()]),
              );
              await onSave(payload);
              onCancel();
            } catch (err) {
              onError?.(err.response?.data?.error?.message || 'Could not save links');
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? 'Saving…' : 'Save links'}
        </Button>
      </div>
    </div>
  );

  return (
    <EditableSectionCard
      title="External links"
      subtitle="Website, LinkedIn, Google Scholar, etc."
      icon={<LinkIcon size={18} />}
      isEmpty={isEmpty}
      addLabel="Add links"
      readView={readView}
      editView={editView}
    />
  );
}
