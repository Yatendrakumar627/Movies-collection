import React from 'react';
import { CheckSquare, Square, Trash2, X, Film, CheckCircle2 } from 'lucide-react';

export default function BulkActionBar({
  selectedCount,
  totalVisible,
  isAllSelected,
  onToggleSelectAll,
  onBulkStatus,
  onBulkCategory,
  onBulkDelete,
  onClearSelection
}) {
  if (selectedCount === 0) return null;

  return (
    <aside className="bulk-action-bar" role="toolbar" aria-label="Bulk actions for selected titles">
      <div className="bulk-bar-inner">
        {/* Tier 1 / Left Meta: Selection Count, Toggle All & Dismiss */}
        <div className="bulk-meta-row">
          <div className="bulk-meta-left">
            <div className="bulk-count-badge">
              <span className="bulk-count-num">{selectedCount}</span>
              <span className="bulk-count-label">selected</span>
            </div>

            <button
              type="button"
              className="bulk-btn bulk-btn-toggle"
              onClick={onToggleSelectAll}
              title={isAllSelected ? 'Deselect all visible titles' : `Select all ${totalVisible} visible titles`}
            >
              {isAllSelected ? <CheckSquare size={14} /> : <Square size={14} />}
              <span className="bulk-toggle-full">{isAllSelected ? 'Deselect All' : `Select All (${totalVisible})`}</span>
              <span className="bulk-toggle-short">{isAllSelected ? 'Deselect' : 'Select All'}</span>
            </button>
          </div>

          <button
            type="button"
            className="bulk-btn-close mobile-only-close"
            onClick={onClearSelection}
            title="Clear selection (Esc)"
            aria-label="Clear selection"
          >
            <X size={15} />
          </button>
        </div>

        <div className="bulk-divider desktop-only-divider"></div>

        {/* Tier 2 / Action Controls: Status, Category & Delete */}
        <div className="bulk-actions-row">
          {/* Bulk Change Status */}
          <div className="bulk-select-group">
            <CheckCircle2 size={13} className="bulk-group-icon" />
            <select
              defaultValue=""
              className="bulk-select"
              onChange={(e) => {
                if (e.target.value) {
                  onBulkStatus(e.target.value);
                  e.target.value = '';
                }
              }}
              aria-label="Bulk change watch status"
            >
              <option value="" disabled>Status...</option>
              <option value="completed">Mark Watched</option>
              <option value="plan_to_watch">Plan to Watch</option>
              <option value="watching">Mark Watching</option>
              <option value="dropped">Mark Dropped</option>
            </select>
          </div>

          {/* Bulk Move Category */}
          <div className="bulk-select-group">
            <Film size={13} className="bulk-group-icon" />
            <select
              defaultValue=""
              className="bulk-select"
              onChange={(e) => {
                if (e.target.value) {
                  onBulkCategory(e.target.value);
                  e.target.value = '';
                }
              }}
              aria-label="Bulk change category"
            >
              <option value="" disabled>Category...</option>
              <option value="Movies">Movies</option>
              <option value="Bollywood">Bollywood</option>
              <option value="Hollywood">Hollywood</option>
              <option value="Web series">Web series</option>
              <option value="Anime">Anime</option>
              <option value="South">South Indian</option>
              <option value="Documentary">Documentary</option>
              <option value="To Watch">To Watch</option>
              <option value="Old Collection">Old Collection</option>
              <option value="Uploaded Movies">Uploaded Movies</option>
              <option value="Uploaded Web series">Uploaded Web series</option>
            </select>
          </div>

          {/* Bulk Delete */}
          <button
            type="button"
            className="bulk-btn bulk-btn-delete"
            onClick={onBulkDelete}
            title={`Delete ${selectedCount} selected title(s)`}
          >
            <Trash2 size={14} />
            <span className="bulk-delete-full">Delete ({selectedCount})</span>
            <span className="bulk-delete-short">Delete</span>
          </button>

          {/* Clear selection on desktop */}
          <button
            type="button"
            className="bulk-btn-close desktop-only-close"
            onClick={onClearSelection}
            title="Clear selection (Esc)"
            aria-label="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
