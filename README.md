# 🚀 LaugraStok v2.0

Une app web/PWA pour capturer tes idées : notes, vocaux, photos, coffre secret, espace crush, et mini-jeux (Tetris + Snake).

---

## 📂 Structure des fichiers

```
LaugraStok/
├── index.html          # Structure de l'app
├── style.css           # Design (glassmorphism Apple)
├── script.js           # Logique principale
├── games.js            # Jeux Tetris + Snake
├── sw.js               # Service Worker (offline)
├── sw-register.js      # Enregistrement du SW
├── manifest.json       # Manifest PWA
└── icon.png            # Icône 512×512
```

---

## 🧪 Test en local

1. Ouvre un terminal dans le dossier
2. Lance un serveur local (obligatoire pour le Service Worker) :
   ```bash
   # Avec Python
   python -m http.server 8080
   
   # Avec Node.js
   npx serve
   ```
3. Ouvre `http://localhost:8080` dans Chrome

⚠️ **Le micro ne marche qu'en HTTPS ou localhost.**

---

## 📱 Convertir en APK avec htmltoapk

### Étapes :
1. Zippe tous les fichiers (`.html`, `.css`, `.js`, `.json`, `icon.png`)
2. Va sur **[htmltoapk](https://htmltoapk.com)** (ou équivalent)
3. Upload ton ZIP
4. Configure :
   - **Nom de l'app** : LaugraStok
   - **Package** : `com.tonnom.laugrastok`
   - **Icône** : ton `icon.png` (512×512)
   - **Version** : 2.0
5. Génère l'APK et installe

### ⚠️ Points importants pour l'APK :
- Le **micro** et la **caméra** doivent être autorisés dans le `AndroidManifest.xml` généré :
  ```xml
  <uses-permission android:name="android.permission.RECORD_AUDIO"/>
  <uses-permission android:name="android.permission.CAMERA"/>
  <uses-permission android:name="android.permission.INTERNET"/>
  ```
- Si l'APK n'autorise pas ces permissions, le micro **ne marchera pas**.

---

## 💰 Ajouter Google AdSense (plus tard)

### 1. Obtenir ton code
Sur [Google AdSense](https://adsense.google.com) → **Annonces** → **Par bloc d'annonces** → copie le code.

### 2. Ajouter le script AdSense dans `index.html`
Dans le `<head>`, ajoute :
```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
```
Remplace `ca-pub-XXXXXXXXXXXXXXXX` par ton ID.

### 3. Placer un bloc de pub (exemple : sous le dashboard)
Dans `index.html`, juste après la `</section>` du dashboard :
```html
<!-- EMPLACEMENT PUB -->
<div class="ad-container">
  <ins class="adsbygoogle"
       style="display:block"
       data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
       data-ad-slot="1234567890"
       data-ad-format="auto"
       data-full-width-responsive="true"></ins>
</div>
```

Et dans `sw-register.js` (ou un petit script à part) :
```javascript
document.querySelectorAll('.adsbygoogle').forEach(() => {
  (adsbygoogle = window.adsbygoogle || []).push({});
});
```

### 4. Style CSS pour l'emplacement pub
Ajoute dans `style.css` :
```css
.ad-container {
  margin: 14px 0;
  min-height: 60px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
```

⚠️ **Attention** : AdSense en APK WebView **ne marche pas toujours**. Pour une vraie monétisation, préfère **AdMob** avec un wrapper natif (ex: [Median.co](https://median.co) ou Capacitor).

---

## 🎮 Modifier les jeux

### Pour ajouter un nouveau jeu :
1. Ouvre `games.js`
2. Ajoute un bouton dans `index.html` dans `.games-tabs` :
   ```html
   <button class="game-tab-btn" data-game="pong">Pong</button>
   ```
3. Dans `games.js`, dans `startGame()`, ajoute :
   ```javascript
   if (currentGame === 'pong') startPong();
   ```
4. Crée une fonction `startPong()` sur le modèle de `startTetris()` ou `startSnake()`.

### Pour supprimer un jeu :
1. Supprime son `<button>` dans `index.html`
2. Supprime la ligne correspondante dans `startGame()` de `games.js`
3. Supprime la fonction `startXXX()` (optionnel — pas obligatoire)

### Pour modifier un jeu existant :
Tout est dans `games.js`, séparé en 2 sections claires :
- `function startTetris()` — Tetris
- `function startSnake()` — Snake

Chaque fonction est **indépendante**, tu peux modifier l'une sans casser l'autre.

---

## 🐛 Bugs connus / limites

- 📦 **localStorage** limité à ~5 Mo → si tu ajoutes trop de photos/vocaux, ça peut saturer
- 🎙️ **Micro** peut être refusé dans certains WebView → vérifie les permissions Android
- 🌐 **Offline** : fonctionne seulement si HTTPS

---

## 📝 Changelog

### v2.0
- ✨ Design glassmorphism Apple (vagues + gouttes de pluie)
- 🗂️ Navigation par onglets (Accueil · Favoris · Coffre · Jeux · Réglages)
- 🎨 Toutes les icônes en SVG (plus d'emojis moches)
- 🎤 Micro réparé (support multi-format, gestion erreurs)
- 🎮 Tetris + Snake recréés (HD Retina, fluides, particules)
- 💕 Section Crush ajoutée
- 📤 Partage (natif + code + téléchargement)
- 📥 Recevoir une idée via code
- ⚙️ Service Worker avec vrai cache offline
- 🐛 Nombreux bugs corrigés

### v1.2
- Version initiale