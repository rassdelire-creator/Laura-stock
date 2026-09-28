/* ============================================================
   LAUGRASTOK v2.0 — Jeux Arcade
   Tetris + Snake recréés : nets, fluides, HD
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const $ = (sel) => document.querySelector(sel);

  /* ============================================================
     RÉFÉRENCES DOM
     ============================================================ */
  const canvas = $('#gameCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const scoreEl = $('#gameScore');
  const highScoreEl = $('#gameHighScore');
  const startBtn = $('#startGameBtn');
  const gameTabs = document.querySelectorAll('.game-tab-btn');

  let currentGame = 'tetris';
  let gameLoopId = null;
  let isPaused = false;
  let keyHandler = null;

  let highScores = JSON.parse(localStorage.getItem('laugra_high_scores') || 'null')
    || { tetris: 0, snake: 0 };

  /* ============================================================
     CANVAS HD (rendu net sur mobile Retina)
     ============================================================ */
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const CSS_W = canvas.clientWidth || 300;
  const CSS_H = canvas.clientHeight || 400;

  canvas.width = CSS_W * DPR;
  canvas.height = CSS_H * DPR;
  canvas.style.width = CSS_W + 'px';
  canvas.style.height = CSS_H + 'px';
  ctx.scale(DPR, DPR);

  /* ============================================================
     SCORE
     ============================================================ */
  function updateScore(newScore) {
    if (scoreEl) scoreEl.textContent = newScore;
    if (newScore > highScores[currentGame]) {
      highScores[currentGame] = newScore;
      localStorage.setItem('laugra_high_scores', JSON.stringify(highScores));
    }
    if (highScoreEl) highScoreEl.textContent = highScores[currentGame];
  }

  function showHighScore() {
    if (highScoreEl) highScoreEl.textContent = highScores[currentGame] || 0;
  }

  /* ============================================================
     BOUCLE DE JEU
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
  }

  function startGame() {
    stopGame();
    isPaused = false;
    updateScore(0);
    showHighScore();
    if (currentGame === 'tetris') startTetris();
    else startSnake();
  }

  /* ============================================================
     TETRIS
     ============================================================ */
  function startTetris() {
    const COLS = 10;
    const ROWS = 20;
    const BLOCK = Math.floor(Math.min((CSS_W - 20) / COLS, (CSS_H - 20) / ROWS));
    const BOARD_W = COLS * BLOCK;
    const BOARD_H = ROWS * BLOCK;
    const OFF_X = (CSS_W - BOARD_W) / 2;
    const OFF_Y = (CSS_H - BOARD_H) / 2;

    const SHAPES = [
      // I
      [[1,1,1,1]],
      // O
      [[1,1],[1,1]],
      // T
      [[0,1,0],[1,1,1]],
      // S
      [[0,1,1],[1,1,0]],
      // Z
      [[1,1,0],[0,1,1]],
      // J
      [[1,0,0],[1,1,1]],
      // L
      [[0,0,1],[1,1,1]]
    ];
    const COLORS = [
      '#22d3ee', // I cyan
      '#fbbf24', // O jaune
      '#a855f7', // T violet
      '#10a37f', // S vert
      '#ef4444', // Z rouge
      '#3b82f6', // J bleu
      '#f97316'  // L orange
    ];

    let board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    let current = null;
    let next = null;
    let dropCounter = 0;
    let dropInterval = 550;
    let lastTime = 0;
    let linesClearedTotal = 0;
    let level = 1;
    let gameOver = false;
    let flashLines = [];
    let flashTimer = 0;

    function newPiece() {
      const idx = Math.floor(Math.random() * SHAPES.length);
      const shape = SHAPES[idx].map(row => [...row]);
      return {
        shape,
        color: COLORS[idx],
        x: Math.floor((COLS - shape[0].length) / 2),
        y: 0
      };
    }

    function collide(b, p) {
      for (let r = 0; r < p.shape.length; r++) {
        for (let c = 0; c < p.shape[r].length; c++) {
          if (!p.shape[r][c]) continue;
          const nx = p.x + c;
          const ny = p.y + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && b[ny][nx]) return true;
        }
      }
      return false;
    }

    function merge(b, p) {
      p.shape.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val && p.y + r >= 0) b[p.y + r][p.x + c] = p.color;
        });
      });
    }

    function rotate(p) {
      const old = p.shape;
      const rotated = old[0].map((_, i) => old.map(row => row[i]).reverse());
      p.shape = rotated;

      // Wall kicks simples
      const kicks = [0, 1, -1, 2, -2];
      for (const k of kicks) {
        p.x += k;
        if (!collide(board, p)) return;
        p.x -= k;
      }
      // Restaure
      p.shape = old;
    }

    function checkLines() {
      const full = [];
      board.forEach((row, i) => {
        if (row.every(cell => cell)) full.push(i);
      });
      if (full.length === 0) return;

      flashLines = full;
      flashTimer = 200;

      setTimeout(() => {
        board = board.filter((_, i) => !full.includes(i));
        while (board.length < ROWS) board.unshift(Array(COLS).fill(null));

        linesClearedTotal += full.length;
        const basePoints = [0, 100, 300, 500, 800][full.length] || 800;
        updateScore(parseInt(scoreEl.textContent) + basePoints * level);

        // Niveau = plus vite
        level = 1 + Math.floor(linesClearedTotal / 10);
        dropInterval = Math.max(120, 550 - (level - 1) * 45);

        flashLines = [];
      }, 200);
    }

    function softDrop() {
      if (!current || gameOver) return;
      current.y++;
      if (collide(board, current)) {
        current.y--;
        lockPiece();
      }
      dropCounter = 0;
    }

    function lockPiece() {
      merge(board, current);
      checkLines();
      current = next;
      next = newPiece();
      if (collide(board, current)) {
        endGame();
      }
    }

    function endGame() {
      gameOver = true;
      stopGame();

      // Message élégant sur le canvas
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CSS_W / 2, CSS_H / 2 - 20);

      ctx.fillStyle = '#10a37f';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`Score : ${scoreEl.textContent}`, CSS_W / 2, CSS_H / 2 + 10);

      ctx.fillStyle = '#9ba1b3';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Appuie sur "Lancer" pour rejouer', CSS_W / 2, CSS_H / 2 + 40);
    }

    function hardDrop() {
      if (!current || gameOver) return;
      while (!collide(board, current)) current.y++;
      current.y--;
      lockPiece();
      dropCounter = 0;
    }

    /* ------- CONTRÔLES ------- */
    function handleAction(action) {
      if (gameOver || isPaused) return;
      if (!current) return;

      if (action === 'LEFT') {
        current.x--;
        if (collide(board, current)) current.x++;
      }
      if (action === 'RIGHT') {
        current.x++;
        if (collide(board, current)) current.x--;
      }
      if (action === 'DOWN') softDrop();
      if (action === 'ROTATE' || action === 'UP') rotate(current);
      if (action === 'DROP') hardDrop();
    }
    bindControls(handleAction, 'tetris');

    /* ------- RENDU ------- */
    function drawBlock(x, y, color, alpha = 1, glow = false) {
      ctx.save();
      ctx.globalAlpha = alpha;

      if (glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
      }

      // Bloc principal avec léger dégradé
      const grad = ctx.createLinearGradient(x, y, x + BLOCK, y + BLOCK);
      grad.addColorStop(0, color);
      grad.addColorStop(1, shadeColor(color, -25));

      ctx.fillStyle = grad;
      roundRect(ctx, x + 1, y + 1, BLOCK - 2, BLOCK - 2, 3);
      ctx.fill();

      // Reflet supérieur
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      roundRect(ctx, x + 2, y + 2, BLOCK - 4, (BLOCK - 4) * 0.35, 2);
      ctx.fill();

      ctx.restore();
    }

    function drawGrid() {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(OFF_X, OFF_Y + r * BLOCK);
        ctx.lineTo(OFF_X + BOARD_W, OFF_Y + r * BLOCK);
        ctx.stroke();
      }
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(OFF_X + c * BLOCK, OFF_Y);
        ctx.lineTo(OFF_X + c * BLOCK, OFF_Y + BOARD_H);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawGhost() {
      if (!current) return;
      const ghost = { ...current, shape: current.shape };
      while (!collide(board, ghost)) ghost.y++;
      ghost.y--;

      ghost.shape.forEach((row, r) => {
        row.forEach((val, c) => {
          if (val && ghost.y + r >= 0) {
            ctx.save();
            ctx.strokeStyle = current.color;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;
            roundRect(ctx,
              OFF_X + (ghost.x + c) * BLOCK + 2,
              OFF_Y + (ghost.y + r) * BLOCK + 2,
              BLOCK - 4, BLOCK - 4, 3);
            ctx.stroke();
            ctx.restore();
          }
        });
      });
    }

    /* ------- BOUCLE ------- */
    function loop(time = 0) {
      const dt = time - lastTime;
      lastTime = time;

      if (!isPaused && !gameOver) {
        dropCounter += dt;
        if (dropCounter > dropInterval) {
          softDrop();
          dropCounter = 0;
        }
      }

      // Fond
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      drawGrid();

      // Blocs posés
      board.forEach((row, r) => {
        row.forEach((color, c) => {
          if (color) {
            const isFlashing = flashLines.includes(r) && flashTimer > 0;
            drawBlock(
              OFF_X + c * BLOCK,
              OFF_Y + r * BLOCK,
              color,
              isFlashing ? 0.4 + Math.random() * 0.6 : 1,
              isFlashing
            );
          }
        });
      });

      if (flashTimer > 0) flashTimer -= dt;

      // Ghost + pièce courante
      if (!gameOver && current) {
        drawGhost();
        current.shape.forEach((row, r) => {
          row.forEach((val, c) => {
            if (val && current.y + r >= 0) {
              drawBlock(
                OFF_X + (current.x + c) * BLOCK,
                OFF_Y + (current.y + r) * BLOCK,
                current.color,
                1, true
              );
            }
          });
        });
      }

      // Niveau en haut à droite
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Niv. ${level}`, CSS_W - 8, 16);

      // Pause
      if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, CSS_W, CSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', CSS_W / 2, CSS_H / 2);
      }

      gameLoopId = requestAnimationFrame(loop);
    }

    /* ------- INIT ------- */
    current = newPiece();
    next = newPiece();
    lastTime = 0;
    loop();
  }

  /* ============================================================
     SNAKE
     ============================================================ */
  function startSnake() {
    const COLS = 17;
    const ROWS = 22;
    const TILE = Math.floor(Math.min((CSS_W - 16) / COLS, (CSS_H - 16) / ROWS));
    const BOARD_W = COLS * TILE;
    const BOARD_H = ROWS * TILE;
    const OFF_X = (CSS_W - BOARD_W) / 2;
    const OFF_Y = (CSS_H - BOARD_H) / 2;

    let snake = [
      { x: 8, y: 11 },
      { x: 7, y: 11 },
      { x: 6, y: 11 }
    ];
    let dir = { x: 1, y: 0 };
    let nextDir = { x: 1, y: 0 };
    let food = spawnFood();
    let lastMove = 0;
    let moveInterval = 140;
    let gameOver = false;
    let particleBurst = [];
    let foodPulse = 0;

    function spawnFood() {
      const free = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!snake?.some(s => s.x === x && s.y === y)) free.push({ x, y });
        }
      }
      if (free.length === 0) return { x: 0, y: 0 };
      return free[Math.floor(Math.random() * free.length)];
    }

    function handleAction(action) {
      if (gameOver || isPaused) return;
      if (action === 'UP' && dir.y === 0) nextDir = { x: 0, y: -1 };
      else if (action === 'DOWN' && dir.y === 0) nextDir = { x: 0, y: 1 };
      else if (action === 'LEFT' && dir.x === 0) nextDir = { x: -1, y: 0 };
      else if (action === 'RIGHT' && dir.x === 0) nextDir = { x: 1, y: 0 };
    }
    bindControls(handleAction, 'snake');

    function endGame() {
      gameOver = true;
      stopGame();

      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CSS_W / 2, CSS_H / 2 - 20);

      ctx.fillStyle = '#10a37f';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(`Score : ${scoreEl.textContent}`, CSS_W / 2, CSS_H / 2 + 10);

      ctx.fillStyle = '#9ba1b3';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Appuie sur "Lancer" pour rejouer', CSS_W / 2, CSS_H / 2 + 40);
    }

    function step() {
      dir = nextDir;
      const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

      // Mur
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        return endGame();
      }
      // Corps (sauf la queue qui va bouger)
      if (snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) {
        return endGame();
      }

      snake.unshift(head);

      if (head.x === food.x && head.y === food.y) {
        // Mange : particle burst
        for (let i = 0; i < 10; i++) {
          particleBurst.push({
            x: OFF_X + (food.x + 0.5) * TILE,
            y: OFF_Y + (food.y + 0.5) * TILE,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            color: '#ef4444'
          });
        }
        updateScore(parseInt(scoreEl.textContent) + 10);
        food = spawnFood();
        // Accélération progressive
        moveInterval = Math.max(70, 140 - Math.floor(parseInt(scoreEl.textContent) / 50) * 8);
      } else {
        snake.pop();
      }
    }

    /* ------- RENDU ------- */
    function drawBackground() {
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      // Damier subtil
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.015)';
            ctx.fillRect(OFF_X + x * TILE, OFF_Y + y * TILE, TILE, TILE);
          }
        }
      }

      // Bordure
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(OFF_X - 0.5, OFF_Y - 0.5, BOARD_W + 1, BOARD_H + 1);
    }

    function drawFood() {
      foodPulse += 0.12;
      const pulse = 1 + Math.sin(foodPulse) * 0.12;

      const cx = OFF_X + (food.x + 0.5) * TILE;
      const cy = OFF_Y + (food.y + 0.5) * TILE;
      const r = (TILE / 2 - 2) * pulse;

      ctx.save();
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 14;

      const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 1, cx, cy, r);
      grad.addColorStop(0, '#fca5a5');
      grad.addColorStop(1, '#ef4444');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSnake() {
      snake.forEach((seg, i) => {
        const x = OFF_X + seg.x * TILE;
        const y = OFF_Y + seg.y * TILE;
        const isHead = i === 0;

        ctx.save();
        if (isHead) {
          ctx.shadowColor = '#10a37f';
          ctx.shadowBlur = 12;
        }

        // Dégradé du corps
        const t = i / Math.max(1, snake.length - 1);
        const c1 = isHead ? '#34d8a8' : mixColor('#10a37f', '#0b6d55', t);
        const c2 = isHead ? '#0d8a6c' : mixColor('#0b6d55', '#064e3b', t);

        const grad = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;

        roundRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, isHead ? 6 : 4);
        ctx.fill();

        // Yeux
        if (isHead) {
          ctx.fillStyle = '#fff';
          const eyeR = Math.max(1.5, TILE * 0.09);
          const ex = x + TILE / 2;
          const ey = y + TILE / 2;
          const off = TILE * 0.18;

          let e1x = ex, e1y = ey, e2x = ex, e2y = ey;
          if (dir.x === 1) { e1x = ex + off; e1y = ey - off; e2x = ex + off; e2y = ey + off; }
          else if (dir.x === -1) { e1x = ex - off; e1y = ey - off; e2x = ex - off; e2y = ey + off; }
          else if (dir.y === 1) { e1x = ex - off; e1y = ey + off; e2x = ex + off; e2y = ey + off; }
          else { e1x = ex - off; e1y = ey - off; e2x = ex + off; e2y = ey - off; }

          ctx.beginPath(); ctx.arc(e1x, e1y, eyeR, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(e2x, e2y, eyeR, 0, Math.PI * 2); ctx.fill();
        }

        ctx.restore();
      });
    }

    function drawParticles(dt) {
      for (let i = particleBurst.length - 1; i >= 0; i--) {
        const p = particleBurst[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15;
        p.life -= dt / 600;

        if (p.life <= 0) {
          particleBurst.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* ------- BOUCLE ------- */
    let lastFrameTime = 0;

    function loop(time = 0) {
      const dt = Math.min(50, time - lastFrameTime);
      lastFrameTime = time;

      if (!isPaused && !gameOver) {
        lastMove += dt;
        if (lastMove > moveInterval) {
          lastMove = 0;
          step();
        }
      }

      drawBackground();
      drawFood();
      drawSnake();
      drawParticles(dt);

      // Score en haut
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Longueur ${snake.length}`, CSS_W - 8, 16);

      if (isPaused && !gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, CSS_W, CSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', CSS_W / 2, CSS_H / 2);
      }

      gameLoopId = requestAnimationFrame(loop);
    }

    loop();
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

  function shadeColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    let r = (num >> 16) + amt;
    let g = (num >> 8 & 0x00FF) + amt;
    let b = (num & 0x0000FF) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return '#' + (0x1000000 + r * 0x10000 + g * 0x100 + b).toString(16).slice(1);
  }

  function mixColor(hex1, hex2, t) {
    const c1 = parseInt(hex1.replace('#', ''), 16);
    const c2 = parseInt(hex2.replace('#', ''), 16);
    const r = Math.round((c1 >> 16) * (1 - t) + (c2 >> 16) * t);
    const g = Math.round(((c1 >> 8) & 0xFF) * (1 - t) + ((c2 >> 8) & 0xFF) * t);
    const b = Math.round((c1 & 0xFF) * (1 - t) + (c2 & 0xFF) * t);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  /* ============================================================
     CONTRÔLES (D-pad + clavier)
     ============================================================ */
  function bindControls(callback, gameType) {
    $('#btnUp').onclick      = () => callback(gameType === 'tetris' ? 'ROTATE' : 'UP');
    $('#btnDown').onclick    = () => callback('DOWN');
    $('#btnLeft').onclick    = () => callback('LEFT');
    $('#btnRight').onclick   = () => callback('RIGHT');
    $('#btnRotate').onclick  = () => callback(gameType === 'tetris' ? 'DROP' : 'ROTATE');

    if (keyHandler) window.removeEventListener('keydown', keyHandler);

    keyHandler = (e) => {
      // Ne fonctionne que si l'onglet Jeux est actif
      const gamesTab = document.getElementById('tab-games');
      if (!gamesTab || !gamesTab.classList.contains('active')) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          callback(gameType === 'tetris' ? 'ROTATE' : 'UP');
          break;
        case 'ArrowDown':
          e.preventDefault();
          callback('DOWN');
          break;
        case 'ArrowLeft':
          e.preventDefault();
          callback('LEFT');
          break;
        case 'ArrowRight':
          e.preventDefault();
          callback('RIGHT');
          break;
        case ' ':
          e.preventDefault();
          callback(gameType === 'tetris' ? 'DROP' : 'ROTATE');
          break;
        case 'p':
        case 'P':
          togglePause();
          break;
      }
    };
    window.addEventListener('keydown', keyHandler);
  }

  function togglePause() {
    isPaused = !isPaused;
  }

  /* ============================================================
     SWITCH ENTRE JEUX
     ============================================================ */
  gameTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      gameTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGame = btn.dataset.game;
      // Reset des styles pour bien réadapter le canvas
      startGame();
    });
  });

  /* ============================================================
     BOUTON LANCER
     ============================================================ */
  startBtn?.addEventListener('click', startGame);

  /* ============================================================
     PAUSE QUAND ON QUITTE L'ONGLET
     ============================================================ */
  const gamesTabEl = document.getElementById('tab-games');
  const tabObserver = new MutationObserver(() => {
    const isActive = gamesTabEl.classList.contains('active');
    if (!isActive && gameLoopId) {
      stopGame();
    }
  });
  if (gamesTabEl) {
    tabObserver.observe(gamesTabEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* ============================================================
     INIT : premier rendu (écran d'attente)
     ============================================================ */
  function drawIdleScreen() {
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, CSS_W, CSS_H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Appuie sur "Lancer" pour jouer', CSS_W / 2, CSS_H / 2);
  }
  drawIdleScreen();
  showHighScore();

  console.log('%c🎮 Jeux Arcade chargés', 'color:#10a37f;font-weight:bold;font-size:13px');
});