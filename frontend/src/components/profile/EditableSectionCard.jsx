import React, { useState } from 'react';
import { Pencil, X } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

/**
 * Reusable card shell for profile sections that support inline editing.
 * Consumers render the read-only view and the edit form, and this shell
 * handles the toggle, cancel, and save affordances consistently.
 *
 * Props:
 *   - title, subtitle, icon
 *   - isEmpty         → whether to render the empty-state slot
 *   - readView        → JSX for the display state
 *   - editView(state) → render function receiving { onCancel } for the edit form
 *   - onOpenEdit      → called when user clicks the Edit / Add button; can be omitted
 *   - editLabel       → override the "Edit" button label (defaults to "Edit")
 *   - addLabel        → label when isEmpty (defaults to "Add")
 */
export default function EditableSectionCard({
  title,
  subtitle,
  icon,
  isEmpty = false,
  readView,
  editView,
  editLabel = 'Edit',
  addLabel = 'Add',
  onOpenEdit,
}) {
  const [editing, setEditing] = useState(false);

  const openEdit = () => {
    if (onOpenEdit) onOpenEdit();
    setEditing(true);
  };
  const closeEdit = () => setEditing(false);

  return (
    <Card>
      <CardContent className="p-5 sm:p-6">
        <header className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-text-light flex items-center gap-2">
              {icon && <span className="text-primary">{icon}</span>}
              {title}
            </h3>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
          </div>
          {!editing && (
            <Button size="sm" variant="outline" onClick={openEdit} className="shrink-0">
              {isEmpty ? (
                <>
                  <span className="text-lg leading-none mr-1">+</span> {addLabel}
                </>
              ) : (
                <>
                  <Pencil size={13} className="mr-1.5" /> {editLabel}
                </>
              )}
            </Button>
          )}
          {editing && (
            <button
              onClick={closeEdit}
              className="p-1.5 rounded-md text-text-muted hover:text-text-light hover:bg-muted shrink-0"
              aria-label="Cancel"
            >
              <X size={16} />
            </button>
          )}
        </header>

        {editing ? editView({ onCancel: closeEdit }) : readView}
      </CardContent>
    </Card>
  );
}
