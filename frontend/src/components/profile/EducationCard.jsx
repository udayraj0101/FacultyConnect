import React, { useState } from 'react';
import { GraduationCap, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EditableSectionCard from './EditableSectionCard';

function emptyItem() {
  return {
    _key: `new-${Date.now()}-${Math.random()}`,
    degree: '',
    field: '',
    institution: '',
    year: '',
  };
}

function normalize(items) {
  return items.map(it => ({
    _key: it.id || it._key || `${it.degree}-${it.year}`,
    id: it.id,
    degree: it.degree || '',
    field: it.field || '',
    institution: it.institution || '',
    year: it.year ?? '',
  }));
}

export default function EducationCard({ items = [], onSave, onError }) {
  const [draft, setDraft] = useState(() => normalize(items));
  const [saving, setSaving] = useState(false);
  const isEmpty = items.length === 0;

  const sorted = [...items].sort((a, b) => (b.year || 0) - (a.year || 0));

  const readView = isEmpty ? (
    <p className="text-sm text-text-muted italic">
      Add your degrees — PhD, Masters, undergrad — so collaborators know your background.
    </p>
  ) : (
    <ul className="space-y-3">
      {sorted.map(it => (
        <li key={it.id} className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <GraduationCap size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-text-light">
              {it.degree}
              {it.field ? ` in ${it.field}` : ''}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {it.institution}
              {it.institution && it.year ? ' · ' : ''}
              {it.year || ''}
            </div>
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
            No degrees yet — click "Add degree" below.
          </div>
        )}
        {draft.map((it, idx) => (
          <div key={it._key} className="rounded-md border border-border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Degree {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setDraft(d => d.filter((_, i) => i !== idx))}
                className="p-1 rounded text-danger hover:bg-danger/10"
                aria-label="Remove this degree"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Degree *</Label>
                <Input
                  value={it.degree}
                  onChange={e => updateAt(idx, { degree: e.target.value })}
                  required
                  placeholder="e.g. Ph.D."
                />
              </div>
              <div>
                <Label>Field</Label>
                <Input
                  value={it.field}
                  onChange={e => updateAt(idx, { field: e.target.value })}
                  placeholder="e.g. Computer Science"
                />
              </div>
              <div>
                <Label>Institution</Label>
                <Input
                  value={it.institution}
                  onChange={e => updateAt(idx, { institution: e.target.value })}
                  placeholder="e.g. IIT Bombay"
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
          <Plus size={14} className="mr-1" /> Add degree
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
              const invalid = draft.find(it => !it.degree.trim());
              if (invalid) {
                onError?.('Every entry needs a degree');
                return;
              }
              setSaving(true);
              try {
                const payload = draft.map(it => ({
                  degree: it.degree.trim(),
                  field: it.field.trim(),
                  institution: it.institution.trim(),
                  year: it.year ? Number(it.year) : null,
                }));
                await onSave(payload);
                onCancel();
              } catch (err) {
                onError?.(err.response?.data?.error?.message || 'Could not save education');
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
      title="Education"
      subtitle="Your academic degrees"
      icon={<GraduationCap size={18} />}
      isEmpty={isEmpty}
      addLabel="Add degree"
      readView={readView}
      editView={editView}
      onOpenEdit={() => setDraft(normalize(items))}
    />
  );
}
