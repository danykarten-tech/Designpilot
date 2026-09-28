/* ==========================================================================
   DESIGNPILOT AI - COLLAPSIBLE AI PANEL MODULE (js/ai-panel.js)
   ========================================================================== */

function formatMarkdown(str) {
  if (!str) return '';
  
  let html = str;

  // Code blocks ```css ... ```
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
    const escapedCode = String(code)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const langLabel = (lang || 'CODE').toUpperCase();
    return `<div class="ai-code-block"><div class="ai-code-header"><span>${langLabel}</span><button onclick="navigator.clipboard.writeText(this.parentNode.nextElementSibling.innerText); this.textContent='Copied!';" class="ai-copy-btn">Copy</button></div><pre><code>${escapedCode}</code></pre></div>`;
  });

  // Inline code `code`
  html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');

  // Headings ###
  html = html.replace(/### (.*?)\n/g, '<h4 class="ai-msg-heading">$1</h4>');
  html = html.replace(/#### (.*?)\n/g, '<h5 class="ai-msg-subheading" style="font-weight:700; color:var(--text-heading); margin-top:8px;">$1</h5>');

  // Bold **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Lists • or - or 1.
  html = html.replace(/\n• (.*?)/g, '<br>• $1');
  html = html.replace(/\n- (.*?)/g, '<br>• $1');
  html = html.replace(/\n(\d+)\. (.*?)/g, '<br><strong>$1.</strong> $2');

  // Newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}

window.initAIPanel = function(state) {
  const wrapper = document.getElementById('workspace-wrapper');
  const aiToggleBtn = document.getElementById('btn-toggle-ai');
  const aiCloseBtn = document.getElementById('btn-ai-close');
  const aiMinBtn = document.getElementById('btn-ai-min');
  const aiNewBtn = document.getElementById('btn-ai-new-chat');

  const aiInput = document.getElementById('ai-panel-input');
  const aiSendBtn = document.getElementById('btn-ai-send');
  const aiMsgList = document.getElementById('ai-messages-list');

  function openAIPanel() {
    if (wrapper) wrapper.classList.add('ai-open');
    state.isAIPanelOpen = true;
  }

  function closeAIPanel() {
    if (wrapper) wrapper.classList.remove('ai-open');
    state.isAIPanelOpen = false;
  }

  if (aiToggleBtn) {
    aiToggleBtn.addEventListener('click', () => {
      if (state.isAIPanelOpen) closeAIPanel();
      else openAIPanel();
    });
  }

  if (aiCloseBtn) aiCloseBtn.addEventListener('click', closeAIPanel);
  if (aiMinBtn) aiMinBtn.addEventListener('click', closeAIPanel);

  if (aiNewBtn && aiMsgList) {
    aiNewBtn.addEventListener('click', () => {
      aiMsgList.innerHTML = `
        <div class="ai-msg assistant">
          Hello! I am your AI Design Assistant. Ask me about UI/UX layout patterns, Figma design systems, WCAG accessibility, or component engineering.
        </div>
      `;
    });
  }

  async function sendAIMessage(customText) {
    const text = customText || (aiInput ? aiInput.value : '');
    if (!text || text.trim() === '' || !aiMsgList) return;

    // 1. User Message Element
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-msg user';
    userMsg.textContent = text;
    aiMsgList.appendChild(userMsg);

    if (!customText && aiInput) aiInput.value = '';
    aiMsgList.scrollTop = aiMsgList.scrollHeight;

    // 2. Typing Indicator Placeholder
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'ai-msg assistant ai-typing-indicator';
    typingIndicator.innerHTML = `<i class="fa-solid fa-sparkles fa-spin" style="color: var(--primary-color);"></i> AI is thinking...`;
    aiMsgList.appendChild(typingIndicator);
    aiMsgList.scrollTop = aiMsgList.scrollHeight;

    const currentContext = state.searchQuery || (state.activeView ? state.activeView.toUpperCase() : 'Product Design');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context: currentContext
        })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      
      // Remove typing indicator
      if (typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }

      const botMsg = document.createElement('div');
      botMsg.className = 'ai-msg assistant';

      const replyText = data.reply || 'Thank you for your question. How else can I assist with your design workflow?';
      botMsg.innerHTML = formatMarkdown(replyText);
      aiMsgList.appendChild(botMsg);
      aiMsgList.scrollTop = aiMsgList.scrollHeight;

    } catch (err) {
      console.warn('[DesignPilot AI] Endpoint fallback activated:', err);
      
      if (typingIndicator.parentNode) {
        typingIndicator.parentNode.removeChild(typingIndicator);
      }

      const botMsg = document.createElement('div');
      botMsg.className = 'ai-msg assistant';

      // Smart fallback response
      let fallbackText = `### 💡 Design Insight for ${currentContext}\n\nRegarding **"${text}"**:\n\n1. **Visual Hierarchy**: Prioritize primary CTAs with distinct accent background colors and high contrast.\n2. **Usability**: Keep user flows linear and predictable with minimum friction.\n3. **Accessibility**: Ensure minimum 4.5:1 color contrast compliance (WCAG 2.1 AA).`;
      
      botMsg.innerHTML = formatMarkdown(fallbackText);
      aiMsgList.appendChild(botMsg);
      aiMsgList.scrollTop = aiMsgList.scrollHeight;
    }
  }

  if (aiSendBtn) aiSendBtn.addEventListener('click', () => sendAIMessage());
  if (aiInput) {
    aiInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendAIMessage();
    });
  }

  window.openAIPanel = openAIPanel;
  window.closeAIPanel = closeAIPanel;
  window.sendAIMessage = sendAIMessage;
};

// Context Indicator Updater
window.updateAIContextText = function(state) {
  const textEl = document.getElementById('ai-context-text');
  if (!textEl) return;

  if (state.activeView === 'inspiration') {
    textEl.textContent = `Context: ${state.searchQuery || 'Inspiration Search'}`;
  } else if (state.activeView === 'figma') {
    textEl.textContent = `Context: Figma Component Library`;
  } else if (state.activeView === 'projects') {
    textEl.textContent = `Context: Active Design Projects`;
  } else {
    textEl.textContent = `Context: ${state.searchQuery || 'Footwear Ecommerce'}`;
  }
};

