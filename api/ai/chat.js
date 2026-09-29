const https = require('https');
const url = require('url');

// -------------------------------------------------------------------------
// 1. OpenAI Chat Completions API Helper
// -------------------------------------------------------------------------
function fetchOpenAIChat(apiKey, modelName, systemPrompt, conversation, userMessage, webResearchContext) {
  return new Promise((resolve) => {
    if (!apiKey) return resolve(null);

    const model = modelName || 'gpt-4o-mini';

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    if (Array.isArray(conversation)) {
      const recentHistory = conversation.slice(-8);
      recentHistory.forEach((msg) => {
        if (msg && msg.role && msg.content) {
          const role = (msg.role === 'user' || msg.role === 'human') ? 'user' : 'assistant';
          messages.push({ role: role, content: String(msg.content) });
        }
      });
    }

    let finalUserMessage = userMessage;
    if (webResearchContext) {
      finalUserMessage = `[REAL-TIME LIVE WEB RESEARCH DATA]:\n${webResearchContext}\n\n[USER QUESTION]:\n${userMessage}`;
    }

    messages.push({ role: 'user', content: finalUserMessage });

    const postData = JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 1500
    });

    const reqOptions = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            if (data.choices && data.choices[0] && data.choices[0].message) {
              resolve(data.choices[0].message.content);
            } else {
              resolve(null);
            }
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// -------------------------------------------------------------------------
// 2. Tavily Web Research Helper
// -------------------------------------------------------------------------
function fetchTavilyResearch(apiKey, searchQuery) {
  return new Promise((resolve) => {
    if (!apiKey) return resolve(null);

    const postData = JSON.stringify({
      api_key: apiKey,
      query: searchQuery,
      search_depth: 'advanced',
      max_results: 6,
      include_answer: true
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
      timeout: 9000
    };

    const req = https.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const data = JSON.parse(body);
            resolve(data || null);
          } catch (e) {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.write(postData);
    req.end();
  });
}

// -------------------------------------------------------------------------
// 3. Helper to Clean Raw Web Text & Format Citations
// -------------------------------------------------------------------------
function cleanWebText(text) {
  if (!text) return '';
  let clean = text.replace(/<[^>]*>?/gm, '');
  clean = clean.replace(/Image \d+:[^\.\n]*/gi, '');
  clean = clean.replace(/\[\.\.\.\]/g, '');
  clean = clean.replace(/Click here[^\.\n]*/gi, '');
  clean = clean.replace(/Subscribe to[^\.\n]*/gi, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

function extractUrlAndDomain(text) {
  if (!text) return null;
  const urlMatch = text.match(/https?:\/\/[^\s\/$.?#].[^\s]*/i);
  if (urlMatch) {
    let rawUrl = urlMatch[0].replace(/[,;)]+$/, '');
    try {
      const parsed = new url.URL(rawUrl);
      const domain = parsed.hostname.replace(/^www\./i, '');
      return { fullUrl: rawUrl, domain: domain };
    } catch (e) {
      return null;
    }
  }
  const domainMatch = text.match(/\b([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(com|org|net|co|io|tech|app|ai|dev|in|us|uk|ca)\b/i);
  if (domainMatch) {
    const domain = domainMatch[0].toLowerCase().replace(/^www\./i, '');
    return { fullUrl: `https://${domain}`, domain: domain };
  }
  return null;
}

// -------------------------------------------------------------------------
// 4. Intent Classification Engine
// -------------------------------------------------------------------------
function classifyIntent(message) {
  const msgLower = (message || '').toLowerCase().trim();

  const targetInfo = extractUrlAndDomain(message);
  if (targetInfo) {
    return { type: 'WEBSITE_ANALYSIS', targetInfo };
  }

  if (
    msgLower.includes('latest') ||
    msgLower.includes('news') ||
    msgLower.includes('today') ||
    msgLower.includes('current price') ||
    msgLower.includes('who is the current') ||
    msgLower.includes('football') ||
    msgLower.includes('match') ||
    msgLower.includes('stock') ||
    msgLower.includes('weather') ||
    msgLower.includes('2026') ||
    msgLower.includes('trend')
  ) {
    return { type: 'CURRENT_INFORMATION' };
  }

  if (
    msgLower.includes('ux') ||
    msgLower.includes('ui') ||
    msgLower.includes('figma') ||
    msgLower.includes('wireframe') ||
    msgLower.includes('prototype') ||
    msgLower.includes('design system') ||
    msgLower.includes('wcag') ||
    msgLower.includes('accessibility') ||
    msgLower.includes('color') ||
    msgLower.includes('typography') ||
    msgLower.includes('landing page')
  ) {
    return { type: 'DESIGN' };
  }

  if (
    msgLower.includes('html') ||
    msgLower.includes('css') ||
    msgLower.includes('javascript') ||
    msgLower.includes('react') ||
    msgLower.includes('api') ||
    msgLower.includes('code') ||
    msgLower.includes('node')
  ) {
    return { type: 'TECHNICAL' };
  }

  return { type: 'GENERAL' };
}

// -------------------------------------------------------------------------
// 5. Main Route Handler (/api/ai/chat or /api/chat)
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

    const message = body.message || body.prompt || '';
    const conversation = body.conversation || body.messages || [];

    if (!message || message.trim() === '') {
      return sendJson(400, {
        status: 'error',
        message: 'Message prompt is required.'
      });
    }

    const openAiKey = process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : '';
    const openAiModel = process.env.OPENAI_MODEL ? process.env.OPENAI_MODEL.trim() : 'gpt-4o-mini';
    const tavilyKey = process.env.TAVILY_API_KEY ? process.env.TAVILY_API_KEY.trim() : '';

    const intent = classifyIntent(message);
    let webResearchContext = '';
    let sourcesList = [];
    let isWebResearched = false;

    // Perform Web Research if Tavily key is present (always research if OpenAI key absent, or for time-sensitive / URL queries)
    const shouldResearch = tavilyKey && (
      !openAiKey || 
      intent.type === 'CURRENT_INFORMATION' || 
      intent.type === 'WEBSITE_ANALYSIS' || 
      intent.type === 'WEB_RESEARCH'
    );

    if (shouldResearch) {
      const searchQuery = (intent.type === 'WEBSITE_ANALYSIS' && intent.targetInfo)
        ? `${intent.targetInfo.domain} company business services UI UX features`
        : message;

      const tavilyData = await fetchTavilyResearch(tavilyKey, searchQuery);
      if (tavilyData && tavilyData.results && tavilyData.results.length > 0) {
        isWebResearched = true;
        tavilyData.results.slice(0, 5).forEach((item) => {
          const title = cleanWebText(item.title || '');
          const content = cleanWebText(item.content || '');
          const sourceUrl = item.url || '';
          if (title && content) {
            webResearchContext += `Source [${title}] (${sourceUrl}): ${content}\n\n`;
            if (sourceUrl) {
              sourcesList.push({ title: title, url: sourceUrl });
            }
          }
        });
      }
    }

    // System prompt for OpenAI LLM
    const systemPrompt = `You are DesignPilot AI, a general-purpose, highly intelligent AI Assistant embedded inside the DesignPilot workspace.
Your Core Rules:
1. You are a general-purpose AI chat workspace similar in behavior to ChatGPT. You answer ANY reasonable question (UI/UX, Product Design, HTML/CSS/JS, React, General Knowledge, Career, Math, Current Information, Website Audits, etc.).
2. You do NOT restrict answers to DesignPilot unless the user explicitly asks about DesignPilot.
3. If live web research data is attached in [REAL-TIME LIVE WEB RESEARCH DATA], synthesize that accurate data into your response and cite facts accurately.
4. Format all responses using GitHub Flavored Markdown:
   - Headings (### for main section, #### for subsections)
   - Bold highlights for key terms
   - Bullet points and numbered lists
   - Markdown pipe tables (| Col 1 | Col 2 |) for comparative data
   - Code blocks with language tags (\`\`\`css, \`\`\`html, \`\`\`js) when applicable
5. Be direct, comprehensive, accurate, conversational, and helpful. Never return hardcoded or generic placeholders.`;

    let generatedAnswer = null;

    // 1. Try OpenAI Chat API if API Key is present
    if (openAiKey) {
      generatedAnswer = await fetchOpenAIChat(openAiKey, openAiModel, systemPrompt, conversation, message, webResearchContext);
    }

    // 2. If OpenAI is not configured or fails, synthesize Tavily search data if available
    if (!generatedAnswer && isWebResearched && webResearchContext) {
      generatedAnswer = `### 💡 ${message.charAt(0).toUpperCase() + message.slice(1)}\n\n`;
      generatedAnswer += `Based on live web research regarding **"${message}"**:\n\n`;
      
      const snippetBlocks = webResearchContext.split('\n\n').filter(b => b.trim().length > 30);
      snippetBlocks.slice(0, 4).forEach((block, idx) => {
        const titleMatch = block.match(/Source \[([^\]]+)\]/);
        const heading = titleMatch ? titleMatch[1] : `Key Finding ${idx + 1}`;
        const contentOnly = block.replace(/Source \[[^\]]+\] \([^\)]+\): /, '');
        generatedAnswer += `#### ${idx + 1}. ${heading}\n${contentOnly}\n\n`;
      });
    }

    // 3. If neither OpenAI nor Tavily research succeeded, check if keys are missing
    if (!generatedAnswer) {
      if (!openAiKey && !tavilyKey) {
        return sendJson(200, {
          status: 'setup_required',
          reply: `⚙️ **AI Assistant Configuration Required**\n\nTo start chatting with DesignPilot AI Assistant, please set your API key in your environment settings:\n\n- \`OPENAI_API_KEY\` (for OpenAI ChatGPT models)\n- \`TAVILY_API_KEY\` (for Live Web Research)\n\nAdd these variables in your local \`.env\` or Vercel Project Settings under **Environment Variables**.`,
          sources: []
        });
      }

      return sendJson(500, {
        status: 'error',
        message: "I couldn't complete that request right now. Please try again."
      });
    }

    // Append Sources section if web research was conducted and sources exist
    if (isWebResearched && sourcesList.length > 0) {
      generatedAnswer += `\n\n---\n#### 🌐 Sources & Citations:\n`;
      sourcesList.forEach((src) => {
        generatedAnswer += `- [${src.title}](${src.url})\n`;
      });
    }

    return sendJson(200, {
      status: 'success',
      reply: generatedAnswer,
      isResearched: isWebResearched,
      sources: sourcesList,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('[DesignPilot AI Error]:', err);
    return sendJson(500, {
      status: 'error',
      message: "I couldn't complete that request right now. Please try again."
    });
  }
};
