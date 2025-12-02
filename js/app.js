let allDrinks = [];
let activeFilters = [];
let ingredients = [];
let synonyms = {};
let selectedSuggestionIndex = -1;
let visibleSuggestions = [];

// Normalize strings
function normalize(str) {
  return String(str || '').toLowerCase().trim();
}

// Build bidirectional synonym map
function buildSynonymMap(rawSynonyms) {
  const map = {};

  Object.keys(rawSynonyms).forEach(key => {
    const group = [key, ...rawSynonyms[key]].map(normalize);

    group.forEach(term => {
      map[term] = group;
    });
  });

  return map;
}

// Add a filter
function addFilter(term) {
  if (!activeFilters.includes(term)) activeFilters.push(term);
  update();
}

// Remove a filter
function removeFilter(term) {
  activeFilters = activeFilters.filter(t => normalize(t) !== normalize(term));
  update();
}

// Update drinks grid and filter tags
function update() {
  renderFilterTags();

  const filtered = allDrinks.filter(drink =>
    activeFilters.every(f => {
      const fNorm = normalize(f);
      const fSyns = synonyms[fNorm] || [fNorm];

      return (drink.ingredients || []).some(i => {
        const iNorm = normalize(i.name);
        const iSyns = synonyms[iNorm] || [iNorm];
        // check for any overlap
        return iSyns.some(iSyn => fSyns.includes(iSyn));
      });
    })
  );

  renderDrinks(filtered);
}

// Render filter tags
function renderFilterTags() {
  const wrap = document.getElementById('filterTags');
  if (!wrap) return;
  wrap.innerHTML = '';

  activeFilters.forEach(f => {
    const tag = document.createElement('div');
    tag.className = 'flex items-center bg-brand text-black font-bold px-3 py-1 rounded-full mr-2 mb-2';
    tag.innerHTML = `${f} <span class="ml-2 cursor-pointer" onclick="removeFilter('${f}')">✕</span>`;
    wrap.appendChild(tag);
  });
}

