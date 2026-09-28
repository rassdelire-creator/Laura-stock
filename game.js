/* ============================================================
   LAUGRASTOK v2.0 — Jeux Arcade
   Tetris + Snake + Miami Dash (Geometry Dash style)
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
  let canvasTapHandler = null;

  let highScores = JSON.parse(localStorage.getItem('laugra_high_scores') || 'null')
    || { tetris: 0, snake: 0, dash: 0 };

  /* ============================================================
     CANVAS HD
     ============================================================ */
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let CSS_W = 300;
  let CSS_H = 400;

  function resizeCanvas() {
    void canvas.offsetWidth;
    const parentWidth = canvas.parentElement.clientWidth || 300;
    const targetWidth  = Math.min(parentWidth - 20, 340);
    const targetHeight = Math.round(targetWidth * 1.35);

    CSS_W = targetWidth;
    CSS_H = targetHeight;

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
    if (canvasTapHandler) {
      canvas.removeEventListener('pointerdown', canvasTapHandler);
      canvasTapHandler = null;
    }
  }

  function startGame() {
    stopGame();
    isPaused = false;
    updateScore(0);
    showHighScore();
    resizeCanvas();
    if (currentGame === 'tetris') startTetris();
    else if (currentGame === 'snake') startSnake();
    else if (currentGame === 'dash') startGeometryDash();
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
      [[1,1,1,1]],
      [[1,1],[1,1]],
      [[0,1,0],[1,1,1]],
      [[0,1,1],[1,1,0]],
      [[1,1,0],[0,1,1]],
      [[1,0,0],[1,1,1]],
      [[0,0,1],[1,1,1]]
    ];
    const COLORS = [
      '#22d3ee', '#fbbf24', '#a855f7', '#10a37f', '#ef4444', '#3b82f6', '#f97316'
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

      const kicks = [0, 1, -1, 2, -2];
      for (const k of kicks) {
        p.x += k;
        if (!collide(board, p)) return;
        p.x -= k;
      }
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

    function handleAction(action) {
      if (gameOver || isPaused) return;
      if (!current) return;
      if (action === 'LEFT') { current.x--; if (collide(board, current)) current.x++; }
      if (action === 'RIGHT') { current.x++; if (collide(board, current)) current.x--; }
      if (action === 'DOWN') softDrop();
      if (action === 'ROTATE' || action === 'UP') rotate(current);
      if (action === 'DROP') hardDrop();
    }
    bindControls(handleAction, 'tetris');

    function drawBlock(x, y, color, alpha = 1, glow = false) {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
      const grad = ctx.createLinearGradient(x, y, x + BLOCK, y + BLOCK);
      grad.addColorStop(0, color);
      grad.addColorStop(1, shadeColor(color, -25));
      ctx.fillStyle = grad;
      roundRect(ctx, x + 1, y + 1, BLOCK - 2, BLOCK - 2, 3);
      ctx.fill();
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

    function loop(time = 0) {
      const dt = time - lastTime;
      lastTime = time;
      if (!isPaused && !gameOver) {
        dropCounter += dt;
        if (dropCounter > dropInterval) { softDrop(); dropCounter = 0; }
      }
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CSS_W, CSS_H);
      drawGrid();
      board.forEach((row, r) => {
        row.forEach((color, c) => {
          if (color) {
            const isFlashing = flashLines.includes(r) && flashTimer > 0;
            drawBlock(OFF_X + c * BLOCK, OFF_Y + r * BLOCK, color,
              isFlashing ? 0.4 + Math.random() * 0.6 : 1, isFlashing);
          }
        });
      });
      if (flashTimer > 0) flashTimer -= dt;
      if (!gameOver && current) {
        drawGhost();
        current.shape.forEach((row, r) => {
          row.forEach((val, c) => {
            if (val && current.y + r >= 0) {
              drawBlock(OFF_X + (current.x + c) * BLOCK,
                OFF_Y + (current.y + r) * BLOCK, current.color, 1, true);
            }
          });
        });
      }
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Niv. ${level}`, CSS_W - 8, 16);
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

    let snake = [{ x: 8, y: 11 }, { x: 7, y: 11 }, { x: 6, y: 11 }];
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
          if (!snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
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
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endGame();
      if (snake.slice(0, -1).some(s => s.x === head.x && s.y === head.y)) return endGame();
      snake.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        for (let i = 0; i < 10; i++) {
          particleBurst.push({
            x: OFF_X + (food.x + 0.5) * TILE,
            y: OFF_Y + (food.y + 0.5) * TILE,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1, color: '#ef4444'
          });
        }
        updateScore(parseInt(scoreEl.textContent) + 10);
        food = spawnFood();
        moveInterval = Math.max(70, 140 - Math.floor(parseInt(scoreEl.textContent) / 50) * 8);
      } else snake.pop();
    }

    function drawBackground() {
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CSS_W, CSS_H);
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.015)';
            ctx.fillRect(OFF_X + x * TILE, OFF_Y + y * TILE, TILE, TILE);
          }
        }
      }
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
        if (isHead) { ctx.shadowColor = '#10a37f'; ctx.shadowBlur = 12; }
        const t = i / Math.max(1, snake.length - 1);
        const c1 = isHead ? '#34d8a8' : mixColor('#10a37f', '#0b6d55', t);
        const c2 = isHead ? '#0d8a6c' : mixColor('#0b6d55', '#064e3b', t);
        const grad = ctx.createLinearGradient(x, y, x + TILE, y + TILE);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        roundRect(ctx, x + 1, y + 1, TILE - 2, TILE - 2, isHead ? 6 : 4);
        ctx.fill();
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
        p.x += p.vx; p.y += p.vy; p.vy += 0.15;
        p.life -= dt / 600;
        if (p.life <= 0) { particleBurst.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    let lastFrameTime = 0;
    function loop(time = 0) {
      const dt = Math.min(50, time - lastFrameTime);
      lastFrameTime = time;
      if (!isPaused && !gameOver) {
        lastMove += dt;
        if (lastMove > moveInterval) { lastMove = 0; step(); }
      }
      drawBackground();
      drawFood();
      drawSnake();
      drawParticles(dt);
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
     MIAMI DASH (style Geometry Dash)
     ============================================================ */
  function startGeometryDash() {
    /* ---------- CONFIG PHYSIQUE ---------- */
    const GROUND_Y = CSS_H * 0.78;
    const GRAVITY = 0.366;
    const JUMP_V = -6.4;
    const CUBE_SIZE = 26;
    const BASE_SPEED = 4.5;

    /* ---------- COULEURS MIAMI (synthwave) ---------- */
    const C = {
      skyTop:    '#1a0b2e',
      skyMid:    '#c94b8c',
      skyLow:    '#ff9a56',
      skyBottom: '#ffd166',
      sun:       '#ffeb99',
      sunGlow:   '#ff8c42',
      buildingFar: '#2a1552',
      buildingMid: '#1e0f3f',
      palm:      '#08000f',
      ground:    '#0d0221',
      neonPink:  '#ff2e93',
      neonCyan:  '#00fff0',
      cube:      '#ff2e93',
      cubeHi:    '#ff7ab8'
    };

    /* ---------- STATE ---------- */
    let speed = BASE_SPEED;
    let cube = {
      x: CSS_W * 0.18,
      y: GROUND_Y - CUBE_SIZE,
      vy: 0,
      onGround: true,
      rot: 0
    };
    let obstacles = [];
    let particles = [];
    let stars = [];
    let distance = 0;
    let gameOver = false;
    let lastTime = 0;
    let spawnTimer = 0;
    let nextSpawn = 900;
    let time = 0;

    /* Parallax offsets */
    let offFar = 0, offMid = 0, offPalm = 0, offGround = 0;

    /* ---------- GÉNÉRATION DÉCOR ---------- */
    for (let i = 0; i < 40; i++) {
      stars.push({
        x: Math.random() * CSS_W,
        y: Math.random() * GROUND_Y * 0.45,
        s: Math.random() * 1.5 + 0.5,
        t: Math.random() * Math.PI * 2
      });
    }

    function genBuildings(minH, maxH, minW, maxW) {
      const arr = [];
      let x = -100;
      while (x < CSS_W + 500) {
        const w = minW + Math.random() * (maxW - minW);
        const h = minH + Math.random() * (maxH - minH);
        arr.push({ x, w, h });
        x += w + Math.random() * 15;
      }
      return arr;
    }

    const farBuildings = genBuildings(40, 90, 25, 45);
    const midBuildings = genBuildings(60, 130, 30, 55);

    function genPalms() {
      const arr = [];
      let x = -50;
      while (x < CSS_W + 500) {
        arr.push({ x, h: 55 + Math.random() * 30 });
        x += 110 + Math.random() * 80;
      }
      return arr;
    }
    const palms = genPalms();

    /* ---------- JUMP ---------- */
    function jump() {
      if (gameOver || !cube.onGround) return;
      cube.vy = JUMP_V;
      cube.onGround = false;
      for (let i = 0; i < 5; i++) {
        particles.push({
          x: cube.x + CUBE_SIZE / 2,
          y: cube.y + CUBE_SIZE,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2,
          life: 1,
          color: C.neonPink,
          size: 2 + Math.random() * 2
        });
      }
    }

    function handleAction(action) {
      if (action === 'UP' || action === 'ROTATE' || action === 'DROP') jump();
    }
    bindControls(handleAction, 'dash');

    /* Tap sur le canvas */
    canvasTapHandler = (e) => {
      if (gameOver) return;
      e.preventDefault();
      jump();
    };
    canvas.addEventListener('pointerdown', canvasTapHandler, { passive: false });

    /* ---------- SPAWN OBSTACLES ---------- */
    function spawnObstacle() {
      const r = Math.random();
      let w, h, type;
      if (r < 0.45)       { type = 'spike';  w = 24; h = 26; }
      else if (r < 0.70)  { type = 'block';  w = 30; h = 30; }
      else if (r < 0.90)  { type = 'double'; w = 46; h = 26; }
      else                { type = 'tall';   w = 26; h = 50; }

      obstacles.push({
        x: CSS_W + 40,
        y: GROUND_Y - h,
        w, h, type
      });
    }

    function checkCollision() {
      const cx = cube.x + 3;
      const cy = cube.y + 3;
      const cw = CUBE_SIZE - 6;
      const ch = CUBE_SIZE - 6;
      for (const o of obstacles) {
        if (cx < o.x + o.w - 3 &&
            cx + cw > o.x + 3 &&
            cy < o.y + o.h &&
            cy + ch > o.y) {
          return true;
        }
      }
      return false;
    }

    function endGame() {
      gameOver = true;
      // Explosion
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: cube.x + CUBE_SIZE / 2,
          y: cube.y + CUBE_SIZE / 2,
          vx: (Math.random() - 0.5) * 10,
          vy: (Math.random() - 0.5) * 10 - 2,
          life: 1,
          color: Math.random() < 0.5 ? C.neonPink : C.neonCyan,
          size: 2 + Math.random() * 3
        });
      }
    }

    /* ---------- DESSIN ---------- */
    function drawSky() {
      const g = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
      g.addColorStop(0, C.skyTop);
      g.addColorStop(0.35, C.skyMid);
      g.addColorStop(0.7, C.skyLow);
      g.addColorStop(1, C.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CSS_W, GROUND_Y);

      // Soleil
      const sunY = GROUND_Y * 0.68;
      const sunR = 48;
      const sunX = CSS_W * 0.72;

      // Glow
      const glow = ctx.createRadialGradient(sunX, sunY, 5, sunX, sunY, sunR * 2.5);
      glow.addColorStop(0, 'rgba(255, 235, 153, 0.55)');
      glow.addColorStop(0.5, 'rgba(255, 140, 66, 0.22)');
      glow.addColorStop(1, 'rgba(255, 140, 66, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, CSS_W, GROUND_Y);

      // Cercle soleil
      ctx.fillStyle = C.sun;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Lignes horizontales qui coupent le soleil (synthwave)
      ctx.fillStyle = g;
      for (let i = 0; i < 6; i++) {
        const y = sunY + sunR * 0.05 + i * 7;
        ctx.fillRect(sunX - sunR - 2, y, sunR * 2 + 4, 3);
      }
    }

    function drawStars() {
      stars.forEach(s => {
        s.t += 0.02;
        const alpha = 0.3 + Math.sin(s.t) * 0.3;
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawBuildings(arr, color, offset, baseY, hasWindows) {
      const totalW = arr[arr.length - 1].x + arr[arr.length - 1].w + 200;
      arr.forEach(b => {
        let x = b.x - (offset % totalW);
        // Wrap x dans la plage visible
        while (x < -200) x += totalW;
        while (x > CSS_W + 200) x -= totalW;

        if (x + b.w > -20 && x < CSS_W + 20) {
          ctx.fillStyle = color;
          ctx.fillRect(x, baseY - b.h, b.w, b.h);

          if (hasWindows) {
            ctx.fillStyle = 'rgba(255, 46, 147, 0.55)';
            const cols = Math.floor(b.w / 8);
            const rows = Math.floor(b.h / 9);
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                if ((r + c + Math.floor(b.x / 10)) % 3 === 0) {
                  ctx.fillRect(x + c * 8 + 3, baseY - b.h + r * 9 + 4, 3, 4);
                }
              }
            }
          }
        }
      });
    }

    function drawPalm(x, baseY, h) {
      ctx.strokeStyle = C.palm;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.quadraticCurveTo(x + 5, baseY - h * 0.6, x - 2, baseY - h);
      ctx.stroke();

      const topX = x - 2;
      const topY = baseY - h;
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const angle = (i - 2) * 0.55;
        ctx.beginPath();
        ctx.moveTo(topX, topY);
        ctx.quadraticCurveTo(
          topX + Math.sin(angle) * 16,
          topY - 14,
          topX + Math.sin(angle) * 26,
          topY - 3 + Math.cos(angle) * 6
        );
        ctx.stroke();
      }
    }

    function drawPalms(offset) {
      const last = palms[palms.length - 1];
      const totalW = last.x + 200;
      palms.forEach(p => {
        let x = p.x - (offset % totalW);
        while (x < -200) x += totalW;
        while (x > CSS_W + 200) x -= totalW;
        if (x > -50 && x < CSS_W + 50) {
          drawPalm(x, GROUND_Y, p.h);
        }
      });
    }

    function drawGround() {
      // Sol
      const g = ctx.createLinearGradient(0, GROUND_Y, 0, CSS_H);
      g.addColorStop(0, '#1a0b2e');
      g.addColorStop(1, '#0d0221');
      ctx.fillStyle = g;
      ctx.fillRect(0, GROUND_Y, CSS_W, CSS_H - GROUND_Y);

      // Ligne néon horizontale
      ctx.strokeStyle = C.neonPink;
      ctx.lineWidth = 2;
      ctx.shadowColor = C.neonPink;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(CSS_W, GROUND_Y);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Lignes de grille néon en perspective (défilement)
      ctx.strokeStyle = 'rgba(255, 46, 147, 0.35)';
      ctx.lineWidth = 1;
      const baseX = -(offGround % 60);
      for (let i = -1; i < CSS_W / 60 + 2; i++) {
        const x = baseX + i * 60;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y + 3);
        ctx.lineTo(x + 35, CSS_H);
        ctx.stroke();
      }

      // Ligne horizontale cyan
      ctx.strokeStyle = 'rgba(0, 255, 240, 0.18)';
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y + 22);
      ctx.lineTo(CSS_W, GROUND_Y + 22);
      ctx.stroke();
    }

    function drawCube() {
      if (gameOver) return;
      ctx.save();
      ctx.translate(cube.x + CUBE_SIZE / 2, cube.y + CUBE_SIZE / 2);
      ctx.rotate(cube.rot);

      ctx.shadowColor = C.neonPink;
      ctx.shadowBlur = 20;

      const grad = ctx.createLinearGradient(-CUBE_SIZE/2, -CUBE_SIZE/2, CUBE_SIZE/2, CUBE_SIZE/2);
      grad.addColorStop(0, C.cubeHi);
      grad.addColorStop(1, C.cube);
      ctx.fillStyle = grad;
      ctx.fillRect(-CUBE_SIZE/2, -CUBE_SIZE/2, CUBE_SIZE, CUBE_SIZE);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(-CUBE_SIZE/2, -CUBE_SIZE/2, CUBE_SIZE, CUBE_SIZE);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(-CUBE_SIZE/2 + 3, -CUBE_SIZE/2 + 3, CUBE_SIZE - 6, 4);

      ctx.restore();
    }

    function drawObstacles() {
      obstacles.forEach(o => {
        if (o.type === 'spike') {
          ctx.fillStyle = C.neonCyan;
          ctx.shadowColor = C.neonCyan;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y);
          ctx.lineTo(o.x + o.w, o.y + o.h);
          ctx.lineTo(o.x, o.y + o.h);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.beginPath();
          ctx.moveTo(o.x + o.w / 2, o.y + 4);
          ctx.lineTo(o.x + o.w - 5, o.y + o.h - 2);
          ctx.lineTo(o.x + 5, o.y + o.h - 2);
          ctx.closePath();
          ctx.fill();
        } else if (o.type === 'double') {
          ctx.fillStyle = C.neonCyan;
          ctx.shadowColor = C.neonCyan;
          ctx.shadowBlur = 12;
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
          // Block (cube néon)
          ctx.fillStyle = '#1a0b2e';
          ctx.fillRect(o.x, o.y, o.w, o.h);
          ctx.strokeStyle = C.neonCyan;
          ctx.lineWidth = 2;
          ctx.shadowColor = C.neonCyan;
          ctx.shadowBlur = 10;
          ctx.strokeRect(o.x + 1, o.y + 1, o.w - 2, o.h - 2);
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(0, 255, 240, 0.3)';
          ctx.lineWidth = 1;
          for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(o.x, o.y + i * o.h / 3);
            ctx.lineTo(o.x + o.w, o.y + i * o.h / 3);
            ctx.stroke();
          }
        }
      });
    }

    function updateParticles(dt) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= dt * 1.5;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawFrame(dt) {
      ctx.fillStyle = '#0a0215';
      ctx.fillRect(0, 0, CSS_W, CSS_H);
      drawSky();
      drawStars();
      drawBuildings(farBuildings, C.buildingFar, offFar, GROUND_Y, false);
      drawBuildings(midBuildings, C.buildingMid, offMid, GROUND_Y, true);
      drawPalms(offPalm);
      drawGround();
      drawObstacles();
      drawCube();
      updateParticles(dt);
    }

    /* ---------- GAME OVER OVERLAY ---------- */
    function drawGameOverOverlay() {
      ctx.fillStyle = 'rgba(10, 2, 33, 0.78)';
      ctx.fillRect(0, 0, CSS_W, CSS_H);

      ctx.textAlign = 'center';

      ctx.shadowColor = C.neonPink;
      ctx.shadowBlur = 24;
      ctx.fillStyle = C.neonPink;
      ctx.font = 'bold 26px Inter, sans-serif';
      ctx.fillText('GAME OVER', CSS_W / 2, CSS_H / 2 - 35);
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px Inter, sans-serif';
      ctx.fillText(`Score : ${scoreEl.textContent}`, CSS_W / 2, CSS_H / 2 + 5);

      ctx.fillStyle = C.neonCyan;
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`${Math.floor(distance / 10)} m parcourus`, CSS_W / 2, CSS_H / 2 + 28);

      ctx.fillStyle = '#9ba1b3';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Appuie sur "Lancer" pour rejouer', CSS_W / 2, CSS_H / 2 + 58);
    }

    /* ---------- BOUCLE ---------- */
    let deathTimer = 0;

    function loop(t) {
      const dt = Math.min(32, t - lastTime) / 16.67;
      lastTime = t;
      time += dt * 16.67;

      // Mode game over : animation d'explosion + overlay
      if (gameOver) {
        updateParticles(0.016 * dt);
        drawFrame(dt);
        drawGameOverOverlay();
        deathTimer += dt;
        // Continue d'animer pendant 3 secondes max
        if (deathTimer < 3 * 60) {
          gameLoopId = requestAnimationFrame(loop);
        } else {
          stopGame();
        }
        return;
      }

      if (!isPaused) {
        // Vitesse progressive
        speed = BASE_SPEED + Math.min(5, distance / 600);

        // Physique cube
        cube.vy += GRAVITY * dt;
        cube.y += cube.vy * dt;

        if (cube.y >= GROUND_Y - CUBE_SIZE) {
          cube.y = GROUND_Y - CUBE_SIZE;
          cube.vy = 0;
          cube.onGround = true;
          // Snap rotation au multiple de 90°
          const snap = Math.round(cube.rot / (Math.PI / 2)) * (Math.PI / 2);
          cube.rot += (snap - cube.rot) * 0.35 * dt;
        } else {
          cube.onGround = false;
          cube.rot += 0.16 * dt;
        }

        // Mouvement obstacles
        const moveX = speed * dt;
        obstacles.forEach(o => o.x -= moveX);
        obstacles = obstacles.filter(o => o.x + o.w > -60);

        // Parallax
        offFar    += moveX * 0.12;
        offMid    += moveX * 0.28;
        offPalm   += moveX * 0.45;
        offGround += moveX * 1.0;

        distance += moveX;

        // Score
        const s = Math.floor(distance / 10);
        if (s > parseInt(scoreEl.textContent)) updateScore(s);

        // Spawn
        spawnTimer += dt * 16.67;
        if (spawnTimer > nextSpawn) {
          spawnObstacle();
          spawnTimer = 0;
          const minI = Math.max(550, 900 - distance / 12);
          nextSpawn = minI + Math.random() * 500;
        }

        // Collision
        if (checkCollision()) {
          endGame();
        }

        // Traînée du cube
        if (Math.random() < 0.35 && cube.onGround) {
          particles.push({
            x: cube.x + 2,
            y: cube.y + CUBE_SIZE - 6 + Math.random() * 10,
            vx: -1 - Math.random() * 2.5,
            vy: (Math.random() - 0.5) * 2,
            life: 0.7,
            color: C.neonCyan,
            size: 2
          });
        }
      }

      // Dessin
      drawFrame(dt);

      // Pause
      if (isPaused) {
        ctx.fillStyle = 'rgba(10, 2, 33, 0.72)';
        ctx.fillRect(0, 0, CSS_W, CSS_H);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSE', CSS_W / 2, CSS_H / 2);
      }

      // Distance en haut à droite
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.floor(distance / 10)} m`, CSS_W - 8, 16);

      gameLoopId = requestAnimationFrame(loop);
    }

    lastTime = performance.now();
    loop(lastTime);
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
      setTimeout(startGame, 40);
    });
  });

  startBtn?.addEventListener('click', () => {
    setTimeout(startGame, 20);
  });

  /* ============================================================
     PAUSE QUAND ON QUITTE L'ONGLET
     ============================================================ */
  const gamesTabEl = document.getElementById('tab-games');
  if (gamesTabEl) {
    const tabObserver = new MutationObserver(() => {
      const isActive = gamesTabEl.classList.contains('active');
      if (!isActive && gameLoopId) stopGame();
      if (isActive && !gameLoopId) setTimeout(drawIdleScreen, 50);
    });
    tabObserver.observe(gamesTabEl, { attributes: true, attributeFilter: ['class'] });
  }

  /* ============================================================
     INIT
     ============================================================ */
  function drawIdleScreen() {
    resizeCanvas();
    ctx.fillStyle = '#0a0b10';
    ctx.fillRect(0, 0, CSS_W, CSS_H);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Appuie sur "Lancer" pour jouer', CSS_W / 2, CSS_H / 2);
  }
  setTimeout(drawIdleScreen, 100);
  showHighScore();

  console.log('%c🎮 Jeux Arcade chargés (3 jeux : Tetris, Snake, Miami Dash)', 'color:#10a37f;font-weight:bold;font-size:13px');
});