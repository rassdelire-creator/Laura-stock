/* --- GESTION DES ONGLETS --- */
function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));

  if(tab === 'vault') {
    document.querySelectorAll('.nav-btn')[0].classList.add('active');
    document.getElementById('vault-section').classList.add('active');
  } else {
    document.querySelectorAll('.nav-btn')[1].classList.add('active');
    document.getElementById('tetris-section').classList.add('active');
  }
}

/* --- LOGIQUE DU COFFRE-FORT --- */
const CORRECT_PIN = "1234"; // Code d'accès par défaut
let currentInput = "";

function pressPin(num) {
  if (currentInput.length < 4) {
    currentInput += num;
    updatePinDisplay();
  }
}

function clearPin() {
  currentInput = "";
  updatePinDisplay();
  document.getElementById('vault-error').textContent = "";
}

function updatePinDisplay() {
  const display = document.getElementById('pin-display');
  display.textContent = "•".repeat(currentInput.length) || "••••";
}

function unlockVault() {
  if (currentInput === CORRECT_PIN) {
    document.getElementById('vault-lock').classList.add('hidden');
    document.getElementById('vault-secret').classList.remove('hidden');
    clearPin();
  } else {
    document.getElementById('vault-error').textContent = "Code incorrect ! Recommencez.";
    currentInput = "";
    updatePinDisplay();
  }
}

function lockVault() {
  document.getElementById('vault-secret').classList.add('hidden');
  document.getElementById('vault-lock').classList.remove('hidden');
}

/* --- LOGIQUE TETRIS CORRIGÉE --- */
const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
context.scale(20, 20);

// Matrice du plateau (12 colonnes x 20 lignes)
const arena = createMatrix(12, 20);

const colors = [
  null,
  '#ef4444', // I
  '#3b82f6', // L
  '#f59e0b', // J
  '#10b981', // O
  '#ec4899', // Z
  '#8b5cf6', // S
  '#06b6d4'  // T
];

const player = {
  pos: {x: 0, y: 0},
  matrix: null,
  score: 0
};

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function createPiece(type) {
  if (type === 'I') {
    return [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]];
  } else if (type === 'L') {
    return [[0, 2, 0], [0, 2, 0], [0, 2, 2]];
  } else if (type === 'J') {
    return [[0, 3, 0], [0, 3, 0], [3, 3, 0]];
  } else if (type === 'O') {
    return [[4, 4], [4, 4]];
  } else if (type === 'Z') {
    return [[5, 5, 0], [0, 5, 5], [0, 0, 0]];
  } else if (type === 'S') {
    return [[0, 6, 6], [6, 6, 0], [0, 0, 0]];
  } else if (type === 'T') {
    return [[0, 7, 0], [7, 7, 7], [0, 0, 0]];
  }
}

// Fusion de la pièce bloquée dans la grille permanente
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// Gestion des collisions avec les bords et le sol
function collide(arena, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 &&
         (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

// Nettoyage SEULEMENT des lignes 100% remplies
function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y >= 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }
    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    player.score += rowCount * 10;
    rowCount *= 2;
  }
  updateScore();
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player); // On fixe la pièce au sol
    playerReset();        // Nouvelle pièce
    arenaSweep();         // Vérification des lignes
  }
  dropCounter = 0;
}

function playerMove(dir) {
  player.pos.x += dir;
  if (collide(arena, player)) {
    player.pos.x -= dir;
  }
}

function playerRotate() {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -1);
      player.pos.x = pos;
      return;
    }
  }
}

function rotate(matrix) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  matrix.forEach(row => row.reverse());
}

function playerReset() {
  const pieces = 'ILJOTSZ';
  player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
  player.pos.y = 0;
  player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);
  
  // Fin de partie
  if (collide(arena, player)) {
    arena.forEach(row => row.fill(0));
    player.score = 0;
    updateScore();
  }
}

function draw() {
  context.fillStyle = '#000';
  context.fillRect(0, 0, canvas.width, canvas.height);

  drawMatrix(arena, {x: 0, y: 0});
  drawMatrix(player.matrix, player.pos);
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function updateScore() {
  document.getElementById('score').textContent = player.score;
}

function resetGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0;
  updateScore();
  playerReset();
}

let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  requestAnimationFrame(update);
}

// Écouteurs de clavier
document.addEventListener('keydown', event => {
  if (!document.getElementById('tetris-section').classList.contains('active')) return;

  if (event.key === 'ArrowLeft') playerMove(-1);
  else if (event.key === 'ArrowRight') playerMove(1);
  else if (event.key === 'ArrowDown') playerDrop();
  else if (event.key === 'ArrowUp') playerRotate();
});

// Démarrage du moteur
playerReset();
update();
