import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import EditableSectionCard from './EditableSectionCard';

const MAX = 1000;

export default function BioCard({ bio = '', onSave, onError }) {
  const [draft, setDraft] = useState(bio);
  const [saving, setSaving] = useState(false);
  const isEmpty = !bio.trim();

  const readView = isEmpty ? (
    <p className="text-sm text-text-muted italic">
      A short summary of your research focus, approach, and what collaborators can expect from working with you.
    </p>
  ) : (
    <p className="text-sm text-text-light leading-relaxed whitespace-pre-line">{bio}</p>
  );

  const editView = ({ onCancel }) => (
    <div className="space-y-3">
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value.slice(0, MAX))}
        rows={6}
        placeholder="Write 2–4 sentences on your research interests, methodology, and what you're currently working on."
        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center justify-between">
        <span className={`text-[11px] ${draft.length > MAX - 80 ? 'text-warning font-semibold' : 'text-text-muted'}`}>
          {draft.length} / {MAX}
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(bio);
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
                await onSave(draft.trim());
                onCancel();
              } catch (err) {
                onError?.(err.response?.data?.error?.message || 'Could not save bio');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving…' : 'Save bio'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <EditableSectionCard
      title="About"
      subtitle="Short professional bio, visible on your directory profile"
      icon={<FileText size={18} />}
      isEmpty={isEmpty}
      addLabel="Add bio"
      readView={readView}
      editView={editView}
      onOpenEdit={() => setDraft(bio)}
    />
  );
}
