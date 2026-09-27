const https = require('https');
const url = require('url');
const crypto = require('crypto');

// Server-side in-memory search cache (1 hour TTL)
const searchCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

// -------------------------------------------------------------------------
// 1. REAL SOURCE CLASSIFICATION (getSourceGroup)
// -------------------------------------------------------------------------
function classifySource(targetUrl, title = '', content = '') {
  if (!targetUrl) return { sourceGroup: 'OTHER', sourceName: 'Other relevant websites', dotClass: 'dot-awwwards', domain: '', priorityWeight: 60 };
  
  try {
    const parsed = new URL(targetUrl);
    const hostname = parsed.hostname.toLowerCase();

    // 1. Envato / ThemeForest
    if (hostname.includes('themeforest.net') || hostname.includes('elements.envato.com') || hostname.includes('envato.com') || hostname.includes('codecanyon.net')) {
      return { sourceGroup: 'ENVATO_THEMEFOREST', sourceName: 'Envato / ThemeForest', dotClass: 'dot-envato', domain: hostname, priorityWeight: 100 };
    }

    // 2. GraphicRiver
    if (hostname.includes('graphicriver.net')) {
      return { sourceGroup: 'GRAPHICRIVER', sourceName: 'GraphicRiver', dotClass: 'dot-envato', domain: hostname, priorityWeight: 95 };
    }

    // 3. Awwwards
    if (hostname.includes('awwwards.com')) {
      return { sourceGroup: 'AWWWARDS', sourceName: 'Awwwards', dotClass: 'dot-awwwards', domain: hostname, priorityWeight: 92 };
    }

    // 4. Dribbble
    if (hostname.includes('dribbble.com')) {
      return { sourceGroup: 'DRIBBBLE', sourceName: 'Dribbble', dotClass: 'dot-dribbble', domain: hostname, priorityWeight: 90 };
    }

    // 5. Behance
    if (hostname.includes('behance.net')) {
      return { sourceGroup: 'BEHANCE', sourceName: 'Behance', dotClass: 'dot-behance', domain: hostname, priorityWeight: 90 };
    }

    // 6. Other relevant websites
    return { sourceGroup: 'OTHER', sourceName: 'Other relevant websites', dotClass: 'dot-awwwards', domain: hostname, priorityWeight: 70 };

  } catch (e) {
    return { sourceGroup: 'OTHER', sourceName: 'Other relevant websites', dotClass: 'dot-awwwards', domain: '', priorityWeight: 60 };
  }
}

// -------------------------------------------------------------------------
// 2. TARGETED MULTI-QUERY EXPANSION ENGINE
// -------------------------------------------------------------------------
function expandQuery(query) {
  const q = (query || '').toLowerCase().trim();
  return [
    `site:themeforest.net ${q}`,
    `site:elements.envato.com ${q}`,
    `site:graphicriver.net ${q}`,
    `site:awwwards.com ${q}`,
    `site:dribbble.com ${q}`,
    `site:behance.net ${q}`,
    `"${q}" website design UI inspiration`
  ];
}

