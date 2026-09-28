/* ============================================================
   LAUGRASTOK v2.0 — Jeux Arcade
   Tetris + Snake + Miami Dash
   Version simplifiée et robuste
   ============================================================ */

(function () {
  'use strict';

  let canvas, ctx;
  let scoreEl, highScoreEl, startBtn;
  let CSS_W = 260, CSS_H = 260;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  let currentGame = 'tetris';
  let gameLoopId = null;
  let isPaused = false;
  let keyHandler = null;
  let tapHandler = null;
  let gameInitialized = false;

  let highScores = { tetris: 0, snake: 0, dash: 0 };
  try {
    const saved = localStorage.getItem('laugra_high_scores');
    if (saved) highScores = Object.assign(highScores, JSON.parse(saved));
  } catch (e) {}

  /* ============================================================
     INITIALISATION
     ============================================================ */
  function init() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    scoreEl = document.getElementById('gameScore');
    highScoreEl = document.getElementById('gameHighScore');
    startBtn = document.getElementById('startGameBtn');

    // Redimensionne maintenant
    resizeCanvas();

    // Bouton Lancer
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        setTimeout(startGame, 30);
      });
    }

    // Event delegation ROBUSTE pour les onglets de jeu
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.game-tab-btn');
      if (tab) switchGameTab(tab);
    }, true);

    document.addEventListener('touchend', (e) => {
      const tab = e.target.closest('.game-tab-btn');
      if (tab) {
        e.preventDefault();
        switchGameTab(tab);
      }
    }, { passive: false });

    // Observe le changement d'onglet principal
    const gamesTabEl = document.getElementById('tab-games');
    if (gamesTabEl && window.MutationObserver) {
      const obs = new MutationObserver(() => {
        const isActive = gamesTabEl.classList.contains('active');
        if (!isActive && gameLoopId) {
          stopGame();
        } else if (isActive && !gameInitialized) {
          setTimeout(drawIdleScreen, 80);
        }
      });
      obs.observe(gamesTabEl, { attributes: true, attributeFilter: ['class'] });
    }

    showHighScore();
    setTimeout(drawIdleScreen, 150);

    console.log('🎮 Games chargé');
  }

  /* ============================================================
     CANVAS
     ============================================================ */
  function resizeCanvas() {
    if (!canvas) return;
    void canvas.offsetWidth;

    const parent = canvas.parentElement;
    const parentW = parent ? parent.clientWidth : 300;

    // Canvas carré, max 260px
    const size = Math.min(parentW - 20, 260);

    CSS_W = size;
    CSS_H = size;

    canvas.width  = CSS_W * DPR;
    canvas.height = CSS_H * DPR;
    canvas.style.width  = CSS_W + 'px';
    canvas.style.height = CSS_H + 'px';

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(DPR, DPR);
  }

  /* ============================================================
     SCORE
     ============================================================ */
  function updateScore(n) {
    if (scoreEl) scoreEl.textContent = n;
    if (n > highScores[currentGame]) {
      highScores[currentGame] = n;
      try { localStorage.setItem('laugra_high_scores', JSON.stringify(highScores)); } catch (e) {}
    }
    if (highScoreEl) highScoreEl.textContent = highScores[currentGame];
  }

  function getScore() {
    return parseInt(scoreEl?.textContent || '0', 10) || 0;
  }

  function showHighScore() {
    if (highScoreEl) highScoreEl.textContent = highScores[currentGame] || 0;
  }

  /* ============================================================
     BOUCLE / NETTOYAGE
     ============================================================ */
  function stopGame() {
    if (gameLoopId) {
      cancelAnimationFrame(gameLoopId);
      gameLoopId = null;
    }
    if (keyHandler) {
      window.removeEventListener('keydown', keyHandler);
      keyHandler = null;
    }
    if (tapHandler && canvas) {
      canvas.removeEventListener('pointerdown', tapHandler);
      tapHandler = null;
    }
    gameInitialized = false;
  }

  function startGame() {
    stopGame();
    isPaused = false;
    resizeCanvas();
    updateScore(0);
    showHighScore();
    gameInitialized = true;

    if (currentGame === 'tetris') startTetris();
    else if (currentGame === 'snake') startSnake();
    else if (currentGame === 'dash') startDash();
  }

  function switchGameTab(tab) {
    const allTabs = document.querySelectorAll('.game-tab-btn');
    allTabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentGame = tab.dataset.game;

    // Relance après 2 frames pour laisser le layout se stabiliser
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        startGame();
      });
    });
  }

  /* ============================================================
     ÉCRAN D'ATTENTE
     ============================================================ */
  function drawIdleScreen() {
    if (!ctx || !canvas) return;
    resizeCanvas();
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = 'bold 40px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮', CSS_W / 2, CSS_H / 2 - 10);

    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.font = '13px Inter, sans-serif';
    ctx.fillText('Appuie sur "Lancer"', CSS_W / 2, CSS_H / 2 + 35);
  }

  /* ============================================================
     CONTRÔLES
     ============================================================ */
  function bindControls(actionFn, gameType) {
    const btnUp = document.getElementById('btnUp');
    const btnDown = document.getElementById('btnDown');
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnRotate = document.getElementById('btnRotate');

    // Nettoie les anciens handlers en remplaçant les onclick
    if (btnUp) btnUp.onclick = () => actionFn(gameType === 'tetris' ? 'ROTATE' : 'UP');
    if (btnDown) btnDown.onclick = () => actionFn('DOWN');
    if (btnLeft) btnLeft.onclick = () => actionFn('LEFT');
    if (btnRight) btnRight.onclick = () => actionFn('RIGHT');
    if (btnRotate) btnRotate.onclick = () => actionFn(gameType === 'tetris' ? 'DROP' : 'JUMP');

    // Clavier
    if (keyHandler) window.removeEventListener('keydown', keyHandler);
    keyHandler = (e) => {
      const gamesTab = document.getElementById('tab-games');
      if (!gamesTab || !gamesTab.classList.contains('active')) return;

      let action = null;
      if (e.key === 'ArrowUp') action = gameType === 'tetris' ? 'ROTATE' : (gameType === 'dash' ? 'JUMP' : 'UP');
      else if (e.key === 'ArrowDown') action = 'DOWN';
      else if (e.key === 'ArrowLeft') action = 'LEFT';
      else if (e.key === 'ArrowRight') action = 'RIGHT';
      else if (e.key === ' ') action = gameType === 'tetris' ? 'DROP' : (gameType === 'dash' ? 'JUMP' : 'ROTATE');
      else if (e.key === 'p' || e.key === 'P') { isPaused = !isPaused; return; }

      if (action) {
        e.preventDefault();
        actionFn(action);
      }
    };
    window.addEventListener('keydown', keyHandler);

    // Tap sur le canvas (utile pour Miami Dash)
    if (tapHandler && canvas) canvas.removeEventListener('pointerdown', tapHandler);
    tapHandler = (e) => {
      if (currentGame === 'dash') {
        e.preventDefault();
        actionFn('JUMP');
      }
    };
    if (canvas) canvas.addEventListener('pointerdown', tapHandler, { passive: false });
  }

  /* ============================================================
     HELPERS GRAPHIQUES
     ============================================================ */
  function roundRect(c, x, y, w, h, r) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawGameOver(score, message) {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, CSS_W, CSS_H);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CSS_W / 2, CSS_H / 2 - 25);

    ctx.fillStyle = '#10a37f';
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillText('Score : ' + score, CSS_W / 2, CSS_H / 2 + 5);

    if (message) {
      ctx.fillStyle = '#9ba1b3';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(message, CSS_W / 2, CSS_H / 2 + 28);
    }

    ctx.fillStyle = '#9ba1b3';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText('Appuie sur "Lancer"', CSS_W / 2, CSS_H / 2 + 52);
  }

  /* ============================================================
     TETRIS
     ============================================================ */
  function startTetris() {
    const COLS = 10, ROWS = 16;
    const BLOCK = Math.floor(Math.min((CSS_W - 20) / COLS, (CSS_H - 20) / ROWS));
    const BW = COLS * BLOCK, BH = ROWS * BLOCK;
    const OX = (CSS_W - BW) / 2, OY = (CSS_H - BH) / 2;

    const SHAPES = [
      [[1,1,1,1]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1]],
      [[0,1,1],[1,1,0]],
      [[1,1,0],[0,1,1]],
      [[1,0,0],[1,1,1]],
      [[0,0,1],[1,1,1]]
    ];
    const COLORS = ['#22d3ee','#fbbf24','#a855f7','#10a37f','#ef4444','#3b82f6','#f97316'];

    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let piece = null, nextPiece = null;
    let dropTimer = 0, dropInterval = 550;
    let lastT = 0, lines = 0, level = 1;
    let gameOver = false;

    function makePiece() {
      const i = Math.floor(Math.random() * SHAPES.length);
      const shape = SHAPES[i].map(r => r.slice());
      return {
        shape, color: COLORS[i],
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0
      };
    }

    function collide(p) {
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (!p.shape[r][c]) continue;
          const nx = p.x + c, ny = p.y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function lock() {
      piece.shape.forEach((row, r) => {
        row.forEach((v, c) => {
          if (v && piece.y + r >= 0) board[piece.y + r][piece.x + c] = piece.color;
        });
      });
      // Lignes complètes
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every(c => c)) {
          board.splice(r, 1);
          board.unshift(Array(COLS).fill(null));
          cleared++;
          r++;
        }
      }
      if (cleared > 0) {
        lines += cleared;
        const pts = [0, 100, 300, 500, 800][cleared] || 800;
        updateScore(getScore() + pts * level);
        level = 1 + Math.floor(lines / 8);
        dropInterval = Math.max(120, 550 - (level - 1) * 45);
      }
      piece = nextPiece;
      nextPiece = makePiece();
      if (collide(piece)) endGame();
    }

    function move(dx) {
      if (gameOver) return;
      piece.x += dx;
      if (collide(piece)) piece.x -= dx;
    }

    function rotate() {
      if (gameOver) return;
      const oldShape = piece.shape;
      const rot = oldShape[0].map((_, i) => oldShape.map(r => r[i]).reverse());
      piece.shape = rot;
      const kicks = [0, 1, -1, 2, -2];
      for (const k of kicks) {
        piece.x += k;
        if (!collide(piece)) return;
        piece.x -= k;
      }
      piece.shape = oldShape;
    }

    function softDrop() {
      if (gameOver) return;
      piece.y++;
      if (collide(piece)) {
        piece.y--;
        lock();
      }
      dropTimer = 0;
    }

    function hardDrop() {
      if (gameOver) return;
      while (!collide(piece)) piece.y++;
      piece.y--;
      lock();
      dropTimer = 0;
    }

    function endGame() {
      gameOver = true;
      stopGame();
      drawGameOver(getScore());
    }

    function action(a) {
      if (gameOver || isPaused) return;
      if (a === 'LEFT') move(-1);
      else if (a === 'RIGHT') move(1);
      else if (a === 'DOWN') softDrop();
      else if (a === 'ROTATE' || a === 'UP') rotate();
      else if (a === 'DROP') hardDrop();
    }
    bindControls(action, 'tetris');

    function drawBlock(x, y, color, glow) {
      ctx.save();
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
      const g = ctx.createLinearGradient(x, y, x + BLOCK, y + BLOCK);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = color;
      roundRect(ctx, x + 1, y + 1, BLOCK - 2, BLOCK - 2, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      roundRect(ctx, x + 2, y + 2, BLOCK - 4, 5, 2);
      ctx.fill();
      ctx.restore();
    }

    function loop(t) {
      const dt = t - lastT;
      lastT = t;

      if (!isPaused && !gameOver) {
        dropTimer += dt;
        if (dropTimer > dropInterval) {
          softDrop();
          dropTimer = 0;
        }
      }

      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      // Grille
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(OX, OY + r * BLOCK);
        ctx.lineTo(OX + BW, OY + r * BLOCK);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(OX + c * BLOCK, OY);
        ctx.lineTo(OX + c * BLOCK, OY + BH);
        ctx.stroke();
      }

      // Board
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (board[r][c]) drawBlock(OX + c * BLOCK, OY + r * BLOCK, board[r][c], false);
        }
      }

      // Pièce courante
      if (piece && !gameOver) {
        piece.shape.forEach((row, r) => {
          row.forEach((v, c) => {
            if (v && piece.y + r >= 0) {
              drawBlock(OX + (piece.x + c) * BLOCK, OY + (piece.y + r) * BLOCK, piece.color, true);
            }
          });
        });
      }

      // Niveau
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Niv. ' + level, CSS_W - 6, 15);

      if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, CSS_W, CSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', CSS_W / 2, CSS_H / 2);
      }

      gameLoopId = requestAnimationFrame(loop);
    }

    piece = makePiece();
    nextPiece = makePiece();
    lastT = performance.now();
    loop(lastT);
  }

  /* ============================================================
     SNAKE
     ============================================================ */
  function startSnake() {
    const COLS = 15, ROWS = 15;
    const TILE = Math.floor(Math.min((CSS_W - 20) / COLS, (CSS_H - 20) / ROWS));
    const BW = COLS * TILE, BH = ROWS * TILE;
    const OX = (CSS_W - BW) / 2, OY = (CSS_H - BH) / 2;

    let snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = spawnFood();
    let moveTimer = 0, moveInterval = 170;
    let lastT = 0;
    let gameOver = false;

    function spawnFood() {
      const free = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
        }
      }
      if (free.length === 0) return { x: 0, y: 0 };
      return free[Math.floor(Math.random() * free.length)];
    }

    function endGame() {
      gameOver = true;
      stopGame();
      drawGameOver(getScore(), 'Longueur : ' + snake.length);
    }

    function step() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();
      if (snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) return endGame();

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        updateScore(getScore() + 10);
        food = spawnFood();
        if (moveInterval > 80) moveInterval -= 4;
      } else {
        snake.pop();
      }
    }

    function action(a) {
      if (gameOver || isPaused) return;
      if (a === 'UP' && dir.y === 0) nextDir = { x: 0, y: -1 };
      else if (a === 'DOWN' && dir.y === 0) nextDir = { x: 0, y: 1 };
      else if (a === 'LEFT' && dir.x === 0) nextDir = { x: -1, y: 0 };
      else if (a === 'RIGHT' && dir.x === 0) nextDir = { x: 1, y: 0 };
    }
    bindControls(action, 'snake');

    function loop(t) {
      const dt = t - lastT;
      lastT = t;

      if (!isPaused && !gameOver) {
        moveTimer += dt;
        if (moveTimer > moveInterval) {
          moveTimer = 0;
          step();
        }
      }

      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      // Bordure
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(OX + 0.5, OY + 0.5, BW - 1, BH - 1);

      // Food
      const fx = OX + food.x * TILE + TILE / 2;
      const fy = OY + food.y * TILE + TILE / 2;
      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(fx, fy, TILE / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Snake
      snake.forEach((seg, i) => {
        const x = OX + seg.x * TILE;
        const y = OY + seg.y * TILE;
        const isHead = i === 0;

        ctx.save();
        if (isHead) {
          ctx.shadowColor = '#10a37f';
          ctx.shadowBlur = 10;
          ctx.fillStyle = '#34d8a8';
        } else {
          ctx.fillStyle = '#10a37f';
        }
        roundRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, isHead ? 6 : 4);
        ctx.fill();
        ctx.restore();

        // Yeux
        if (isHead) {
          ctx.fillStyle = '#fff';
          const ex = x + TILE / 2;
          const ey = y + TILE / 2;
          const off = TILE * 0.18;
          const er = Math.max(1.2, TILE * 0.08);
          let e1x = ex, e1y = ey, e2x = ex, e2y = ey;
          if (dir.x === 1) { e1x = ex + off; e1y = ey - off; e2x = ex + off; e2y = ey + off; }
          else if (dir.x === -1) { e1x = ex - off; e1y = ey - off; e2x = ex - off; e2y = ey + off; }
          else if (dir.y === 1) { e1x = ex - off; e1y = ey + off; e2x = ex + off; e2y = ey + off; }
          else { e1x = ex - off; e1y = ey - off; e2x = ex + off; e2y = ey - off; }
          ctx.beginPath(); ctx.arc(e1x, e1y, er, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e2x, e2y, er, 0, Math.PI * 2); ctx.fill();
        }
      });

      // Longueur
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Long. ' + snake.length, CSS_W - 6, 15);

      if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, CSS_W, CSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', CSS_W / 2, CSS_H / 2);
      }

      gameLoopId = requestAnimationFrame(loop);
    }

    lastT = performance.now();
    loop(lastT);
  }

  /* ============================================================
     MIAMI DASH (style Geometry Dash)
     ============================================================ */
  function startDash() {
    const GROUND_Y = CSS_H * 0.75;
    const GRAVITY = 0.55;
    const JUMP_V = -9.5;
    const CUBE = 22;

    const C = {
      skyTop: '#1a0b2e',
      skyMid: '#c94b8c',
      skyLow: '#ff9a56',
      skyBot: '#ffd166',
      sun: '#ffeb99',
      far: '#2a1552',
      mid: '#1e0f3f',
      ground: '#0d0221',
      pink: '#ff2e93',
      cyan: '#00fff0',
      cubeHi: '#ff7ab8'
    };

    let speed = 3.4;
    let cube = {
      x: 45,
      y: GROUND_Y - CUBE,
      vy: 0,
      onGround: true,
      rot: 0
    };
    let obstacles = [];
    let particles = [];
    let stars = [];
    let dist = 0;
    let gameOver = false;
    let lastT = 0;
    let spawnT = 0;
    let nextSpawn = 1400;
    let offFar = 0, offMid = 0, offPalm = 0;

    // Étoiles
    for (let i = 0; i < 30; i++) {
      stars.push({
        x: Math.random() * CSS_W,
        y: Math.random() * GROUND_Y * 0.5,
        s: Math.random() * 1.3 + 0.4,
        t: Math.random() * Math.PI * 2
      });
    }

    // Immeubles
    function genBuildings(minH, maxH, minW, maxW) {
      const arr = [];
      let x = -50;
      const total = CSS_W + 400;
      while (x < total) {
        const w = minW + Math.random() * (maxW - minW);
        const h = minH + Math.random() * (maxH - minH);
        arr.push({ x, w, h });
        x += w + 8 + Math.random() * 12;
      }
      return arr;
    }
    const farB = genBuildings(30, 70, 20, 35);
    const midB = genBuildings(50, 100, 25, 45);

    // Palmiers
    const palms = [];
    let px = -30;
    while (px < CSS_W + 400) {
      palms.push({ x: px, h: 45 + Math.random() * 25 });
      px += 90 + Math.random() * 60;
    }

    function jump() {
      if (gameOver || !cube.onGround) return;
      cube.vy = JUMP_V;
      cube.onGround = false;
      for (let i = 0; i < 4; i++) {
        particles.push({
          x: cube.x + CUBE / 2,
          y: cube.y + CUBE,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2,
          life: 1,
          color: C.pink
        });
      }
    }

    function spawnObstacle() {
      const r = Math.random();
      let w, h, type;
      if (r < 0.5) { type = 'spike'; w = 20; h = 22; }
      else if (r < 0.8) { type = 'block'; w = 26; h = 26; }
      else { type = 'double'; w = 40; h = 22; }

      obstacles.push({ x: CSS_W + 30, y: GROUND_Y - h, w, h, type });
    }

    function hit(o) {
      const cx = cube.x + 3;
      const cy = cube.y + 3;
      const cw = CUBE - 6;
      const ch = CUBE - 6;
      return cx < o.x + o.w - 2 && cx + cw > o.x + 2 && cy < o.y + o.h && cy + ch > o.y;
    }

    function endGame() {
      gameOver = true;
      stopGame();
      for (let i = 0; i < 24; i++) {
        particles.push({
          x: cube.x + CUBE / 2,
          y: cube.y + CUBE / 2,
          vx: (Math.random() - 0.5) * 9,
          vy: (Math.random() - 0.5) * 9 - 2,
          life: 1,
          color: Math.random() < 0.5 ? C.pink : C.cyan
        });
      }
    }

    function action(a) {
      if (a === 'UP' || a === 'JUMP' || a === 'ROTATE' || a === 'DROP') jump();
    }
    bindControls(action, 'dash');

    function drawSky() {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      g.addColorStop(0, C.skyTop);
      g.addColorStop(0.4, C.skyMid);
      g.addColorStop(0.7, C.skyLow);
      g.addColorStop(1, C.skyBot);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CSS_W, GROUND_Y);

      // Soleil
      const sunX = CSS_W * 0.7;
      const sunY = GROUND_Y * 0.65;
      const r = 32;

      const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, r * 2.5);
      glow.addColorStop(0, 'rgba(255,235,153,0.5)');
      glow.addColorStop(1, 'rgba(255,140,66,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, CSS_W, GROUND_Y);

      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.arc(sunX, sunY, r, 0, Math.PI * 2);
      ctx.fill();

      // Lignes coupantes
      ctx.fillStyle = g;
      for (let i = 0; i < 5; i++) {
        ctx.fillRect(sunX - r - 2, sunY + 4 + i * 6, r * 2 + 4, 3);
      }
    }

    function drawBuildings(arr, color, offset, windows) {
      const last = arr[arr.length - 1];
      const total = last.x + last.w + 200;

      arr.forEach(b => {
        let x = b.x - (offset % total);
        while (x < -200) x += total;
        while (x > CSS_W + 200) x -= total;
        if (x + b.w < -10 || x > CSS_W + 10) return;

        ctx.fillStyle = color;
        ctx.fillRect(x, GROUND_Y - b.h, b.w, b.h);

        if (windows) {
          ctx.fillStyle = 'rgba(255,46,147,0.55)';
          const cols = Math.floor(b.w / 8);
          const rows = Math.floor(b.h / 9);
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              if ((r + c + Math.floor(b.x / 10)) % 3 === 0) {
                ctx.fillRect(x + c * 8 + 3, GROUND_Y - b.h + r * 9 + 4, 3, 4);
              }
            }
          }
        }
      });
    }

    function drawPalms(offset) {
      const last = palms[palms.length - 1];
      const total = last.x + 200;

      ctx.strokeStyle = '#08000f';
      ctx.lineCap = 'round';

      palms.forEach(p => {
        let x = p.x - (offset % total);
        while (x < -100) x += total;
        while (x > CSS_W + 100) x -= total;
        if (x < -40 || x > CSS_W + 40) return;

        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.quadraticCurveTo(x + 4, GROUND_Y - p.h * 0.6, x - 2, GROUND_Y - p.h);
        ctx.stroke();

        const tx = x - 2, ty = GROUND_Y - p.h;
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
          const a = (i - 2) * 0.55;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.quadraticCurveTo(tx + Math.sin(a) * 14, ty - 12, tx + Math.sin(a) * 22, ty - 3 + Math.cos(a) * 5);
          ctx.stroke();
        }
      });
    }

    function drawGround() {
      const g = ctx.createLinearGradient(0, GROUND_Y, 0, CSS_H);
      g.addColorStop(0, '#1a0b2e');
      g.addColorStop(1, '#0d0221');
      ctx.fillStyle = g;
      ctx.fillRect(0, GROUND_Y, CSS_W, CSS_H - GROUND_Y);

      ctx.strokeStyle = C.pink;
      ctx.lineWidth = 2;
      ctx.shadowColor = C.pink;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CSS_W, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Grille
      ctx.strokeStyle = 'rgba(255,46,147,0.28)';
      ctx.lineWidth = 1;
      const baseX = -((dist) % 45);
      for (let i = -1; i < CSS_W / 45 + 2; i++) {
        const x = baseX + i * 45;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 2);
        ctx.lineTo(x + 25, CSS_H);
        ctx.stroke();
      }
    }

    function drawCube() {
      if (gameOver) return;
      ctx.save();
      ctx.translate(cube.x + CUBE / 2, cube.y + CUBE / 2);
      ctx.rotate(cube.rot);

      ctx.shadowColor = C.pink;
      ctx.shadowBlur = 14;

      const g = ctx.createLinearGradient(-CUBE / 2, -CUBE / 2, CUBE / 2, CUBE / 2);
      g.addColorStop(0, C.cubeHi);
      g.addColorStop(1, C.pink);
      ctx.fillStyle = g;
      ctx.fillRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-CUBE / 2, -CUBE / 2, CUBE, CUBE);

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(-CUBE / 2 + 3, -CUBE / 2 + 3, CUBE - 6, 3);

      ctx.restore();
    }

    function drawObstacles() {
      obstacles.forEach(o => {
        if (o.type === 'spike') {
          ctx.fillStyle = C.cyan;
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.lineTo(o.x, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else if (o.type === 'double') {
          ctx.fillStyle = C.cyan;
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur = 8;
          for (let i = 0; i < 2; i++) {
            const sx = o.x + i * (o.w / 2);
            ctx.beginPath();
            ctx.moveTo(sx + o.w / 4, o.y);
            ctx.lineTo(sx + o.w / 2, o.y + o.h);
            ctx.lineTo(sx, o.y + o.h);
            ctx.closePath();
            ctx.fill();
          }
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = '#1a0b2e';
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = C.cyan;
          ctx.lineWidth = 2;
          ctx.shadowColor = C.cyan;
          ctx.shadowBlur = 8;
          ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
          ctx.shadowBlur = 0;
        }
      });
    }

    function updateParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.03;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2 * p.life + 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawFrame() {
      ctx.fillStyle = '#0a0215';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      drawSky();

      // Étoiles
      stars.forEach(s => {
        s.t += 0.02;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(s.t) * 0.3) + ')';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
      });

      drawBuildings(farB, C.far, offFar, false);
      drawBuildings(midB, C.mid, offMid, true);
      drawPalms(offPalm);
      drawGround();
      drawObstacles();
      drawCube();
      updateParticles();

      // Distance
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(Math.floor(dist / 10) + ' m', CSS_W - 6, 15);
    }

    function loop(t) {
      const dt = Math.min(32, t - lastT) / 16.67;
      lastT = t;

      if (!isPaused && !gameOver) {
        speed = 3.4 + Math.min(4, dist / 800);

        // Physique cube
        cube.vy += GRAVITY * dt;
        cube.y += cube.vy * dt;

        if (cube.y >= GROUND_Y - CUBE) {
          cube.y = GROUND_Y - CUBE;
          cube.vy = 0;
          cube.onGround = true;
          // Aligne la rotation
          const snap = Math.round(cube.rot / (Math.PI / 2)) * (Math.PI / 2);
          cube.rot += (snap - cube.rot) * 0.3 * dt;
        } else {
          cube.onGround = false;
          cube.rot += 0.14 * dt;
        }

        const moveX = speed * dt;
        obstacles.forEach(o => o.x -= moveX);
        obstacles = obstacles.filter(o => o.x + o.w > -50);

        offFar += moveX * 0.1;
        offMid += moveX * 0.25;
        offPalm += moveX * 0.4;
        dist += moveX;

        const s = Math.floor(dist / 10);
        if (s > getScore()) updateScore(s);

        // Spawn
        spawnT += dt * 16.67;
        if (spawnT > nextSpawn) {
          spawnObstacle();
          spawnT = 0;
          const base = Math.max(900, 1500 - dist / 15);
          nextSpawn = base + Math.random() * 500;
        }

        // Collision
        for (const o of obstacles) {
          if (hit(o)) { endGame(); break; }
        }
      }

      drawFrame();

      if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(10,2,33,0.7)';
        ctx.fillRect(0, 0, CSS_W, CSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', CSS_W / 2, CSS_H / 2);
      }

      if (gameOver) {
        drawGameOver(getScore(), Math.floor(dist / 10) + ' m parcourus');
        return;
      }

      gameLoopId = requestAnimationFrame(loop);
    }

    lastT = performance.now();
    loop(lastT);
  }

  /* ============================================================
     LANCEMENT
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();