/* ============================================================
   LAUGRASTOK — Jeux Arcade
   Tetris + Snake + Miami Dash
   VERSION CORRIGÉE / STABLE MOBILE + APK
   ============================================================ */

(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  function boot() {
    console.log('🎮 BOOT games.js');

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.log('❌ gameCanvas introuvable'); return; }

    const ctx = canvas.getContext('2d');
    if (!ctx) { console.log('❌ Canvas 2D indisponible'); return; }

    const scoreEl = document.getElementById('gameScore');
    const highScoreEl = document.getElementById('gameHighScore');
    const startBtn = document.getElementById('startGameBtn');

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let CW = 220;
    let CH = 220;
    let currentGame = 'tetris';
    let loopTimer = null;
    let paused = false;

    let highs = { tetris: 0, snake: 0, dash: 0 };

    /* ============================================================
       HIGH SCORES
       ============================================================ */
    try {
      const saved = localStorage.getItem('laugra_high_scores');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          highs = Object.assign(highs, parsed);
        }
      }
    } catch (e) {
      console.warn('⚠️ Impossible de charger les scores');
    }

    function saveHighScores() {
      try {
        localStorage.setItem('laugra_high_scores', JSON.stringify(highs));
      } catch (e) {
        console.warn('⚠️ Impossible de sauvegarder les scores');
      }
    }

    /* ============================================================
       CANVAS
       ============================================================ */
    function setupCanvas() {
      const parent = canvas.parentElement;
      const parentW = parent ? parent.clientWidth : 300;

      let size = Math.min(parentW - 24, 220);
      if (!Number.isFinite(size) || size < 180) size = 180;

      CW = size;
      CH = size;

      canvas.width = Math.round(CW * DPR);
      canvas.height = Math.round(CH * DPR);
      canvas.style.width = CW + 'px';
      canvas.style.height = CH + 'px';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    }

    /* ============================================================
       SCORE
       ============================================================ */
    function getScore() {
      if (!scoreEl) return 0;
      const value = parseInt(scoreEl.textContent, 10);
      return Number.isFinite(value) ? value : 0;
    }

    function setScore(value) {
      const n = Math.max(0, Math.floor(Number(value) || 0));
      if (scoreEl) scoreEl.textContent = String(n);

      const oldHigh = Number(highs[currentGame]) || 0;
      if (n > oldHigh) {
        highs[currentGame] = n;
        saveHighScores();
      }

      if (highScoreEl) {
        highScoreEl.textContent = String(Number(highs[currentGame]) || 0);
      }
    }

    function showHigh() {
      if (highScoreEl) {
        highScoreEl.textContent = String(Number(highs[currentGame]) || 0);
      }
    }

    /* ============================================================
       BOUCLE DE JEU
       ============================================================ */
    function stopLoop() {
      if (loopTimer !== null) {
        clearInterval(loopTimer);
        loopTimer = null;
      }
    }

    function runLoop(drawFn, updateFn, fps) {
      stopLoop();
      let lastT = performance.now();
      const interval = 1000 / (fps || 60);

      loopTimer = setInterval(function () {
        const now = performance.now();
        let dt = now - lastT;
        lastT = now;
        dt = Math.min(50, Math.max(0, dt));

        if (!paused && updateFn) updateFn(dt);
        if (drawFn) drawFn(dt);
      }, interval);
    }

    /* ============================================================
       NETTOYAGE
       ============================================================ */
    function cleanupControls() {
      if (window._lsKeyHandler) {
        window.removeEventListener('keydown', window._lsKeyHandler);
        window._lsKeyHandler = null;
      }
      canvas.onpointerdown = null;
    }

    function resetGameState() {
      stopLoop();
      cleanupControls();
      paused = false;
    }

    /* ============================================================
       DÉMARRAGE
       ============================================================ */
    function start() {
      console.log('▶️ START :', currentGame);
      resetGameState();
      setupCanvas();
      setScore(0);
      showHigh();

      if (currentGame === 'tetris') tetris();
      else if (currentGame === 'snake') snake();
      else if (currentGame === 'dash') dash();
    }

    /* ============================================================
       ÉCRAN D'ATTENTE
       ============================================================ */
    function idle() {
      resetGameState();
      setupCanvas();

      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, CW, CH);

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.font = 'bold 44px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎮', CW / 2, CH / 2 - 10);

      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '13px Inter, sans-serif';
      ctx.fillText('Appuie sur "Lancer"', CW / 2, CH / 2 + 35);
    }

    /* ============================================================
       GAME OVER
       ============================================================ */
    function drawGameOver(score, extra) {
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.fillRect(0, 0, CW, CH);

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CW / 2, CH / 2 - 25);

      ctx.fillStyle = '#10a37f';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.fillText('Score : ' + Math.floor(score), CW / 2, CH / 2 + 5);

      if (extra) {
        ctx.fillStyle = '#9ba1b3';
        ctx.font = '12px Inter, sans-serif';
        ctx.fillText(extra, CW / 2, CH / 2 + 28);
      }

      ctx.fillStyle = '#9ba1b3';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('Appuie sur "Lancer"', CW / 2, CH / 2 + 52);
    }

    /* ============================================================
       CONTRÔLES
       ============================================================ */
    function bindButtons(fn, type) {
      const up = document.getElementById('btnUp');
      const down = document.getElementById('btnDown');
      const left = document.getElementById('btnLeft');
      const right = document.getElementById('btnRight');
      const rot = document.getElementById('btnRotate');

      cleanupControls();

      function send(action) {
        if (typeof fn === 'function') fn(action);
      }

      if (up) up.onclick = function (e) {
        e.preventDefault();
        send(type === 'tetris' ? 'ROTATE' : type === 'dash' ? 'JUMP' : 'UP');
      };

      if (down) down.onclick = function (e) {
        e.preventDefault();
        send('DOWN');
      };

      if (left) left.onclick = function (e) {
        e.preventDefault();
        send('LEFT');
      };

      if (right) right.onclick = function (e) {
        e.preventDefault();
        send('RIGHT');
      };

      if (rot) rot.onclick = function (e) {
        e.preventDefault();
        send(type === 'tetris' ? 'DROP' : type === 'dash' ? 'JUMP' : 'ROTATE');
      };

      /* --- CLAVIER --- */
      window._lsKeyHandler = function (e) {
        const gamesTab = document.getElementById('tab-games');
        if (!gamesTab || !gamesTab.classList.contains('active')) return;

        let action = null;

        if (e.key === 'ArrowUp') {
          action = type === 'tetris' ? 'ROTATE' : type === 'dash' ? 'JUMP' : 'UP';
        } else if (e.key === 'ArrowDown') {
          action = 'DOWN';
        } else if (e.key === 'ArrowLeft') {
          action = 'LEFT';
        } else if (e.key === 'ArrowRight') {
          action = 'RIGHT';
        } else if (e.key === ' ' || e.code === 'Space') {
          action = type === 'tetris' ? 'DROP' : type === 'dash' ? 'JUMP' : 'ROTATE';
        } else if (e.key === 'p' || e.key === 'P') {
          paused = !paused;
          return;
        }

        if (action) {
          e.preventDefault();
          send(action);
        }
      };
      window.addEventListener('keydown', window._lsKeyHandler);

      /* --- TOUCH / POINTER (uniquement Miami Dash) --- */
      if (type === 'dash') {
        canvas.onpointerdown = function (e) {
          e.preventDefault();
          send('JUMP');
        };
      }
    }

    /* ============================================================
       TETRIS
       ============================================================ */
    function tetris() {
      const COLS = 10;
      const ROWS = 16;
      const B = Math.floor(Math.min((CW - 16) / COLS, (CH - 16) / ROWS));
      const BW = COLS * B;
      const BH = ROWS * B;
      const OX = (CW - BW) / 2;
      const OY = (CH - BH) / 2;

      const SHAPES = [
        [[1, 1, 1, 1]],
        [[1, 1], [1, 1]],
        [[0, 1, 0], [1, 1, 1]],
        [[0, 1, 1], [1, 1, 0]],
        [[1, 1, 0], [0, 1, 1]],
        [[1, 0, 0], [1, 1, 1]],
        [[0, 0, 1], [1, 1, 1]]
      ];

      const COLORS = [
        '#22d3ee', '#fbbf24', '#a855f7', '#10a37f',
        '#ef4444', '#3b82f6', '#f97316'
      ];

      const board = [];
      for (let r = 0; r < ROWS; r++) {
        board.push(new Array(COLS).fill(null));
      }

      let piece = null;
      let dropT = 0;
      let dropInt = 550;
      let lines = 0;
      let level = 1;
      let dead = false;

      function newPiece() {
        const i = Math.floor(Math.random() * SHAPES.length);
        const shape = SHAPES[i].map(function (row) { return row.slice(); });
        return {
          shape: shape,
          color: COLORS[i],
          x: Math.floor((COLS - shape[0].length) / 2),
          y: 0
        };
      }

      function collide(p) {
        for (let r = 0; r < p.shape.length; r++) {
          for (let c = 0; c < p.shape[r].length; c++) {
            if (!p.shape[r][c]) continue;
            const nx = p.x + c;
            const ny = p.y + r;
            if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
            if (ny >= 0 && board[ny][nx]) return true;
          }
        }
        return false;
      }

      function lock() {
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] && piece.y + r >= 0 && piece.y + r < ROWS) {
              board[piece.y + r][piece.x + c] = piece.color;
            }
          }
        }

        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          let full = true;
          for (let c = 0; c < COLS; c++) {
            if (!board[r][c]) { full = false; break; }
          }
          if (full) {
            board.splice(r, 1);
            board.unshift(new Array(COLS).fill(null));
            cleared++;
            r++;
          }
        }

        if (cleared > 0) {
          lines += cleared;
          const pts = [0, 100, 300, 500, 800][cleared] || 800;
          setScore(getScore() + pts * level);
          level = 1 + Math.floor(lines / 8);
          dropInt = Math.max(120, 550 - (level - 1) * 45);
        }

        piece = newPiece();
        if (collide(piece)) {
          dead = true;
          stopLoop();
          drawGameOver(getScore());
        }
      }

      function move(dx) {
        if (dead) return;
        piece.x += dx;
        if (collide(piece)) piece.x -= dx;
      }

      function rotatePiece() {
        if (dead) return;
        const old = piece.shape;
        const rotated = [];

        for (let c = 0; c < old[0].length; c++) {
          const row = [];
          for (let r = old.length - 1; r >= 0; r--) {
            row.push(old[r][c]);
          }
          rotated.push(row);
        }

        piece.shape = rotated;
        const originalX = piece.x;
        const kicks = [0, 1, -1, 2, -2];

        for (let i = 0; i < kicks.length; i++) {
          piece.x = originalX + kicks[i];
          if (!collide(piece)) return;
        }

        piece.x = originalX;
        piece.shape = old;
      }

      function softDrop() {
        if (dead) return;
        piece.y++;
        if (collide(piece)) {
          piece.y--;
          lock();
        }
        dropT = 0;
      }

      function hardDrop() {
        if (dead) return;
        while (!collide(piece)) piece.y++;
        piece.y--;
        lock();
        dropT = 0;
      }

      function action(a) {
        if (dead || paused) return;
        if (a === 'LEFT') move(-1);
        else if (a === 'RIGHT') move(1);
        else if (a === 'DOWN') softDrop();
        else if (a === 'ROTATE' || a === 'UP') rotatePiece();
        else if (a === 'DROP') hardDrop();
      }

      bindButtons(action, 'tetris');

      function drawBlock(x, y, color, glow) {
        ctx.save();
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 10;
        }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.roundRect(x + 1, y + 1, B - 2, B - 2, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x + 3, y + 3, Math.max(1, B - 6), 4);
        ctx.restore();
      }

      piece = newPiece();
      if (collide(piece)) {
        dead = true;
        drawGameOver(0);
        return;
      }

      function update(dt) {
        if (dead) return;
        dropT += dt;
        if (dropT >= dropInt) softDrop();
      }

      function draw() {
        ctx.fillStyle = '#0a0b10';
        ctx.fillRect(0, 0, CW, CH);

        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;

        for (let r = 0; r <= ROWS; r++) {
          ctx.beginPath();
          ctx.moveTo(OX, OY + r * B);
          ctx.lineTo(OX + BW, OY + r * B);
          ctx.stroke();
        }

        for (let c = 0; c <= COLS; c++) {
          ctx.beginPath();
          ctx.moveTo(OX + c * B, OY);
          ctx.lineTo(OX + c * B, OY + BH);
          ctx.stroke();
        }

        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (board[r][c]) drawBlock(OX + c * B, OY + r * B, board[r][c], false);
          }
        }

        if (piece && !dead) {
          for (let r = 0; r < piece.shape.length; r++) {
            for (let c = 0; c < piece.shape[r].length; c++) {
              if (piece.shape[r][c] && piece.y + r >= 0) {
                drawBlock(OX + (piece.x + c) * B, OY + (piece.y + r) * B, piece.color, true);
              }
            }
          }
        }

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Niv. ' + level, CW - 6, 15);

        if (paused && !dead) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, 0, CW, CH);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PAUSE', CW / 2, CH / 2);
        }
      }

      runLoop(draw, update, 60);
    }

    /* ============================================================
       SNAKE
       ============================================================ */
    function snake() {
      const COLS = 15;
      const ROWS = 15;
      const T = Math.floor(Math.min((CW - 16) / COLS, (CH - 16) / ROWS));
      const BW = COLS * T;
      const BH = ROWS * T;
      const OX = (CW - BW) / 2;
      const OY = (CH - BH) / 2;

      let body = [
        { x: 7, y: 7 },
        { x: 6, y: 7 },
        { x: 5, y: 7 }
      ];
      let dir = { x: 1, y: 0 };
      let nextDir = { x: 1, y: 0 };
      let moveT = 0;
      let moveInt = 180;
      let dead = false;
      let food = null;

      function makeFood() {
        const free = [];
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            let occupied = false;
            for (let i = 0; i < body.length; i++) {
              if (body[i].x === x && body[i].y === y) {
                occupied = true;
                break;
              }
            }
            if (!occupied) free.push({ x, y });
          }
        }
        if (!free.length) return null;
        return free[Math.floor(Math.random() * free.length)];
      }

      food = makeFood();

      function endSnake() {
        if (dead) return;
        dead = true;
        stopLoop();
        drawGameOver(getScore(), 'Longueur : ' + body.length);
      }

      function step() {
        if (dead) return;
        dir = { x: nextDir.x, y: nextDir.y };

        const head = {
          x: body[0].x + dir.x,
          y: body[0].y + dir.y
        };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          endSnake();
          return;
        }

        for (let i = 0; i < body.length - 1; i++) {
          if (body[i].x === head.x && body[i].y === head.y) {
            endSnake();
            return;
          }
        }

        body.unshift(head);

        if (food && head.x === food.x && head.y === food.y) {
          setScore(getScore() + 10);
          food = makeFood();
          moveInt = Math.max(80, moveInt - 4);
          if (!food) endSnake();
        } else {
          body.pop();
        }
      }

      function action(a) {
        if (dead || paused) return;

        if (a === 'UP' && dir.y === 0 && nextDir.y === 0) {
          nextDir = { x: 0, y: -1 };
        } else if (a === 'DOWN' && dir.y === 0 && nextDir.y === 0) {
          nextDir = { x: 0, y: 1 };
        } else if (a === 'LEFT' && dir.x === 0 && nextDir.x === 0) {
          nextDir = { x: -1, y: 0 };
        } else if (a === 'RIGHT' && dir.x === 0 && nextDir.x === 0) {
          nextDir = { x: 1, y: 0 };
        }
      }

      bindButtons(action, 'snake');

      function update(dt) {
        if (dead) return;
        moveT += dt;
        if (moveT >= moveInt) {
          moveT = 0;
          step();
        }
      }

      function draw() {
        ctx.fillStyle = '#0a0b10';
        ctx.fillRect(0, 0, CW, CH);

        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if ((x + y) % 2 === 0) {
              ctx.fillRect(OX + x * T, OY + y * T, T, T);
            }
          }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.strokeRect(OX + 0.5, OY + 0.5, BW - 1, BH - 1);

        /* FOOD */
        if (food) {
          const fx = OX + food.x * T + T / 2;
          const fy = OY + food.y * T + T / 2;

          ctx.save();
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(fx, fy, Math.max(2, T / 2 - 3), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        /* SNAKE */
        for (let i = 0; i < body.length; i++) {
          const x = OX + body[i].x * T;
          const y = OY + body[i].y * T;
          const isHead = i === 0;

          ctx.save();
          if (isHead) {
            ctx.shadowColor = '#10a37f';
            ctx.shadowBlur = 10;
            ctx.fillStyle = '#34d8a8';
          } else {
            ctx.fillStyle = '#10a37f';
          }

          const r = isHead ? 6 : 4;
          ctx.beginPath();
          ctx.roundRect(x + 1, y + 1, T - 2, T - 2, r);
          ctx.fill();
          ctx.restore();

          if (isHead) {
            ctx.fillStyle = '#fff';
            const ex = x + T / 2;
            const ey = y + T / 2;
            const off = T * 0.18;
            const er = Math.max(1.2, T * 0.08);

            let e1x = ex, e1y = ey, e2x = ex, e2y = ey;

            if (dir.x === 1) {
              e1x = ex + off; e1y = ey - off;
              e2x = ex + off; e2y = ey + off;
            } else if (dir.x === -1) {
              e1x = ex - off; e1y = ey - off;
              e2x = ex - off; e2y = ey + off;
            } else if (dir.y === 1) {
              e1x = ex - off; e1y = ey + off;
              e2x = ex + off; e2y = ey + off;
            } else {
              e1x = ex - off; e1y = ey - off;
              e2x = ex + off; e2y = ey - off;
            }

            ctx.beginPath(); ctx.arc(e1x, e1y, er, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(e2x, e2y, er, 0, Math.PI * 2); ctx.fill();
          }
        }

        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('Long. ' + body.length, CW - 6, 15);

        if (paused && !dead) {
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(0, 0, CW, CH);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PAUSE', CW / 2, CH / 2);
        }
      }

      runLoop(draw, update, 60);
    }

    /* ============================================================
       MIAMI DASH
       ============================================================ */
    function dash() {
      const GY = CH * 0.75;
      const GRAV = 0.55;
      const JUMP = -9.5;
      const SIZE = 22;

      const C = {
        top: '#1a0b2e',
        mid: '#c94b8c',
        low: '#ff9a56',
        bot: '#ffd166',
        sun: '#ffeb99',
        far: '#2a1552',
        near: '#1e0f3f',
        pink: '#ff2e93',
        cyan: '#00fff0',
        hi: '#ff7ab8'
      };

      let speed = 3.4;
      let cube = { x: 45, y: GY - SIZE, vy: 0, onGround: true, rot: 0 };
      let obs = [];
      let parts = [];
      let stars = [];
      let dist = 0;
      let dead = false;
      let spawnT = 0;
      let nextSpawn = 1400;
      let offFar = 0;
      let offMid = 0;
      let offPalm = 0;
      let deathTimer = null;

      /* --- ÉTOILES --- */
      for (let i = 0; i < 28; i++) {
        stars.push({
          x: Math.random() * CW,
          y: Math.random() * GY * 0.5,
          s: Math.random() * 1.3 + 0.4,
          t: Math.random() * Math.PI * 2
        });
      }

      function genB(minH, maxH, minW, maxW) {
        const arr = [];
        let x = -50;
        while (x < CW + 400) {
          const w = minW + Math.random() * (maxW - minW);
          const h = minH + Math.random() * (maxH - minH);
          arr.push({ x, w, h });
          x += w + 8 + Math.random() * 12;
        }
        return arr;
      }

      const farB = genB(30, 70, 20, 35);
      const midB = genB(50, 100, 25, 45);

      const palms = [];
      let px = -30;
      while (px < CW + 400) {
        palms.push({ x: px, h: 45 + Math.random() * 25 });
        px += 90 + Math.random() * 60;
      }

      function jump() {
        if (dead || !cube.onGround) return;
        cube.vy = JUMP;
        cube.onGround = false;

        for (let i = 0; i < 4; i++) {
          parts.push({
            x: cube.x + SIZE / 2,
            y: cube.y + SIZE,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 2,
            life: 1,
            color: C.pink
          });
        }
      }

      function spawnObs() {
        const r = Math.random();
        let w, h, type;

        if (r < 0.5) { type = 'spike'; w = 20; h = 22; }
        else if (r < 0.8) { type = 'block'; w = 26; h = 26; }
        else { type = 'double'; w = 40; h = 22; }

        obs.push({ x: CW + 30, y: GY - h, w, h, type });
      }

      function hit(o) {
        const cx = cube.x + 3;
        const cy = cube.y + 3;
        const cw = SIZE - 6;
        const ch = SIZE - 6;

        return (
          cx < o.x + o.w - 2 &&
          cx + cw > o.x + 2 &&
          cy < o.y + o.h &&
          cy + ch > o.y
        );
      }

      function action(a) {
        if (a === 'UP' || a === 'JUMP' || a === 'ROTATE' || a === 'DROP') {
          jump();
        }
      }

      bindButtons(action, 'dash');

      /* --- FIN DASH --- */
      function endDash() {
        if (dead) return;
        dead = true;

        for (let i = 0; i < 24; i++) {
          parts.push({
            x: cube.x + SIZE / 2,
            y: cube.y + SIZE / 2,
            vx: (Math.random() - 0.5) * 9,
            vy: (Math.random() - 0.5) * 9 - 2,
            life: 1,
            color: Math.random() < 0.5 ? C.pink : C.cyan
          });
        }

        if (deathTimer) clearTimeout(deathTimer);

        deathTimer = setTimeout(function () {
          stopLoop();
          draw();
          drawGameOver(getScore(), Math.floor(dist / 10) + ' m');
          deathTimer = null;
        }, 600);
      }

      /* --- CIEL --- */
      function drawSky() {
        const g = ctx.createLinearGradient(0, 0, 0, GY);
        g.addColorStop(0, C.top);
        g.addColorStop(0.4, C.mid);
        g.addColorStop(0.7, C.low);
        g.addColorStop(1, C.bot);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CW, GY);

        const sx = CW * 0.7;
        const sy = GY * 0.65;
        const r = 28;

        const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, r * 2.5);
        glow.addColorStop(0, 'rgba(255,235,153,0.5)');
        glow.addColorStop(1, 'rgba(255,140,66,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, CW, GY);

        ctx.fillStyle = C.sun;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = g;
        for (let i = 0; i < 5; i++) {
          ctx.fillRect(sx - r - 2, sy + 4 + i * 6, r * 2 + 4, 3);
        }
      }

      /* --- IMMEUBLES --- */
      function drawB(arr, color, offset, windows) {
        if (!arr.length) return;
        const last = arr[arr.length - 1];
        const total = last.x + last.w + 200;

        for (let i = 0; i < arr.length; i++) {
          const b = arr[i];
          let x = b.x - (offset % total);

          while (x < -200) x += total;
          while (x > CW + 200) x -= total;

          if (x + b.w < -10 || x > CW + 10) continue;

          ctx.fillStyle = color;
          ctx.fillRect(x, GY - b.h, b.w, b.h);

          if (windows) {
            ctx.fillStyle = 'rgba(255,46,147,0.55)';
            const cols = Math.floor(b.w / 8);
            const rows = Math.floor(b.h / 9);

            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                if ((r + c + Math.floor(b.x / 10)) % 3 === 0) {
                  ctx.fillRect(
                    x + c * 8 + 3,
                    GY - b.h + r * 9 + 4,
                    3, 4
                  );
                }
              }
            }
          }
        }
      }

      /* --- PALMIERS --- */
      function drawPalms(offset) {
        if (!palms.length) return;
        const last = palms[palms.length - 1];
        const total = last.x + 200;

        ctx.strokeStyle = '#08000f';
        ctx.lineCap = 'round';

        for (let i = 0; i < palms.length; i++) {
          const p = palms[i];
          let x = p.x - (offset % total);

          while (x < -100) x += total;
          while (x > CW + 100) x -= total;

          if (x < -40 || x > CW + 40) continue;

          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, GY);
          ctx.quadraticCurveTo(x + 4, GY - p.h * 0.6, x - 2, GY - p.h);
          ctx.stroke();

          const tx = x - 2;
          const ty = GY - p.h;

          ctx.lineWidth = 2;
          for (let k = 0; k < 5; k++) {
            const a = (k - 2) * 0.55;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(
              tx + Math.sin(a) * 14,
              ty - 12,
              tx + Math.sin(a) * 22,
              ty - 3 + Math.cos(a) * 5
            );
            ctx.stroke();
          }
        }
      }

      /* --- SOL --- */
      function drawGround() {
        const g = ctx.createLinearGradient(0, GY, 0, CH);
        g.addColorStop(0, '#1a0b2e');
        g.addColorStop(1, '#0d0221');
        ctx.fillStyle = g;
        ctx.fillRect(0, GY, CW, CH - GY);

        ctx.strokeStyle = C.pink;
        ctx.lineWidth = 2;
        ctx.shadowColor = C.pink;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(0, GY);
        ctx.lineTo(CW, GY);
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255,46,147,0.28)';
        ctx.lineWidth = 1;
        const baseX = -(dist % 45);

        for (let i = -1; i < CW / 45 + 2; i++) {
          const x = baseX + i * 45;
          ctx.beginPath();
          ctx.moveTo(x, GY + 2);
          ctx.lineTo(x + 25, CH);
          ctx.stroke();
        }
      }

      /* --- CUBE --- */
      function drawCube() {
        if (dead) return;

        ctx.save();
        ctx.translate(cube.x + SIZE / 2, cube.y + SIZE / 2);
        ctx.rotate(cube.rot);

        ctx.shadowColor = C.pink;
        ctx.shadowBlur = 14;

        const g = ctx.createLinearGradient(-SIZE / 2, -SIZE / 2, SIZE / 2, SIZE / 2);
        g.addColorStop(0, C.hi);
        g.addColorStop(1, C.pink);

        ctx.fillStyle = g;
        ctx.fillRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-SIZE / 2, -SIZE / 2, SIZE, SIZE);

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(-SIZE / 2 + 3, -SIZE / 2 + 3, SIZE - 6, 3);

        ctx.restore();
      }

      /* --- OBSTACLES --- */
      function drawObs() {
        for (let i = 0; i < obs.length; i++) {
          const o = obs[i];

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

            for (let k = 0; k < 2; k++) {
              const sx = o.x + k * (o.w / 2);
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
        }
      }

      /* --- PARTICULES --- */
      function updateParts(dt) {
        const k = dt / 16.67;

        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.x += p.vx * k;
          p.y += p.vy * k;
          p.vy += 0.2 * k;
          p.life -= 0.03 * k;
          if (p.life <= 0) parts.splice(i, 1);
        }
      }

      function drawParts() {
        for (let i = 0; i < parts.length; i++) {
          const p = parts[i];
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

      /* --- UPDATE --- */
      function update(dt) {
        if (dead) {
          updateParts(dt);
          return;
        }

        const k = dt / 16.67;
        speed = 3.4 + Math.min(4, dist / 800);

        cube.vy += GRAV * k;
        cube.y += cube.vy * k;

        if (cube.y >= GY - SIZE) {
          cube.y = GY - SIZE;
          cube.vy = 0;
          cube.onGround = true;

          const snap = Math.round(cube.rot / (Math.PI / 2)) * (Math.PI / 2);
          cube.rot += (snap - cube.rot) * 0.3 * k;
        } else {
          cube.onGround = false;
          cube.rot += 0.14 * k;
        }

        const moveX = speed * k;

        for (let i = 0; i < obs.length; i++) obs[i].x -= moveX;
        obs = obs.filter(function (o) { return o.x + o.w > -50; });

        offFar += moveX * 0.1;
        offMid += moveX * 0.25;
        offPalm += moveX * 0.4;
        dist += moveX;

        const score = Math.floor(dist / 10);
        if (score > getScore()) setScore(score);

        spawnT += dt;
        if (spawnT >= nextSpawn) {
          spawnObs();
          spawnT = 0;
          const base = Math.max(900, 1500 - dist / 15);
          nextSpawn = base + Math.random() * 500;
        }

        for (let i = 0; i < obs.length; i++) {
          if (hit(obs[i])) {
            endDash();
            break;
          }
        }

        updateParts(dt);
      }

      /* --- DRAW --- */
      function draw() {
        ctx.fillStyle = '#0a0215';
        ctx.fillRect(0, 0, CW, CH);

        drawSky();

        for (let i = 0; i < stars.length; i++) {
          const st = stars[i];
          st.t += 0.02;
          ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + Math.sin(st.t) * 0.3) + ')';
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.s, 0, Math.PI * 2);
          ctx.fill();
        }

        drawB(farB, C.far, offFar, false);
        drawB(midB, C.near, offMid, true);
        drawPalms(offPalm);
        drawGround();
        drawObs();
        drawCube();
        drawParts();

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(Math.floor(dist / 10) + ' m', CW - 6, 15);

        if (paused && !dead) {
          ctx.fillStyle = 'rgba(10,2,33,0.7)';
          ctx.fillRect(0, 0, CW, CH);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 18px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('PAUSE', CW / 2, CH / 2);
        }
      }

      runLoop(draw, update, 60);
    }

    /* ============================================================
       BOUTON LANCER
       ============================================================ */
    if (startBtn) {
      startBtn.onclick = function (e) {
        e.preventDefault();
        start();
      };
    }

    /* ============================================================
       ONGLETS
       ============================================================ */
    const gameBtns = document.querySelectorAll('.game-tab-btn');
    console.log('🎮 Onglets trouvés :', gameBtns.length);

    for (let i = 0; i < gameBtns.length; i++) {
      (function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();

          const game = btn.dataset.game;
          console.log('👆 CLIC :', game);

          if (game !== 'tetris' && game !== 'snake' && game !== 'dash') {
            console.warn('⚠️ Jeu inconnu :', game);
            return;
          }

          for (let j = 0; j < gameBtns.length; j++) {
            gameBtns[j].classList.remove('active');
          }
          btn.classList.add('active');

          currentGame = game;
          start();
        };
      })(gameBtns[i]);
    }

    /* ============================================================
       SURVEILLANCE ONGLET JEUX
       ============================================================ */
    const gamesTab = document.getElementById('tab-games');
    let lastWasActive = gamesTab ? gamesTab.classList.contains('active') : false;

    setInterval(function () {
      if (!gamesTab) return;

      const active = gamesTab.classList.contains('active');
      if (active === lastWasActive) return;

      lastWasActive = active;

      if (!active) {
        stopLoop();
        paused = false;
      } else {
        idle();
        showHigh();
      }
    }, 300);

    /* ============================================================
       RESIZE
       ============================================================ */
    let resizeTimer = null;

    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        setupCanvas();
        if (!loopTimer) idle();
      }, 100);
    });

    /* ============================================================
       INITIAL
       ============================================================ */
    setupCanvas();
    setTimeout(function () {
      idle();
      showHigh();
    }, 100);

    console.log('✅ LAUGRASTOK Games prêt !');
  }
})();