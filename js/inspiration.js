/* ==========================================================================
   DESIGNPILOT AI - INSPIRATION CONTROLLER & CARD RENDERER (js/inspiration.js)
   ========================================================================== */

window.initInspiration = function(state) {
  const inspInput = document.getElementById('insp-page-search-input');
  const inspBtn = document.getElementById('insp-page-search-btn');
  const sourceSelect = document.getElementById('insp-source-select');

  // Default Provider
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
      
      if (e.target.value === 'Demo Mode') {
        state.provider = new window.DemoInspirationProvider(window.DESIGNPILOT_DATA ? window.DESIGNPILOT_DATA.INSPIRATIONS : []);
      } else {
        state.provider = new window.LiveSearchProvider();
      }
      
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

// Render Main Inspiration Grid with Visit Website ↗ & View Source ↗ Buttons
window.renderInspirationPage = async function(state) {
  const grid = document.getElementById('inspiration-grid-container');
  const activeTitle = document.getElementById('insp-active-title');
  const countText = document.getElementById('insp-count-text');

  if (!grid) return;

  // 1. Loading State Setup
  grid.style.display = 'grid';
  grid.innerHTML = Array(4).fill(0).map(() => `
    <div class="design-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="card-info">
        <div class="skeleton-line" style="width: 70%; height: 16px;"></div>
        <div class="skeleton-line" style="width: 40%; height: 12px; margin-top: 8px;"></div>
        <div class="skeleton-line" style="width: 100%; height: 32px; margin-top: 16px;"></div>
      </div>
    </div>
  `).join('');

  if (activeTitle) activeTitle.textContent = state.searchQuery || 'Design Inspiration';
  if (countText) countText.textContent = 'Searching inspiration provider...';

  let response = { items: [], searchMeta: {} };
  if (!state.provider) {
    state.provider = new window.LiveSearchProvider();
  }

  try {
    // 2. Execute Search
    response = await state.provider.search(state.searchQuery, {
      category: state.activeFilter || 'All',
      source: state.activeSource || 'All Sources'
    });
  } catch (err) {
    console.warn('[DesignPilot Provider] Provider search error:', err);
    response = {
      items: [],
      error: 'Inspiration search is temporarily unavailable.',
      message: err.message
    };
  } finally {
    // Ensure loading state terminates
  }

  // 3. Handle Error State
  if (response.error) {
    grid.style.display = 'block';
    if (countText) countText.textContent = 'Inspiration search is temporarily unavailable.';

    grid.innerHTML = `
      <div class="no-results-box" style="border: 1px dashed var(--border-color); padding: 36px 20px; text-align: center; border-radius: var(--radius-lg); background: var(--bg-surface);">
        <div class="no-results-icon" style="color: #f59e0b; font-size: 32px; margin-bottom: 12px;">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3 style="font-size: 18px; font-weight: 700; color: var(--text-heading); margin-bottom: 8px;">${response.error}</h3>
        <p style="color: var(--text-secondary); font-size: 14px; max-width: 520px; margin: 0 auto 16px auto; line-height: 1.5;">
          ${response.message || 'Please check your connection or try again shortly.'}
        </p>

        <div class="suggested-searches-list" style="margin-top: 16px;">
          <button class="suggestion-chip switch-demo-chip" style="background: var(--primary-color); color: #fff; border: none; font-weight: 600;">
            <i class="fa-solid fa-flask" style="margin-right: 6px;"></i> View Demo Results
          </button>
        </div>
      </div>
    `;

    const demoSwitchBtn = grid.querySelector('.switch-demo-chip');
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
  const searchMeta = response.searchMeta || {};

  // Header Title
  if (searchMeta.wasCorrected && searchMeta.correctedQuery) {
    if (activeTitle) {
      activeTitle.innerHTML = `${state.searchQuery} <span style="font-size: 13px; font-weight: 500; color: var(--primary-color); margin-left: 8px;">Showing results for "${searchMeta.correctedQuery}"</span>`;
    }
  } else {
    if (activeTitle) activeTitle.textContent = state.searchQuery || 'Design Inspiration';
  }

  // 4. Handle Empty State
  if (!results || results.length === 0) {
    grid.style.display = 'block';
    if (countText) countText.textContent = '0 inspirations found';

    grid.innerHTML = `
      <div class="no-results-box">
        <div class="no-results-icon"><i class="fa-solid fa-folder-open"></i></div>
        <h3>No inspiration found</h3>
        <p style="color: var(--text-secondary); font-size: 14px; margin-top: 6px;">We couldn't find matches for "${state.searchQuery}". Try searching one of these design topics:</p>

        <div class="suggested-searches-list">
          <button class="suggestion-chip insp-retry-chip" data-query="footwear ecommerce">footwear ecommerce</button>
          <button class="suggestion-chip insp-retry-chip" data-query="shoe ecommerce">shoe ecommerce</button>
          <button class="suggestion-chip insp-retry-chip" data-query="saas dashboard">saas dashboard</button>
          <button class="suggestion-chip insp-retry-chip" data-query="fintech dashboard">fintech dashboard</button>
          <button class="suggestion-chip insp-retry-chip" data-query="luxury fashion">luxury fashion</button>
        </div>
      </div>
    `;

    grid.querySelectorAll('.insp-retry-chip').forEach(chip => {
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

  // 5. Handle Success State
  grid.style.display = 'grid';
  if (countText) countText.textContent = `${results.length} inspiration result${results.length !== 1 ? 's' : ''}`;

  grid.innerHTML = results.map(item => {
    const isSaved = window.StorageManager ? window.StorageManager.isSaved(item.id) : false;
    
    const hasValidOriginal = isValidUrl(item.originalUrl);
    const hasValidSource = isValidUrl(item.sourceUrl);

    const displayImgSrc = item.previewImage || item.thumbnailImage || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="%231a1d21"/><text x="50%" y="50%" fill="%23777c85" font-size="16" font-family="sans-serif" text-anchor="middle" dy=".3em">No Preview Available</text></svg>';

    let actionButtonsHtml = '';
    if (hasValidOriginal && hasValidSource) {
      actionButtonsHtml = `
        <a href="${item.originalUrl}" target="_blank" rel="noopener" class="btn-original-link">
          Visit Website ↗
        </a>
        <a href="${item.sourceUrl}" target="_blank" rel="noopener" class="btn-original-link" style="background: var(--bg-subtle); border: 1px solid var(--border-color);" title="View source page">
          View Source ↗
        </a>
      `;
    } else if (hasValidOriginal) {
      actionButtonsHtml = `
        <a href="${item.originalUrl}" target="_blank" rel="noopener" class="btn-original-link">
          Visit Website ↗
        </a>
      `;
    } else if (hasValidSource) {
      actionButtonsHtml = `
        <a href="${item.sourceUrl}" target="_blank" rel="noopener" class="btn-original-link">
          View Source ↗
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
          <img class="card-thumb" src="${displayImgSrc}" alt="${item.title}" loading="lazy" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;600&quot; height=&quot;400&quot; viewBox=&quot;0 0 600 400&quot;><rect width=&quot;100%&quot; height=&quot;100%&quot; fill=&quot;%231a1d21&quot;/><text x=&quot;50%&quot; y=&quot;50%&quot; fill=&quot;%23777c85&quot; font-size=&quot;16&quot; font-family=&quot;sans-serif&quot; text-anchor=&quot;middle&quot; dy=&quot;.3em&quot;>Preview Unavailable</text></svg>';">
          
          <span class="card-source-tag">
            <span class="source-dot ${item.dotClass || 'dot-awwwards'}"></span> ${item.sourceName || item.source || 'Inspiration'}
            ${item.isDemo ? '<span class="demo-tag-pill">DEMO</span>' : ''}
          </span>

          ${item.relevanceScore ? `
            <span class="relevance-badge" title="Relevance Score">
              <i class="fa-solid fa-bolt" style="font-size: 10px;"></i> ${item.relevanceScore}%
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
  }).join('');

  attachInspirationCardEvents(grid, state);
};

function attachInspirationCardEvents(grid, state) {
  grid.querySelectorAll('.btn-card-save').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.currentTarget.dataset.id;
      if (window.StorageManager) {
        window.StorageManager.toggleSave(id);
        window.renderInspirationPage(state);
      }
    });
  });
}
