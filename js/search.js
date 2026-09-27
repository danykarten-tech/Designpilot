/* ==========================================================================
   DESIGNPILOT AI - PHASE 2: INTELLIGENT SEARCH ENGINE (js/search.js)
   ========================================================================== */

(function() {
  // -----------------------------------------------------------------------
  // 1. TYPO CORRECTION & SYNONYM DICTIONARY (Sections 2 & 3)
  // -----------------------------------------------------------------------
  const TYPO_DICTIONARY = {
    'footware': 'footwear',
    'footwearr': 'footwear',
    'fotwear': 'footwear',
    'shoo': 'shoe',
    'shoos': 'shoes',
    'sneker': 'sneaker',
    'snekers': 'sneakers',
    'ecommmerce': 'ecommerce',
    'e-commerce': 'ecommerce',
    'ecom': 'ecommerce',
    'shoppping': 'shopping',
    'dashbord': 'dashboard',
    'dashboad': 'dashboard',
    'anlytics': 'analytics',
    'fintechh': 'fintech',
    'finace': 'finance',
    'bankin': 'banking',
    'portfoli': 'portfolio',
    'portfolo': 'portfolio',
    'creativ': 'creative',
    'fashon': 'fashion',
    'luxry': 'luxury',
    'luxary': 'luxury',
    'healtcare': 'healthcare',
    'helthcare': 'healthcare',
    'restrant': 'restaurant',
    'restarant': 'restaurant',
    'trave': 'travel',
    'travle': 'travel'
  };

  const SYNONYM_GROUPS = {
    'footwear': ['footwear', 'footware', 'shoe', 'shoes', 'sneaker', 'sneakers', 'boots', 'sandals', 'kicks', 'cleats'],
    'ecommerce': ['ecommerce', 'e-commerce', 'store', 'shop', 'shopping', 'online store', 'retail', 'cart', 'checkout'],
    'dashboard': ['dashboard', 'admin', 'analytics', 'data', 'metrics', 'telemetry', 'control panel'],
    'fashion': ['fashion', 'apparel', 'clothing', 'style', 'luxury fashion', 'lookbook', 'wear', 'boutique'],
    'portfolio': ['portfolio', 'personal website', 'designer portfolio', 'creative portfolio', 'resume', 'case study'],
    'agency': ['agency', 'creative agency', 'design agency', 'studio', 'collective'],
    'fintech': ['fintech', 'finance', 'financial', 'banking', 'payment', 'wallet', 'crypto', 'money'],
    'saas': ['saas', 'software', 'platform', 'app', 'tool', 'cloud', 'landing page'],
    'healthcare': ['healthcare', 'health', 'medical', 'wellness', 'clinic', 'doctor'],
    'travel': ['travel', 'booking', 'hotel', 'tourism', 'flight', 'resort', 'vacation'],
    'restaurant': ['restaurant', 'food', 'culinary', 'dining', 'bistro', 'cafe', 'menu']
  };

  // Helper: map a term to its primary canonical category root
  function getCanonicalCategory(term) {
    if (!term) return null;
    const cleanTerm = TYPO_DICTIONARY[term.toLowerCase()] || term.toLowerCase();

    for (const [category, synonyms] of Object.entries(SYNONYM_GROUPS)) {
      if (synonyms.includes(cleanTerm)) {
        return category;
      }
    }
    return cleanTerm;
  }

  window.SearchEngine = {
    // Expose dictionary mapping for testing
    TYPO_DICTIONARY,
    SYNONYM_GROUPS,

    // ---------------------------------------------------------------------
    // 2. QUERY NORMALIZATION & TYPO TOLERANCE (Section 4)
    // ---------------------------------------------------------------------
    normalizeQuery(query) {
      if (!query || query.trim() === '') {
        return {
          original: '',
          normalized: '',
          tokens: [],
          correctedTokens: [],
          wasCorrected: false,
          correctedQuery: ''
        };
      }

      // 1. Convert to lowercase & trim extra whitespace
      let raw = query.toLowerCase().trim().replace(/\s+/g, ' ');

      // 2. Remove punctuation
      let cleaned = raw.replace(/[^\w\s-]/g, '');

      // 3. Tokenize & Typo Correction
      const tokens = cleaned.split(' ').filter(t => t.length > 0);
      let wasCorrected = false;

      const correctedTokens = tokens.map(token => {
        if (TYPO_DICTIONARY[token]) {
          wasCorrected = true;
          return TYPO_DICTIONARY[token];
        }
        return token;
      });

      const correctedQuery = correctedTokens.join(' ');

      return {
        original: query,
        normalized: cleaned,
        tokens,
        correctedTokens,
        wasCorrected,
        correctedQuery
      };
    },

    // ---------------------------------------------------------------------
    // 3. DESIGN INTENT DETECTION `parseDesignQuery(query)` (Section 5)
    // ---------------------------------------------------------------------
    parseDesignQuery(query) {
      const norm = this.normalizeQuery(query);
      
      let intent = {
        originalQuery: query,
        normalizedQuery: norm.correctedQuery || norm.normalized,
        wasCorrected: norm.wasCorrected,
        correctedQuery: norm.correctedQuery,
        industry: null,
        designType: null,
        style: null,
        pageType: null,
        platform: 'web',
        keywords: [...norm.correctedTokens],
        synonyms: []
      };

      const tokens = norm.correctedTokens;

      // Detect Primary Categories & Industries
      tokens.forEach(token => {
        const canonical = getCanonicalCategory(token);

        if (canonical === 'footwear') {
          intent.industry = 'Footwear';
          intent.designType = intent.designType || 'Ecommerce';
          intent.synonyms.push(...SYNONYM_GROUPS['footwear']);
        } else if (canonical === 'fashion') {
          intent.industry = intent.industry || 'Fashion';
          intent.designType = intent.designType || 'Ecommerce';
          intent.synonyms.push(...SYNONYM_GROUPS['fashion']);
        } else if (canonical === 'saas') {
          intent.industry = 'SaaS';
          intent.designType = intent.designType || 'Landing Page';
          intent.synonyms.push(...SYNONYM_GROUPS['saas']);
        } else if (canonical === 'dashboard') {
          intent.designType = 'Dashboard';
          intent.synonyms.push(...SYNONYM_GROUPS['dashboard']);
        } else if (canonical === 'fintech') {
          intent.industry = 'Fintech';
          intent.designType = intent.designType || 'Dashboard';
          intent.synonyms.push(...SYNONYM_GROUPS['fintech']);
        } else if (canonical === 'portfolio') {
          intent.industry = 'Creative';
          intent.designType = 'Portfolio';
          intent.pageType = 'Portfolio';
          intent.synonyms.push(...SYNONYM_GROUPS['portfolio']);
        } else if (canonical === 'agency') {
          intent.industry = 'Agency';
          intent.designType = 'Landing Page';
          intent.synonyms.push(...SYNONYM_GROUPS['agency']);
        } else if (canonical === 'ecommerce') {
          intent.designType = 'Ecommerce';
          intent.synonyms.push(...SYNONYM_GROUPS['ecommerce']);
        } else if (canonical === 'healthcare') {
          intent.industry = 'Healthcare';
          intent.synonyms.push(...SYNONYM_GROUPS['healthcare']);
        } else if (canonical === 'travel') {
          intent.industry = 'Travel';
          intent.synonyms.push(...SYNONYM_GROUPS['travel']);
        } else if (canonical === 'restaurant') {
          intent.industry = 'Restaurant';
          intent.synonyms.push(...SYNONYM_GROUPS['restaurant']);
        }

        // Style detection
        if (token === 'luxury' || token === 'premium') intent.style = 'Luxury';
        if (token === 'minimal' || token === 'clean') intent.style = 'Minimal';
        if (token === 'dark') intent.style = 'Dark';
        if (token === 'bold') intent.style = 'Bold';
        if (token === 'editorial') intent.style = 'Editorial';

        // PageType detection
        if (token === 'website' || token === 'site' || token === 'homepage') intent.pageType = 'Homepage';
        if (token === 'landing') intent.pageType = 'Landing Page';
        if (token === 'mobile' || token === 'app') intent.platform = 'mobile';
      });

      return intent;
    },

    // ---------------------------------------------------------------------
    // 4. MULTI-WEIGHT RELEVANCE RANKING (Section 6)
    // ---------------------------------------------------------------------
    calculateRelevanceScore(item, intent) {
      if (!intent || !intent.normalizedQuery) return 50;

      let score = 0;
      const tokens = intent.keywords;
      const synonyms = intent.synonyms;

      const titleLower = item.title ? item.title.toLowerCase() : '';
      const descLower = item.description ? item.description.toLowerCase() : '';
      const catLower = item.category ? item.category.toLowerCase() : '';
      const indLower = item.industry ? item.industry.toLowerCase() : '';
      const styleLower = item.style ? item.style.toLowerCase() : '';
      const pageTypeLower = item.pageType ? item.pageType.toLowerCase() : '';
      const tagsLower = (item.tags || []).map(t => t.toLowerCase());

      // 1. Industry Match (+50)
      if (intent.industry && indLower.includes(intent.industry.toLowerCase())) {
        score += 50;
      }

      // 2. Design Type / Category Match (+30)
      if (intent.designType && (catLower.includes(intent.designType.toLowerCase()) || tagsLower.some(t => t.includes(intent.designType.toLowerCase())))) {
        score += 30;
      }

      // 3. Page Type Match (+20)
      if (intent.pageType && pageTypeLower.includes(intent.pageType.toLowerCase())) {
        score += 20;
      }

      // 4. Style Match (+15)
      if (intent.style && styleLower.includes(intent.style.toLowerCase())) {
        score += 15;
      }

      // 5. Keyword Tokens Match (+10 each)
      tokens.forEach(token => {
        if (titleLower.includes(token) || indLower.includes(token) || catLower.includes(token) || tagsLower.includes(token)) {
          score += 10;
        } else if (descLower.includes(token)) {
          score += 5;
        }
      });

      // 6. Synonym Match (+8 each)
      synonyms.forEach(syn => {
        if (titleLower.includes(syn) || indLower.includes(syn) || catLower.includes(syn) || tagsLower.includes(syn)) {
          score += 8;
        }
      });

      // 7. Typo-corrected match bonus (+5)
      if (intent.wasCorrected && score > 0) {
        score += 5;
      }

      return Math.min(score, 99);
    },

    // ---------------------------------------------------------------------
    // 5. MULTI-PASS FALLBACK SEARCH ENGINE (Section 7)
    // ---------------------------------------------------------------------
    searchAndRank(query, dataset) {
      if (!query || query.trim() === '') {
        return {
          results: dataset.map(item => ({ ...item, relevanceScore: 80 })),
          intent: this.parseDesignQuery(''),
          fallbackApplied: false
        };
      }

      const intent = this.parseDesignQuery(query);

      // PASS 1: Strict Intent Scoring
      let scoredItems = dataset.map(item => ({
        ...item,
        relevanceScore: this.calculateRelevanceScore(item, intent)
      }));

      let results = scoredItems.filter(item => item.relevanceScore >= 25);
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // PASS 2: Fallback to Synonym/Token Or Matching if Pass 1 yielded 0 results
      if (results.length === 0 && intent.keywords.length > 0) {
        scoredItems = dataset.map(item => {
          let fallbackScore = 0;
          const fullText = `${item.title} ${item.description} ${item.category} ${item.industry} ${item.tags.join(' ')}`.toLowerCase();

          intent.keywords.forEach(kw => {
            const canonical = getCanonicalCategory(kw);
            if (canonical && fullText.includes(canonical)) fallbackScore += 30;
            if (fullText.includes(kw)) fallbackScore += 20;
          });

          return { ...item, relevanceScore: fallbackScore };
        });

        results = scoredItems.filter(item => item.relevanceScore > 0);
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      return {
        results,
        intent,
        fallbackApplied: intent.wasCorrected || (results.length > 0 && intent.originalQuery.toLowerCase() !== intent.normalizedQuery)
      };
    }
  };
})();
