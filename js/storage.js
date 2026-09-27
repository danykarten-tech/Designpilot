/* ==========================================================================
   DESIGNPILOT AI - PHASE 2: STORAGE MANAGER (js/storage.js)
   ========================================================================== */

(function() {
  const SAVED_STORAGE_KEY = 'designpilot_saved_inspirations';
  const HISTORY_STORAGE_KEY = 'designpilot_recent_searches';

  window.StorageManager = {
    // ---------------------------------------------------------------------
    // 1. Saved Inspiration (LocalStorage)
    // ---------------------------------------------------------------------
    getSavedIds() {
      try {
        const stored = localStorage.getItem(SAVED_STORAGE_KEY);
        return stored ? JSON.parse(stored) : ['demo-001', 'demo-003'];
      } catch (e) {
        return ['demo-001', 'demo-003'];
      }
    },

    saveItem(id) {
      const saved = this.getSavedIds();
      if (!saved.includes(id)) {
        saved.push(id);
        try {
          localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(saved));
        } catch (e) {}
      }
      return saved;
    },

    removeItem(id) {
      let saved = this.getSavedIds();
      saved = saved.filter(i => i !== id);
      try {
        localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(saved));
      } catch (e) {}
      return saved;
    },

    isSaved(id) {
      return this.getSavedIds().includes(id);
    },

    toggleSave(id) {
      if (this.isSaved(id)) {
        this.removeItem(id);
        return false;
      } else {
        this.saveItem(id);
        return true;
      }
    },

    // ---------------------------------------------------------------------
    // 2. Recent Search History (LocalStorage)
    // ---------------------------------------------------------------------
    getRecentSearches() {
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        return stored ? JSON.parse(stored) : ['footwear ecommerce', 'luxury fashion', 'SaaS dashboard'];
      } catch (e) {
        return ['footwear ecommerce', 'luxury fashion', 'SaaS dashboard'];
      }
    },

    addRecentSearch(query) {
      if (!query || query.trim() === '') return;
      const q = query.trim();
      let history = this.getRecentSearches();

      // Remove existing occurrence & unshift to front
      history = history.filter(item => item.toLowerCase() !== q.toLowerCase());
      history.unshift(q);

      // Keep last 6 searches
      if (history.length > 6) history = history.slice(0, 6);

      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (e) {}
      return history;
    },

    deleteRecentSearch(query) {
      let history = this.getRecentSearches();
      history = history.filter(item => item.toLowerCase() !== query.toLowerCase());
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      } catch (e) {}
      return history;
    }
  };
})();
