document.addEventListener('DOMContentLoaded', () => {

  // 1. SPLASH SCREEN
  setTimeout(() => {
    document.getElementById('splashScreen')?.classList.add('hidden');
  }, 800);

  // 2. PROFIL
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

  // 4. COFFRE-FORT SECRETS
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
    pinInstruction.textContent = savedPin ? "Entre ton code PIN à 6 chiffres :" : "Crée ton code PIN à 6 chiffres :";
    unlockSecretBtn.textContent = savedPin ? "Déverrouiller" : "Créer le code PIN";
  });

  closeSecretBtn.addEventListener('click', () => {
    secretModal.classList.add('hidden');
    pinArea.classList.remove('hidden');
    secretContent.classList.add('hidden');
    pinInput.value = '';
  });

  unlockSecretBtn.addEventListener('click', () => {
    const enteredPin = pinInput.value.trim();
    if (enteredPin.length !== 6 || isNaN(enteredPin)) return alert("Code à 6 chiffres requis !");

    if (!savedPin) {
      savedPin = enteredPin;
      localStorage.setItem('laugra_secret_pin', savedPin);
      alert("PIN enregistré !");
    } else if (enteredPin !== savedPin) {
      return alert("Code PIN incorrect !");
    }

    pinArea.classList.add('hidden');
    secretContent.classList.remove('hidden');
    renderSecretIdeas();
  });

  document.getElementById('addSecretBtn').addEventListener('click', () => {
    const title = document.getElementById('secretTitle').value.trim();
    const text = document.getElementById('secretText').value.trim();
    if (!title && !text) return;

    secretIdeas.unshift({ id: Date.now(), title: title || "Secret", text: text, date: new Date().toLocaleDateString('fr-FR') });
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

  // 5. VOCAL ET CAMERA
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
            mediaStatus.textContent = "🎙️ Vocal enregistré";
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
      mediaStatus.textContent = currentMediaType === 'video' ? "🎥 Vidéo prête" : "📸 Photo prête";
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
          ? `<div class="media-preview"><video controls src="${i.media}"></video></div>`
          : `<div class="media-preview"><img src="${i.media}" /></div>`;
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
    mediaStatus.textContent = "Aucun média sélectionné";
  });

  window.deleteIdea = function(id) {
    ideas = ideas.filter(i => i.id !== id);
    localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
    renderIdeas();
  };

  document.getElementById('searchInput').addEventListener('input', renderIdeas);
  renderIdeas();

  // 7. ARCADE - JEUX JOUABLES (SNAKE, TETRIS, PACMAN, SUDOKU)
  const gamesToggle = document.getElementById('gamesToggle');
  const gamesModal = document.getElementById('gamesModal');
  const closeGamesBtn = document.getElementById('closeGamesBtn');
  const gameCanvas = document.getElementById('gameCanvas');
  const sudokuGrid = document.getElementById('sudokuGrid');
  const ctx = gameCanvas.getContext('2d');

  let currentGame = 'snake', gameInterval;

  gamesToggle.addEventListener('click', () => gamesModal.classList.remove('hidden'));
  closeGamesBtn.addEventListener('click', () => {
    gamesModal.classList.add('hidden');
    clearInterval(gameInterval);
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
    clearInterval(gameInterval);
    gameCanvas.classList.remove('hidden');
    sudokuGrid.classList.add('hidden');

    if (currentGame === 'snake') playSnake();
    else if (currentGame === 'tetris') playTetris();
    else if (currentGame === 'pacman') playPacman();
    else if (currentGame === 'sudoku') playSudoku();
  }

  // CONTROLES D-PAD DYNAMIQUES
  let dirAction = () => {};
  document.getElementById('btnUp').onclick = () => onDpad('UP');
  document.getElementById('btnDown').onclick = () => onDpad('DOWN');
  document.getElementById('btnLeft').onclick = () => onDpad('LEFT');
  document.getElementById('btnRight').onclick = () => onDpad('RIGHT');
  document.getElementById('btnAction').onclick = () => onDpad('ACTION');

  let currentMoveHandler = null;
  function onDpad(type) {
    if (currentMoveHandler) currentMoveHandler(type);
  }

  // --- 1. SNAKE ---
  function playSnake() {
    let snake = [{x: 8, y: 8}];
    let dir = {x: 1, y: 0};
    let food = {x: 3, y: 3};

    currentMoveHandler = (type) => {
      if (type === 'UP' && dir.y === 0) dir = {x: 0, y: -1};
      if (type === 'DOWN' && dir.y === 0) dir = {x: 0, y: 1};
      if (type === 'LEFT' && dir.x === 0) dir = {x: -1, y: 0};
      if (type === 'RIGHT' && dir.x === 0) dir = {x: 1, y: 0};
    };

    gameInterval = setInterval(() => {
      let head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};
      if (head.x < 0 || head.x >= 16 || head.y < 0 || head.y >= 16) return initGame();
      
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        food = {x: Math.floor(Math.random()*16), y: Math.floor(Math.random()*16)};
      } else snake.pop();

      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0,0,240,240);
      ctx.fillStyle = "#ef4444"; ctx.fillRect(food.x*15, food.y*15, 14, 14);
      ctx.fillStyle = "#10a37f";
      snake.forEach(p => ctx.fillRect(p.x*15, p.y*15, 14, 14));
    }, 120);
  }

  // --- 2. TETRIS ---
  function playTetris() {
    let grid = Array(16).fill().map(() => Array(10).fill(0));
    let piece = {x: 4, y: 0, shape: [[1,1],[1,1]]};

    currentMoveHandler = (type) => {
      if (type === 'LEFT' && piece.x > 0) piece.x--;
      if (type === 'RIGHT' && piece.x < 8) piece.x++;
      if (type === 'DOWN') piece.y++;
    };

    gameInterval = setInterval(() => {
      piece.y++;
      if (piece.y > 14) {
        piece.y = 0; piece.x = 4;
      }

      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0,0,240,240);
      ctx.fillStyle = "#10a37f";
      piece.shape.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v) ctx.fillRect((piece.x + c) * 15, (piece.y + r) * 15, 14, 14);
        });
      });
    }, 250);
  }

  // --- 3. PAC-MAN ---
  function playPacman() {
    let pac = {x: 120, y: 120, dirX: 2, dirY: 0};
    let ghost = {x: 30, y: 30};

    currentMoveHandler = (type) => {
      if (type === 'UP') { pac.dirX = 0; pac.dirY = -2; }
      if (type === 'DOWN') { pac.dirX = 0; pac.dirY = 2; }
      if (type === 'LEFT') { pac.dirX = -2; pac.dirY = 0; }
      if (type === 'RIGHT') { pac.dirX = 2; pac.dirY = 0; }
    };

    gameInterval = setInterval(() => {
      pac.x += pac.dirX; pac.y += pac.dirY;
      if (pac.x < 10) pac.x = 230; if (pac.x > 230) pac.x = 10;
      if (pac.y < 10) pac.y = 230; if (pac.y > 230) pac.y = 10;

      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0,0,240,240);
      // Pacman
      ctx.fillStyle = "#eab308";
      ctx.beginPath(); ctx.arc(pac.x, pac.y, 10, 0.2 * Math.PI, 1.8 * Math.PI); ctx.lineTo(pac.x, pac.y); ctx.fill();
      // Fantôme
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(ghost.x, ghost.y, 14, 14);
    }, 50);
  }

  // --- 4. SUDOKU INTERACTIF 4x4 ---
  function playSudoku() {
    gameCanvas.classList.add('hidden');
    sudokuGrid.classList.remove('hidden');
    sudokuGrid.innerHTML = '';

    const board = [
      [1, 0, 3, 4],
      [3, 4, 0, 2],
      [0, 1, 4, 3],
      [4, 3, 2, 0]
    ];

    board.forEach((row, r) => {
      row.forEach((val, c) => {
        const cell = document.createElement('div');
        cell.className = 'sudoku-cell' + (val !== 0 ? ' fixed' : '');
        cell.textContent = val !== 0 ? val : '';
        
        if (val === 0) {
          cell.addEventListener('click', () => {
            let currentVal = parseInt(cell.textContent) || 0;
            currentVal = (currentVal % 4) + 1;
            cell.textContent = currentVal;
          });
        }
        sudokuGrid.appendChild(cell);
      });
    });
  }

  function escapeHtml(text) {
    return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  }

});
