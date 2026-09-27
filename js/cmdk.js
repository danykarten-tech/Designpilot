/* ==========================================================================
   DESIGNPILOT AI - GLOBAL SEARCH (CMD+K) MODULE (js/cmdk.js)
   ========================================================================== */

window.initCmdk = function(state) {
  const modal = document.getElementById('cmdk-modal-overlay');
  const triggerBtn = document.getElementById('btn-global-search');
  const input = document.getElementById('cmdk-input-field');

  function openCMDK() {
    if (modal) {
      modal.classList.add('active');
      if (input) input.focus();
    }
  }

  function closeCMDK() {
    if (modal) modal.classList.remove('active');
  }

  if (triggerBtn) triggerBtn.addEventListener('click', openCMDK);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCMDK();
    });
  }

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openCMDK();
    }
    if (e.key === 'Escape') {
      closeCMDK();
      if (window.closeDetailModal) window.closeDetailModal();
    }
  });

  document.querySelectorAll('.cmdk-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.currentTarget.dataset.target;
      closeCMDK();
      if (target === 'footwear') {
        state.searchQuery = 'Footwear Ecommerce';
        document.getElementById('tab-inspiration').click();
      } else if (target === 'figma') {
        document.getElementById('tab-figma').click();
      }
    });
  });

  window.openCMDK = openCMDK;
  window.closeCMDK = closeCMDK;
};
