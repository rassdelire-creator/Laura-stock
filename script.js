document.addEventListener('DOMContentLoaded', () => {

  // --- 1. DEBLOCAGE SPLASH SCREEN ---
  setTimeout(() => {
    const splash = document.getElementById('splashScreen');
    if (splash) {
      splash.classList.add('hidden');
    }
  }, 1200);

  // --- 2. GESTION DU PROFIL USER ---
  const profileModal = document.getElementById('profileModal');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const userGreeting = document.getElementById('userGreeting');

  const userNameInput = document.getElementById('userNameInput');
  const userAgeInput = document.getElementById('userAgeInput');
  const userGenderInput = document.getElementById('userGenderInput');
  const userCrushInput = document.getElementById('userCrushInput');

  let userProfile = JSON.parse(localStorage.getItem('laugra_user_profile')) || null;

  function checkProfile() {
    if (!userProfile) {
      profileModal.classList.remove('hidden');
    } else {
      profileModal.classList.add('hidden');
      userGreeting.textContent = `Bienvenue, ${userProfile.name} ! ✨`;
    }
  }

  saveProfileBtn.addEventListener('click', () => {
    const name = userNameInput.value.trim();
    const age = userAgeInput.value.trim();
    const gender = userGenderInput.value;
    const crush = userCrushInput.value.trim();

    if (!name || !age) {
      alert('Remplis au moins ton prénom et ton âge !');
      return;
    }

    userProfile = { name, age, gender, crush };
    localStorage.setItem('laugra_user_profile', JSON.stringify(userProfile));
    checkProfile();
  });

  checkProfile();

  // --- 3. THEME TOGGLE ---
  const themeToggle = document.getElementById('themeToggle');
  let currentTheme = localStorage.getItem('laugra_theme') || 'dark';

  if (currentTheme === 'light') {
    document.documentElement.setAttribute('data-theme', 'light');
    themeToggle.textContent = '☀️';
  }

  themeToggle.addEventListener('click', () => {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('laugra_theme', currentTheme);
  });

  // --- 4. GESTION DES IDÉES ---
  const ideaTitle = document.getElementById('ideaTitle');
  const ideaCategory = document.getElementById('ideaCategory');
  const ideaText = document.getElementById('ideaText');
  const addBtn = document.getElementById('addBtn');
  const ideasList = document.getElementById('ideasList');
  const searchInput = document.getElementById('searchInput');
  const tagBtns = document.querySelectorAll('.tag-btn');

  let ideas = JSON.parse(localStorage.getItem('laugra_ideas')) || [];
  let currentFilter = 'all';

  function saveIdeas() {
    localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
  }

  function renderIdeas() {
    ideasList.innerHTML = '';
    const search = searchInput.value.toLowerCase();

    const filtered = ideas.filter(i => {
      const matchesFilter = currentFilter === 'all' || i.category === currentFilter;
      const matchesSearch = i.title.toLowerCase().includes(search) || i.text.toLowerCase().includes(search);
      return matchesFilter && matchesSearch;
    });

    if (filtered.length === 0) {
      ideasList.innerHTML = '<div class="empty-state">Aucune idée sauvegardée pour le moment.</div>';
      return;
    }

    filtered.forEach(i => {
      const card = document.createElement('div');
      card.className = 'idea-card';
      
      const categoryNames = {
        app: '💻 Dev',
        story: '✍️ Histoire',
        video: '🎥 Vidéo',
        other: '💡 Autre'
      };

      card.innerHTML = `
        <div class="idea-header">
          <span class="idea-title">${escapeHtml(i.title)}</span>
          <span class="badge">${categoryNames[i.category] || '💡 Autre'}</span>
        </div>
        <div class="idea-content">${escapeHtml(i.text)}</div>
        <div class="idea-footer">
          <span>Enregistré le ${i.date}</span>
          <button class="delete-btn" onclick="deleteIdea(${i.id})">Supprimer</button>
        </div>
      `;
      ideasList.appendChild(card);
    });
  }

  addBtn.addEventListener('click', () => {
    const title = ideaTitle.value.trim();
    const text = ideaText.value.trim();
    const category = ideaCategory.value;

    if (!title || !text) {
      alert('Ajoute au moins un titre et une description.');
      return;
    }

    const newIdea = {
      id: Date.now(),
      title,
      text,
      category,
      date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    };

    ideas.unshift(newIdea);
    saveIdeas();
    renderIdeas();

    ideaTitle.value = '';
    ideaText.value = '';
  });

  window.deleteIdea = function(id) {
    ideas = ideas.filter(i => i.id !== id);
    saveIdeas();
    renderIdeas();
  };

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

  // --- 5. MINI GEOMETRY DASH ---
  const player = document.getElementById('player');
  const obstacle = document.getElementById('obstacle');
  const startGameBtn = document.getElementById('startGameBtn');
  const startScreen = document.getElementById('startScreen');
  const gameScore = document.getElementById('gameScore');

  let isJumping = false;
  let isPlaying = false;
  let score = 0;
  let scoreInterval;
  let checkCollisionInterval;

  function jump() {
    if (isJumping || !isPlaying) return;
    isJumping = true;
    player.classList.add('jump');

    setTimeout(() => {
      player.classList.remove('jump');
      isJumping = false;
    }, 500);
  }

  function startGame() {
    isPlaying = true;
    score = 0;
    gameScore.textContent = 'Score: 0';
    startScreen.style.display = 'none';
    obstacle.classList.add('running');

    scoreInterval = setInterval(() => {
      score++;
      gameScore.textContent = `Score: ${score}`;
    }, 100);

    checkCollisionInterval = setInterval(() => {
      const playerRect = player.getBoundingClientRect();
      const obstacleRect = obstacle.getBoundingClientRect();

      if (
        playerRect.right > obstacleRect.left &&
        playerRect.left < obstacleRect.right &&
        playerRect.bottom > obstacleRect.top
      ) {
        gameOver();
      }
    }, 10);
  }

  function gameOver() {
    isPlaying = false;
    obstacle.classList.remove('running');
    clearInterval(scoreInterval);
    clearInterval(checkCollisionInterval);
    alert(`Game Over ! Score final : ${score}`);
    startScreen.style.display = 'flex';
  }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') jump();
  });

  document.getElementById('gameContainer').addEventListener('click', () => {
    if (isPlaying) jump();
  });

  startGameBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startGame();
  });

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

});
