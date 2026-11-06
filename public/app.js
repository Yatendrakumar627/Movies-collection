/**
 * Watched - Frontend Application Script
 * Curated Cinema & Series Journal
 */

// Application State
const state = {
  items: [],
  filters: {
    status: 'all',
    type: 'all',
    watchYear: 'all',
    releaseYear: 'all',
    search: '',
    sort: 'watched_date_desc'
  },
  editingId: null,
  selectedIds: new Set()
};

// DOM Elements
const elements = {
  // Export Excel
  exportExcelBtn: document.getElementById('exportExcelBtn'),

  // About Modal
  openAboutModalBtn: document.getElementById('openAboutModalBtn'),
  aboutModal: document.getElementById('aboutModal'),
  closeAboutBtn: document.getElementById('closeAboutBtn'),
  closeAboutBtn2: document.getElementById('closeAboutBtn2'),

  // Stats
  statTotal: document.getElementById('statTotal'),
  statWatching: document.getElementById('statWatching'),
  statCompleted: document.getElementById('statCompleted'),
  statPlanToWatch: document.getElementById('statPlanToWatch'),
  statAvgRating: document.getElementById('statAvgRating'),

  // Controls
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  statusFilterTabs: document.getElementById('statusFilterTabs'),
  typeFilter: document.getElementById('typeFilter'),
  watchYearFilter: document.getElementById('watchYearFilter'),
  releaseYearFilter: document.getElementById('releaseYearFilter'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  sortBy: document.getElementById('sortBy'),
  displayedCount: document.getElementById('displayedCount'),
  selectedCountBadge: document.getElementById('selectedCountBadge'),
  selectAllVisibleBtn: document.getElementById('selectAllVisibleBtn'),

  // Grid & States
  mediaGrid: document.getElementById('mediaGrid'),
  emptyState: document.getElementById('emptyState'),
  emptyStateAddBtn: document.getElementById('emptyStateAddBtn'),
  loadingState: document.getElementById('loadingState'),

  // Bulk Action Bar
  bulkActionBar: document.getElementById('bulkActionBar'),
  bulkCountNum: document.getElementById('bulkCountNum'),
  bulkToggleAllBtn: document.getElementById('bulkToggleAllBtn'),
  bulkToggleAllText: document.getElementById('bulkToggleAllText'),
  bulkStatusSelect: document.getElementById('bulkStatusSelect'),
  bulkCategorySelect: document.getElementById('bulkCategorySelect'),
  bulkDeleteBtn: document.getElementById('bulkDeleteBtn'),
  bulkDeleteText: document.getElementById('bulkDeleteText'),
  bulkCloseBtn: document.getElementById('bulkCloseBtn'),

  // Modal
  itemModal: document.getElementById('itemModal'),
  itemForm: document.getElementById('itemForm'),
  modalTitle: document.getElementById('modalTitle'),
  itemId: document.getElementById('itemId'),
  inputTitle: document.getElementById('inputTitle'),
  inputType: document.getElementById('inputType'),
  inputStatus: document.getElementById('inputStatus'),
  inputGenre: document.getElementById('inputGenre'),
  inputYear: document.getElementById('inputYear'),
  inputRating: document.getElementById('inputRating'),
  ratingDisplay: document.getElementById('ratingDisplay'),
  starPreview: document.getElementById('starPreview'),
  inputPlatform: document.getElementById('inputPlatform'),
  inputWatchedDate: document.getElementById('inputWatchedDate'),
  inputPoster: document.getElementById('inputPoster'),
  inputNotes: document.getElementById('inputNotes'),
  openAddModalBtn: document.getElementById('openAddModalBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  saveBtnText: document.getElementById('saveBtnText'),

  // Toast
  toastContainer: document.getElementById('toastContainer')
};

// ==============================================================
// INITIALIZATION
// ==============================================================
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  fetchFilterOptions();
  fetchWatchlist();
  fetchStats();
});

