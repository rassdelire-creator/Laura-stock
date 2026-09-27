document.addEventListener('DOMContentLoaded', () => {

  // 1. SPLASH SCREEN
  setTimeout(() => {
    document.getElementById('splashScreen')?.classList.add('hidden');
  }, 1000);

  // 2. PROFIL UTILISATEUR
  const profileModal = document.getElementById('profileModal');
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  const userGreeting = document.getElementById('userGreeting');
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
    const name = document.getElementById('userNameInput').value.trim();
    const age = document.getElementById('userAgeInput').value.trim();
    if (!name || !age) return alert('Entre ton prénom et ton âge !');
    userProfile = { name, age };
    localStorage.setItem('laugra_user_profile', JSON.stringify(userProfile));
    checkProfile();
  });
  checkProfile();

  // 3. THÈME SOMBRE / CLAIR
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

  // 4. COFFRE-FORT / IDÉES SECRÈTES
  const secretToggle = document.getElementById('secretToggle');
  const secretModal = document.getElementById('secretModal');
  const closeSecretBtn = document.getElementById('closeSecretBtn');
  const unlockSecretBtn = document.getElementById('unlockSecretBtn');
  const pinInput = document.getElementById('pinInput');
  const pinInstruction = document.getElementById('pinInstruction');
  const pinArea = document.getElementById('pinArea');
  const secretContent = document.getElementById('secretContent');

  let savedPin = localStorage.getItem('laugra_secret_pin') || null;
  let secretIdeas = JSON.parse(localStorage.getItem('laugra_secret_ideas')) || [];

  secretToggle.addEventListener('click', () => {
    secretModal.classList.remove('hidden');
    if (!savedPin) {
      pinInstruction.textContent = "Crée ton code PIN à 6 chiffres :";
      unlockSecretBtn.textContent = "Créer le code PIN";
    } else {
      pinInstruction.textContent = "Entre ton code PIN à 6 chiffres :";
      unlockSecretBtn.textContent = "Déverrouiller";
    }
  });

  closeSecretBtn.addEventListener('click', () => {
    secretModal.classList.add('hidden');
    pinArea.classList.remove('hidden');
    secretContent.classList.add('hidden');
    pinInput.value = '';
  });

  unlockSecretBtn.addEventListener('click', () => {
    const enteredPin = pinInput.value.trim();
    if (enteredPin.length !== 6 || isNaN(enteredPin)) {
      return alert("Le code doit contenir exactement 6 chiffres !");
    }

    if (!savedPin) {
      savedPin = enteredPin;
      localStorage.setItem('laugra_secret_pin', savedPin);
      alert("Code PIN enregistré avec succès !");
    } else if (enteredPin !== savedPin) {
      return alert("Code PIN incorrect !");
    }

    pinArea.classList.add('hidden');
    secretContent.classList.remove('hidden');
    renderSecretIdeas();
  });

  const addSecretBtn = document.getElementById('addSecretBtn');
  addSecretBtn.addEventListener('click', () => {
    const title = document.getElementById('secretTitle').value.trim();
    const text = document.getElementById('secretText').value.trim();
    if (!title && !text) return;

    secretIdeas.unshift({
      id: Date.now(),
      title: title || "Secret Sans Titre",
      text: text,
      date: new Date().toLocaleDateString('fr-FR')
    });

    localStorage.setItem('laugra_secret_ideas', JSON.stringify(secretIdeas));
    renderSecretIdeas();
    document.getElementById('secretTitle').value = '';
    document.getElementById('secretText').value = '';
  });

  function renderSecretIdeas() {
    const container = document.getElementById('secretIdeasList');
    container.innerHTML = '';
    secretIdeas.forEach(i => {
      const card = document.createElement('div');
      card.className = 'idea-card';
      card.innerHTML = `
        <div class="idea-header"><span class="idea-title">🔒 ${escapeHtml(i.title)}</span></div>
        <div class="idea-content">${escapeHtml(i.text)}</div>
        <div class="idea-footer"><span>${i.date}</span><button class="delete-btn" onclick="deleteSecret(${i.id})">Supprimer</button></div>
      `;
      container.appendChild(card);
    });
  }

  window.deleteSecret = function(id) {
    secretIdeas = secretIdeas.filter(i => i.id !== id);
    localStorage.setItem('laugra_secret_ideas', JSON.stringify(secretIdeas));
    renderSecretIdeas();
  };

  // 5. ENREGISTREUR VOCAL & PHOTO/VIDÉO
  const recordVoiceBtn = document.getElementById('recordVoiceBtn');
  const recordTimer = document.getElementById('recordTimer');
  const cameraInput = document.getElementById('cameraInput');
  const mediaStatus = document.getElementById('mediaStatus');

  let mediaRecorder, audioChunks = [], isRecording = false;
  let currentAudioBase64 = null, currentMediaBase64 = null, currentMediaType = null;
  let timerInterval, secondsRecorded = 0;

  recordVoiceBtn.addEventListener('click', async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = () => {
            currentAudioBase64 = reader.result;
            mediaStatus.textContent = "🎙️ Vocal prêt !";
          };
        };
        mediaRecorder.start();
        isRecording = true;
        recordVoiceBtn.classList.add('recording');
        recordTimer.classList.remove('hidden');
        secondsRecorded = 0;
        timerInterval = setInterval(() => {
          secondsRecorded++;
          recordTimer.textContent = String(secondsRecorded).padStart(2, '0') + 's';
        }, 1000);
      } catch (err) { alert("Accès micro refusé."); }
    } else {
      mediaRecorder.stop();
      isRecording = false;
      recordVoiceBtn.classList.remove('recording');
      clearInterval(timerInterval);
    }
  });

  cameraInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      currentMediaBase64 = reader.result;
      currentMediaType = file.type.startsWith('video') ? 'video' : 'image';
      mediaStatus.textContent = currentMediaType === 'video' ? "🎥 Vidéo ajoutée !" : "📸 Photo ajoutée !";
    };
  });

  // 6. GESTION DES IDÉES PUBLIQUES
  const addBtn = document.getElementById('addBtn');
  const ideasList = document.getElementById('ideasList');
  let ideas = JSON.parse(localStorage.getItem('laugra_ideas')) || [];

  function renderIdeas() {
    ideasList.innerHTML = '';
    const search = document.getElementById('searchInput').value.toLowerCase();
    
    ideas.filter(i => i.title.toLowerCase().includes(search)).forEach(i => {
      const card = document.createElement('div');
      card.className = 'idea-card';
      let mediaHTML = '';
      if (i.audio) mediaHTML += `<audio controls src="${i.audio}"></audio>`;
      if (i.media) {
        mediaHTML += i.mediaType === 'video' 
          ? `<div class="media-preview-container"><video controls src="${i.media}"></video></div>`
          : `<div class="media-preview-container"><img src="${i.media}" /></div>`;
      }

      card.innerHTML = `
        <div class="idea-header">
          <span class="idea-title">${escapeHtml(i.title)}</span>
          <span class="badge">${i.category}</span>
        </div>
        ${i.text ? `<div class="idea-content">${escapeHtml(i.text)}</div>` : ''}
        ${mediaHTML}
        <div class="idea-footer">
          <span>${i.date}</span>
          <button class="delete-btn" onclick="deleteIdea(${i.id})">Supprimer</button>
        </div>
      `;
      ideasList.appendChild(card);
    });
  }

  addBtn.addEventListener('click', () => {
    const title = document.getElementById('ideaTitle').value.trim();
    const text = document.getElementById('ideaText').value.trim();
    if (!title && !text && !currentAudioBase64 && !currentMediaBase64) return;

    ideas.unshift({
      id: Date.now(),
      title: title || "Nouvelle idée",
      text: text,
      category: document.getElementById('ideaCategory').value,
      audio: currentAudioBase64,
      media: currentMediaBase64,
      mediaType: currentMediaType,
      date: new Date().toLocaleDateString('fr-FR')
    });

    localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
    renderIdeas();

    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaText').value = '';
    currentAudioBase64 = currentMediaBase64 = currentMediaType = null;
    mediaStatus.textContent = "Aucun fichier média ajouté";
  });

  window.deleteIdea = function(id) {
    ideas = ideas.filter(i => i.id !== id);
    localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
    renderIdeas();
  };

  document.getElementById('searchInput').addEventListener('input', renderIdeas);
  renderIdeas();

  // 7. ARCADE MINI JEUX (SNAKE, TETRIS, PACMAN, SUDOKU)
  const gamesToggle = document.getElementById('gamesToggle');
  const gamesModal = document.getElementById('gamesModal');
  const closeGamesBtn = document.getElementById('closeGamesBtn');
  const gameCanvas = document.getElementById('gameCanvas');
  const sudokuGrid = document.getElementById('sudokuGrid');
  const ctx = gameCanvas.getContext('2d');

  let currentGame = 'snake', gameLoop;

  gamesToggle.addEventListener('click', () => gamesModal.classList.remove('hidden'));
  closeGamesBtn.addEventListener('click', () => {
    gamesModal.classList.add('hidden');
    clearInterval(gameLoop);
  });

  document.querySelectorAll('.game-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.game-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGame = btn.dataset.game;
      initGame();
    });
  });

  document.getElementById('startGameBtn').addEventListener('click', () => initGame());

  function initGame() {
    clearInterval(gameLoop);
    gameCanvas.classList.remove('hidden');
    sudokuGrid.classList.add('hidden');

    if (currentGame === 'snake') startSnake();
    else if (currentGame === 'tetris') startTetris();
    else if (currentGame === 'pacman') startPacman();
    else if (currentGame === 'sudoku') startSudoku();
  }

  // --- SNAKE ---
  let snake, dir, food;
  function startSnake() {
    snake = [{x: 10, y: 10}]; dir = {x: 1, y: 0};
    food = {x: 5, y: 5};
    gameLoop = setInterval(() => {
      const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
      if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) return initGame();
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        food = {x: Math.floor(Math.random()*20), y: Math.floor(Math.random()*20)};
      } else snake.pop();

      ctx.fillStyle = "#000"; ctx.fillRect(0,0,300,300);
      ctx.fillStyle = "#ff453a"; ctx.fillRect(food.x*15, food.y*15, 14, 14);
      ctx.fillStyle = "#0a84ff";
      snake.forEach(p => ctx.fillRect(p.x*15, p.y*15, 14, 14));
    }, 120);
  }

  // CONTROLES D-PAD DU JEU
  document.getElementById('btnUp').onclick = () => dir = {x: 0, y: -1};
  document.getElementById('btnDown').onclick = () => dir = {x: 0, y: 1};
  document.getElementById('btnLeft').onclick = () => dir = {x: -1, y: 0};
  document.getElementById('btnRight').onclick = () => dir = {x: 1, y: 0};

  // --- TETRIS / PACMAN / SUDOKU (Simulations simples) ---
  function startTetris() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,300,300);
    ctx.fillStyle = "#fff"; ctx.fillText("🧱 Tetris Prêt - Appuie Démarrer", 50, 150);
  }

  function startPacman() {
    ctx.fillStyle = "#000"; ctx.fillRect(0,0,300,300);
    ctx.fillStyle = "#ffff00"; ctx.beginPath(); ctx.arc(150, 150, 20, 0.2 * Math.PI, 1.8 * Math.PI); ctx.lineTo(150, 150); ctx.fill();
  }

  function startSudoku() {
    gameCanvas.classList.add('hidden');
    sudokuGrid.classList.remove('hidden');
    sudokuGrid.innerHTML = '';
    const nums = [1, 2, 3, 4, 3, 4, 1, 2, 2, 1, 4, 3, 4, 3, 2, 1];
    nums.forEach(n => {
      const cell = document.createElement('div');
      cell.className = 'sudoku-cell';
      cell.textContent = n;
      sudokuGrid.appendChild(cell);
    });
  }

  function escapeHtml(text) {
    return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  }

});
