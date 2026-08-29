import React, { useState } from 'react';
import { Briefcase, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EditableSectionCard from './EditableSectionCard';

function emptyItem() {
  return {
    _key: `new-${Date.now()}-${Math.random()}`,
    institution: '',
    designation: '',
    from: '',
    to: '',
    current: false,
    description: '',
  };
}

function normalizeItems(items) {
  return items.map(it => ({
    _key: it.id || it._key || `${it.institution}-${it.from}`,
    id: it.id,
    institution: it.institution || '',
    designation: it.designation || '',
    from: it.from ?? '',
    to: it.to ?? '',
    current: !!it.current,
    description: it.description || '',
  }));
}

function displayRange(from, to, current) {
  if (!from && !to && !current) return '';
  const start = from || '?';
  const end = current ? 'Present' : to || '?';
  return `${start} – ${end}`;
}

export default function EmploymentHistoryCard({ items = [], onSave, onError }) {
  const [draft, setDraft] = useState(() => normalizeItems(items));
  const [saving, setSaving] = useState(false);
  const isEmpty = items.length === 0;

  const sorted = [...items].sort((a, b) => {
    if (a.current && !b.current) return -1;
    if (!a.current && b.current) return 1;
    return (b.to || 9999) - (a.to || 9999);
  });

  const readView = isEmpty ? (
    <p className="text-sm text-text-muted italic">
      Add your current and past positions — institutions, dates, and a one-liner on what you did.
    </p>
  ) : (
    <ol className="space-y-4">
      {sorted.map(it => (
        <li key={it.id} className="relative pl-4 border-l-2 border-primary/30">
          <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-primary" />
          <div className="text-sm font-bold text-text-light">{it.designation || 'Faculty'}</div>
          <div className="text-sm text-text-light">{it.institution}</div>
          <div className="text-xs text-text-muted mt-0.5">
            {displayRange(it.from, it.to, it.current)}
            {it.current && (
              <span className="ml-2 inline-flex items-center rounded-full bg-success/10 text-success border border-success/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                Current
              </span>
            )}
          </div>
          {it.description && (
            <p className="text-xs text-text-muted mt-1 leading-relaxed">{it.description}</p>
          )}
        </li>
      ))}
    </ol>
  );

  const updateAt = (idx, patch) =>
    setDraft(d => d.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const editView = ({ onCancel }) => (
    <div className="space-y-4">
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        {draft.length === 0 && (
          <div className="text-sm text-text-muted italic text-center py-4">
            No entries yet — click "Add position" below.
          </div>
        )}
        {draft.map((it, idx) => (
          <div key={it._key} className="rounded-md border border-border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Position {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setDraft(d => d.filter((_, i) => i !== idx))}
                className="p-1 rounded text-danger hover:bg-danger/10"
                aria-label="Remove this position"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Institution *</Label>
                <Input
                  value={it.institution}
                  onChange={e => updateAt(idx, { institution: e.target.value })}
                  required
                  placeholder="e.g. IIT Madras"
                />
              </div>
              <div>
                <Label>Designation</Label>
                <Input
                  value={it.designation}
                  onChange={e => updateAt(idx, { designation: e.target.value })}
                  placeholder="e.g. Associate Professor"
                />
              </div>
              <div>
                <Label>From (year)</Label>
                <Input
                  type="number"
                  min="1900"
                  max="2100"
                  value={it.from}
                  onChange={e => updateAt(idx, { from: e.target.value })}
                />
              </div>
              <div>
                <Label>To (year)</Label>
                <Input
                  type="number"
                  min="1900"
                  max="2100"
                  value={it.to}
                  onChange={e => updateAt(idx, { to: e.target.value })}
                  disabled={it.current}
                  placeholder={it.current ? 'Present' : ''}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={it.current}
                onChange={e => updateAt(idx, { current: e.target.checked, to: e.target.checked ? '' : it.to })}
                className="accent-primary"
              />
              This is my current position
            </label>
            <div>
              <Label>Description</Label>
              <textarea
                value={it.description}
                onChange={e => updateAt(idx, { description: e.target.value.slice(0, 500) })}
                rows={2}
                maxLength={500}
                placeholder="Brief description of your role (max 500 chars)"
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
          <Plus size={14} className="mr-1" /> Add position
        </Button>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setDraft(normalizeItems(items));
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
              const invalid = draft.find(it => !it.institution.trim());
              if (invalid) {
                onError?.('Every position needs an institution');
                return;
              }
              setSaving(true);
              try {
                const payload = draft.map(it => ({
                  institution: it.institution.trim(),
                  designation: it.designation.trim(),
                  from: it.from ? Number(it.from) : null,
                  to: it.current ? null : it.to ? Number(it.to) : null,
                  current: !!it.current,
                  description: it.description.trim(),
                }));
                await onSave(payload);
                onCancel();
              } catch (err) {
                onError?.(err.response?.data?.error?.message || 'Could not save employment history');
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
      title="Employment history"
      subtitle="Past and current positions"
      icon={<Briefcase size={18} />}
      isEmpty={isEmpty}
      addLabel="Add position"
      readView={readView}
      editView={editView}
      onOpenEdit={() => setDraft(normalizeItems(items))}
    />
  );
}
