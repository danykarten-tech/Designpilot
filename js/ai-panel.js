/* ==========================================================================
   DESIGNPILOT AI - GENERAL-PURPOSE AI ASSISTANT MODULE (js/ai-panel.js)
   ========================================================================== */

let conversationHistory = [];
let appStateRef = null;

function formatMarkdown(str) {
  if (!str) return '';
  
  let html = str;

  // Markdown Links [Text](URL)
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="ai-source-link">$1 <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i></a>');

  // Code blocks ```css ... ```
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
    const escapedCode = String(code)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langLabel = (lang || 'CODE').toUpperCase();
    return `<div class="ai-code-block"><div class="ai-code-header"><span>${langLabel}</span><button onclick="navigator.clipboard.writeText(this.parentNode.nextElementSibling.innerText); this.textContent='Copied!';" class="ai-copy-btn">Copy</button></div><pre><code>${escapedCode}</code></pre></div>`;
  });

  // Markdown Tables (| col1 | col2 |)
  html = html.replace(/\n\|([^\n]+)\|\n\|[-|\s:]+\|\n((?:\|[^\n]+\|\n?)+)/g, (match, header, body) => {
    const headers = header.split('|').map(h => h.trim()).filter(h => h.length > 0);
    const rows = body.trim().split('\n').map(row => row.split('|').map(cell => cell.trim()).filter(cell => cell.length > 0));
    
    let tableHtml = '<div class="ai-table-wrapper"><table class="ai-md-table"><thead><tr>';
    headers.forEach(h => tableHtml += `<th>${h}</th>`);
    tableHtml += '</tr></thead><tbody>';
    rows.forEach(r => {
      if (r.length > 0) {
        tableHtml += '<tr>';
        r.forEach(c => tableHtml += `<td>${c}</td>`);
        tableHtml += '</tr>';
      }
    });
    tableHtml += '</tbody></table></div>';
    return '\n' + tableHtml + '\n';
  });

  // Horizontal Rules ---
  html = html.replace(/\n---\n/g, '<hr class="ai-hr">');

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

  // Headings ### and ####
  html = html.replace(/### (.*?)\n/g, '<h4 class="ai-msg-heading">$1</h4>');
  html = html.replace(/#### (.*?)\n/g, '<h5 class="ai-msg-subheading">$1</h5>');

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italics *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet Lists • or - or 1.
  html = html.replace(/\n• (.*?)/g, '<br>• $1');
  html = html.replace(/\n- (.*?)/g, '<br>• $1');
  html = html.replace(/\n(\d+)\. (.*?)/g, '<br><strong>$1.</strong> $2');

  // Newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}

// Global Open AI Panel Function (Works independently of API)
window.openAIPanel = function() {
  const wrapper = document.getElementById('workspace-wrapper');
  const panel = document.getElementById('ai-panel');
  if (wrapper) wrapper.classList.add('ai-open');
  if (panel) {
    panel.classList.add('open');
    panel.style.transform = 'translateX(0)';
  }
  if (appStateRef) appStateRef.isAIPanelOpen = true;
  const input = document.getElementById('ai-panel-input');
  if (input) {
    setTimeout(() => input.focus(), 150);
  }
};

// Global Close AI Panel Function (Works independently of API)
window.closeAIPanel = function() {
  const wrapper = document.getElementById('workspace-wrapper');
  const panel = document.getElementById('ai-panel');
  if (wrapper) wrapper.classList.remove('ai-open');
  if (panel) {
    panel.classList.remove('open');
    panel.style.transform = '';
  }
  if (appStateRef) appStateRef.isAIPanelOpen = false;
};

// Global Toggle AI Panel Function
window.toggleAIPanel = function() {
  const wrapper = document.getElementById('workspace-wrapper');
  const isOpen = wrapper && wrapper.classList.contains('ai-open');
  if (isOpen) {
    window.closeAIPanel();
  } else {
    window.openAIPanel();
  }
};

// Send AI Message logic
async function sendAIMessage(customText) {
  const aiInput = document.getElementById('ai-panel-input');
  const aiMsgList = document.getElementById('ai-messages-list');
  const text = customText || (aiInput ? aiInput.value : '');
  if (!text || text.trim() === '' || !aiMsgList) return;

  const trimmedText = text.trim();

  // 1. Append User Message
  const userMsg = document.createElement('div');
  userMsg.className = 'ai-msg user';
  userMsg.textContent = trimmedText;
  aiMsgList.appendChild(userMsg);

  if (!customText && aiInput) aiInput.value = '';
  aiMsgList.scrollTop = aiMsgList.scrollHeight;

  // 2. Append Typing Indicator
  const isWebQuery = /https?:\/\/|latest|news|today|price|football|match|stock|weather|2026/i.test(trimmedText);
  const loadingText = isWebQuery ? 'Researching the web...' : 'Thinking...';
  const loadingIcon = isWebQuery ? 'fa-earth-americas' : 'fa-sparkles';

  const typingIndicator = document.createElement('div');
  typingIndicator.className = 'ai-msg assistant ai-typing-indicator';
  typingIndicator.innerHTML = `<i class="fa-solid ${loadingIcon} fa-spin" style="color: var(--primary-color, #6366f1);"></i> ${loadingText}`;
  aiMsgList.appendChild(typingIndicator);
  aiMsgList.scrollTop = aiMsgList.scrollHeight;

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: trimmedText,
        conversation: conversationHistory
      })
    });

    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      throw new Error(`Invalid server response: HTTP ${res.status}`);
    }

    if (typingIndicator.parentNode) {
      typingIndicator.parentNode.removeChild(typingIndicator);
    }

    if (!res.ok || (data && data.status === 'error')) {
      const errorDetail = (data && data.message) ? data.message : `HTTP Error ${res.status}`;
      const errorMsg = document.createElement('div');
      errorMsg.className = 'ai-msg assistant error-msg';
      errorMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> ${formatMarkdown(errorDetail)}`;
      aiMsgList.appendChild(errorMsg);
      aiMsgList.scrollTop = aiMsgList.scrollHeight;
      return;
    }

    const replyText = data.reply || "I couldn't complete that request right now. Please try again.";

    conversationHistory.push({ role: 'user', content: trimmedText });
    conversationHistory.push({ role: 'assistant', content: replyText });

    const botMsg = document.createElement('div');
    botMsg.className = 'ai-msg assistant';
    botMsg.innerHTML = formatMarkdown(replyText);
    aiMsgList.appendChild(botMsg);
    aiMsgList.scrollTop = aiMsgList.scrollHeight;

  } catch (err) {
    console.error('[DesignPilot AI] Request error:', err);
    if (typingIndicator.parentNode) {
      typingIndicator.parentNode.removeChild(typingIndicator);
    }

    const errorMsg = document.createElement('div');
    errorMsg.className = 'ai-msg assistant error-msg';
    errorMsg.innerHTML = `<i class="fa-solid fa-triangle-exclamation" style="color:#ef4444;"></i> I couldn't complete that request right now. Please check your connection or try again.`;
    aiMsgList.appendChild(errorMsg);
    aiMsgList.scrollTop = aiMsgList.scrollHeight;
  }
}

