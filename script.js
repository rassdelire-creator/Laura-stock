// ==========================================================================
// 1. DONNÉES DES APPLICATIONS & SUGGESTIONS
// ==========================================================================
const apps = [
{ name: "Rasstube", desc: "Plateforme vidéo personnalisée pour gérer mes projets YouTube.", icon: "🎬", link: "#" },
{ name: "Mood Recommender", desc: "Recommande de la musique et des animés selon mon humeur.", icon: "🎭", link: "#" },
{ name: "Space Explorer 2D", desc: "Jeu mobile pixel art d'exploration spatiale.", icon: "🚀", link: "#" },
{ name: "Générateur de Flemme", desc: "Application drôle pour générer des excuses convaincantes.", icon: "🛋️", link: "#" },
{ name: "Wattpad Story Planner", desc: "Outil de structuration de chapitres pour mes romans Web.", icon: "✍️", link: "#" },
{ name: "Shorts & TikTok Ideas", desc: "Carnet d'idées de concepts vidéo viraux et scripts.", icon: "📱", link: "#" }
];

const suggestions = [
"Une appli qui simule un faux appel de ton chat pour annuler un rendez-vous ennuyeux.",
"Un bouton 'Anti-Procrastination' qui t'ouvre un onglet d'exercices d'étirement obligatoires.",
"Une app de météo qui te donne les prévisions uniquement sous forme de citations dramatiques d'animés.",
"Un traducteur d'aboiements de chien vers du langage juridique très soutenu.",
"Une application qui transforme tes to-do lists en combats de boss style RPG.",
"Un générateur d'idées d'histoires Wattpad utilisant uniquement des objets de ta chambre."
];

// ==========================================================================
// 2. GESTION DU THÈME (DARK / LIGHT MODE)
// ==========================================================================
const themeToggleBtn = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// Charger le thème sauvegardé
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
document.documentElement.setAttribute('data-theme', savedTheme);
themeIcon.textContent = savedTheme === 'light' ? '☀️' : '🌙';
}

themeToggleBtn.addEventListener('click', () => {
const currentTheme = document.documentElement.getAttribute('data-theme');
let newTheme = 'light';

if (currentTheme === 'light') {
newTheme = 'dark';
themeIcon.textContent = '🌙';
} else {
themeIcon.textContent = '☀️';
}

document.documentElement.setAttribute('data-theme', newTheme);
localStorage.setItem('theme', newTheme);
});

// ==========================================================================
// 3. AFFICHAGE DYNAMIQUE DES CARTES D'APPS
// ==========================================================================
function renderAppsList(items) {
const container = document.getElementById("appsDrawer");
container.innerHTML = "";

if (items.length === 0) {
container.innerHTML = <p style="grid-column: 1/-1; text-align: center; opacity: 0.7;">Aucune application ne correspond à ta recherche 🔍</p>;
return;
}

items.forEach((app, index) => {
const card = document.createElement("div");
card.className = "app-card";
card.style.animationDelay = ${index * 0.07}s; // Animation en cascade (Staggered)

card.innerHTML = `
  <div class="icon">${app.icon}</div>
  <h3>${app.name}</h3>
  <p>${app.desc}</p>
`;

card.onclick = () => {
  if (app.link && app.link !== "#") {
    window.open(app.link, "_blank");
  } else {
    alert(`Ouverture de ${app.name} ! (Lien de démonstration)`);
  }
};

container.appendChild(card);
});
}

// ==========================================================================
// 4. RECHERCHE EN TEMPS RÉEL
// ==========================================================================
document.getElementById("searchInput").addEventListener("input", (e) => {
const search = e.target.value.toLowerCase().trim();
const filtered = apps.filter(a =>
a.name.toLowerCase().includes(search) ||
a.desc.toLowerCase().includes(search)
);
renderAppsList(filtered);
});

// ==========================================================================
// 5. BOUTON SUGGESTION DRÔLE
// ==========================================================================
document.getElementById("suggestBtn").addEventListener("click", () => {
const randomIndex = Math.floor(Math.random() * suggestions.length);
const textElement = document.getElementById("suggestionText");
textElement.innerText = suggestions[randomIndex];
});

// Initialisation au chargement de la page
renderAppsList(apps);