// ==============================================================
// EVENT LISTENERS
// ==============================================================
function setupEventListeners() {
  // Export Excel
  if (elements.exportExcelBtn) {
    elements.exportExcelBtn.addEventListener('click', async () => {
      showToast('Generating Excel spreadsheet...', 'info');
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
        showToast('Spreadsheet downloaded successfully!', 'success');
      } catch (err) {
        console.error('Export error:', err);
        showToast(err.message || 'Failed to download spreadsheet', 'error');
      }
    });
  }

  // About modal controls
  if (elements.openAboutModalBtn) {
    elements.openAboutModalBtn.addEventListener('click', () => toggleAboutModal(true));
  }
  if (elements.closeAboutBtn) {
    elements.closeAboutBtn.addEventListener('click', () => toggleAboutModal(false));
  }
  if (elements.closeAboutBtn2) {
    elements.closeAboutBtn2.addEventListener('click', () => toggleAboutModal(false));
  }

  // Search input with debounce
  let searchTimeout = null;
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    elements.clearSearchBtn.classList.toggle('hidden', !val);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.filters.search = val;
      fetchWatchlist();
    }, 280);
  });

  // Clear search button
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.clearSearchBtn.classList.add('hidden');
    state.filters.search = '';
    fetchWatchlist();
    elements.searchInput.focus();
  });

  // Filter tabs (Watch status)
  elements.statusFilterTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;

    elements.statusFilterTabs.querySelectorAll('.filter-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    state.filters.status = tab.dataset.status;
    fetchWatchlist();
  });

  // Dropdown filter: Type / Category
  elements.typeFilter.addEventListener('change', (e) => {
    state.filters.type = e.target.value;
    fetchWatchlist();
  });

  // Dropdown filter: Watching Year (Timeline milestone)
  if (elements.watchYearFilter) {
    elements.watchYearFilter.addEventListener('change', (e) => {
      state.filters.watchYear = e.target.value;
      fetchWatchlist();
    });
  }

  // Dropdown filter: Release Year
  if (elements.releaseYearFilter) {
    elements.releaseYearFilter.addEventListener('change', (e) => {
      state.filters.releaseYear = e.target.value;
      fetchWatchlist();
    });
  }

  // Dropdown filter: Sort
  elements.sortBy.addEventListener('change', (e) => {
    state.filters.sort = e.target.value;
    fetchWatchlist();
  });

  // Reset Filters Button
  if (elements.resetFiltersBtn) {
    elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
  }

  // Open Modal (Add)
  elements.openAddModalBtn.addEventListener('click', () => openModalForCreate());
  if (elements.emptyStateAddBtn) {
    elements.emptyStateAddBtn.addEventListener('click', () => openModalForCreate());
  }

  // Close Modal
  elements.closeModalBtn.addEventListener('click', () => closeModal());
  elements.cancelModalBtn.addEventListener('click', () => closeModal());

  // Close modals on backdrop click
  elements.itemModal.addEventListener('click', (e) => {
    if (e.target === elements.itemModal) closeModal();
  });
  if (elements.aboutModal) {
    elements.aboutModal.addEventListener('click', (e) => {
      if (e.target === elements.aboutModal) toggleAboutModal(false);
    });
  }

  // Escape key closes modals or clears bulk selection
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (state.selectedIds.size > 0 && elements.itemModal.classList.contains('hidden') && (!elements.aboutModal || elements.aboutModal.classList.contains('hidden'))) {
        clearSelection();
        return;
      }
      closeModal();
      toggleAboutModal(false);
    }
  });

  // Bulk selection controls
  if (elements.selectAllVisibleBtn) {
    elements.selectAllVisibleBtn.addEventListener('click', toggleSelectAllVisible);
  }
  if (elements.bulkToggleAllBtn) {
    elements.bulkToggleAllBtn.addEventListener('click', toggleSelectAllVisible);
  }
  if (elements.bulkCloseBtn) {
    elements.bulkCloseBtn.addEventListener('click', clearSelection);
  }
  if (elements.bulkStatusSelect) {
    elements.bulkStatusSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        bulkUpdateStatus(e.target.value);
        e.target.value = '';
      }
    });
  }
  if (elements.bulkCategorySelect) {
    elements.bulkCategorySelect.addEventListener('change', (e) => {
      if (e.target.value) {
        bulkUpdateCategory(e.target.value);
        e.target.value = '';
      }
    });
  }
  if (elements.bulkDeleteBtn) {
    elements.bulkDeleteBtn.addEventListener('click', bulkDeleteItems);
  }

  // Rating range slider preview
  elements.inputRating.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    elements.ratingDisplay.textContent = val;
    elements.starPreview.textContent = getStars(val);
  });

  // Form Submission
  elements.itemForm.addEventListener('submit', handleFormSubmit);
}

// ==============================================================
// API CALLS
// ==============================================================

