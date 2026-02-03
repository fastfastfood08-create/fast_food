/**
 * Sidebar Loader (Instant Injection)
 * This script runs immediately after the #sidebar-container to inject cached HTML.
 * It prevents the white flash/flicker by rendering before the main CSS/JS is fully parsed.
 */
(function() {
    try {
        const container = document.getElementById('sidebar-container');
        if (!container) return;

        // 1. Try Cache
        const cachedHtml = sessionStorage.getItem('adminSidebarCache');
        if (cachedHtml) {
            container.innerHTML = cachedHtml;
            container.setAttribute('data-loaded', 'true'); // Flag for admin-core.js

            // 2. Set Active State Immediately (Visual feedback without waiting for JS)
            const path = window.location.pathname;
            const navItems = {
                '/admin-dashboard': 'nav-dashboard',
                '/admin-orders': 'nav-orders',
                '/admin-meals': 'nav-meals',
                '/admin-categories': 'nav-categories',
                '/admin-ratings': 'nav-ratings',
                '/admin-settings': 'nav-settings'
            };

            // Remove old 'active' classes to be safe
            const oldActive = container.querySelectorAll('.nav-item.active');
            if(oldActive) oldActive.forEach(el => el.classList.remove('active'));

            // Find current page key
            let currentPage = Object.keys(navItems).find(key => path.includes(key));
            
            // Handle root /admin redirect case
            if (!currentPage && path.endsWith('/admin')) {
                currentPage = '/admin-dashboard';
            }

            if (currentPage) {
                const id = navItems[currentPage];
                const activeEl = document.getElementById(id);
                if (activeEl) {
                    activeEl.classList.add('active');
                }
            }
        }
    } catch (e) {
        // Silently fail if something goes wrong, admin-core.js will handle fallback
        console.error('Sidebar fast-load error:', e);
    }
})();
