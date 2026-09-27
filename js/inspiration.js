/* ==========================================================================
   DESIGNPILOT AI - INSPIRATION CONTROLLER & CARD RENDERER (js/inspiration.js)
   ========================================================================== */

window.initInspiration = function(state) {
  const inspInput = document.getElementById('insp-page-search-input');
  const inspBtn = document.getElementById('insp-page-search-btn');
  const sourceSelect = document.getElementById('insp-source-select');

  if (!state.provider) {
    state.provider = new window.LiveSearchProvider();
  }

  const triggerSearch = (query) => {
    state.searchQuery = query;
    if (inspInput) inspInput.value = query;

    if (query && query.trim() !== '' && window.StorageManager) {
      window.StorageManager.addRecentSearch(query);
    }

    renderRecentSearches(state);
    window.renderInspirationPage(state);
  };

  if (inspBtn && inspInput) {
    inspBtn.addEventListener('click', () => triggerSearch(inspInput.value));
    inspInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSearch(inspInput.value);
    });
  }

  if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
      state.activeSource = e.target.value;
      window.renderInspirationPage(state);
    });
  }

  // Category Filter Chips
  document.querySelectorAll('.insp-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      document.querySelectorAll('.insp-chip').forEach(c => c.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.activeFilter = e.currentTarget.dataset.filter;
      window.renderInspirationPage(state);
    });
  });

  renderRecentSearches(state);
  window.renderInspirationPage(state);
};

// Strict URL Validator
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

// Render Recent Searches History
function renderRecentSearches(state) {
  const container = document.getElementById('recent-searches-container');
  if (!container || !window.StorageManager) return;

  const history = window.StorageManager.getRecentSearches();

  if (history.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.innerHTML = `
    <span class="recent-label"><i class="fa-solid fa-clock-rotate-left"></i> Recent:</span>
    ${history.map(item => `
      <div class="recent-chip" data-query="${item}">
        <span class="recent-query-text">${item}</span>
        <button class="recent-delete-btn" data-delete="${item}" title="Delete search">&times;</button>
      </div>
    `).join('')}
  `;

  container.querySelectorAll('.recent-query-text').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const q = e.target.closest('.recent-chip').dataset.query;
      state.searchQuery = q;
      const inspInput = document.getElementById('insp-page-search-input');
      if (inspInput) inspInput.value = q;
      window.renderInspirationPage(state);
    });
  });

  container.querySelectorAll('.recent-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const q = e.currentTarget.dataset.delete;
      window.StorageManager.deleteRecentSearch(q);
      renderRecentSearches(state);
    });
  });
}

// Single Card HTML Generator
function renderCardHtml(item) {
  const isSaved = window.StorageManager ? window.StorageManager.isSaved(item.id) : false;
  
  const displayImgSrc = item.previewImage || item.thumbnailImage;
  const placeholderHtml = `
    <div class="card-thumb-placeholder" style="width:100%; height:180px; background:#131518; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#777c85; border-radius:var(--radius-md); border: 1px solid rgba(255,255,255,0.05); padding: 16px; text-align: center;">
      <span class="source-dot ${item.dotClass || 'dot-awwwards'}" style="width: 10px; height: 10px; margin-bottom: 8px;"></span>
      <span style="font-size:12px; font-weight:700; color: #e2e8f0; margin-bottom: 4px;">${item.sourceName || 'Source'}</span>
      <span style="font-size:11px; font-weight:500; color: #64748b;">No preview available</span>
    </div>
  `;

  const imgHtml = displayImgSrc 
    ? `<img class="card-thumb" src="${displayImgSrc}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.parentNode.innerHTML='${placeholderHtml.replace(/'/g, "&apos;")}';">`
    : placeholderHtml;

  const targetLink = item.originalUrl || item.url || item.sourceUrl;
  let actionButtonsHtml = '';
  if (isValidUrl(targetLink)) {
    actionButtonsHtml = `
      <a href="${targetLink}" target="_blank" rel="noopener noreferrer" class="btn-original-link">
        View Original ↗
      </a>
    `;
  } else {
    actionButtonsHtml = `
      <button disabled class="btn-original-link disabled" title="Link unavailable">
        Link unavailable
      </button>
    `;
  }

  return `
    <article class="design-card" data-id="${item.id}">
      <div class="card-thumb-wrapper">
        ${imgHtml}
        
        <span class="card-source-tag">
          <span class="source-dot ${item.dotClass || 'dot-awwwards'}"></span> ${item.sourceName || item.source || 'Web'}
          ${item.isDemo ? '<span class="demo-tag-pill">DEMO</span>' : ''}
        </span>

        ${item.relevanceScore ? `
          <span class="relevance-badge" title="Calculated Relevance Score">
            <i class="fa-solid fa-bolt" style="font-size: 10px;"></i> ${item.relevanceScore}% Match
          </span>
        ` : ''}
      </div>

      <div class="card-info">
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">
          <span>${item.category || 'Website'}</span> • <span>${item.pageType || 'Template'}</span>
        </div>

        <div class="card-actions-row">
          ${actionButtonsHtml}
          
          <button class="btn-card-icon btn-card-save ${isSaved ? 'saved' : ''}" data-id="${item.id}" title="${isSaved ? 'Remove from Saved' : 'Save Reference'}">
            <i class="${isSaved ? 'fa-solid fa-bookmark' : 'fa-regular fa-bookmark'}" style="${isSaved ? 'color: var(--primary-color);' : ''}"></i>
          </button>
        </div>
      </div>
    </article>
  `;
}

