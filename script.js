document.addEventListener('DOMContentLoaded', () => {

  // 1. SPLASH SCREEN
  setTimeout(() => {
    document.getElementById('splashScreen')?.classList.add('hidden');
  }, 800);

  // 2. PROFIL USER
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

  // 3. MODE SOMBRE / CLAIR
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

  // 5. ENREGISTREUR VOCAL ET CAMERA
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
            mediaStatus.textContent = "🎙️ Vocal prêt";
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
      } catch (err) { alert("Accès au micro refusé."); }
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

  // 6. GESTION IDÉES PUBLIQUES (ÉDITION + FAVORIS)
  const addBtn = document.getElementById('addBtn');
  const ideasList = document.getElementById('ideasList');
  let ideas = JSON.parse(localStorage.getItem('laugra_ideas')) || [];
  let currentFilter = 'all';

  function renderIdeas() {
    ideasList.innerHTML = '';
    const search = document.getElementById('searchInput').value.toLowerCase();
    
    let filtered = ideas.filter(i => i.title.toLowerCase().includes(search) || i.text.toLowerCase().includes(search));

    if (currentFilter === 'fav') {
      filtered = filtered.filter(i => i.fav);
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(i => i.category === currentFilter);
    }

    filtered.forEach(i => {
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
          <span class="idea-title">
            <span class="fav-star ${i.fav ? 'active' : ''}" onclick="toggleFav(${i.id})">★</span>
            ${escapeHtml(i.title)}
          </span>
          <span class="badge">${i.category}</span>
        </div>
        ${i.text ? `<div class="idea-content">${escapeHtml(i.text)}</div>` : ''}
        ${mediaHTML}
        <div class="idea-footer">
          <span>${i.date}</span>
          <div class="action-btns">
            <button class="edit-btn" onclick="editIdea(${i.id})">✏️ Éditer</button>
            <button class="delete-btn" onclick="deleteIdea(${i.id})">Supprimer</button>
          </div>
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
      fav: false,
      date: new Date().toLocaleDateString('fr-FR')
    });

    localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
    renderIdeas();

    document.getElementById('ideaTitle').value = '';
    document.getElementById('ideaText').value = '';
    currentAudioBase64 = currentMediaBase64 = currentMediaType = null;
    mediaStatus.textContent = "Aucun média ajouté";
  });

  window.toggleFav = function(id) {
    const idea = ideas.find(i => i.id === id);
    if (idea) {
      idea.fav = !idea.fav;
      localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
      renderIdeas();
    }
  };

  window.editIdea = function(id) {
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;
    const newText = prompt("Modifier le contenu de l'idée :", idea.text);
    if (newText !== null) {
      idea.text = newText.trim();
      localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
      renderIdeas();
    }
  };

  window.deleteIdea = function(id) {
    ideas = ideas.filter(i => i.id !== id);
    localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
    renderIdeas();
  };

  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderIdeas();
    });
  });

  document.getElementById('searchInput').addEventListener('input', renderIdeas);
  renderIdeas();

  // 7. MOTEUR ARCADE OPTIMISÉ (TETRIS & SNAKE UNICEMENT)
  const gamesToggle = document.getElementById('gamesToggle');
  const gamesModal = document.getElementById('gamesModal');
  const closeGamesBtn = document.getElementById('closeGamesBtn');
  const gameCanvas = document.getElementById('gameCanvas');
  const ctx = gameCanvas.getContext('2d');
  const gameScoreEl = document.getElementById('gameScore');
  const gameHighScoreEl = document.getElementById('gameHighScore');

  let currentGame = 'tetris', gameLoop, score = 0;
  let highScores = JSON.parse(localStorage.getItem('laugra_high_scores')) || { tetris: 0, snake: 0 };

  gamesToggle.addEventListener('click', () => {
    gamesModal.classList.remove('hidden');
    initGame();
  });

  closeGamesBtn.addEventListener('click', () => {
    gamesModal.classList.add('hidden');
    stopGame();
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

  function updateScore(newScore) {
    score = newScore;
    gameScoreEl.textContent = score;
    if (score > highScores[currentGame]) {
      highScores[currentGame] = score;
      localStorage.setItem('laugra_high_scores', JSON.stringify(highScores));
    }
    gameHighScoreEl.textContent = highScores[currentGame];
  }

  function stopGame() {
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = null;
  }

  function initGame() {
    stopGame();
    updateScore(0);
    if (currentGame === 'tetris') startTetris();
    else if (currentGame === 'snake') startSnake();
  }

  // --- TETRIS PRO ENGINE ---
  function startTetris() {
    const COLS = 10, ROWS = 16, BLOCK_SIZE = 24;
    let board = Array.from({length: ROWS}, () => Array(COLS).fill(0));
    
    const SHAPES = [
      [[1,1,1,1]], // I
      [[1,1],[1,1]], // O
      [[0,1,0],[1,1,1]], // T
      [[1,0,0],[1,1,1]], // L
      [[0,0,1],[1,1,1]]  // J
    ];
    const COLORS = ['#10a37f', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'];

    let currentPiece = getRandomPiece();
    let lastTime = 0, dropCounter = 0;

    function getRandomPiece() {
      const idx = Math.floor(Math.random() * SHAPES.length);
      return {
        shape: SHAPES[idx],
        color: COLORS[idx],
        x: Math.floor(COLS / 2) - 1,
        y: 0
      };
    }

    function collide(b, p) {
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (p.shape[r][c] && (b[p.y + r] && b[p.y + r][p.x + c]) !== 0) return true;
        }
      }
      return false;
    }

    function merge(b, p) {
      p.shape.forEach((row, r) => {
        row.forEach((value, c) => {
          if (value) b[p.y + r][p.x + c] = p.color;
        });
      });
    }

    function rotate(p) {
      const rotated = p.shape[0].map((_, i) => p.shape.map(row => row[i]).reverse());
      const oldShape = p.shape;
      p.shape = rotated;
      if (collide(board, p)) p.shape = oldShape;
    }

    function clearLines() {
      let linesCleared = 0;
      board = board.filter(row => {
        if (row.every(cell => cell !== 0)) {
          linesCleared++;
          return false;
        }
        return true;
      });
      while (board.length < ROWS) {
        board.unshift(Array(COLS).fill(0));
      }
      if (linesCleared > 0) updateScore(score + linesCleared * 100);
    }

    function drop() {
      currentPiece.y++;
      if (collide(board, currentPiece)) {
        currentPiece.y--;
        merge(board, currentPiece);
        clearLines();
        currentPiece = getRandomPiece();
        if (collide(board, currentPiece)) {
          alert("Game Over ! Score: " + score);
          initGame();
        }
      }
      dropCounter = 0;
    }

    // COMMANDES TACTILES ET D-PAD
    bindDpad((action) => {
      if (action === 'LEFT') { currentPiece.x--; if (collide(board, currentPiece)) currentPiece.x++; }
      if (action === 'RIGHT') { currentPiece.x++; if (collide(board, currentPiece)) currentPiece.x--; }
      if (action === 'DOWN') drop();
      if (action === 'ROTATE' || action === 'UP') rotate(currentPiece);
    });

    function update(time = 0) {
      const deltaTime = time - lastTime;
      lastTime = time;
      dropCounter += deltaTime;

      if (dropCounter > 600) drop();

      // DESSIN
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

      // Plateau
      board.forEach((row, r) => {
        row.forEach((color, c) => {
          if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(c * BLOCK_SIZE, r * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
          }
        });
      });

      // Pièce courante
      currentPiece.shape.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val) {
            ctx.fillStyle = currentPiece.color;
            ctx.fillRect((currentPiece.x + c) * BLOCK_SIZE, (currentPiece.y + r) * BLOCK_SIZE, BLOCK_SIZE - 1, BLOCK_SIZE - 1);
          }
        });
      });

      gameLoop = requestAnimationFrame(update);
    }

    update();
  }

  // --- SNAKE PRO ENGINE ---
  function startSnake() {
    const GRID_SIZE = 16, TILE = 15;
    let snake = [{x: 8, y: 8}];
    let dir = {x: 1, y: 0}, nextDir = {x: 1, y: 0};
    let food = {x: 3, y: 3};
    let lastTime = 0;

    bindDpad((action) => {
      if (action === 'UP' && dir.y === 0) nextDir = {x: 0, y: -1};
      if (action === 'DOWN' && dir.y === 0) nextDir = {x: 0, y: 1};
      if (action === 'LEFT' && dir.x === 0) nextDir = {x: -1, y: 0};
      if (action === 'RIGHT' && dir.x === 0) nextDir = {x: 1, y: 0};
    });

    function update(time = 0) {
      if (time - lastTime > 120) {
        lastTime = time;
        dir = nextDir;
        let head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

        // Collision murs
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= 21) {
          alert("Game Over ! Score: " + score);
          return initGame();
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          updateScore(score + 10);
          food = {x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * 20)};
        } else {
          snake.pop();
        }
      }

      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

      // Pomme
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(food.x * TILE, food.y * TILE, TILE - 1, TILE - 1);

      // Serpent
      ctx.fillStyle = '#10a37f';
      snake.forEach(part => ctx.fillRect(part.x * TILE, part.y * TILE, TILE - 1, TILE - 1));

      gameLoop = requestAnimationFrame(update);
    }

    update();
  }

  function bindDpad(callback) {
    document.getElementById('btnUp').onclick = () => callback('UP');
    document.getElementById('btnDown').onclick = () => callback('DOWN');
    document.getElementById('btnLeft').onclick = () => callback('LEFT');
    document.getElementById('btnRight').onclick = () => callback('RIGHT');
    document.getElementById('btnRotate').onclick = () => callback('ROTATE');
  }

  function escapeHtml(text) {
    return text ? text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
  }

});
