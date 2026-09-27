/* ==========================================================================
   DESIGNPILOT AI - ROUTER & NAVIGATION (js/nav.js)
   ========================================================================== */

window.initNavigation = function(state) {
  const navButtons = document.querySelectorAll('.nav-link, #nav-brand-home');

  navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const view = btn.dataset.view;
      if (!view) return;

      // Update Top Nav active state
      document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
      const activeTab = document.getElementById(`tab-${view}`);
      if (activeTab) activeTab.classList.add('active');

      // Update visible page section
      document.querySelectorAll('.view-page').forEach(p => p.classList.remove('active'));
      const targetPage = document.getElementById(`page-${view}`);
      if (targetPage) targetPage.classList.add('active');

      state.activeView = view;
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Update Context indicator in AI panel
      if (window.updateAIContextText) {
        window.updateAIContextText(state);
      }
    });
  });

  const linkViewAll = document.getElementById('link-view-all-inspiration');
  if (linkViewAll) {
    linkViewAll.addEventListener('click', () => {
      document.getElementById('tab-inspiration').click();
    });
  }
};