// Fetch dynamic filter options (Timeline Watch Years & Release Years)
async function fetchFilterOptions() {
  try {
    const res = await fetch('/api/filter-options');
    if (!res.ok) return;
    const data = await res.json();

    if (elements.watchYearFilter && Array.isArray(data.watchYears)) {
      elements.watchYearFilter.innerHTML = '<option value="all">Watching Year (All Timeline)</option>' +
        data.watchYears.map((yr) => `<option value="${yr}">Watched in ${yr}</option>`).join('');
    }

    if (elements.releaseYearFilter && Array.isArray(data.releaseYears)) {
      elements.releaseYearFilter.innerHTML = '<option value="all">Release Year (All)</option>' +
        data.releaseYears.map((yr) => `<option value="${yr}">Year ${yr}</option>`).join('');
    }
  } catch (err) {
    console.warn('Failed to load filter options:', err);
  }
}

// Update reset button visibility based on active filter state
function updateResetButtonVisibility() {
  if (!elements.resetFiltersBtn) return;
  const hasActive =
    state.filters.status !== 'all' ||
    state.filters.type !== 'all' ||
    state.filters.watchYear !== 'all' ||
    state.filters.releaseYear !== 'all' ||
    state.filters.search.trim() !== '' ||
    state.filters.sort !== 'watched_date_desc';

  elements.resetFiltersBtn.classList.toggle('hidden', !hasActive);
}

// Reset all filters back to default
function resetAllFilters() {
  state.filters.status = 'all';
  state.filters.type = 'all';
  state.filters.watchYear = 'all';
  state.filters.releaseYear = 'all';
  state.filters.search = '';
  state.filters.sort = 'watched_date_desc';

  elements.searchInput.value = '';
  elements.clearSearchBtn.classList.add('hidden');
  elements.typeFilter.value = 'all';
  if (elements.watchYearFilter) elements.watchYearFilter.value = 'all';
  if (elements.releaseYearFilter) elements.releaseYearFilter.value = 'all';
  elements.sortBy.value = 'watched_date_desc';

  elements.statusFilterTabs.querySelectorAll('.filter-tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.status === 'all');
  });

  updateResetButtonVisibility();
  fetchWatchlist();
}

