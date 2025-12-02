// Panel JS (drop into your script, after renderDrinks)
(function () {
    const detailPanelRoot = document.getElementById('detailPanel');
    const panel = document.getElementById('panel');
    const panelContent = document.getElementById('panelContent');
    const panelTitle = document.getElementById('panelTitle');
    const closeBtn = document.getElementById('closePanelBtn');
    const backdrop = document.getElementById('panelBackdrop');
    const panelHandle = document.getElementById('panelHandle');
    const dragIndicator = document.getElementById('dragIndicator');
    const mainEl = document.querySelector('main');

    let isOpen = false;
    let currentDrink = null;

    // Helper: returns true if we're on "mobile" layout (matches bottom sheet behaviour)
    function isMobile() {
        return window.matchMedia('(max-width: 639px)').matches;
    }

    // Open panel with drink data
    function openPanel(drink) {
        currentDrink = drink;
        panelTitle.textContent = drink.name || 'Drink';
        panelContent.innerHTML = buildPanelHtml(drink);

        // Make sure main can be pushed by adding class (safe if already added)
        mainEl.classList.add('push-for-panel');

        // toggle root class to animate in
        document.documentElement.classList.add('no-scroll-when-panel-open'); // optional for global control
        document.body.classList.add('panel-open');
        isOpen = true;

        // for accessibility: focus the close button
        closeBtn.focus();

        // For mobile, allow dragging from handle; for desktop pointer events handled but not draggable downward
        if (isMobile()) {
            dragIndicator.style.display = 'block';
        } else {
            dragIndicator.style.display = 'none';
        }
    }

    // Close panel
    function closePanel() {
        document.body.classList.remove('panel-open');
        isOpen = false;
        currentDrink = null;
        // remove push after transition
        const t = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-transition')) || 300;
        setTimeout(() => {
            mainEl.classList.remove('push-for-panel');
            document.documentElement.classList.remove('no-scroll-when-panel-open');
        }, t + 20);
    }

    // Build inner HTML for panel (detailed view)
    function buildPanelHtml(d) {
        const method = d.method ? `<p class="mb-3 text-sm text-neutral-400">${d.method}</p>` : '';
        const ingredientsHtml = (d.ingredients || []).map(i => `<li class="mb-2"><strong class="text-neutral-100">${escapeHtml(i.name)}</strong> ${i.amount ? `<span class="text-neutral-400">– ${escapeHtml(i.amount)}</span>` : ''}</li>`).join('');
        const notes = d.notes ? `<p class="mt-3 text-sm text-neutral-400">${escapeHtml(d.notes)}</p>` : '';

        return `
        ${method}
        <div>
          <strong class="text-neutral-200">Ingredients</strong>
          <ul class="mt-2 text-sm list-none pl-0">${ingredientsHtml}</ul>
        </div>
        ${notes}
      `;
    }

    // Basic HTML escape
    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Attach panel open to each drink card.
    // If you already add click handlers when creating cards, you can skip this.
    // We'll monkey-patch renderDrinks by overriding it so newly created cards get the onclick.
    const originalRender = window.renderDrinks;
    if (typeof originalRender === 'function') {
        window.renderDrinks = function (list) {
            originalRender(list);
            // attach click handler to each card element (based on title match)
            const cards = document.querySelectorAll('#drinksContainer > div');
            cards.forEach(card => {
                // avoid double-binding
                if (card.__panelBound) return;
                card.__panelBound = true;

                card.addEventListener('click', (ev) => {
                    // If click was on the tag close '✕' or other interactive element, ignore
                    if (ev.target.closest('button') || ev.target.closest('a')) return;
                    // find drink name inside card
                    const titleEl = card.querySelector('h3');
                    const name = titleEl ? titleEl.textContent.trim() : null;
                    // find drink object from allDrinks by name
                    const d = (window.allDrinks || []).find(x => x.name === name);
                    if (d) openPanel(d);
                });
            });
        };
    } else {
        // Fallback if renderDrinks not available — attach from the initial cards
        document.addEventListener('click', (ev) => {
            const card = ev.target.closest('#drinksContainer > div');
            if (!card) return;
            const titleEl = card.querySelector('h3');
            const name = titleEl ? titleEl.textContent.trim() : null;
            const d = (window.allDrinks || []).find(x => x.name === name);
            if (d) openPanel(d);
        });
    }

    // Close by clicking backdrop or close button
    backdrop.addEventListener('click', () => closePanel());
    closeBtn.addEventListener('click', () => closePanel());

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isOpen) closePanel();
    });

    // Drag-to-close for mobile bottom sheet
    (function setupDrag() {
        let startY = 0;
        let currentY = 0;
        let dragging = false;
        let panelHeight = 0;

        function onPointerDown(e) {
            if (!isMobile() || !isOpen) return;
            dragging = true;
            panelHandle.classList.add('dragging');
            startY = e.touches ? e.touches[0].clientY : e.clientY;
            panelHeight = panel.getBoundingClientRect().height;
            panel.style.transition = 'none';
        }

        function onPointerMove(e) {
            if (!dragging) return;
            currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const delta = Math.max(0, currentY - startY);
            // move the panel down by delta (px)
            panel.style.transform = `translateY(${delta}px)`; // relative movement
            backdrop.style.opacity = Math.max(0, 1 - delta / (panelHeight * 0.9));
        }

        function onPointerUp(e) {
            if (!dragging) return;
            dragging = false;
            panelHandle.classList.remove('dragging');
            panel.style.transition = ''; // restore transition
            const delta = Math.max(0, (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - startY);
            const threshold = panelHeight * 0.35; // if dragged more than 35% of panel height, close
            if (delta > threshold) {
                // animate out quickly
                panel.style.transform = `translateY(100%)`;
                backdrop.style.opacity = 0;
                // wait transition then fully close
                setTimeout(() => {
                    panel.style.transform = '';
                    closePanel();
                }, 220);
            } else {
                // reset to open position
                panel.style.transform = '';
                backdrop.style.opacity = 1;
            }
        }

        // Touch support
        panelHandle.addEventListener('touchstart', onPointerDown, { passive: true });
        document.addEventListener('touchmove', onPointerMove, { passive: true });
        document.addEventListener('touchend', onPointerUp);

        // Mouse support (desktop: small drag effect not used to close)
        panelHandle.addEventListener('mousedown', (e) => {
            if (!isMobile() || !isOpen) return;
            onPointerDown(e);
            const onMove = (ev) => onPointerMove(ev);
            const onUp = (ev) => {
                onPointerUp(ev);
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    })();

    // Close when clicking outside the panel (but not when interacting with input inside)
    document.addEventListener('click', (ev) => {
        if (!isOpen) return;
        const clickInsidePanel = ev.target.closest('#panel');
        const clickInsideTrigger = ev.target.closest('#drinksContainer');
        if (!clickInsidePanel && !clickInsideTrigger) {
            closePanel();
        }
    });

    // Expose openPanel for debugging if needed:
    window.openDrinkPanel = openPanel;
})();