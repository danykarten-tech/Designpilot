const https = require('https');
const http = require('http');
const url = require('url');
const crypto = require('crypto');

// Server-side in-memory search cache (1 hour TTL)
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

// -------------------------------------------------------------------------
// 1. SOURCE RESOLVER (Domain -> Source Name)
// -------------------------------------------------------------------------
function resolveSourceFromUrl(targetUrl) {
  if (!targetUrl) return { sourceName: 'Other', dotClass: 'dot-awwwards', domain: '' };
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();
    
    if (hostname.includes('behance.net')) return { sourceName: 'Behance', dotClass: 'dot-behance', domain: hostname };
    if (hostname.includes('dribbble.com')) return { sourceName: 'Dribbble', dotClass: 'dot-dribbble', domain: hostname };
    if (hostname.includes('awwwards.com')) return { sourceName: 'Awwwards', dotClass: 'dot-awwwards', domain: hostname };
    if (hostname.includes('graphicriver.net')) return { sourceName: 'GraphicRiver', dotClass: 'dot-envato', domain: hostname };
    if (hostname.includes('envato.com') || hostname.includes('themeforest.net')) return { sourceName: 'Envato', dotClass: 'dot-envato', domain: hostname };
    if (hostname.includes('siteinspire.com')) return { sourceName: 'SiteInspire', dotClass: 'dot-awwwards', domain: hostname };
    if (hostname.includes('webflow.com')) return { sourceName: 'Webflow', dotClass: 'dot-awwwards', domain: hostname };

    return { sourceName: 'Other', dotClass: 'dot-awwwards', domain: hostname };
  } catch (e) {
    return { sourceName: 'Other', dotClass: 'dot-awwwards', domain: '' };
  }
}

// -------------------------------------------------------------------------
// 2. QUERY EXPANSION ENGINE (3-5 Intelligently Selected Variations Max)
// -------------------------------------------------------------------------
function expandQuery(query) {
  const q = (query || '').toLowerCase().trim();
  const variations = [
    `${q} website design inspiration`,
    `${q} UI UX web design showcase`
  ];
  return variations;
}

// -------------------------------------------------------------------------
// 3. RELEVANCE RANKING ENGINE
// -------------------------------------------------------------------------
function calculateRelevanceScore(item, query) {
  if (!query || query.trim() === '') return 85;
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 60;

  const fullText = [
    item.title,
    item.description,
    item.category,
    item.sourceName,
    item.domain
  ].filter(Boolean).join(' ').toLowerCase();

  // Boost terms match
  terms.forEach(term => {
    if (fullText.includes(term)) score += 12;
  });

  if (fullText.includes(query.toLowerCase())) score += 15;

  // Boost design relevance keywords
  const designKeywords = ['website', 'ui', 'ux', 'storefront', 'landing page', 'ecommerce', 'dashboard', 'template', 'design', 'showcase'];
  designKeywords.forEach(kw => {
    if (fullText.includes(kw)) score += 5;
  });

  // Deprioritize generic non-design articles
  if (fullText.includes('wikipedia') || fullText.includes('news article') || fullText.includes('review')) {
    score -= 20;
  }

  return Math.min(99, Math.max(45, score));
}

// -------------------------------------------------------------------------
// 4. INFER CATEGORY
// -------------------------------------------------------------------------
function inferCategory(query, title, content) {
  const text = `${query} ${title} ${content}`.toLowerCase();
  if (text.includes('ecommerce') || text.includes('shoe') || text.includes('footwear') || text.includes('fashion') || text.includes('store')) {
    return 'Ecommerce';
  }
  if (text.includes('saas') || text.includes('dashboard') || text.includes('analytics') || text.includes('app')) {
    return 'SaaS';
  }
  if (text.includes('fintech') || text.includes('bank') || text.includes('crypto') || text.includes('finance')) {
    return 'Fintech';
  }
  if (text.includes('agency') || text.includes('portfolio') || text.includes('creative')) {
    return 'Agency';
  }
  return 'Web Design';
}

// -------------------------------------------------------------------------
// 5. DUPLICATE DETECTOR
// -------------------------------------------------------------------------
function deduplicateResults(list) {
  const seen = new Set();
  const merged = [];

  list.forEach(item => {
    let key = item.url ? item.url.toLowerCase().trim().replace(/\/$/, '') : item.id;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  });

  return merged;
}