// Fetch watchlist items with filters
async function fetchWatchlist() {
  elements.loadingState.classList.remove('hidden');
  elements.mediaGrid.classList.add('hidden');
  elements.emptyState.classList.add('hidden');

  updateResetButtonVisibility();

  try {
    const params = new URLSearchParams();
    if (state.filters.status && state.filters.status !== 'all') {
      params.append('status', state.filters.status);
    }
    if (state.filters.type && state.filters.type !== 'all') {
      params.append('category', state.filters.type);
    }
    if (state.filters.watchYear && state.filters.watchYear !== 'all') {
      params.append('watchYear', state.filters.watchYear);
    }
    if (state.filters.releaseYear && state.filters.releaseYear !== 'all') {
      params.append('releaseYear', state.filters.releaseYear);
    }
    if (state.filters.search) {
      params.append('search', state.filters.search);
    }
    if (state.filters.sort) {
      params.append('sort', state.filters.sort);
    }

    const res = await fetch(`/api/items?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch items');

    const data = await res.json();
    state.items = data.items || [];
    renderGrid(state.items);
  } catch (err) {
    console.error('Fetch error:', err);
    showToast('Failed to load watchlist: ' + err.message, 'error');
    elements.loadingState.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
  }
}

// Fetch dashboard statistics
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;

    const stats = await res.json();
    if (elements.statTotal) elements.statTotal.textContent = stats.total || 0;
    if (elements.statCompleted) elements.statCompleted.textContent = stats.completed || 0;
    if (elements.statPlanToWatch) elements.statPlanToWatch.textContent = stats.planToWatch || 0;
    if (elements.statWatching) elements.statWatching.textContent = stats.watching || 0;
    if (elements.statAvgRating) elements.statAvgRating.textContent = stats.avgRating ? Number(stats.avgRating).toFixed(1) : '7.7';
  } catch (err) {
    console.warn('Failed to fetch stats:', err);
  }
}

// Save (Create or Update) Item
async function handleFormSubmit(e) {
  e.preventDefault();

  const payload = {
    title: elements.inputTitle.value.trim(),
    type: elements.inputType.value,
    status: elements.inputStatus.value,
    genre: elements.inputGenre.value.trim(),
    release_year: elements.inputYear.value ? parseInt(elements.inputYear.value, 10) : null,
    rating: parseFloat(elements.inputRating.value),
    watched_date: elements.inputWatchedDate.value || null,
    platform: elements.inputPlatform.value.trim(),
    poster_url: elements.inputPoster.value.trim(),
    notes: elements.inputNotes.value.trim()
  };

  if (!payload.title) {
    showToast('Please enter a title', 'error');
    return;
  }

  const isEditing = Boolean(state.editingId);
  const url = isEditing ? `/api/items/${state.editingId}` : '/api/items';
  const method = isEditing ? 'PUT' : 'POST';

  elements.saveBtnText.textContent = 'Saving...';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save');
    }

    closeModal();
    showToast(state.editingId ? `Updated "${payload.title}"` : `Added "${payload.title}" to watchlist!`, 'success');
    fetchWatchlist();
    fetchStats();
  } catch (err) {
    console.error('Save error:', err);
    showToast('Failed to save title: ' + err.message, 'error');
  } finally {
    elements.saveBtnText.textContent = state.editingId ? 'Update Title' : 'Save Title';
  }
}

// Quick status toggle directly from card
async function quickUpdateStatus(id, newStatus) {
  try {
    const res = await fetch(`/api/items/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (!res.ok) throw new Error('Failed to update status');

    showToast('Status updated', 'success');
    fetchWatchlist();
    fetchStats();
  } catch (err) {
    showToast('Could not update status: ' + err.message, 'error');
  }
}

// Delete Item
async function deleteItem(id, title) {
  if (!confirm(`Are you sure you want to remove "${title}" from your watchlist?`)) {
    return;
  }

  try {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');

    showToast(`Removed "${title}"`, 'success');
    fetchWatchlist();
    fetchStats();
  } catch (err) {
    showToast('Could not delete item: ' + err.message, 'error');
  }
}

// ==============================================================
// RENDERING
// ==============================================================

function renderGrid(items) {
  elements.loadingState.classList.add('hidden');
  elements.displayedCount.textContent = items.length;

  updateBulkActionBar();

  if (items.length === 0) {
    elements.mediaGrid.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
    return;
  }

  elements.emptyState.classList.add('hidden');
  elements.mediaGrid.classList.remove('hidden');

  elements.mediaGrid.innerHTML = items.map((item) => createCardHtml(item)).join('');

  // Attach card event listeners
  elements.mediaGrid.querySelectorAll('.card-checkbox-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(btn.dataset.id, 10);
      if (state.selectedIds.has(id)) {
        state.selectedIds.delete(id);
      } else {
        state.selectedIds.add(id);
      }
      renderGrid(state.items);
    });
  });

  elements.mediaGrid.querySelectorAll('.btn-action-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const item = items.find((i) => i.id === id);
      if (item) openModalForEdit(item);
    });
  });

  elements.mediaGrid.querySelectorAll('.btn-action-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.dataset.id, 10);
      const title = btn.dataset.title;
      deleteItem(id, title);
    });
  });

  elements.mediaGrid.querySelectorAll('.card-status-select').forEach((sel) => {
    sel.addEventListener('change', (e) => {
      const id = parseInt(sel.dataset.id, 10);
      quickUpdateStatus(id, e.target.value);
    });
  });
}

function updateBulkActionBar() {
  if (!elements.bulkActionBar) return;

  const count = state.selectedIds.size;
  const visibleCount = state.items.length;
  const isAllSelected = visibleCount > 0 && state.items.every((i) => state.selectedIds.has(i.id));

  if (count > 0) {
    elements.bulkActionBar.classList.remove('hidden');
    if (elements.bulkCountNum) elements.bulkCountNum.textContent = count;
    if (elements.bulkDeleteText) elements.bulkDeleteText.textContent = `Delete (${count})`;
    if (elements.selectedCountBadge) {
      elements.selectedCountBadge.textContent = ` (${count} selected)`;
      elements.selectedCountBadge.classList.remove('hidden');
    }
    if (elements.bulkToggleAllText) {
      elements.bulkToggleAllText.textContent = isAllSelected ? 'Deselect All' : `Select All (${visibleCount})`;
    }
    if (elements.selectAllVisibleBtn) {
      elements.selectAllVisibleBtn.textContent = isAllSelected ? '✓ Deselect All' : `Select All (${visibleCount})`;
      elements.selectAllVisibleBtn.classList.toggle('active', isAllSelected);
      elements.selectAllVisibleBtn.classList.remove('hidden');
    }
  } else {
    elements.bulkActionBar.classList.add('hidden');
    if (elements.selectedCountBadge) elements.selectedCountBadge.classList.add('hidden');
    if (elements.selectAllVisibleBtn) {
      elements.selectAllVisibleBtn.textContent = `Select All (${visibleCount})`;
      elements.selectAllVisibleBtn.classList.remove('active');
      elements.selectAllVisibleBtn.classList.toggle('hidden', visibleCount === 0);
    }
  }
}

