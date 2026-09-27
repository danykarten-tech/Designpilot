/* ==========================================================================
   DESIGNPILOT AI - MULTI-SOURCE PROVIDER ARCHITECTURE (js/provider.js)
   ========================================================================== */

(function() {
  class InspirationProvider {
    constructor(name) {
      this.name = name || 'BaseProvider';
      this.status = 'Available';
    }

    async search(query, options = {}) {
      throw new Error('search method must be implemented by subclass provider.');
    }
  }

  // Provider Registry (Phase 3)
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
      const providerStats = [];

      const promises = this.providers.map(p => {
        return p.search(query, options).then(res => {
          providerStats.push({ name: p.name, status: 'success', count: (res.items || []).length });
          return res.items || [];
        }).catch(err => {
          providerStats.push({ name: p.name, status: 'failed', count: 0, reason: err.message });
          return [];
        });
      });

      const resultsArrays = await Promise.all(promises);
      let mergedItems = [];
      resultsArrays.forEach(arr => mergedItems.push(...arr));

      mergedItems = mergeAndDeduplicateResults(mergedItems);

      mergedItems.forEach(item => {
        if (!item.relevanceScore) {
          item.relevanceScore = calculateRelevance(item, query);
        }
      });
      mergedItems.sort((a, b) => b.relevanceScore - a.relevanceScore);

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

  // Demo Inspiration Provider (Phase 3 & 20)
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

      if (filters.source && filters.source !== 'All Sources') {
        items = items.filter(item => (item.sourceName || item.source || '').toLowerCase() === filters.source.toLowerCase());
      }

      return {
        items: items,
        searchMeta: searchMeta
      };
    }
  }

  // Web Search Provider Abstraction (Phase 8)
  class WebSearchProvider extends InspirationProvider {
    constructor() {
      super('WebSearchProvider');
    }

    async search(query, filters = {}) {
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

  // Envato Provider (Phase 4)
  class EnvatoProvider extends InspirationProvider {
    constructor() {
      super('EnvatoProvider');
    }

    async search(query, filters = {}) {
      try {
        const res = await fetch('/api/inspiration/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters, limit: 36 })
        });
        if (!res.ok) return { items: [] };
        const data = await res.json();
        return { items: data.results || [] };
      } catch (e) {
        return { items: [] };
      }
    }
  }

  // Live Server Search Provider (Tavily Web Search Integration)
  class LiveSearchProvider extends InspirationProvider {
    constructor() {
      super('LiveSearchProvider');
    }

    async search(query, filters = {}) {
      try {
        const res = await fetch('/api/inspiration/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, filters, limit: 40 })
        });

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();
        console.log('[DesignPilot Provider] Search response:', data);

        if (data.status === 'unconfigured') {
          return {
            items: [],
            error: data.error || 'Live search is not configured.',
            message: data.message || 'TAVILY_API_KEY environment variable is not configured in server environment.',
            isLiveConfigured: false
          };
        }

        if (data.status === 'error') {
          return {
            items: [],
            error: data.error || 'Search temporarily unavailable.',
            message: data.message || 'Failed to fetch search results.',
            isLiveConfigured: true
          };
        }

        let items = data.results || [];

        // Apply Category Filtering
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
              const descMatch = item.description && item.description.toLowerCase().includes(filters.category.toLowerCase());
              const titleMatch = item.title && item.title.toLowerCase().includes(filters.category.toLowerCase());
              return catMatch || tagMatch || styleMatch || typeMatch || descMatch || titleMatch;
            });
          }
        }

        // Apply Source Filtering
        if (filters.source && filters.source !== 'All Sources') {
          const srcFilter = filters.source.toLowerCase();
          items = items.filter(item => {
            const itemCategory = (item.sourceCategory || item.sourceName || item.source || '').toLowerCase();
            const itemSrc = (item.sourceName || item.source || '').toLowerCase();

            if (srcFilter === 'envato') return itemCategory === 'envato' || itemSrc.includes('envato');
            if (srcFilter === 'awwwards') return itemCategory === 'awwwards' || itemSrc.includes('awwwards');
            if (srcFilter === 'dribbble') return itemCategory === 'dribbble' || itemSrc.includes('dribbble');
            if (srcFilter === 'behance') return itemCategory === 'behance' || itemSrc.includes('behance');
            if (srcFilter === 'graphicriver') return itemCategory === 'graphicriver' || itemSrc.includes('graphicriver');
            if (srcFilter === 'other inspiration') return itemCategory === 'other inspiration';
            if (srcFilter === 'live websites') return itemCategory === 'live websites';

            return itemSrc.includes(srcFilter);
          });
        }

        return {
          items: items,
          isLiveConfigured: true,
          searchMeta: {
            provider: 'Tavily Web Search Engine',
            normalizedQuery: query
          }
        };
      } catch (err) {
        console.error('[DesignPilot Provider] Search endpoint error:', err);
        return {
          items: [],
          error: 'Search temporarily unavailable.',
          message: err.message
        };
      }
    }
  }

  // Documented Provider Stub Classes
  class AwwwardsProvider extends InspirationProvider {
    constructor() { super('AwwwardsProvider'); this.status = 'Not directly connected (No public API)'; }
  }
  class BehanceProvider extends InspirationProvider {
    constructor() { super('BehanceProvider'); this.status = 'Not directly connected'; }
  }
  class DribbbleProvider extends InspirationProvider {
    constructor() { super('DribbbleProvider'); this.status = 'Not directly connected'; }
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