// Render drinks grid
function renderDrinks(list) {
  const container = document.getElementById('drinksContainer');
  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    container.innerHTML = '<p class="text-neutral-400">No drinks match your ingredients.</p>';
    return;
  }

  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'bg-neutral-800 rounded-lg p-4 border border-neutral-700 mb-4';
    card.innerHTML = `
      <h3 class="text-xl font-bold text-brand mb-2">${d.name}</h3>
      <p class="text-sm text-neutral-400 mb-2">${d.method || ''}</p>
      <div class="text-neutral-300 text-sm">
        <strong>Ingredients:</strong><br>
        ${(d.ingredients || []).map(i => `${i.name} (${i.amount || ''})`).join('<br>')}
      </div>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll('#drinksContainer > div').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.querySelector('h3')?.textContent.trim();
      const drink = allDrinks.find(d => d.name === name);
      if (drink) window.openDrinkPanel(drink);
    });
  });
}

// Handle arrow key navigation in suggestions
function handleArrowKeys(e) {
  const items = Array.from(document.querySelectorAll('#suggestions li'));

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (items.length === 0) return;

    selectedSuggestionIndex =
      selectedSuggestionIndex < items.length - 1
        ? selectedSuggestionIndex + 1
        : 0;

    updateHighlight(items);
    // Scroll into view if needed
    if (selectedSuggestionIndex >= 0) {
      items[selectedSuggestionIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }
  else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (items.length === 0) return;

    selectedSuggestionIndex =
      selectedSuggestionIndex > 0
        ? selectedSuggestionIndex - 1
        : items.length - 1;

    updateHighlight(items);
    // Scroll into view if needed
    if (selectedSuggestionIndex >= 0) {
      items[selectedSuggestionIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }
}

// Highlight selected suggestion
function updateHighlight(items) {
  items.forEach((li, idx) => {
    li.classList.toggle('bg-neutral-700', idx === selectedSuggestionIndex);
    li.classList.toggle('text-brand', idx === selectedSuggestionIndex);

    // Remove hover background from selected item
    if (idx === selectedSuggestionIndex) {
      li.classList.remove('hover:bg-neutral-700');
    } else {
      li.classList.add('hover:bg-neutral-700');
    }
  });
}

// Show suggestions dropdown
function showSuggestions(term) {
  const suggestionsList = document.getElementById('suggestions');
  selectedSuggestionIndex = -1;
  visibleSuggestions = [];

  if (!term) {
    suggestionsList.innerHTML = '';
    suggestionsList.style.display = 'none';
    return;
  }

  const t = normalize(term);
  let items = [];

  // Match ingredients and synonyms
  ingredients.forEach(ing => {
    const ingNorm = normalize(ing);
    if (ingNorm.startsWith(t)) items.push(ing);
    else if (synonyms[ingNorm]?.some(s => normalize(s).startsWith(t))) items.push(ing);
  });

  Object.keys(synonyms).forEach(key => {
    if (key.startsWith(t)) items.push(key);
  });

  // Deduplicate by normalized value, keep first occurrence (original casing)
  const seen = new Set();
  items = items.filter(i => {
    const norm = normalize(i);
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });

  // Limit to first 10 suggestions
  items = items.slice(0, 10);

  suggestionsList.innerHTML = '';
  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'px-3 py-2 hover:bg-neutral-700 cursor-pointer';
    li.textContent = item;
    li.dataset.index = index;

    li.addEventListener('click', () => {
      addFilter(item);
      document.getElementById('searchInput').value = '';
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
      selectedSuggestionIndex = -1; // Reset selection
    });

    // Add hover effect
    li.addEventListener('mouseenter', () => {
      const allItems = Array.from(suggestionsList.querySelectorAll('li'));
      selectedSuggestionIndex = index;
      updateHighlight(allItems);
    });

    suggestionsList.appendChild(li);
  });

  visibleSuggestions = items;
  suggestionsList.style.display = items.length ? 'block' : 'none';

  // Reset selection when suggestions change
  selectedSuggestionIndex = -1;
}

// Initialize app
async function init() {
  try {
    // Load drinks
    const drinksRes = await fetch('data/drinks.json', { cache: 'no-store' });
    allDrinks = (await drinksRes.json()) || [];

    // Build ingredients list
    const ingSet = new Set();
    allDrinks.forEach(d => {
      (d.ingredients || []).forEach(i => {
        if (i && i.name) ingSet.add(i.name);
      });
    });
    ingredients = Array.from(ingSet);

    // Load synonyms
    try {
      const synRes = await fetch('data/synonyms.json', { cache: 'no-store' });
      const rawSyns = await synRes.json();
      synonyms = buildSynonymMap(rawSyns);
    } catch (e) {
      synonyms = {};
    }
  } catch (err) {
    console.warn('Failed to load drinks or synonyms', err);
    allDrinks = [];
    ingredients = [];
    synonyms = {};
  }

  // Setup search input & dropdown
  const searchInput = document.getElementById('searchInput');
  const suggestionsList = document.getElementById('suggestions');

  searchInput.addEventListener('input', e => showSuggestions(e.target.value));
  searchInput.addEventListener('keydown', e => {
    handleArrowKeys(e);

    // Only add filter if selected via Enter or from suggestion list
    if (e.key === 'Enter') {
      if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < visibleSuggestions.length) {
        const selectedItem = visibleSuggestions[selectedSuggestionIndex];
        addFilter(selectedItem);
        searchInput.value = '';
        document.getElementById('suggestions').innerHTML = '';
        document.getElementById('suggestions').style.display = 'none';
        selectedSuggestionIndex = -1;
        e.preventDefault();
      }
      // If no selection, do nothing (strict selection)
    }
  });

  document.addEventListener('click', e => {
    if (!searchInput.contains(e.target) && !suggestionsList.contains(e.target)) {
      suggestionsList.innerHTML = '';
      suggestionsList.style.display = 'none';
      selectedSuggestionIndex = -1;
    }
  });

  // Initial render
  renderDrinks(allDrinks);
  renderFilterTags();
}

// DOM ready
document.addEventListener('DOMContentLoaded', init);