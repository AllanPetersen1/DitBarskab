let allDrinks = [];
let activeFilters = [];

async function init() {
  const res = await fetch('data/drinks.json');
  allDrinks = await res.json();
  renderDrinks(allDrinks);

  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const v = e.target.value.trim().toLowerCase();
      if (v) addFilter(v);
      e.target.value = '';
    }
  });
}

function addFilter(tag) {
  if (!activeFilters.includes(tag)) activeFilters.push(tag);
  update();
}

function removeFilter(tag) {
  activeFilters = activeFilters.filter(t => t !== tag);
  update();
}

function update() {
  renderFilterTags();
  const filtered = allDrinks.filter(drink =>
    activeFilters.every(f => drink.ingredients.some(i => i.name.toLowerCase().includes(f)))
  );
  renderDrinks(filtered);
}

function renderFilterTags() {
  const wrap = document.getElementById('filterTags');
  wrap.innerHTML = '';
  activeFilters.forEach(f => {
    const tag = document.createElement('div');
    tag.className = 'flex items-center bg-brand text-black font-bold px-3 py-1 rounded-full';
    tag.innerHTML = `${f} <span class="ml-2 cursor-pointer" onclick="removeFilter('${f}')">✕</span>`;
    wrap.appendChild(tag);
  });
}

function renderDrinks(list) {
  const c = document.getElementById('drinksContainer');
  c.innerHTML = '';
  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'bg-neutral-800 rounded-lg p-4 border border-neutral-700';
    card.innerHTML = `
      <h3 class="text-xl font-bold text-brand mb-2">${d.name}</h3>
      <p class="text-sm text-neutral-400 mb-2">${d.method}</p>
      <div class="text-neutral-300 text-sm">
        <strong>Ingredients:</strong><br>
        ${d.ingredients.map(i => `${i.name} (${i.amount})`).join('<br>')}
      </div>
    `;
    c.appendChild(card);
  });
}

init();
