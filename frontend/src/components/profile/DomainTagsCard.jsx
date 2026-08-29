import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';

export default function DomainTagsCard({ tags, onUpdateTags, onError }) {
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  const addTag = async () => {
    const tag = newTag.trim();
    if (!tag || saving) return;
    if (tags.includes(tag)) {
      setNewTag('');
      return;
    }
    setSaving(true);
    try {
      await onUpdateTags([...tags, tag]);
      setNewTag('');
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not add tag');
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async tag => {
    if (saving) return;
    setSaving(true);
    try {
      await onUpdateTags(tags.filter(t => t !== tag));
    } catch (err) {
      onError(err.response?.data?.error?.message || 'Could not remove tag');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Research domain tags</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 items-center">
          {tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary border border-primary/20 px-3 py-1 text-sm font-medium"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                disabled={saving}
                className="text-primary/60 hover:text-primary disabled:opacity-40"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <div className="inline-flex items-center gap-2">
            <input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="Add a research area"
              className="h-8 rounded-full border border-dashed border-border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <Button size="sm" variant="outline" onClick={addTag} disabled={saving || !newTag.trim()}>
              Add
            </Button>
          </div>
        </div>
        {tags.length === 0 && (
          <p className="mt-3 text-xs text-text-muted">
            Add research areas so other faculty can discover you and we can recommend relevant
            opportunities.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
