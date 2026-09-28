/* ============================================================
   LAUGRASTOK — Jeux Arcade (VERSION ULTRA-FIABLE)
   Tetris + Snake + Miami Dash
   ============================================================ */

(function () {
  'use strict';

  // On attend DOMContentLoaded (pas 'load' qui peut ne jamais venir dans l'APK)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  function boot() {
    console.log('🎮 BOOT games.js');

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) { console.log('❌ Pas de canvas'); return; }

    const ctx = canvas.getContext('2d');
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
    try {
      const s = localStorage.getItem('laugra_high_scores');
      if (s) highs = Object.assign(highs, JSON.parse(s));
    } catch (e) {}

    /* ============================================================
       CANVAS
       ============================================================ */
    function setupCanvas() {
      const parent = canvas.parentElement;
      const parentW = parent ? parent.clientWidth : 300;

      let size = Math.min(parentW - 24, 220);
      if (size < 180) size = 180;

      CW = size;
      CH = size;

      canvas.width = CW * DPR;
      canvas.height = CH * DPR;
      canvas.style.width = CW + 'px';
      canvas.style.height = CH + 'px';

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(DPR, DPR);
    }

    /* ============================================================
       SCORE
       ============================================================ */
    function setScore(n) {
      if (scoreEl) scoreEl.textContent = n;
      if (n > (highs[currentGame] || 0)) {
        highs[currentGame] = n;
        try { localStorage.setItem('laugra_high_scores', JSON.stringify(highs)); } catch (e) {}
      }
      if (highScoreEl) highScoreEl.textContent = highs[currentGame] || 0;
    }

    function getScore() {
      return parseInt((scoreEl && scoreEl.textContent) || '0', 10) || 0;
    }

    function showHigh() {
      if (highScoreEl) highScoreEl.textContent = highs[currentGame] || 0;
    }

    /* ============================================================
       BOUCLE (setInterval = fiable partout)
       ============================================================ */
    function stopLoop() {
      if (loopTimer) {
        clearInterval(loopTimer);
        loopTimer = null;
      }
    }

    function runLoop(drawFn, updateFn, fps) {
      stopLoop();
      let lastT = performance.now();
      loopTimer = setInterval(function () {
        const now = performance.now();
        const dt = Math.min(50, now - lastT);
        lastT = now;
        if (!paused && updateFn) updateFn(dt);
        if (drawFn) drawFn(dt);
      }, 1000 / (fps || 60));
    }

    /* ============================================================
       DÉMARRAGE
       ============================================================ */
    function start() {
      console.log('▶️ START jeu :', currentGame);
      stopLoop();
      paused = false;
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
      stopLoop();
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
       GAME OVER OVERLAY
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
      ctx.fillText('Score : ' + score, CW / 2, CH / 2 + 5);
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

      if (up) up.onclick = function () { fn(type === 'tetris' ? 'ROTATE' : (type === 'dash' ? 'JUMP' : 'UP')); };
      if (down) down.onclick = function () { fn('DOWN'); };
      if (left) left.onclick = function () { fn('LEFT'); };
      if (right) right.onclick = function () { fn('RIGHT'); };
      if (rot) rot.onclick = function () { fn(type === 'tetris' ? 'DROP' : (type === 'dash' ? 'JUMP' : 'ROTATE')); };

      // Clavier (PC)
      if (window._lsKeyHandler) window.removeEventListener('keydown', window._lsKeyHandler);
      window._lsKeyHandler = function (e) {
        const gt = document.getElementById('tab-games');
        if (!gt || !gt.classList.contains('active')) return;
        let a = null;
        if (e.key === 'ArrowUp') a = type === 'tetris' ? 'ROTATE' : (type === 'dash' ? 'JUMP' : 'UP');
        else if (e.key === 'ArrowDown') a = 'DOWN';
        else if (e.key === 'ArrowLeft') a = 'LEFT';
        else if (e.key === 'ArrowRight') a = 'RIGHT';
        else if (e.key === ' ') a = type === 'tetris' ? 'DROP' : (type === 'dash' ? 'JUMP' : 'ROTATE');
        else if (e.key === 'p' || e.key === 'P') { paused = !paused; return; }
        if (a) { e.preventDefault(); fn(a); }
      };
      window.addEventListener('keydown', window._lsKeyHandler);

      // Tap canvas : uniquement pour Miami Dash
      canvas.onpointerdown = (type === 'dash')
        ? function (e) { e.preventDefault(); fn('JUMP'); }
        : null;
    }

    /* ============================================================
       TETRIS
       ============================================================ */
    function tetris() {
      const COLS = 10, ROWS = 16;
      const B = Math.floor(Math.min((CW - 16) / COLS, (CH - 16) / ROWS));
      const BW = COLS * B, BH = ROWS * B;
      const OX = (CW - BW) / 2, OY = (CH - BH) / 2;

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

      let board = [];
      for (let r = 0; r < ROWS; r++) {
        const row = [];
        for (let c = 0; c < COLS; c++) row.push(null);
        board.push(row);
      }

      let piece = null;
      let dropT = 0, dropInt = 550;
      let lines = 0, level = 1;
      let dead = false;

      function newPiece() {
        const i = Math.floor(Math.random() * SHAPES.length);
        const sh = [];
        for (let r = 0; r < SHAPES[i].length; r++) sh.push(SHAPES[i][r].slice());
        return { shape: sh, color: COLORS[i], x: Math.floor((COLS - sh[0].length) / 2), y: 0 };
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
        for (let r = 0; r < piece.shape.length; r++) {
          for (let c = 0; c < piece.shape[r].length; c++) {
            if (piece.shape[r][c] && piece.y + r >= 0) {
              board[piece.y + r][piece.x + c] = piece.color;
            }
          }
        }
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) {
          let full = true;
          for (let c = 0; c < COLS; c++) if (!board[r][c]) { full = false; break; }
          if (full) {
            board.splice(r, 1);
            const empty = [];
            for (let c = 0; c < COLS; c++) empty.push(null);
            board.unshift(empty);
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
        const rot = [];
        for (let c = 0; c < old[0].length; c++) {
          const row = [];
          for (let r = old.length - 1; r >= 0; r--) row.push(old[r][c]);
          rot.push(row);
        }
        piece.shape = rot;
        const kicks = [0, 1, -1, 2, -2];
        for (let i = 0; i < kicks.length; i++) {
          piece.x += kicks[i];
          if (!collide(piece)) return;
          piece.x -= kicks[i];
        }
        piece.shape = old;
      }

      function softDrop() {
        if (dead) return;
        piece.y++;
        if (collide(piece)) { piece.y--; lock(); }
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
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + 3, y + 1);
        ctx.arcTo(x + B - 1, y + 1, x + B - 1, y + B - 1, 3);
        ctx.arcTo(x + B - 1, y + B - 1, x + 1, y + B - 1, 3);
        ctx.arcTo(x + 1, y + B - 1, x + 1, y + 1, 3);
        ctx.arcTo(x + 1, y + 1, x + B - 1, y + 1, 3);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(x + 3, y + 3, B - 6, 4);
        ctx.restore();
      }

      piece = newPiece();

      function update(dt) {
        if (dead) return;
        dropT += dt;
        if (dropT > dropInt) { softDrop(); dropT = 0; }
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
      const COLS = 15, ROWS = 15;
      const T = Math.floor(Math.min((CW - 16) / COLS, (CH - 16) / ROWS));
      const BW = COLS * T, BH = ROWS * T;
      const OX = (CW - BW) / 2, OY = (CH - BH) / 2;

      let body = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }];
      let dir = { x: 1, y: 0 };
      let nextDir = { x: 1, y: 0 };
      let moveT = 0, moveInt = 180;
      let dead = false;
      let food = null;

      function makeFood() {
        const free = [];
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            let here = false;
            for (let i = 0; i < body.length; i++) {
              if (body[i].x === x && body[i].y === y) { here = true; break; }
            }
            if (!here) free.push({ x: x, y: y });
          }
        }
        if (free.length === 0) return { x: 0, y: 0 };
        return free[Math.floor(Math.random() * free.length)];
      }
      food = makeFood();

      function endSnake() {
        dead = true;
        stopLoop();
        drawGameOver(getScore(), 'Longueur : ' + body.length);
      }

      function step() {
        dir = { x: nextDir.x, y: nextDir.y };
        const head = { x: body[0].x + dir.x, y: body[0].y + dir.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) return endSnake();
        for (let i = 0; i < body.length - 1; i++) {
          if (body[i].x === head.x && body[i].y === head.y) return endSnake();
        }

        body.unshift(head);
        if (head.x === food.x && head.y === food.y) {
          setScore(getScore() + 10);
          food = makeFood();
          if (moveInt > 80) moveInt -= 4;
        } else {
          body.pop();
        }
      }

      function action(a) {
        if (dead || paused) return;
        if (a === 'UP' && dir.y === 0) nextDir = { x: 0, y: -1 };
        else if (a === 'DOWN' && dir.y === 0) nextDir = { x: 0, y: 1 };
        else if (a === 'LEFT' && dir.x === 0) nextDir = { x: -1, y: 0 };
        else if (a === 'RIGHT' && dir.x === 0) nextDir = { x: 1, y: 0 };
      }
      bindButtons(action, 'snake');

      function update(dt) {
        if (dead) return;
        moveT += dt;
        if (moveT > moveInt) { moveT = 0; step(); }
      }

      function draw() {
        ctx.fillStyle = '#0a0b10';
        ctx.fillRect(0, 0, CW, CH);

        ctx.fillStyle = 'rgba(255,255,255,0.02)';
        for (let y = 0; y < ROWS; y++) {
          for (let x = 0; x < COLS; x++) {
            if ((x + y) % 2 === 0) ctx.fillRect(OX + x * T, OY + y * T, T, T);
          }
        }

        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(OX + 0.5, OY + 0.5, BW - 1, BH - 1);

        // Food
        const fx = OX + food.x * T + T / 2;
        const fy = OY + food.y * T + T / 2;
        ctx.save();
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(fx, fy, T / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Snake
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
          ctx.moveTo(x + r + 1, y + 1);
          ctx.arcTo(x + T - 1, y + 1, x + T - 1, y + T - 1, r);
          ctx.arcTo(x + T - 1, y + T - 1, x + 1, y + T - 1, r);
          ctx.arcTo(x + 1, y + T - 1, x + 1, y + 1, r);
          ctx.arcTo(x + 1, y + 1, x + T - 1, y + 1, r);
          ctx.closePath();
          ctx.fill();
          ctx.restore();

          if (isHead) {
            ctx.fillStyle = '#fff';
            const ex = x + T / 2, ey = y + T / 2;
            const off = T * 0.18;
            const er = Math.max(1.2, T * 0.08);
            let e1x = ex, e1y = ey, e2x = ex, e2y = ey;
            if (dir.x === 1) { e1x = ex + off; e1y = ey - off; e2x = ex + off; e2y = ey + off; }
            else if (dir.x === -1) { e1x = ex - off; e1y = ey - off; e2x = ex - off; e2y = ey + off; }
            else if (dir.y === 1) { e1x = ex - off; e1y = ey + off; e2x = ex + off; e2y = ey + off; }
            else { e1x = ex - off; e1y = ey - off; e2x = ex + off; e2y = ey - off; }
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
        top: '#1a0b2e', mid: '#c94b8c', low: '#ff9a56', bot: '#ffd166',
        sun: '#ffeb99', far: '#2a1552', near: '#1e0f3f',
        pink: '#ff2e93', cyan: '#00fff0', hi: '#ff7ab8'
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
      let offFar = 0, offMid = 0, offPalm = 0;

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
          arr.push({ x: x, w: w, h: h });
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
            x: cube.x + SIZE / 2, y: cube.y + SIZE,
            vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2,
            life: 1, color: C.pink
          });
        }
      }

      function spawnObs() {
        const r = Math.random();
        let w, h, type;
        if (r < 0.5) { type = 'spike'; w = 20; h = 22; }
        else if (r < 0.8) { type = 'block'; w = 26; h = 26; }
        else { type = 'double'; w = 40; h = 22; }
        obs.push({ x: CW + 30, y: GY - h, w: w, h: h, type: type });
      }

      function hit(o) {
        const cx = cube.x + 3, cy = cube.y + 3;
        const cw = SIZE - 6, ch = SIZE - 6;
        return cx < o.x + o.w - 2 && cx + cw > o.x + 2 && cy < o.y + o.h && cy + ch > o.y;
      }

      function action(a) {
        if (a === 'UP' || a === 'JUMP' || a === 'ROTATE' || a === 'DROP') jump();
      }
      bindButtons(action, 'dash');

      function drawSky() {
        const g = ctx.createLinearGradient(0, 0, 0, GY);
        g.addColorStop(0, C.top);
        g.addColorStop(0.4, C.mid);
        g.addColorStop(0.7, C.low);
        g.addColorStop(1, C.bot);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, CW, GY);

        const sx = CW * 0.7, sy = GY * 0.65, r = 28;
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

      function drawB(arr, color, offset, windows) {
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
                  ctx.fillRect(x + c * 8 + 3, GY - b.h + r * 9 + 4, 3, 4);
                }
              }
            }
          }
        }
      }

      function drawPalms(offset) {
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

          const tx = x - 2, ty = GY - p.h;
          ctx.lineWidth = 2;
          for (let k = 0; k < 5; k++) {
            const a = (k - 2) * 0.55;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.quadraticCurveTo(tx + Math.sin(a) * 14, ty - 12, tx + Math.sin(a) * 22, ty - 3 + Math.cos(a) * 5);
            ctx.stroke();
          }
        }
      }

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

      function drawParts() {
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.2;
          p.life -= 0.03;
          if (p.life <= 0) { parts.splice(i, 1); continue; }
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

      function update(dt) {
        if (dead) return;
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

        const s = Math.floor(dist / 10);
        if (s > getScore()) setScore(s);

        spawnT += dt;
        if (spawnT > nextSpawn) {
          spawnObs();
          spawnT = 0;
          const base = Math.max(900, 1500 - dist / 15);
          nextSpawn = base + Math.random() * 500;
        }

        for (let i = 0; i < obs.length; i++) {
          if (hit(obs[i])) {
            dead = true;
            stopLoop();
            for (let k2 = 0; k2 < 24; k2++) {
              parts.push({
                x: cube.x + SIZE / 2, y: cube.y + SIZE / 2,
                vx: (Math.random() - 0.5) * 9,
                vy: (Math.random() - 0.5) * 9 - 2,
                life: 1,
                color: Math.random() < 0.5 ? C.pink : C.cyan
              });
            }
            setTimeout(function () {
              drawGameOver(getScore(), Math.floor(dist / 10) + ' m');
            }, 300);
            break;
          }
        }
      }

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
       ONGLETS DE JEU — DIRECT, SANS DÉLAI
       ============================================================ */
    const gameBtns = document.querySelectorAll('.game-tab-btn');
    console.log('🎮 Onglets trouvés :', gameBtns.length);

    for (let i = 0; i < gameBtns.length; i++) {
      (function (btn) {
        btn.onclick = function (e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('👆 CLIC :', btn.dataset.game);

          for (let j = 0; j < gameBtns.length; j++) {
            gameBtns[j].classList.remove('active');
          }
          btn.classList.add('active');
          currentGame = btn.dataset.game;
          start();
        };
      })(gameBtns[i]);
    }

    /* ============================================================
       PAUSE quand on quitte l'onglet Jeux
       ============================================================ */
    const gamesTab = document.getElementById('tab-games');
    let lastWasActive = false;

    setInterval(function () {
      if (!gamesTab) return;
      const active = gamesTab.classList.contains('active');
      if (active !== lastWasActive) {
        lastWasActive = active;
        if (!active) {
          stopLoop();
        } else if (!loopTimer) {
          idle();
        }
      }
    }, 300);

    /* ============================================================
       INITIAL
       ============================================================ */
    setupCanvas();
    setTimeout(idle, 100);
    showHigh();

    console.log('✅ Games prêt !');
  }
})();