// -------------------------------------------------------------------------
// 6. TAVILY API HTTP CALLER
// -------------------------------------------------------------------------
function callTavilyApi(apiKey, searchQuery) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      api_key: apiKey,
      query: searchQuery,
      search_depth: 'basic',
      include_images: true,
      max_results: 20
    });

    const reqOptions = {
      hostname: 'api.tavily.com',
      port: 443,
      path: '/search',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data);
          } catch (e) {
            reject(new Error('Invalid JSON from Tavily API'));
          }
        } else {
          reject(new Error(`Tavily API HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Tavily API request timed out'));
    });

    req.write(postData);
    req.end();
  });
}

// -------------------------------------------------------------------------
// 7. CORE SEARCH ENGINE EXECUTION WITH TAVILY
// -------------------------------------------------------------------------
async function executeTavilySearch(apiKey, query) {
  const normalizedQuery = (query || '').toLowerCase().trim();
  
  // Check in-memory cache
  const cached = searchCache.get(normalizedQuery);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    console.log(`[Tavily Search] Cache hit for query: "${normalizedQuery}"`);
    return cached.results;
  }

  const expandedQueries = expandQuery(query);
  console.log(`[Tavily Search] Executing ${expandedQueries.length} search queries for: "${query}"`);

  // Run maximum 2 parallel Tavily queries to save free tier credits
  const responses = await Promise.allSettled(
    expandedQueries.map(q => callTavilyApi(apiKey, q))
  );

  let rawResults = [];
  let returnedImages = [];

  responses.forEach(res => {
    if (res.status === 'fulfilled' && res.value) {
      if (Array.isArray(res.value.results)) {
        rawResults.push(...res.value.results);
      }
      if (Array.isArray(res.value.images)) {
        returnedImages.push(...res.value.images);
      }
    } else if (res.status === 'rejected') {
      console.warn('[Tavily Search] Query execution failed:', res.reason ? res.reason.message : res.reason);
    }
  });

  let imgIdx = 0;
  const normalizedList = rawResults.map(item => {
    const sourceInfo = resolveSourceFromUrl(item.url);
    const itemUrl = item.url || '';
    
    // Assign image if Tavily returned images or result image
    let thumb = item.image || item.thumbnail || null;
    if (!thumb && returnedImages.length > 0 && imgIdx < returnedImages.length) {
      thumb = returnedImages[imgIdx++];
    }

    const category = inferCategory(query, item.title, item.content);
    
    const normalizedItem = {
      id: 'tavily-' + crypto.createHash('md5').update(itemUrl).digest('hex').substring(0, 12),
      title: item.title || 'Design Inspiration',
      url: itemUrl,
      originalUrl: itemUrl,
      sourceUrl: itemUrl,
      source: sourceInfo.sourceName,
      sourceName: sourceInfo.sourceName,
      dotClass: sourceInfo.dotClass,
      domain: sourceInfo.domain,
      description: item.content || item.snippet || '',
      thumbnail: thumb,
      previewImage: thumb,
      thumbnailImage: thumb,
      category: category,
      pageType: 'Website',
      isDemo: false
    };

    normalizedItem.relevanceScore = calculateRelevanceScore(normalizedItem, query);
    return normalizedItem;
  });

  const deduplicated = deduplicateResults(normalizedList);
  deduplicated.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Store in cache
  searchCache.set(normalizedQuery, {
    timestamp: Date.now(),
    results: deduplicated
  });

  return deduplicated;
}

// -------------------------------------------------------------------------
// 8. SERVERLESS ROUTE HANDLER
// -------------------------------------------------------------------------
module.exports = async function handler(req, res) {
  function sendJson(statusCode, data) {
    if (typeof res.status === 'function') {
      return res.status(statusCode).json(data);
    }
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(data));
  }

  try {
    let query = '';
    let filters = {};
    let limit = 40;

    if (req.method === 'GET') {
      const parsedUrl = url.parse(req.url, true);
      query = parsedUrl.query.query || (req.query && req.query.query) || '';
      limit = parseInt(parsedUrl.query.limit || req.query?.limit || '40', 10);
    } else {
      let body = req.body;
      if (!body) {
        let raw = '';
        try {
          for await (const chunk of req) {
            raw += chunk;
          }
          body = JSON.parse(raw || '{}');
        } catch (e) {
          body = {};
        }
      } else if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = {}; }
      }
      body = body || {};

      query = body.query || (req.query && req.query.query) || '';
      filters = body.filters || {};
      limit = parseInt(body.limit || '40', 10);
    }

    const apiKey = process.env.TAVILY_API_KEY ? process.env.TAVILY_API_KEY.trim() : '';

    // Check missing API Key
    if (!apiKey) {
      return sendJson(200, {
        status: 'unconfigured',
        isLiveConfigured: false,
        error: 'Live search is not configured.',
        message: 'TAVILY_API_KEY environment variable is not configured in server environment.',
        results: []
      });
    }

    // Run Tavily Search
    const allResults = await executeTavilySearch(apiKey, query);

    // Apply Filter by Source if specified in request
    let filteredResults = allResults;
    if (filters.source && filters.source !== 'All Sources') {
      const srcFilter = filters.source.toLowerCase();
      filteredResults = filteredResults.filter(item => {
        const itemSrc = (item.sourceName || item.source || '').toLowerCase();
        if (srcFilter === 'other') {
          return !['behance', 'dribbble', 'awwwards', 'envato', 'graphicriver'].includes(itemSrc);
        }
        return itemSrc === srcFilter;
      });
    }

    const finalResults = filteredResults.slice(0, limit);

    return sendJson(200, {
      status: 'success',
      isLiveConfigured: true,
      query: query,
      normalizedQuery: (query || '').toLowerCase().trim(),
      total: filteredResults.length,
      returnedCount: finalResults.length,
      results: finalResults
    });

  } catch (err) {
    console.error('[DesignPilot Search Handler Error]:', err);
    return sendJson(200, {
      status: 'error',
      error: 'Search temporarily unavailable.',
      message: err.message,
      results: []
    });
  }
};
