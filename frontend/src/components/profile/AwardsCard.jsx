import React, { useState } from 'react';
import { Award, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EditableSectionCard from './EditableSectionCard';

function emptyItem() {
  return {
    _key: `new-${Date.now()}-${Math.random()}`,
    title: '',
    year: '',
    description: '',
  };
}

function normalize(items) {
  return items.map(it => ({
    _key: it.id || it._key || `${it.title}-${it.year}`,
    id: it.id,
    title: it.title || '',
    year: it.year ?? '',
    description: it.description || '',
  }));
}

export default function AwardsCard({ items = [], onSave, onError }) {
  const [draft, setDraft] = useState(() => normalize(items));
  const [saving, setSaving] = useState(false);
  const isEmpty = items.length === 0;

  const sorted = [...items].sort((a, b) => (b.year || 0) - (a.year || 0));

  const readView = isEmpty ? (
    <p className="text-sm text-text-muted italic">
      Recognitions, fellowships, best-paper awards — anything that shows credibility.
    </p>
  ) : (
    <ul className="space-y-3">
      {sorted.map(it => (
        <li key={it.id} className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-secondary/10 text-secondary flex items-center justify-center shrink-0 mt-0.5">
            <Award size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-text-light">{it.title}</div>
            {it.year && <div className="text-xs text-text-muted mt-0.5">{it.year}</div>}
            {it.description && (
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{it.description}</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );

  const updateAt = (idx, patch) =>
    setDraft(d => d.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const editView = ({ onCancel }) => (
    <div className="space-y-4">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {draft.length === 0 && (
          <div className="text-sm text-text-muted italic text-center py-4">
            No awards yet — click "Add award" below.
          </div>
        )}
        {draft.map((it, idx) => (
          <div key={it._key} className="rounded-md border border-border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Award {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setDraft(d => d.filter((_, i) => i !== idx))}
                className="p-1 rounded text-danger hover:bg-danger/10"
                aria-label="Remove this award"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
              <div>
                <Label>Title *</Label>
                <Input
                  value={it.title}
                  onChange={e => updateAt(idx, { title: e.target.value })}
                  required
                  placeholder="e.g. INSA Young Scientist Award"
                />
              </div>
              <div>
                <Label>Year</Label>
                <Input
                  type="number"
                  min="1900"
                  max="2100"
                  value={it.year}
                  onChange={e => updateAt(idx, { year: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <textarea
                value={it.description}
                onChange={e => updateAt(idx, { description: e.target.value.slice(0, 300) })}
                rows={2}
                maxLength={300}
                placeholder="Optional context (max 300 chars)"
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDraft(d => [...d, emptyItem()])}
        >
          <Plus size={14} className="mr-1" /> Add award
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(normalize(items));
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
              const invalid = draft.find(it => !it.title.trim());
              if (invalid) {
                onError?.('Every award needs a title');
                return;
              }
              setSaving(true);
              try {
                const payload = draft.map(it => ({
                  title: it.title.trim(),
                  year: it.year ? Number(it.year) : null,
                  description: it.description.trim(),
                }));
                await onSave(payload);
                onCancel();
              } catch (err) {
                onError?.(err.response?.data?.error?.message || 'Could not save awards');
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? 'Saving…' : 'Save all'}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <EditableSectionCard
      title="Awards & recognitions"
      subtitle="Fellowships, best-paper awards, honors"
      icon={<Award size={18} />}
      isEmpty={isEmpty}
      addLabel="Add award"
      readView={readView}
      editView={editView}
      onOpenEdit={() => setDraft(normalize(items))}
    />
  );
}
