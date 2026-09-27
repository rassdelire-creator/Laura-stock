let ideas = JSON.parse(localStorage.getItem('my_ideas')) || [];
let currentFilter = 'all';

const ideaTitleInput = document.getElementById('ideaTitle');
const ideaCategorySelect = document.getElementById('ideaCategory');
const ideaTextInput = document.getElementById('ideaText');
const addBtn = document.getElementById('addBtn');
const ideasList = document.getElementById('ideasList');
const searchInput = document.getElementById('searchInput');
const tagBtns = document.querySelectorAll('.tag-btn');
const themeToggle = document.getElementById('themeToggle');

// Masquer le splash screen au chargement
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashScreen');
  setTimeout(() => {
    if (splash) {
      splash.classList.add('hidden');
    }
  }, 1400);
});

// Thème
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'light' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const newTheme = isLight ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  themeToggle.textContent = newTheme === 'light' ? '☀️' : '🌙';
  localStorage.setItem('theme', newTheme);
});

// Ajout
addBtn.addEventListener('click', () => {
  const title = ideaTitleInput.value.trim();
  const text = ideaTextInput.value.trim();
  const category = ideaCategorySelect.value;

  if (!title) {
    alert("Donne un titre à ton idée !");
    return;
  }

  const newIdea = {
    id: Date.now(),
    title: title,
    text: text,
    category: category,
    date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
  };

  ideas.unshift(newIdea);
  saveAndRender();

  ideaTitleInput.value = '';
  ideaTextInput.value = '';
});

function deleteIdea(id) {
  ideas = ideas.filter(idea => idea.id !== id);
  saveAndRender();
}

function saveAndRender() {
  localStorage.setItem('my_ideas', JSON.stringify(ideas));
  renderIdeas();
}

const categoryLabels = {
  app: '💻 App / Dev',
  story: '✍️ Histoire',
  video: '🎥 Vidéo',
  other: '💡 Autre'
};

function renderIdeas() {
  const search = searchInput.value.toLowerCase().trim();
  ideasList.innerHTML = '';

  const filtered = ideas.filter(idea => {
    const matchesFilter = currentFilter === 'all' || idea.category === currentFilter;
    const matchesSearch = idea.title.toLowerCase().includes(search) || idea.text.toLowerCase().includes(search);
    return matchesFilter && matchesSearch;
  });

  if (filtered.length === 0) {
    ideasList.innerHTML = `
      <div class="empty-state">
        <p>Aucune idée enregistrée.</p>
      </div>
    `;
    return;
  }

  filtered.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card';
    card.innerHTML = `
      <div class="idea-header">
        <span class="idea-title">${escapeHtml(idea.title)}</span>
        <span class="badge">${categoryLabels[idea.category] || '💡 Autre'}</span>
      </div>
      ${idea.text ? `<div class="idea-content">${escapeHtml(idea.text)}</div>` : ''}
      <div class="idea-footer">
        <span>Enregistré le ${idea.date}</span>
        <button class="delete-btn" onclick="deleteIdea(${idea.id})">Supprimer</button>
      </div>
    `;
    ideasList.appendChild(card);
  });
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}

searchInput.addEventListener('input', renderIdeas);

tagBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tagBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderIdeas();
  });
});

renderIdeas();