function toggleSelectAllVisible() {
  const visibleIds = state.items.map((i) => i.id);
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => state.selectedIds.has(id));

  if (isAllSelected) {
    visibleIds.forEach((id) => state.selectedIds.delete(id));
  } else {
    visibleIds.forEach((id) => state.selectedIds.add(id));
  }
  renderGrid(state.items);
}

function clearSelection() {
  state.selectedIds.clear();
  renderGrid(state.items);
}

async function bulkUpdateStatus(newStatus) {
  const ids = Array.from(state.selectedIds);
  if (ids.length === 0) return;

  try {
    const res = await fetch('/api/items/bulk/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, status: newStatus })
    });
    if (!res.ok) throw new Error('Bulk update failed');
    const data = await res.json();
    showToast(`Updated status for ${data.count} titles`, 'success');
    state.selectedIds.clear();
    fetchWatchlist();
    fetchStats();
  } catch (err) {
    showToast('Failed to update: ' + err.message, 'error');
  }
}

async function bulkUpdateCategory(newCategory) {
  const ids = Array.from(state.selectedIds);
  if (ids.length === 0) return;

  try {
    const res = await fetch('/api/items/bulk/category', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, category: newCategory })
    });
    if (!res.ok) throw new Error('Bulk category update failed');
    const data = await res.json();
    showToast(`Moved ${data.count} titles to "${newCategory}"`, 'success');
    state.selectedIds.clear();
    fetchWatchlist();
    fetchStats();
    fetchFilterOptions();
  } catch (err) {
    showToast('Failed to move: ' + err.message, 'error');
  }
}