// -------------------------------------------------------------------------
// 3. RELEVANCE RANKING ENGINE
// -------------------------------------------------------------------------
function calculateRelevanceScore(item, query, sourceInfo) {
  if (!query || query.trim() === '') return 85;
  const qLower = query.toLowerCase().trim();
  const terms = qLower.split(/\s+/).filter(Boolean);
  
  let score = 0;

  // 1. Exact query match (+40 max)
  const titleLower = (item.title || '').toLowerCase();
  const descLower = (item.description || '').toLowerCase();
  const fullText = `${titleLower} ${descLower} ${item.url}`.toLowerCase();

  if (fullText.includes(qLower)) {
    score += 40;
  } else {
    let matchedTerms = 0;
    terms.forEach(t => { if (fullText.includes(t)) matchedTerms++; });
    score += Math.round((matchedTerms / terms.length) * 35);
  }

  // 2. Source priority (+25 max)
  const sourceWeight = sourceInfo.priorityWeight || 70;
  score += Math.round(((sourceWeight - 40) / 60) * 25);

  // 3. Design relevance (+20 max)
  const designKw = ['ui', 'ux', 'template', 'design', 'storefront', 'dashboard', 'showcase', 'landing page', 'ecommerce', 'app', 'website', 'shot', 'project', 'theme'];
  let designCount = 0;
  designKw.forEach(kw => { if (fullText.includes(kw)) designCount++; });
  score += Math.min(20, designCount * 5);

  // 4. Title relevance (+10 max)
  let titleMatch = 0;
  terms.forEach(t => { if (titleLower.includes(t)) titleMatch++; });
  if (titleMatch > 0) {
    score += Math.min(10, Math.round((titleMatch / terms.length) * 10));
  }

  // 5. Image availability & useful deep path (+5 max)
  if (item.thumbnail || item.previewImage) {
    score += 3;
  }
  const specificPath = ['/item/', '/shots/', '/gallery/', '/sites/', '/templates/', '/product/', '/p/'];
  if (specificPath.some(p => (item.url || '').toLowerCase().includes(p))) {
    score += 2;
  }

  return Math.min(98, Math.max(45, score));
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
// 5. DEDUPLICATION ENGINE & URL NORMALIZATION
// -------------------------------------------------------------------------
function deduplicateResults(list) {
  const seen = new Set();
  const merged = [];

  list.forEach(item => {
    let rawUrl = (item.url || '').toLowerCase().trim();
    if (!rawUrl) return;

    try {
      const u = new URL(rawUrl);
      const cleanParams = new URLSearchParams();
      u.searchParams.forEach((val, key) => {
        if (!key.startsWith('utm_') && key !== 'ref' && key !== 'srsltid' && key !== 'fbclid') {
          cleanParams.append(key, val);
        }
      });
      const paramStr = cleanParams.toString() ? '?' + cleanParams.toString() : '';
      const normalizedKey = `${u.origin}${u.pathname}`.replace(/\/$/, '') + paramStr;

      if (!seen.has(normalizedKey)) {
        seen.add(normalizedKey);
        merged.push(item);
      }
    } catch (e) {
      const normalizedKey = rawUrl.replace(/\/$/, '');
      if (!seen.has(normalizedKey)) {
        seen.add(normalizedKey);
        merged.push(item);
      }
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
      max_results: 15
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
    return cached.payload;
  }

  const expandedQueries = expandQuery(query);
  console.log(`[Tavily Search] Executing ${expandedQueries.length} targeted search queries for: "${query}"`);

  // Run targeted queries in parallel with fault tolerance (Promise.allSettled)
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
      console.warn('[Tavily Search] Query execution failed non-blockingly:', res.reason ? res.reason.message : res.reason);
    }
  });

  let imgIdx = 0;
  const normalizedList = rawResults.map(item => {
    const itemUrl = item.url || '';
    const sourceInfo = classifySource(itemUrl, item.title, item.content);
    
    // Assign image if Tavily returned images or result image
    let thumb = item.image || item.thumbnail || null;
    if (!thumb && returnedImages.length > 0 && imgIdx < returnedImages.length) {
      thumb = returnedImages[imgIdx++];
    }

    const category = inferCategory(query, item.title, item.content);
    
    // Strip raw HTML tags from title and snippet/content to prevent raw markup bleeding
    const cleanTitle = (item.title || 'Design Inspiration').replace(/<[^>]*>?/gm, '').trim();
    const cleanDesc = (item.content || item.snippet || '').replace(/<[^>]*>?/gm, '').trim();

    const normalizedItem = {
      id: 'tavily-' + crypto.createHash('md5').update(itemUrl).digest('hex').substring(0, 12),
      title: cleanTitle,
      url: itemUrl,
      originalUrl: itemUrl,
      sourceUrl: itemUrl,
      source: sourceInfo.sourceName,
      sourceName: sourceInfo.sourceName,
      sourceGroup: sourceInfo.sourceGroup,
      dotClass: sourceInfo.dotClass,
      domain: sourceInfo.domain,
      description: cleanDesc,
      thumbnail: thumb,
      previewImage: thumb,
      thumbnailImage: thumb,
      category: category,
      pageType: 'Website',
      isDemo: false
    };

    normalizedItem.relevanceScore = calculateRelevanceScore(normalizedItem, query, sourceInfo);
    return normalizedItem;
  });

  const deduplicated = deduplicateResults(normalizedList);
  
  // Sort all results by calculated relevance score descending
  deduplicated.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Group by sourceGroup into exact priority order
  const sourceGroupOrder = [
    'ENVATO_THEMEFOREST',
    'GRAPHICRIVER',
    'AWWWARDS',
    'DRIBBBLE',
    'BEHANCE',
    'OTHER'
  ];

  const grouped = {};
  sourceGroupOrder.forEach(sg => grouped[sg] = []);

  deduplicated.forEach(item => {
    const sg = item.sourceGroup || 'OTHER';
    if (!grouped[sg]) grouped[sg] = [];
    grouped[sg].push(item);
  });

  const payload = {
    total: deduplicated.length,
    results: deduplicated,
    groupedResults: grouped
  };

  // Store in cache
  searchCache.set(normalizedQuery, {
    timestamp: Date.now(),
    payload: payload
  });

  return payload;
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

    // Run Targeted Multi-Query Tavily Search
    const searchOutcome = await executeTavilySearch(apiKey, query);
    let allResults = searchOutcome.results || [];

    // Apply Filter by Source if specified in request
    let filteredResults = allResults;
    if (filters.source && filters.source !== 'All Sources') {
      const srcFilter = filters.source.toLowerCase().trim();
      filteredResults = filteredResults.filter(item => {
        const itemGroup = (item.sourceGroup || '').toLowerCase();
        const itemSrc = (item.sourceName || item.source || '').toLowerCase();
        
        if (srcFilter === 'envato / themeforest' || srcFilter === 'themeforest') return itemGroup === 'envato_themeforest';
        if (srcFilter === 'graphicriver') return itemGroup === 'graphicriver';
        if (srcFilter === 'awwwards') return itemGroup === 'awwwards';
        if (srcFilter === 'dribbble') return itemGroup === 'dribbble';
        if (srcFilter === 'behance') return itemGroup === 'behance';
        if (srcFilter === 'other') return itemGroup === 'other';

        return itemSrc.includes(srcFilter);
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
      groupedResults: searchOutcome.groupedResults || {},
      results: finalResults
    });

  } catch (err) {
    console.error('[DesignPilot Search Handler Error]:', err);
    return sendJson(200, {
      status: 'error',
      error: 'Unable to load live inspiration right now.',
      message: err.message,
      results: []
    });
  }
};
