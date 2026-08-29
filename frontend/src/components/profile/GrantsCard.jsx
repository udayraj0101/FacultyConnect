import React, { useState } from 'react';
import { IndianRupee, Trash2, Plus } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EditableSectionCard from './EditableSectionCard';

const ROLES = ['PI', 'Co-PI', 'Investigator', 'Consultant'];

function emptyItem() {
  return {
    _key: `new-${Date.now()}-${Math.random()}`,
    title: '',
    agency: '',
    role: 'PI',
    amount: '',
    year: '',
    ongoing: false,
  };
}

function normalize(items) {
  return items.map(it => ({
    _key: it.id || it._key || `${it.title}-${it.year}`,
    id: it.id,
    title: it.title || '',
    agency: it.agency || '',
    role: it.role || 'PI',
    amount: it.amount ?? '',
    year: it.year ?? '',
    ongoing: !!it.ongoing,
  }));
}

function formatAmount(amount) {
  if (typeof amount !== 'number' || amount <= 0) return '';
  if (amount >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000) return `Rs. ${(amount / 100_000).toFixed(2)} L`;
  return `Rs. ${amount.toLocaleString('en-IN')}`;
}

export default function GrantsCard({ items = [], onSave, onError }) {
  const [draft, setDraft] = useState(() => normalize(items));
  const [saving, setSaving] = useState(false);
  const isEmpty = items.length === 0;

  const sorted = [...items].sort((a, b) => (b.year || 0) - (a.year || 0));

  const readView = isEmpty ? (
    <p className="text-sm text-text-muted italic">
      Funded research projects — DST, DBT, SERB, ICSSR, industry, or international grants.
    </p>
  ) : (
    <ul className="space-y-3">
      {sorted.map(it => (
        <li key={it.id} className="rounded-md border border-border bg-white p-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-text-light">{it.title}</div>
              <div className="text-xs text-text-muted mt-0.5 flex items-center gap-2 flex-wrap">
                {it.agency && <span>{it.agency}</span>}
                {it.agency && it.year ? <span>·</span> : null}
                {it.year && <span>{it.year}</span>}
                {it.ongoing && (
                  <span className="inline-flex items-center rounded-full bg-success/10 text-success border border-success/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
                    Ongoing
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider">
                {it.role}
              </span>
              {typeof it.amount === 'number' && it.amount > 0 && (
                <div className="text-xs font-semibold text-text-light mt-1">
                  {formatAmount(it.amount)}
                </div>
              )}
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
            No grants yet — click "Add grant" below.
          </div>
        )}
        {draft.map((it, idx) => (
          <div key={it._key} className="rounded-md border border-border p-4 space-y-3 bg-muted/30">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Grant {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => setDraft(d => d.filter((_, i) => i !== idx))}
                className="p-1 rounded text-danger hover:bg-danger/10"
                aria-label="Remove this grant"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div>
              <Label>Title *</Label>
              <Input
                value={it.title}
                onChange={e => updateAt(idx, { title: e.target.value })}
                required
                placeholder="e.g. Federated Learning for Rural Healthcare"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Funding agency</Label>
                <Input
                  value={it.agency}
                  onChange={e => updateAt(idx, { agency: e.target.value })}
                  placeholder="e.g. DST-SERB"
                />
              </div>
              <div>
                <Label>Your role</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={it.role}
                  onChange={e => updateAt(idx, { role: e.target.value })}
                >
                  {ROLES.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Amount (Rs.)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={it.amount}
                  onChange={e => updateAt(idx, { amount: e.target.value })}
                  placeholder="e.g. 2500000"
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
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={it.ongoing}
                onChange={e => updateAt(idx, { ongoing: e.target.checked })}
                className="accent-primary"
              />
              This grant is ongoing
            </label>
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
          <Plus size={14} className="mr-1" /> Add grant
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
                onError?.('Every grant needs a title');
                return;
              }
              setSaving(true);
              try {
                const payload = draft.map(it => ({
                  title: it.title.trim(),
                  agency: it.agency.trim(),
                  role: it.role,
                  amount: it.amount ? Number(it.amount) : null,
                  year: it.year ? Number(it.year) : null,
                  ongoing: !!it.ongoing,
                }));
                await onSave(payload);
                onCancel();
              } catch (err) {
                onError?.(err.response?.data?.error?.message || 'Could not save grants');
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
      title="Grants received"
      subtitle="Funded research projects"
      icon={<IndianRupee size={18} />}
      isEmpty={isEmpty}
      addLabel="Add grant"
      readView={readView}
      editView={editView}
      onOpenEdit={() => setDraft(normalize(items))}
    />
  );
}
