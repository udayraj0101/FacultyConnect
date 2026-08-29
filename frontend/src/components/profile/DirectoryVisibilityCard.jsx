import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';

export default function DirectoryVisibilityCard({ directoryVisible, onToggle, onError }) {
  const [saving, setSaving] = useState(false);

  const change = async e => {
    if (saving) return;
    setSaving(true);
    try {
      await onToggle(e.target.checked);
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not update visibility');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <div className="font-semibold">Directory visibility</div>
          <p className="text-sm text-text-muted mt-1 max-w-xl">
            When on, other faculty can find you by research domain in Directory Search. Your contact
            details stay hidden until you accept a connect request.
          </p>
        </div>
        <label className="inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={directoryVisible}
            onChange={change}
            disabled={saving}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-muted peer-checked:bg-primary rounded-full peer transition-colors relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-5"></div>
        </label>
      </CardContent>
    </Card>
  );
}
