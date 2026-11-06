import React from 'react';
import {
  Layers,
  Play,
  Bookmark,
  Check,
  XCircle,
  LayoutGrid,
  List,
  Film,
  Calendar,
  Clock,
  ArrowUpDown,
  RotateCcw
} from 'lucide-react';

export default function Controls({
  statusFilter,
  onStatusChange,
  categoryFilter,
  onCategoryChange,
  watchYearFilter,
  onWatchYearChange,
  releaseYearFilter,
  onReleaseYearChange,
  sortBy,
  onSortChange,
  watchYears = [],
  releaseYears = [],
  onResetFilters,
  hasActiveFilters,
  viewMode = 'grid',
  onViewModeChange
}) {
  const statusTabs = [
    { id: 'all', label: 'All', icon: Layers },
    { id: 'completed', label: 'Watched', icon: Check },
    { id: 'plan_to_watch', label: 'Plan to Watch', icon: Bookmark },
    { id: 'watching', label: 'Watching', icon: Play },
    { id: 'dropped', label: 'Dropped', icon: XCircle }
  ];

  return (
    <section className="dashboard-controls-panel" aria-label="Filters and Sorting">
      {/* Row 1: Status Tab Strip + Grid/List View Toggles */}
      <div className="status-tabs-toolbar">
        <div className="status-pill-strip" role="tablist">
          {statusTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                className={`status-tab-btn ${isActive ? 'tab-active' : ''}`}
                onClick={() => onStatusChange(tab.id)}
              >
                <Icon size={14} className="tab-icon" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grid / List Layout Switcher */}
        {onViewModeChange && (
          <div className="view-mode-toggle-group" aria-label="Layout view mode">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
              title="Grid poster view"
              aria-label="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
              title="Compact list view"
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Row 2: Dropdown Filter Pills Toolbar */}
      <div className="filter-pills-row">
        {/* Category Filter */}
        <div className="pill-select-wrapper">
          <Film size={14} className="pill-select-icon" />
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryChange(e.target.value)}
            aria-label="Filter by category"
            className="pill-select"
          >
            <option value="all">All Categories</option>
            <option value="Bollywood">Bollywood</option>
            <option value="Hollywood">Hollywood</option>
            <option value="Web series">Web series</option>
            <option value="Anime">Anime</option>
            <option value="South">South</option>
            <option value="To Watch">To Watch</option>
            <option value="Old Collection">Old Collection</option>
            <option value="Uploaded Movies">Uploaded Movies</option>
            <option value="Uploaded Web series">Uploaded Web series</option>
          </select>
        </div>

        {/* Watching Year Timeline */}
        <div className="pill-select-wrapper">
          <Clock size={14} className="pill-select-icon" />
          <select
            value={watchYearFilter}
            onChange={(e) => onWatchYearChange(e.target.value)}
            aria-label="Filter by watching year timeline"
            className="pill-select"
          >
            <option value="all">Watching Year</option>
            {watchYears.map((yr) => (
              <option key={yr} value={yr}>
                Watched in {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Release Year */}
        <div className="pill-select-wrapper">
          <Calendar size={14} className="pill-select-icon" />
          <select
            value={releaseYearFilter}
            onChange={(e) => onReleaseYearChange(e.target.value)}
            aria-label="Filter by release year"
            className="pill-select"
          >
            <option value="all">Release Year</option>
            {releaseYears.map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div className="pill-select-wrapper">
          <ArrowUpDown size={14} className="pill-select-icon" />
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label="Sort order"
            className="pill-select"
          >
            <option value="watched_date_desc">Recent Watched</option>
            <option value="watched_date_asc">Oldest Watched</option>
            <option value="created_at_desc">Newest Added</option>
            <option value="created_at_asc">Oldest Added</option>
            <option value="rating_desc">Highest Rated (10 → 0)</option>
            <option value="rating_asc">Lowest Rated (0 → 10)</option>
            <option value="year_desc">Released: Newest First</option>
            <option value="year_asc">Released: Oldest First</option>
            <option value="title_asc">Title (A – Z)</option>
            <option value="title_desc">Title (Z – A)</option>
          </select>
        </div>

        {/* Reset Button */}
        <button
          type="button"
          className={`pill-reset-btn ${hasActiveFilters ? 'active' : ''}`}
          onClick={onResetFilters}
          title="Reset all filters to default"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>
      </div>
    </section>
  );
}
