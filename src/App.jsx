import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import Controls from './components/Controls';
import MediaCard from './components/MediaCard';
import ItemModal from './components/ItemModal';
import DetailModal from './components/DetailModal';
import AboutModal from './components/AboutModal';
import BulkActionBar from './components/BulkActionBar';
import Toast from './components/Toast';
import { Plus, Upload } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, watching: 0, completed: 0, planToWatch: 0, avgRating: '0.0' });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  // Theme state: 'dark' (luxury cinema) or 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('watched_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('watched_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [watchYearFilter, setWatchYearFilter] = useState('all');
  const [releaseYearFilter, setReleaseYearFilter] = useState('all');
  const [sortBy, setSortBy] = useState('watched_date_desc');

  // Dynamic filter options from DB
  const [filterOptions, setFilterOptions] = useState({ watchYears: [], releaseYears: [] });

  // Bulk / Multiple Selection State
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Progressive Batched Virtual Rendering (Limits active DOM nodes to maintain 60 FPS)
  const [displayLimit, setDisplayLimit] = useState(36);
  const sentinelRef = useRef(null);

  // Reset display chunk limit when user filters or searches
  useEffect(() => {
    setDisplayLimit(36);
  }, [search, statusFilter, categoryFilter, watchYearFilter, releaseYearFilter, sortBy]);

  // Infinite Scroll IntersectionObserver (Appends 36 items as user approaches bottom)
  useEffect(() => {
    if (displayLimit >= items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0] && entries[0].isIntersecting) {
          setDisplayLimit((prev) => Math.min(prev + 36, items.length));
        }
      },
      { rootMargin: '600px' }
    );

    const el = sentinelRef.current;
    if (el) observer.observe(el);
    return () => {
      if (el) observer.unobserve(el);
    };
  }, [displayLimit, items.length]);

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  // Lock body scroll whenever a modal is open (Prevents mobile background scroll bleed)
  useEffect(() => {
    const isAnyModalOpen = isItemModalOpen || isAboutOpen || !!detailItem;
    if (isAnyModalOpen) {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');

      return () => {
        const topVal = document.body.style.top;
        const scrollYPos = topVal ? Math.abs(parseInt(topVal, 10)) : 0;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
        window.scrollTo(0, scrollYPos);
      };
    }
  }, [isItemModalOpen, isAboutOpen, detailItem]);

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }, []);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.warn('Failed to fetch stats:', e);
    }
  }, []);

  // Fetch Filter Options (Watch years timeline & Release years)
  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/filter-options');
      if (res.ok) {
        const data = await res.json();
        setFilterOptions(data);
      }
    } catch (e) {
      console.warn('Failed to fetch filter options:', e);
    }
  }, []);

  // Fetch Watchlist Items with full parameterized filters
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (watchYearFilter !== 'all') params.append('watchYear', watchYearFilter);
      if (releaseYearFilter !== 'all') params.append('releaseYear', releaseYearFilter);
      if (search.trim()) params.append('search', search.trim());
      if (sortBy) params.append('sort', sortBy);

      const res = await fetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to load items:', e);
      addToast('Failed to load watchlist: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, watchYearFilter, releaseYearFilter, search, sortBy, addToast]);

  useEffect(() => {
    fetchStats();
    fetchFilterOptions();
  }, [fetchStats, fetchFilterOptions]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchItems();
    }, 220);
    return () => clearTimeout(timeout);
  }, [fetchItems]);

  const hasActiveFilters =
    search.trim() !== '' ||
    statusFilter !== 'all' ||
    categoryFilter !== 'all' ||
    watchYearFilter !== 'all' ||
    releaseYearFilter !== 'all' ||
    sortBy !== 'watched_date_desc';

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setCategoryFilter('all');
    setWatchYearFilter('all');
    setReleaseYearFilter('all');
    setSortBy('watched_date_desc');
  };

  // Handle Save (Create or Update)
  const handleSaveItem = async (payload) => {
    try {
      const isEditing = Boolean(editingItem && editingItem.id);
      const url = isEditing ? `/api/items/${editingItem.id}` : '/api/items';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save item');
      }

      addToast(
        isEditing ? `Updated "${payload.title}"` : `Added "${payload.title}" to watchlist`,
        'success'
      );
      setIsItemModalOpen(false);
      setEditingItem(null);
      fetchItems();
      fetchStats();
      fetchFilterOptions();
    } catch (e) {
      addToast(e.message, 'error');
      throw e;
    }
  };

  // Quick Status Change on Card
  const handleStatusChange = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update status');
      }

      addToast('Status updated', 'success');
      setDetailItem((prev) => (prev && prev.id === id ? { ...prev, status: newStatus } : prev));
      fetchItems();
      fetchStats();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Delete Item
  const handleDeleteItem = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from your watchlist?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');

      addToast(`Removed "${title}"`, 'success');
      setDetailItem((prev) => (prev && prev.id === id ? null : prev));
      fetchItems();
      fetchStats();
      fetchFilterOptions();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  // Bulk Selection Handlers
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const visibleIds = items.map((i) => i.id);
  const isAllVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  // Keyboard shortcut: Esc to close detail modal or clear selection
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (detailItem) {
          setDetailItem(null);
          return;
        }
        if (!isItemModalOpen && !isAboutOpen && selectedIds.size > 0) {
          setSelectedIds(new Set());
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isItemModalOpen, isAboutOpen, detailItem, selectedIds.size]);

  // Bulk Status Update
  const handleBulkStatus = async (status) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const res = await fetch('/api/items/bulk/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status })
      });
      if (!res.ok) throw new Error('Bulk status update failed');
      const data = await res.json();
      addToast(`Updated status for ${data.count} titles`, 'success');
      setSelectedIds(new Set());
      fetchItems();
      fetchStats();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Bulk Category Update
  const handleBulkCategory = async (category) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const res = await fetch('/api/items/bulk/category', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, category })
      });
      if (!res.ok) throw new Error('Bulk category update failed');
      const data = await res.json();
      addToast(`Moved ${data.count} titles to "${category}"`, 'success');
      setSelectedIds(new Set());
      fetchItems();
      fetchStats();
      fetchFilterOptions();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (!window.confirm(`Are you sure you want to permanently remove ${ids.length} selected titles from your watchlist?`)) {
      return;
    }

    try {
      const res = await fetch('/api/items/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
      });
      if (!res.ok) throw new Error('Bulk delete failed');
      const data = await res.json();
      addToast(`Removed ${data.count} titles from watchlist`, 'success');
      setSelectedIds(new Set());
      fetchItems();
      fetchStats();
      fetchFilterOptions();
    } catch (e) {
      addToast(e.message, 'error');
    }
  };

  const handleExportExcel = useCallback(async () => {
    addToast('Generating Excel spreadsheet...', 'info');
    try {
      const res = await fetch('/api/export/excel');
      if (!res.ok) {
        throw new Error(`Export failed with HTTP status ${res.status}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('Please restart your dev server (node server.js) to activate the export route.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `Watched_Collection_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 200);
      addToast('Spreadsheet downloaded successfully!', 'success');
    } catch (err) {
      console.error('Export error:', err);
      addToast(err.message || 'Failed to download spreadsheet', 'error');
    }
  }, [addToast]);

  return (
    <>
      <div className="glow-sphere glow-1"></div>
      <div className="glow-sphere glow-2"></div>

      <Header
        search={search}
        onSearchChange={setSearch}
        onOpenAdd={handleOpenAdd}
        onOpenAbout={() => setIsAboutOpen(true)}
        onExportExcel={handleExportExcel}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="main-content">
        <StatsCards stats={stats} />

        <Controls
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          categoryFilter={categoryFilter}
          onCategoryChange={setCategoryFilter}
          watchYearFilter={watchYearFilter}
          onWatchYearChange={setWatchYearFilter}
          releaseYearFilter={releaseYearFilter}
          onReleaseYearChange={setReleaseYearFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          watchYears={filterOptions.watchYears}
          releaseYears={filterOptions.releaseYears}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <div className="results-header">
          <div className="results-count">
            Showing <span className="highlight-count">{items.length}</span> titles
            {hasActiveFilters && (
              <span className="filter-badge-hint"> (Filtered)</span>
            )}
            {selectedIds.size > 0 && (
              <span className="filter-badge-selected"> ({selectedIds.size} selected)</span>
            )}
          </div>

          {items.length > 0 && (
            <button
              type="button"
              className={`btn-select-all-inline ${isAllVisibleSelected ? 'active' : ''}`}
              onClick={handleToggleSelectAllVisible}
              title={isAllVisibleSelected ? 'Deselect all visible titles' : 'Select all visible titles'}
            >
              {isAllVisibleSelected ? '✓ Deselect All' : `Select All (${items.length})`}
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading your watchlist...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎬</div>
            <h3>No titles found</h3>
            <p>Try adjusting your search terms or filters, or reset to view all titles.</p>
            {hasActiveFilters ? (
              <button className="btn btn-secondary" onClick={handleResetFilters}>
                Clear All Filters
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleOpenAdd}>
                <Plus size={18} />
                <span>Add Your First Title</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <section className={`media-grid ${viewMode === 'list' ? 'grid-list-mode' : ''}`}>
              {items.slice(0, displayLimit).map((item) => (
                <MediaCard
                  key={item.id}
                  item={item}
                  onEdit={handleOpenEdit}
                  onDelete={handleDeleteItem}
                  onStatusChange={handleStatusChange}
                  onOpenDetail={setDetailItem}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelect={handleToggleSelect}
                  viewMode={viewMode}
                />
              ))}
            </section>

            {/* Seamless Sentinel for Progressive Batch Loading */}
            {displayLimit < items.length && (
              <div ref={sentinelRef} className="progressive-sentinel">
                <div className="progressive-spinner" aria-hidden="true"></div>
                <span className="progressive-text">Showing {displayLimit} of {items.length} titles...</span>
              </div>
            )}
          </>
        )}

        {/* Floating Action Button */}
        <button
          type="button"
          className={`floating-export-btn ${selectedIds.size > 0 ? 'fab-hidden-bulk' : ''}`}
          onClick={handleExportExcel}
          title="Instant Export to Excel"
          aria-label="Export to Excel"
        >
          <Upload size={22} strokeWidth={2.4} />
        </button>
      </main>

      <BulkActionBar
        selectedCount={selectedIds.size}
        totalVisible={items.length}
        isAllSelected={isAllVisibleSelected}
        onToggleSelectAll={handleToggleSelectAllVisible}
        onBulkStatus={handleBulkStatus}
        onBulkCategory={handleBulkCategory}
        onBulkDelete={handleBulkDelete}
        onClearSelection={handleClearSelection}
      />

      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
        existingItems={items}
      />

      <DetailModal
        isOpen={!!detailItem}
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={(item) => {
          setDetailItem(null);
          handleOpenEdit(item);
        }}
        onDelete={handleDeleteItem}
        onStatusChange={handleStatusChange}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />

      <Toast toasts={toasts} />
    </>
  );
}
