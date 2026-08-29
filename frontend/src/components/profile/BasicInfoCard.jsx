import React, { useState } from 'react';
import { User, Phone, Building2, GraduationCap } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import EditableSectionCard from './EditableSectionCard';

const DESIGNATIONS = [
  { value: 'Assistant', label: 'Assistant Professor' },
  { value: 'Associate', label: 'Associate Professor' },
  { value: 'Professor', label: 'Professor' },
  { value: 'Guest', label: 'Guest Professor' },
  { value: 'Research', label: 'Research Faculty' },
];

function designationLabel(value) {
  return DESIGNATIONS.find(d => d.value === value)?.label || value;
}

function ReadRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-text-muted shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold">
          {label}
        </div>
        <div className="text-sm text-text-light truncate">{value || <em className="text-text-muted">Not set</em>}</div>
      </div>
    </div>
  );
}

export default function BasicInfoCard({ faculty, onSave, onError }) {
  const [form, setForm] = useState({
    name: faculty.name || '',
    phone: faculty.phone || '',
    designation: faculty.designation || 'Assistant',
    department: faculty.department || '',
  });
  const [saving, setSaving] = useState(false);

  const readView = (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
      <ReadRow icon={<User size={15} />} label="Full name" value={faculty.name} />
      <ReadRow
        icon={<GraduationCap size={15} />}
        label="Designation"
        value={designationLabel(faculty.designation)}
      />
      <ReadRow icon={<Building2 size={15} />} label="Department" value={faculty.department} />
      <ReadRow icon={<Phone size={15} />} label="Phone" value={faculty.phone} />
    </div>
  );

  const editView = ({ onCancel }) => (
    <form
      className="space-y-4"
      onSubmit={async e => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
          await onSave({
            name: form.name.trim(),
            phone: form.phone.trim(),
            designation: form.designation,
            department: form.department.trim(),
          });
          onCancel();
        } catch (err) {
          onError?.(err.response?.data?.error?.message || 'Could not save basic info');
        } finally {
          setSaving(false);
        }
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basic-name">Full name</Label>
          <Input
            id="basic-name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            required
            minLength={2}
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="basic-designation">Designation</Label>
          <select
            id="basic-designation"
            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            value={form.designation}
            onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
          >
            {DESIGNATIONS.map(d => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="basic-department">Department</Label>
          <Input
            id="basic-department"
            value={form.department}
            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
            placeholder="e.g. Computer Science and Engineering"
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="basic-phone">Phone</Label>
          <Input
            id="basic-phone"
            value={form.phone}
            onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
            placeholder="Optional"
            maxLength={20}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  );

  return (
    <EditableSectionCard
      title="Basic information"
      subtitle="Your name, role, and contact number"
      icon={<User size={18} />}
      readView={readView}
      editView={editView}
      editLabel="Edit"
    />
  );
}
