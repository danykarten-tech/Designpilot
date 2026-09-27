/* ==========================================================================
   DESIGNPILOT AI - REAL & DEMO INSPIRATION PROVIDERS (js/provider.js)
   ========================================================================== */

(function() {
  // Base Provider Abstract Interface
  class InspirationProvider {
    constructor(name) {
      this.name = name || 'BaseProvider';
      this.status = 'Available';
    }

    async search(query, filters) {
      throw new Error('search method must be implemented by subclass provider.');
    }
  }

  // 1. Relevance Score Calculator (calculateRelevance)
  function calculateRelevance(result, query) {
    if (!query) return 85;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 50;

    const textToSearch = [
      result.title,
      result.description,
      result.category,
      result.industry,
      result.style,
      result.pageType,
      ...(result.tags || [])
    ].filter(Boolean).join(' ').toLowerCase();

    let matchedCount = 0;
    terms.forEach(term => {
      if (textToSearch.includes(term)) {
        matchedCount++;
        score += 15;
      }
    });

    if (textToSearch.includes(query.toLowerCase())) {
      score += 20;
    }

    const titleLower = (result.title || '').toLowerCase();
    terms.forEach(term => {
      if (titleLower.includes(term)) {
        score += 10;
      }
    });

    return Math.min(99, Math.max(45, score));
  }

  // 2. Demo Inspiration Provider (Demo Mode)
  class DemoInspirationProvider extends InspirationProvider {
    constructor(data) {
      super('DemoInspirationProvider');
      this.dataset = (data || []).map(item => ({ ...item, isDemo: true }));
    }

    async search(query, filters = {}) {
      await new Promise(resolve => setTimeout(resolve, 200));

      let items = [...this.dataset];
      let searchMeta = {
        wasCorrected: false,
        correctedQuery: '',
        normalizedQuery: query,
        provider: 'DemoInspirationProvider',
        isDemoMode: true
      };

      if (window.SearchEngine) {
        const outcome = window.SearchEngine.searchAndRank(query, items);
        items = outcome.results;
        searchMeta.wasCorrected = outcome.intent.wasCorrected;
        searchMeta.correctedQuery = outcome.intent.correctedQuery;
        searchMeta.normalizedQuery = outcome.intent.normalizedQuery;
      }

      // Filter by Category Chip
      if (filters.category && filters.category !== 'All') {
        if (filters.category === 'Saved') {
          const savedIds = window.StorageManager ? window.StorageManager.getSavedIds() : [];
          items = items.filter(item => savedIds.includes(item.id));
        } else {
          items = items.filter(item => {
            const catMatch = item.category && item.category.toLowerCase().includes(filters.category.toLowerCase());
            const tagMatch = item.tags && item.tags.some(t => t.toLowerCase() === filters.category.toLowerCase());
            const styleMatch = item.style && item.style.toLowerCase() === filters.category.toLowerCase();
            return catMatch || tagMatch || styleMatch;
          });
        }
      }

      // Filter by Source Dropdown
      if (filters.source && filters.source !== 'All Sources') {
        items = items.filter(item => (item.sourceName || item.source || '').toLowerCase() === filters.source.toLowerCase());
      }

      return {
        items,
        searchMeta
      };
    }
  }

  // 3. Live Server Search Provider (Backend Proxy via /api/inspiration/search)
  class LiveSearchProvider extends InspirationProvider {
    constructor() {
      super('LiveSearchProvider');
    }

    async search(query, filters = {}) {
      try {
        const res = await fetch('/api/inspiration/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters })
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log('[DesignPilot Provider] Live server search response:', data);

        // Handle Server Response Statuses
        if (data.status === 'demo_mode' || data.status === 'unconfigured') {
          // If server is in demo mode or unconfigured (missing API token), return demo dataset results
          if (window.DESIGNPILOT_DATA && window.DESIGNPILOT_DATA.INSPIRATIONS) {
            const demoProv = new DemoInspirationProvider(window.DESIGNPILOT_DATA.INSPIRATIONS);
            const demoRes = await demoProv.search(query, filters);
            demoRes.searchMeta.notice = data.message || 'Demo dataset active (Live search unconfigured)';
            return demoRes;
          }
        }

        if (data.status === 'rate_limited') {
          return {
            items: [],
            error: 'Search limit reached. Please try again shortly.',
            isLiveConfigured: true,
            searchMeta: { provider: 'LiveSearchProvider' }
          };
        }

        if (data.status === 'error') {
          return {
            items: [],
            error: 'Inspiration search is temporarily unavailable.',
            message: data.message,
            isLiveConfigured: true,
            searchMeta: { provider: 'LiveSearchProvider' }
          };
        }

        let items = data.results || [];

        // Apply Local Category Filtering if requested
        if (filters.category && filters.category !== 'All') {
          if (filters.category === 'Saved') {
            const savedIds = window.StorageManager ? window.StorageManager.getSavedIds() : [];
            items = items.filter(item => savedIds.includes(item.id));
          } else {
            items = items.filter(item => {
              const catMatch = item.category && item.category.toLowerCase().includes(filters.category.toLowerCase());
              const tagMatch = item.tags && item.tags.some(t => t.toLowerCase().includes(filters.category.toLowerCase()));
              const styleMatch = item.style && item.style.toLowerCase().includes(filters.category.toLowerCase());
              const typeMatch = item.pageType && item.pageType.toLowerCase().includes(filters.category.toLowerCase());
              return catMatch || tagMatch || styleMatch || typeMatch;
            });
          }
        }

        // Rank results using calculateRelevance
        items.forEach(item => {
          item.relevanceScore = calculateRelevance(item, query);
        });
        items.sort((a, b) => b.relevanceScore - a.relevanceScore);

        return {
          items: items,
          isLiveConfigured: true,
          searchMeta: {
            provider: 'Envato (Live)',
            normalizedQuery: query
          }
        };
      } catch (err) {
        console.warn('[DesignPilot Provider] Live search endpoint fallback to Demo:', err);
        // Fallback to Demo Mode if endpoint fails or network error occurs
        if (window.DESIGNPILOT_DATA && window.DESIGNPILOT_DATA.INSPIRATIONS) {
          const demoProv = new DemoInspirationProvider(window.DESIGNPILOT_DATA.INSPIRATIONS);
          return demoProv.search(query, filters);
        }

        return {
          items: [],
          error: 'Inspiration search is temporarily unavailable.',
          message: err.message,
          searchMeta: { provider: 'LiveSearchProvider' }
        };
      }
    }
  }

  // Documented Provider Classes
  class AwwwardsProvider extends InspirationProvider {
    constructor() { super('AwwwardsProvider'); this.status = 'Integration unavailable'; }
  }
  class BehanceProvider extends InspirationProvider {
    constructor() { super('BehanceProvider'); this.status = 'Integration unavailable'; }
  }
  class DribbbleProvider extends InspirationProvider {
    constructor() { super('DribbbleProvider'); this.status = 'Integration unavailable'; }
  }
  class EnvatoProvider extends LiveSearchProvider {
    constructor() { super('EnvatoProvider'); }
  }

  window.calculateRelevance = calculateRelevance;
  window.InspirationProvider = InspirationProvider;
  window.DemoInspirationProvider = DemoInspirationProvider;
  window.LiveSearchProvider = LiveSearchProvider;
  window.AwwwardsProvider = AwwwardsProvider;
  window.BehanceProvider = BehanceProvider;
  window.DribbbleProvider = DribbbleProvider;
  window.EnvatoProvider = EnvatoProvider;
})();