async function bulkDeleteItems() {
  const ids = Array.from(state.selectedIds);
  if (ids.length === 0) return;

  if (!confirm(`Are you sure you want to permanently delete ${ids.length} selected titles from your watchlist?`)) {
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
    showToast(`Removed ${data.count} titles from watchlist`, 'success');
    state.selectedIds.clear();
    fetchWatchlist();
    fetchStats();
    fetchFilterOptions();
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

function createCardHtml(item) {
  const isSelected = state.selectedIds.has(item.id);
  const typeBadge = item.category || item.type || 'Bollywood';
  const statusFormatted = formatStatus(item.status);
  const stars = getStars(item.rating || 0);
  const watchedDateStr = item.watched_date ? formatDisplayDate(item.watched_date) : '';

  const posterHtml = item.poster_url
    ? `<img src="${escapeHtml(item.poster_url)}" alt="${escapeHtml(item.title)}" class="card-poster" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'poster-fallback\\'><span class=\\'fallback-icon\\'>🎬</span><span class=\\'fallback-title\\'>${escapeHtml(item.title)}</span></div>'">`
    : `<div class="poster-fallback">
         <span class="fallback-icon">🎬</span>
         <span class="fallback-title">${escapeHtml(item.title)}</span>
       </div>`;

  return `
    <article class="media-card ${isSelected ? 'card-selected' : ''}" data-id="${item.id}">
      <div class="card-poster-wrap">
        ${posterHtml}
        <div class="poster-badges">
          <div class="badge-left-group">
            <button type="button" class="card-checkbox-btn ${isSelected ? 'checked' : ''}" data-id="${item.id}" title="${isSelected ? 'Deselect title' : 'Select title for bulk action'}">
              <span class="checkbox-inner">${isSelected ? '✓' : ''}</span>
            </button>
            <span class="type-pill">${escapeHtml(typeBadge)}</span>
          </div>
          <span class="status-badge ${escapeHtml(item.status || '')}">${escapeHtml(statusFormatted)}</span>
        </div>
      </div>

      <div class="card-content">
        <div class="card-title-row">
          <h4 class="card-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</h4>
          ${item.release_year ? `<span class="card-year">${item.release_year}</span>` : ''}
        </div>

        <div class="card-meta">
          ${item.genre ? `<span class="card-genre">${escapeHtml(item.genre)}</span>` : ''}
          ${item.platform ? `<span class="card-platform">${escapeHtml(item.platform)}</span>` : ''}
        </div>

        ${watchedDateStr ? `
          <div class="card-watched-date">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>Watched: ${escapeHtml(watchedDateStr)}</span>
          </div>
        ` : ''}

        <div class="card-rating">
          <span class="rating-num">${item.rating != null ? Number(item.rating).toFixed(1) : '—'}</span>
          <span class="stars">${stars}</span>
        </div>

        ${item.notes ? `<p class="card-notes">${escapeHtml(item.notes)}</p>` : ''}

        <div class="card-footer">
          <select class="card-status-select" data-id="${item.id}" aria-label="Change status">
            <option value="plan_to_watch" ${item.status === 'plan_to_watch' ? 'selected' : ''}>Plan to Watch</option>
            <option value="watching" ${item.status === 'watching' ? 'selected' : ''}>Watching</option>
            <option value="completed" ${item.status === 'completed' ? 'selected' : ''}>Completed</option>
            <option value="dropped" ${item.status === 'dropped' ? 'selected' : ''}>Dropped</option>
          </select>

          <div class="card-actions">
            <button class="btn-icon btn-action-edit" data-id="${item.id}" title="Edit Title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn-icon danger btn-action-delete" data-id="${item.id}" data-title="${escapeHtml(item.title)}" title="Delete Title">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

// ==============================================================
// MODAL LOGIC
// ==============================================================

function openModalForCreate() {
  state.editingId = null;
  elements.modalTitle.textContent = 'Add Title to Watchlist';
  elements.saveBtnText.textContent = 'Save Title';
  elements.itemForm.reset();
  elements.itemId.value = '';
  elements.inputWatchedDate.value = '';
  elements.inputRating.value = '8';
  elements.ratingDisplay.textContent = '8';
  elements.starPreview.textContent = getStars(8);
  elements.itemModal.classList.remove('hidden');
  elements.inputTitle.focus();
}

function openModalForEdit(item) {
  state.editingId = item.id;
  elements.modalTitle.textContent = 'Edit Watchlist Item';
  elements.saveBtnText.textContent = 'Update Title';

  elements.itemId.value = item.id;
  elements.inputTitle.value = item.title || '';
  elements.inputType.value = item.category || item.type || 'Bollywood';
  elements.inputStatus.value = item.status || 'plan_to_watch';
  elements.inputGenre.value = item.genre || '';
  elements.inputYear.value = item.release_year || '';
  elements.inputWatchedDate.value = item.watched_date ? item.watched_date.substring(0, 10) : '';

  const r = item.rating != null ? item.rating : 8;
  elements.inputRating.value = r;
  elements.ratingDisplay.textContent = r;
  elements.starPreview.textContent = getStars(r);

  elements.inputPlatform.value = item.platform || '';
  elements.inputPoster.value = item.poster_url || '';
  elements.inputNotes.value = item.notes || '';

  elements.itemModal.classList.remove('hidden');
  elements.inputTitle.focus();
}

function closeModal() {
  elements.itemModal.classList.add('hidden');
  state.editingId = null;
}

function toggleAboutModal(show) {
  if (elements.aboutModal) {
    elements.aboutModal.classList.toggle('hidden', !show);
  }
}

// ==============================================================
// HELPERS
// ==============================================================

function formatStatus(status) {
  switch (status) {
    case 'plan_to_watch': return 'Plan to Watch';
    case 'watching': return 'Watching';
    case 'completed': return 'Completed';
    case 'dropped': return 'Dropped';
    default: return status || 'Unknown';
  }
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const raw = String(dateStr).substring(0, 10);
    const parts = raw.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(Date.UTC(year, month, day));
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
    }
    return raw;
  } catch (e) {
    return String(dateStr).substring(0, 10);
  }
}

function getStars(score) {
  const stars5 = score / 2;
  const fullStars = Math.floor(stars5);
  const halfStar = (stars5 - fullStars) >= 0.5 ? 1 : 0;
  const emptyStars = Math.max(0, 5 - fullStars - halfStar);
  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}