// Render Main Inspiration Page (Source-Grouped or Filtered)
window.renderInspirationPage = async function(state) {
  const container = document.getElementById('inspiration-grid-container');
  const activeTitle = document.getElementById('insp-active-title');
  const countText = document.getElementById('insp-count-text');

  if (!container) return;

  // 1. Loading State
  container.style.display = 'block';
  container.className = '';
  container.innerHTML = `
    <div style="padding: 28px 20px; background: var(--bg-surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); margin-bottom: 24px;">
      <div style="font-size: 14px; font-weight: 600; color: var(--primary-color); margin-bottom: 16px; display: flex; align-items: center; gap: 10px;">
        <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 16px;"></i>
        <span>Searching design inspiration across ThemeForest, GraphicRiver, Awwwards, Dribbble, Behance...</span>
      </div>
      <div class="design-grid">
        ${Array(4).fill(0).map(() => `
          <div class="design-card skeleton-card">
            <div class="skeleton-img"></div>
            <div class="card-info">
              <div class="skeleton-line" style="width: 70%; height: 16px;"></div>
              <div class="skeleton-line" style="width: 40%; height: 12px; margin-top: 8px;"></div>
              <div class="skeleton-line" style="width: 100%; height: 32px; margin-top: 16px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  if (activeTitle) activeTitle.textContent = state.searchQuery || 'Design Inspiration';
  if (countText) countText.textContent = 'Searching design sources...';

  let response = { items: [], groupedResults: {}, searchMeta: {} };
  if (!state.provider) {
    state.provider = new window.LiveSearchProvider();
  }

  try {
    response = await state.provider.search(state.searchQuery, {
      category: state.activeFilter || 'All',
      source: state.activeSource || 'All Sources'
    });
  } catch (err) {
    console.warn('[DesignPilot Provider] Search exception:', err);
    response = {
      items: [],
      groupedResults: {},
      error: 'Search temporarily unavailable.',
      message: err.message
    };
  }

  // 2. Error State Handling
  if (response.error) {
    container.style.display = 'block';
    if (countText) countText.textContent = 'Search temporarily unavailable';

    container.innerHTML = `
      <div class="no-results-box" style="border: 1px dashed var(--border-color); padding: 36px 20px; text-align: center; border-radius: var(--radius-lg); background: var(--bg-surface);">
        <div class="no-results-icon" style="color: #f59e0b; font-size: 32px; margin-bottom: 12px;">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-heading); margin-bottom: 8px;">${response.error}</h3>
        <p style="color: var(--text-secondary); font-size: 14px; max-width: 520px; margin: 0 auto 16px auto; line-height: 1.5;">
          ${response.message || 'The search service is temporarily unavailable. Please try again shortly.'}
        </p>

        <div class="suggested-searches-list" style="margin-top: 16px;">
          <button class="suggestion-chip switch-demo-chip" style="background: var(--primary-color); color: #fff; border: none; font-weight: 600;">
            <i class="fa-solid fa-flask" style="margin-right: 6px;"></i> Enable Development Demo Mode
          </button>
        </div>
      </div>
    `;

    const demoSwitchBtn = container.querySelector('.switch-demo-chip');
    if (demoSwitchBtn) {
      demoSwitchBtn.addEventListener('click', () => {
        state.provider = new window.DemoInspirationProvider(window.DESIGNPILOT_DATA ? window.DESIGNPILOT_DATA.INSPIRATIONS : []);
        const sourceSelect = document.getElementById('insp-source-select');
        if (sourceSelect) sourceSelect.value = 'Demo Mode';
        window.renderInspirationPage(state);
      });
    }
    return;
  }

  const results = response.items || [];
  const groupedResults = response.groupedResults || {};

  // Header Title
  if (activeTitle) activeTitle.textContent = state.searchQuery || 'Design Inspiration';

  // 3. Empty State Handling
  if (!results || results.length === 0) {
    container.style.display = 'block';
    if (countText) countText.textContent = '0 relevant inspirations found';

    container.innerHTML = `
      <div class="no-results-box">
        <div class="no-results-icon"><i class="fa-solid fa-folder-open"></i></div>
        <h3>No inspiration found</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin-top: 6px;">We couldn't find matches for "${state.searchQuery}". Try searching one of these topics:</p>

        <div class="suggested-searches-list">
          <button class="suggestion-chip insp-retry-chip" data-query="footwear ecommerce">footwear ecommerce</button>
          <button class="suggestion-chip insp-retry-chip" data-query="SaaS dashboard">SaaS dashboard</button>
          <button class="suggestion-chip insp-retry-chip" data-query="fintech website">fintech website</button>
          <button class="suggestion-chip insp-retry-chip" data-query="restaurant website">restaurant website</button>
          <button class="suggestion-chip insp-retry-chip" data-query="fashion ecommerce">fashion ecommerce</button>
          <button class="suggestion-chip insp-retry-chip" data-query="real estate website">real estate website</button>
          <button class="suggestion-chip insp-retry-chip" data-query="AI SaaS landing page">AI SaaS landing page</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.insp-retry-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const q = e.currentTarget.dataset.query;
        state.searchQuery = q;
        const inspInput = document.getElementById('insp-page-search-input');
        if (inspInput) inspInput.value = q;
        window.renderInspirationPage(state);
      });
    });
    return;
  }

  // 4. Success State Rendering
  if (countText) countText.textContent = `${results.length} relevant inspiration${results.length !== 1 ? 's' : ''}`;

  const currentSourceFilter = state.activeSource || 'All Sources';

  // If specific source is selected, render single grid
  if (currentSourceFilter !== 'All Sources') {
    container.style.display = 'grid';
    container.className = 'design-grid';
    container.innerHTML = results.map(renderCardHtml).join('');
    attachInspirationCardEvents(container, state);
    return;
  }

  // If "All Sources" is selected, render grouped sections ordered by exact priority!
  const sectionDefinitions = [
    { key: 'THEMEFOREST', title: 'ThemeForest', selectValue: 'ThemeForest', dotClass: 'dot-envato' },
    { key: 'ENVATO', title: 'Envato Elements', selectValue: 'Envato Elements', dotClass: 'dot-envato' },
    { key: 'GRAPHICRIVER', title: 'GraphicRiver', selectValue: 'GraphicRiver', dotClass: 'dot-envato' },
    { key: 'AWWWARDS', title: 'Awwwards', selectValue: 'Awwwards', dotClass: 'dot-awwwards' },
    { key: 'DRIBBBLE', title: 'Dribbble', selectValue: 'Dribbble', dotClass: 'dot-dribbble' },
    { key: 'BEHANCE', title: 'Behance', selectValue: 'Behance', dotClass: 'dot-behance' },
    { key: 'OTHER_INSPIRATION', title: 'Other Inspiration', selectValue: 'Other Inspiration', dotClass: 'dot-awwwards' },
    { key: 'LIVE_WEBSITE', title: 'Live Websites', selectValue: 'Live Websites', dotClass: 'dot-awwwards' },
    { key: 'ARTICLE', title: 'Articles & Collections', selectValue: 'All Sources', dotClass: 'dot-awwwards' }
  ];

  container.style.display = 'block';
  container.className = '';

  let htmlSections = '';

  sectionDefinitions.forEach(sec => {
    let sectionItems = groupedResults[sec.key] || [];
    
    // Apply visual category filter (e.g. Luxury, Minimal, Saved) if active
    if (state.activeFilter && state.activeFilter !== 'All') {
      if (state.activeFilter === 'Saved') {
        const savedIds = window.StorageManager ? window.StorageManager.getSavedIds() : [];
        sectionItems = sectionItems.filter(item => savedIds.includes(item.id));
      } else {
        const f = state.activeFilter.toLowerCase();
        sectionItems = sectionItems.filter(item => {
          const cat = (item.category || '').toLowerCase();
          const desc = (item.description || '').toLowerCase();
          const title = (item.title || '').toLowerCase();
          return cat.includes(f) || desc.includes(f) || title.includes(f);
        });
      }
    }

    if (sectionItems.length > 0) {
      htmlSections += `
        <section class="source-group-section">
          <div class="source-group-header">
            <div class="source-group-title-box">
              <span class="source-dot ${sec.dotClass}" style="width: 10px; height: 10px;"></span>
              <h3 class="source-group-title-text">${sec.title}</h3>
              <span class="source-group-count-badge">${sectionItems.length} result${sectionItems.length !== 1 ? 's' : ''}</span>
            </div>

            <button class="view-all-source-btn" data-source="${sec.selectValue}">
              View all ${sectionItems.length} →
            </button>
          </div>

          <div class="design-grid">
            ${sectionItems.map(renderCardHtml).join('')}
          </div>
        </section>
      `;
    }
  });

  if (!htmlSections) {
    container.style.display = 'grid';
    container.className = 'design-grid';
    container.innerHTML = results.map(renderCardHtml).join('');
  } else {
    container.innerHTML = htmlSections;
  }

  attachInspirationCardEvents(container, state);
};

function attachInspirationCardEvents(container, state) {
  // Save Bookmark Events
  container.querySelectorAll('.btn-card-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (window.StorageManager) {
        window.StorageManager.toggleSave(id);
        window.renderInspirationPage(state);
      }
    });
  });

  // "View all X →" Section Button Events
  container.querySelectorAll('.view-all-source-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const src = e.currentTarget.dataset.source;
      state.activeSource = src;
      const sourceSelect = document.getElementById('insp-source-select');
      if (sourceSelect) sourceSelect.value = src;
      window.renderInspirationPage(state);
    });
  });
}
