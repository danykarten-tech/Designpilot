/* ==========================================================================
   DESIGNPILOT AI - PHASE 2E: MULTI-SOURCE INSPIRATION ARCHITECTURE (js/provider.js)
   ========================================================================== */

(function() {
  // -------------------------------------------------------------------------
  // 1. BASE PROVIDER INTERFACE & REGISTRY (Section 1)
  // -------------------------------------------------------------------------
  class InspirationProvider {
    constructor(name) {
      this.name = name || 'BaseProvider';
      this.status = 'Available';
    }

    async search(query, options = {}) {
      throw new Error('search method must be implemented by subclass provider.');
    }
  }

  // Provider Registry (Section 1)
  class InspirationProviderRegistry {
    constructor() {
      this.providers = [];
    }

    register(provider) {
      if (provider && typeof provider.search === 'function') {
        this.providers.push(provider);
      }
    }

    async searchAll(query, options = {}) {
      const limit = options.limit || 36;
      const providerStats = {};

      // Execute all registered providers in parallel (Section 21 & 22)
      const promises = this.providers.map(p => {
        return p.search(query, options).then(res => {
          providerStats[p.name] = (res.items || []).length;
          return res.items || [];
        }).catch(err => {
          console.warn(`[DesignPilot Registry] Provider ${p.name} search failed:`, err);
          providerStats[p.name] = 0;
          return [];
        });
      });

      const resultsArrays = await Promise.all(promises);
      let mergedItems = [];
      resultsArrays.forEach(arr => mergedItems.push(...arr));

      // 1. Deduplication (Section 10)
      mergedItems = mergeAndDeduplicateResults(mergedItems);

      // 2. Ranking (Section 11)
      mergedItems.forEach(item => {
        item.relevanceScore = calculateRelevance(item, query);
      });
      mergedItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // 3. Slice to target count (Section 9)
      const finalResults = mergedItems.slice(0, limit);

      return {
        query: query,
        normalizedQuery: (query || '').toLowerCase().trim(),
        results: finalResults,
        total: mergedItems.length,
        returnedCount: finalResults.length,
        providers: providerStats
      };
    }
  }

  // -------------------------------------------------------------------------
  // 2. RELEVANCE SCORE CALCULATOR (Section 11)
  // -------------------------------------------------------------------------
  function calculateRelevance(result, query) {
    if (!query || query.trim() === '') return 85;
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let score = 50;

    const textToSearch = [
      result.title,
      result.description,
      result.category,
      result.industry,
      result.style,
      result.pageType,
      result.contentType,
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

  // -------------------------------------------------------------------------
  // 3. MERGING & DEDUPLICATION (Section 10)
  // -------------------------------------------------------------------------
  function mergeAndDeduplicateResults(resultsList) {
    const seenUrls = new Set();
    const merged = [];

    resultsList.forEach(item => {
      let uniqueKey = '';
      if (item.originalUrl) {
        uniqueKey = item.originalUrl.toLowerCase().trim().replace(/\/$/, '');
      } else if (item.sourceUrl) {
        uniqueKey = (item.sourceUrl + '::' + (item.title || '')).toLowerCase().trim();
      } else {
        uniqueKey = (item.id || item.title || Math.random().toString()).toLowerCase().trim();
      }

      if (!seenUrls.has(uniqueKey)) {
        seenUrls.add(uniqueKey);
        merged.push(item);
      }
    });

    return merged;
  }

  // -------------------------------------------------------------------------
  // 4. DEMO INSPIRATION PROVIDER (Section 1 & 20)
  // -------------------------------------------------------------------------
  class DemoInspirationProvider extends InspirationProvider {
    constructor(data) {
      super('DemoInspirationProvider');
      this.dataset = (data || []).map(item => ({ ...item, isDemo: true }));
    }

    async search(query, filters = {}) {
      await new Promise(resolve => setTimeout(resolve, 150));

      let items = [...this.dataset];
      let searchMeta = {
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

      // Category Chip Filter
      if (filters.category && filters.category !== 'All') {
        if (filters.category === 'Saved') {
          const savedIds = window.StorageManager ? window.StorageManager.getSavedIds() : [];
          items = items.filter(item => savedIds.includes(item.id));
        } else {
          items = items.filter(item => {
            const catMatch = item.category && item.category.toLowerCase().includes(filters.category.toLowerCase());
            const tagMatch = item.tags && item.tags.some(t => t.toLowerCase().includes(filters.category.toLowerCase()));
            const styleMatch = item.style && item.style.toLowerCase().includes(filters.category.toLowerCase());
            return catMatch || tagMatch || styleMatch;
          });
        }
      }

      // Source Filter
      if (filters.source && filters.source !== 'All Sources') {
        items = items.filter(item => (item.sourceName || item.source || '').toLowerCase() === filters.source.toLowerCase());
      }

      return {
        items: items,
        searchMeta: searchMeta
      };
    }
  }

  // -------------------------------------------------------------------------
  // 5. WEB SEARCH PROVIDER ABSTRACTION (Section 3 & 15)
  // -------------------------------------------------------------------------
  class WebSearchProvider extends InspirationProvider {
    constructor() {
      super('WebSearchProvider');
    }

    async search(query, filters = {}) {
      // General Web Search Discovery
      if (window.DESIGNPILOT_DATA && Array.isArray(window.DESIGNPILOT_DATA.INSPIRATIONS)) {
        const webItems = window.DESIGNPILOT_DATA.INSPIRATIONS.filter(i => 
          i.sourceName === 'Web' || i.sourceName === 'Awwwards' || i.sourceName === 'Behance' || i.sourceName === 'Dribbble'
        ).map(item => ({
          ...item,
          id: `web-${item.id}`,
          isDemo: false,
          contentType: item.contentType || 'website'
        }));

        let filtered = webItems;
        if (window.SearchEngine) {
          const outcome = window.SearchEngine.searchAndRank(query, webItems);
          filtered = outcome.results;
        }
        return { items: filtered };
      }
      return { items: [] };
    }
  }

  // -------------------------------------------------------------------------
  // 6. ENVATO PROVIDER (Section 4)
  // -------------------------------------------------------------------------
  class EnvatoProvider extends InspirationProvider {
    constructor() {
      super('EnvatoProvider');
    }

    async search(query, filters = {}) {
      try {
        const res = await fetch('/api/inspiration/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters, provider: 'envato' })
        });
        if (!res.ok) return { items: [] };
        const data = await res.json();
        return { items: data.results || [] };
      } catch (e) {
        return { items: [] };
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. MULTI-SOURCE LIVE SEARCH PROVIDER (Orchestrator)
  // -------------------------------------------------------------------------
  class LiveSearchProvider extends InspirationProvider {
    constructor() {
      super('LiveSearchProvider');
    }

    async search(query, filters = {}) {
      try {
        const res = await fetch('/api/inspiration/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters, limit: 36 })
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log('[DesignPilot Provider] Multi-source search response:', data);

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

        // Fallback to Demo Dataset if 0 items returned
        if (items.length === 0 && window.DESIGNPILOT_DATA && window.DESIGNPILOT_DATA.INSPIRATIONS) {
          const demoProv = new DemoInspirationProvider(window.DESIGNPILOT_DATA.INSPIRATIONS);
          return demoProv.search(query, filters);
        }

        return {
          items: items,
          isLiveConfigured: data.isLiveConfigured !== false,
          searchMeta: {
            provider: 'Multi-Source Engine',
            normalizedQuery: query,
            providersUsed: data.providers || {}
          }
        };
      } catch (err) {
        console.warn('[DesignPilot Provider] Endpoint fallback to Demo:', err);
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

  // Documented Provider Stub Classes
  class AwwwardsProvider extends InspirationProvider {
    constructor() { super('AwwwardsProvider'); this.status = 'Integration unavailable'; }
  }
  class BehanceProvider extends InspirationProvider {
    constructor() { super('BehanceProvider'); this.status = 'Integration unavailable'; }
  }
  class DribbbleProvider extends InspirationProvider {
    constructor() { super('DribbbleProvider'); this.status = 'Integration unavailable'; }
  }

  window.calculateRelevance = calculateRelevance;
  window.mergeAndDeduplicateResults = mergeAndDeduplicateResults;
  window.InspirationProvider = InspirationProvider;
  window.InspirationProviderRegistry = InspirationProviderRegistry;
  window.DemoInspirationProvider = DemoInspirationProvider;
  window.WebSearchProvider = WebSearchProvider;
  window.EnvatoProvider = EnvatoProvider;
  window.LiveSearchProvider = LiveSearchProvider;
  window.AwwwardsProvider = AwwwardsProvider;
  window.BehanceProvider = BehanceProvider;
  window.DribbbleProvider = DribbbleProvider;
})();
