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

    function preventScroll(e) {
        e.preventDefault();
    }

    function isMobile() {
        return window.matchMedia('(max-width: 639px)').matches;
    }

    async function openPanel(drink) {
        currentDrink = drink;

        let imgUrl = '';
        let description = 'lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

        try {
            const res = await fetch('https://www.thecocktaildb.com/api/json/v1/1/search.php?s=' + encodeURIComponent(drink.name));
            const data = await res.json();
            if (data.drinks && data.drinks.length > 0) {
                const apiDrink = data.drinks[0];
                imgUrl = apiDrink.strDrinkThumb || '';
                description = apiDrink.strInstructions || description;
            }
        } catch (e) {
            console.warn('Failed to fetch drink image', e);
        }

        panelTitle.textContent = drink.name || 'Drink';
        panelContent.innerHTML = buildPanelHtml(drink, imgUrl, description);

        mainEl.classList.add('push-for-panel');

        if (isMobile()) {
            document.documentElement.classList.add('no-scroll-when-panel-open');
            dragIndicator.style.display = 'block';
            document.addEventListener('touchmove', preventScroll, { passive: false });
        } else {
            dragIndicator.style.display = 'none';
        }

        document.documentElement.classList.add('panel-open');
        isOpen = true;
        closeBtn.focus();
    }

    function closePanel() {
        document.documentElement.classList.remove('panel-open');
        document.documentElement.classList.remove('no-scroll-when-panel-open');
        isOpen = false;
        currentDrink = null;

        document.removeEventListener('touchmove', preventScroll);

        panel.style.transform = '';
        backdrop.style.opacity = '';

        const t = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-transition')) || 300;
        setTimeout(() => {
            mainEl.classList.remove('push-for-panel');
        }, t + 20);
    }

    function buildPanelHtml(d, imgUrl = '', description = '') {

    const ingredientsHtml = (d.ingredients || [])
        .map(i => `<li class="mb-2"><span class="text-neutral-100">${escapeHtml(i.name)}</span> ${i.amount ? `<span class="text-neutral-400">– ${escapeHtml(i.amount)}</span>` : ''}</li>`)
        .join('');

    return `
    <div class="flex flex-col xl:flex-row gap-4 w-full">
        <!-- Image -->
        ${imgUrl ? `
        <div class="md:basis-1/2 w-full">
            <img src="${imgUrl}" alt="${d.name}" class="rounded w-full h-auto object-cover">
        </div>
        ` : ''}

        <!-- Description -->
        <div class="md:basis-1/2 text-sm text-neutral-400 min-w-0">
            <p>${description}</p>

            <!-- Ingredients -->
            <div class="mt-4">
                <strong class="text-neutral-200">Ingredients</strong>
                <ul class="mt-2 text-sm list-none pl-0">${ingredientsHtml}</ul>
            </div>
        </div>
    </div>

    
    `;
}


    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Attach click handlers to cards
    const originalRender = window.renderDrinks;
    if (typeof originalRender === 'function') {
        window.renderDrinks = function (list) {
            originalRender(list);
            const cards = document.querySelectorAll('#drinksContainer > div');
            cards.forEach(card => {
                if (card.__panelBound) return;
                card.__panelBound = true;

                card.addEventListener('click', (ev) => {
                    if (ev.target.closest('button') || ev.target.closest('a')) return;
                    const titleEl = card.querySelector('h3');
                    const name = titleEl ? titleEl.textContent.trim() : null;
                    const d = (window.allDrinks || []).find(x => x.name === name);
                    if (d) openPanel(d);
                });
            });
        };
    } else {
        document.addEventListener('click', (ev) => {
            const card = ev.target.closest('#drinksContainer > div');
            if (!card) return;
            const titleEl = card.querySelector('h3');
            const name = titleEl ? titleEl.textContent.trim() : null;
            const d = (window.allDrinks || []).find(x => x.name === name);
            if (d) openPanel(d);
        });
    }

    // Close events
    backdrop.addEventListener('click', closePanel);
    closeBtn.addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closePanel(); });

    // Drag-to-close for mobile
    (function setupDrag() {
        let startY = 0;
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
            const currentY = e.touches ? e.touches[0].clientY : e.clientY;
            const delta = Math.max(0, currentY - startY);
            panel.style.transform = `translateY(${delta}px)`;
            backdrop.style.opacity = Math.max(0, 1 - delta / (panelHeight * 0.9));
        }

        function onPointerUp(e) {
            if (!dragging) return;
            dragging = false;
            panelHandle.classList.remove('dragging');
            panel.style.transition = '';

            const delta = Math.max(0, (e.changedTouches ? e.changedTouches[0].clientY : e.clientY) - startY);
            if (delta > panelHeight * 0.35) {
                panel.style.transform = `translateY(100%)`;
                backdrop.style.opacity = 0;
                setTimeout(() => {
                    panel.style.transform = '';
                    closePanel();
                }, 220);
            } else {
                panel.style.transform = '';
                backdrop.style.opacity = 1;
            }
        }

        panelHandle.addEventListener('touchstart', onPointerDown, { passive: true });
        document.addEventListener('touchmove', onPointerMove, { passive: true });
        document.addEventListener('touchend', onPointerUp);

        panelHandle.addEventListener('mousedown', (e) => {
            if (!isMobile() || !isOpen) return;
            onPointerDown(e);
            const onMove = ev => onPointerMove(ev);
            const onUp = ev => { onPointerUp(ev); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
        });
    })();

    // Close when clicking outside
    document.addEventListener('click', (ev) => {
        if (!isOpen) return;
        if (!ev.target.closest('#panel') && !ev.target.closest('#drinksContainer')) closePanel();
    });

    window.openDrinkPanel = openPanel;
})();
