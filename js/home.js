/* ==========================================================================
   DESIGNPILOT AI - HOMEPAGE MODULE (js/home.js)
   ========================================================================== */

window.initHome = function(state) {
  const homeInput = document.getElementById('home-search-input');
  const homeBtn = document.getElementById('home-search-btn');

  const executeSearch = (query) => {
    state.searchQuery = query;
    document.getElementById('tab-inspiration').click();

    const inspInput = document.getElementById('insp-page-search-input');
    if (inspInput) inspInput.value = query;

    if (window.renderInspirationPage) {
      window.renderInspirationPage(state);
    }
  };

  if (homeBtn && homeInput) {
    homeBtn.addEventListener('click', () => {
      executeSearch(homeInput.value || 'Footwear Ecommerce');
    });
    homeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        executeSearch(homeInput.value || 'Footwear Ecommerce');
      }
    });
  }

  // Suggestion Chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      const query = e.currentTarget.dataset.query;
      if (homeInput) homeInput.value = query;
      executeSearch(query);
    });
  });

  // Render Featured Inspiration Visual Grid (3-4 columns)
  renderFeaturedGrid();
};

function renderFeaturedGrid() {
  const grid = document.getElementById('home-featured-grid');
  if (!grid || !window.DESIGNPILOT_DATA) return;

  const items = window.DESIGNPILOT_DATA.INSPIRATIONS.slice(0, 4);

  grid.innerHTML = items.map(item => `
    <article class="design-card" data-id="${item.id}">
      <div class="card-thumb-wrapper">
        <img class="card-thumb" src="${item.previewImage}" alt="${item.title}" loading="lazy">
        <span class="card-source-tag">
          <span class="source-dot ${item.dotClass}"></span> ${item.source}
        </span>
      </div>
      <div class="card-info">
        <h3 class="card-title">${item.title}</h3>
        <div class="card-meta">${item.category}</div>
        <div class="card-actions-row">
          <a href="${item.originalUrl}" target="_blank" rel="noopener" class="btn-original-link">
            View Original <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 11px;"></i>
          </a>
          <button class="btn-card-icon btn-card-detail" data-id="${item.id}" title="Inspect Details">
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.btn-card-detail').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (window.openDetailModal) {
        window.openDetailModal(e.currentTarget.dataset.id);
      }
    });
  });
}
