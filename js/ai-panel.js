/* ==========================================================================
   DESIGNPILOT AI - COLLAPSIBLE AI PANEL MODULE (js/ai-panel.js)
   ========================================================================== */

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
          New session started. Ask me about UI/UX layout patterns, Figma design systems, or WCAG accessibility guidelines.
        </div>
      `;
    });
  }

  function sendAIMessage(customText) {
    const text = customText || (aiInput ? aiInput.value : '');
    if (!text || text.trim() === '' || !aiMsgList) return;

    // User Message
    const userMsg = document.createElement('div');
    userMsg.className = 'ai-msg user';
    userMsg.textContent = text;
    aiMsgList.appendChild(userMsg);

    if (!customText && aiInput) aiInput.value = '';
    aiMsgList.scrollTop = aiMsgList.scrollHeight;

    // Realistic Demo Assistant Response
    setTimeout(() => {
      const botMsg = document.createElement('div');
      botMsg.className = 'ai-msg assistant';

      let response = `Based on current senior product design standards for **${state.searchQuery || 'this project'}**:

1. **Visual Hierarchy**: Emphasize photography & hero callouts before secondary metadata.
2. **Component Ergonomics**: Ensure button touch targets meet 44x44pt on mobile.
3. **Accessibility**: Maintain WCAG 2.1 AA color contrast compliance.`;

      if (text.toLowerCase().includes('ux') || text.toLowerCase().includes('pattern')) {
        response = `For a modern **${state.searchQuery || 'e-commerce'}** workflow:

• **Hero**: 60/40 Split layout featuring high-contrast editorial photography.
• **Navigation**: Minimal header with sticky cart counter indicator.
• **Product Spec Grid**: Monospace typography paired with serif display headers.`;
      }

      botMsg.innerHTML = response.replace(/\n/g, '<br>');
      aiMsgList.appendChild(botMsg);
      aiMsgList.scrollTop = aiMsgList.scrollHeight;
    }, 500);
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
