let allIngredients = [];
let chosenIngredients = [];

async function initAdd() {
  const res = await fetch('data/ingredients.json');
  allIngredients = await res.json();

  const input = document.getElementById('ingredientSearch');

  input.addEventListener('input', () => {
    const q = input.value.toLowerCase();
    const matches = allIngredients.filter(i => i.toLowerCase().includes(q)).slice(0, 10);
    renderSuggestions(matches);
  });

  document.getElementById('downloadBtn').addEventListener('click', downloadJSON);
}

function renderSuggestions(list) {
  const box = document.getElementById('ingredientSuggestions');
  box.innerHTML = '';
  if (list.length === 0) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');

  list.forEach(i => {
    const row = document.createElement('div');
    row.className = 'p-2 hover:bg-neutral-700 cursor-pointer';
    row.innerText = i;
    row.onclick = () => addIngredient(i);
    box.appendChild(row);
  });
}

function addIngredient(name) {
  const amount = prompt(`Amount for ${name}? (e.g. 3 cl)`);
  if (!amount) return;
  chosenIngredients.push({ name, amount });
  renderIngredientList();
}

function renderIngredientList() {
  const wrap = document.getElementById('ingredientList');
  wrap.innerHTML = '';
  chosenIngredients.forEach((i, index) => {
    const chip = document.createElement('div');
    chip.className = 'bg-brand text-black font-bold px-3 py-1 rounded-full flex items-center';
    chip.innerHTML = `${i.name} (${i.amount}) <span class="ml-2 cursor-pointer" onclick="removeIng(${index})">✕</span>`;
    wrap.appendChild(chip);
  });
}

function removeIng(index) {
  chosenIngredients.splice(index, 1);
  renderIngredientList();
}

function downloadJSON() {
  const obj = {
    name: document.getElementById('drinkName').value,
    ingredients: chosenIngredients,
    garnish: document.getElementById('garnish').value,
    method: document.getElementById('method').value,
    glass: document.getElementById('glass').value,
    ice: document.getElementById('ice').value
  };

  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${obj.name.replace(/\s+/g, '_').toLowerCase()}.json`;
  a.click();
}

initAdd();