window.sendAIMessage = sendAIMessage;

// Module Initialization
window.initAIPanel = function(state) {
  appStateRef = state;

  const aiCloseBtn = document.getElementById('btn-ai-close');
  const aiMinBtn = document.getElementById('btn-ai-min');
  const aiNewBtn = document.getElementById('btn-ai-new-chat');
  const aiInput = document.getElementById('ai-panel-input');
  const aiSendBtn = document.getElementById('btn-ai-send');
  const aiMsgList = document.getElementById('ai-messages-list');

  if (aiCloseBtn) aiCloseBtn.addEventListener('click', window.closeAIPanel);
  if (aiMinBtn) aiMinBtn.addEventListener('click', window.closeAIPanel);

  if (aiNewBtn && aiMsgList) {
    aiNewBtn.addEventListener('click', () => {
      conversationHistory = [];
      aiMsgList.innerHTML = `
        <div class="ai-msg assistant">
          👋 Hello! I am your AI Assistant. Ask me anything—from UI/UX design, web development, and coding to general knowledge, writing, technology, current events, or website analysis.
        </div>
      `;
    });
  }

  if (aiSendBtn) aiSendBtn.addEventListener('click', () => sendAIMessage());
  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendAIMessage();
    });
  }
};

// Global Click Delegation for Top Nav AI Button and Controls
document.addEventListener('click', (e) => {
  const toggleBtn = e.target.closest('#btn-toggle-ai, .ai-toggle-btn, [data-action="toggle-ai"]');
  if (toggleBtn) {
    e.preventDefault();
    window.toggleAIPanel();
    return;
  }

  const closeBtn = e.target.closest('#btn-ai-close, #btn-ai-min');
  if (closeBtn) {
    e.preventDefault();
    window.closeAIPanel();
    return;
  }
});

// Context Indicator Updater
window.updateAIContextText = function(state) {
  const textEl = document.getElementById('ai-context-text');
  if (!textEl) return;

  if (state && state.searchQuery) {
    textEl.textContent = `Context: ${state.searchQuery}`;
  } else {
    textEl.textContent = `General AI Workspace`;
  }
};
