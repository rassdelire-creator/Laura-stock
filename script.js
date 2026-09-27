// --- SERVICE WORKER ---
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.log(err));
}

// --- GESTION DU PROFIL UTILISATEUR ---
const profileModal = document.getElementById('profileModal');
const userNameInput = document.getElementById('userNameInput');
const userAgeInput = document.getElementById('userAgeInput');
const userGenderInput = document.getElementById('userGenderInput');
const userCrushInput = document.getElementById('userCrushInput');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const userGreeting = document.getElementById('userGreeting');

let userProfile = JSON.parse(localStorage.getItem('user_profile')) || null;

function checkProfile() {
  if (!userProfile || !userProfile.name) {
    profileModal.classList.remove('hidden');
  } else {
    profileModal.classList.add('hidden');
    displayGreeting();
  }
}

saveProfileBtn.addEventListener('click', () => {
  const name = userNameInput.value.trim();
  const age = userAgeInput.value.trim();
  const gender = userGenderInput.value;
  const crush = userCrushInput.value.trim();

  if (!name || !age) {
    alert("Remplis au moins ton nom et ton âge !");
    return;
  }

  userProfile = { name, age, gender, crush };
  localStorage.setItem('user_profile', JSON.stringify(userProfile));
  profileModal.classList.add('hidden');
  displayGreeting();
});

function displayGreeting() {
  if (!userProfile) return;
  const pronoun = userProfile.gender === 'elle' ? 'Bienvenue' : 'Bienvenu';
  let text = `${pronoun} ${userProfile.name} (${userProfile.age} ans)`;
  if (userProfile.crush) {
    text += ` | ❤️ ${userProfile.crush}`;
  }
  userGreeting.textContent = text;
}

// --- MINI-JEU GEOMETRY DASH ---
const player = document.getElementById('player');
const obstacle = document.getElementById('obstacle');
const gameContainer = document.getElementById('gameContainer');
const startScreen = document.getElementById('startScreen');
const startGameBtn = document.getElementById('startGameBtn');
const gameScoreEl = document.getElementById('gameScore');

let isGaming = false;
let score = 0;
let scoreInterval;
let checkCollisionInterval;

function jump() {
  if (!isGaming) return;
  if (!player.classList.contains('jump')) {
    player.classList.add('jump');
    setTimeout(() => player.classList.remove('jump'), 500);
  }
}

gameContainer.addEventListener('touchstart', (e) => {
  e.preventDefault();
  jump();
});

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') jump();
});

startGameBtn.addEventListener('click', startGame);

function startGame() {
  startScreen.style.display = 'none';
  obstacle.classList.add('running');
  isGaming = true;
  score = 0;
  gameScoreEl.textContent = `Score: ${score}`;

  scoreInterval = setInterval(() => {
    score++;
    gameScoreEl.textContent = `Score: ${score}`;
  }, 100);

  checkCollisionInterval = setInterval(() => {
    const playerBottom = parseInt(window.getComputedStyle(player).getPropertyValue('bottom'));
    const obstacleLeft = parseInt(window.getComputedStyle(obstacle).getPropertyValue('left'));

    if (obstacleLeft > 30 && obstacleLeft < 56 && playerBottom < 26) {
      gameOver();
    }
  }, 10);
}

function gameOver() {
  isGaming = false;
  obstacle.classList.remove('running');
  clearInterval(scoreInterval);
  clearInterval(checkCollisionInterval);
  alert(`Game Over ! Score final : ${score}`);
  startScreen.style.display = 'flex';
}

// --- SPLASH SCREEN & INITIALISATION ---
window.addEventListener('DOMContentLoaded', () => {
  const splash = document.getElementById('splashScreen');
  setTimeout(() => {
    if (splash) splash.classList.add('hidden');
    checkProfile();
  }, 1400);
});

// --- GESTION DES IDÉES ---
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

// THÈME
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

// SAUVEGARDE & RENDU
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
    title, text, category,
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
    ideasList.innerHTML = `<div class="empty-state"><p>Aucune idée enregistrée.</p></div>`;
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
  return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
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
