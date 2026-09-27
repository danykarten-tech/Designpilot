/* ==========================================================================
   DESIGNPILOT AI - PHASE 2C APP ENTRY POINT (app.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const state = {
    activeView: 'home',
    searchQuery: 'Footwear Ecommerce',
    activeFilter: 'All',
    isAIPanelOpen: false
  };

  // Helper for URL Validation (Section 14)
  function isValidUrl(urlStr) {
    if (!urlStr || typeof urlStr !== 'string' || urlStr.trim() === '') return false;
    const clean = urlStr.trim().toLowerCase();
    if (clean.startsWith('javascript:') || clean.startsWith('data:') || clean.startsWith('vbscript:')) {
      return false;
    }
    try {
      const parsed = new URL(urlStr);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch (e) {
      return false;
    }
  }

  // Initialize Modules
  if (window.initNavigation) window.initNavigation(state);
  if (window.initHome) window.initHome(state);
  if (window.initInspiration) window.initInspiration(state);
  if (window.initAIPanel) window.initAIPanel(state);
  if (window.initFigmaPage) window.initFigmaPage(state);
  if (window.initProjectsPage) window.initProjectsPage(state);
  if (window.initCmdk) window.initCmdk(state);

  // Detail Modal Global Helper (Section 5)
  const detailModal = document.getElementById('detail-modal-overlay');
  window.openDetailModal = function(itemId) {
    if (!window.DESIGNPILOT_DATA) return;
    const item = window.DESIGNPILOT_DATA.INSPIRATIONS.find(i => i.id === itemId);
    if (!item || !detailModal) return;

    const body = document.getElementById('detail-modal-body');
    const titleEl = document.getElementById('detail-card-title');
    if (titleEl) titleEl.textContent = item.title;

    const hasValidOriginal = isValidUrl(item.originalUrl);
    const hasValidSource = isValidUrl(item.sourceUrl);

    if (body) {
      body.innerHTML = `
        <img src="${item.previewImage}" alt="${item.title}" style="width: 100%; height: 260px; object-fit: cover; border-radius: var(--radius-lg); margin-bottom: 20px;">
        
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span class="card-source-tag" style="position: static;">
            <span class="source-dot ${item.dotClass}"></span> ${item.sourceName || item.source}
            ${item.isDemo ? '<span class="demo-tag-pill">DEMO</span>' : ''}
          </span>
          <span style="font-size: 13px; color: var(--text-muted); font-weight: 600;">${item.category} • ${item.style || 'Minimal'}</span>
        </div>

        <p style="font-size: 14px; color: var(--text-main); line-height: 1.6; margin-bottom: 16px;">${item.description}</p>

        <div style="background: var(--bg-subtle); padding: 14px; border-radius: var(--radius-md); font-size: 13px; margin-bottom: 20px;">
          <strong style="color: var(--primary-color);">Design Analysis:</strong> ${item.analysis || 'Standard grid layout with clean typographic hierarchy.'}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 12px;">
            ${hasValidOriginal ? `
              <a href="${item.originalUrl}" target="_blank" rel="noopener" class="hero-search-btn" style="text-decoration: none; flex: 1; justify-content: center;">
                Visit Website ↗
              </a>
            ` : `
              <button disabled class="hero-search-btn disabled" style="flex: 1; justify-content: center; opacity: 0.5; cursor: not-allowed;" title="Original website link unavailable">
                Link unavailable
              </button>
            `}
            
            ${hasValidSource ? `
              <a href="${item.sourceUrl}" target="_blank" rel="noopener" class="btn-original-link" style="background: var(--bg-subtle); color: var(--text-main); border: 1px solid var(--border-color);">
                View Source ↗
              </a>
            ` : ''}
          </div>
        </div>
      `;
    }

    detailModal.classList.add('active');
  };

  window.closeDetailModal = function() {
    if (detailModal) detailModal.classList.remove('active');
  };

  const closeBtn = document.getElementById('btn-close-detail-modal');
  if (closeBtn) closeBtn.addEventListener('click', window.closeDetailModal);
  if (detailModal) {
    detailModal.addEventListener('click', (e) => {
      if (e.target === detailModal) window.closeDetailModal();
    });
  }
});
