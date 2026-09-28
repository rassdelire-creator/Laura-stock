/* ============================================================
   LAUGRASTOK v2.0 — Logique principale
   Bugs corrigés + navigation + crush + partage
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ============================================================
     1. UTILITAIRES
     ============================================================ */
  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const safeParse = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };

  const escapeHtml = (text) => {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const nowFR = () => new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  // Toast en HAUT de l'écran (jamais caché par la tab bar)
  const toast = (msg, type = 'info') => {
    const old = document.getElementById('lsToast');
    if (old) old.remove();

    const t = document.createElement('div');
    t.id = 'lsToast';
    t.textContent = msg;
    t.style.cssText = `
      position: fixed;
      top: calc(70px + env(safe-area-inset-top, 0px));
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: ${type === 'error' ? '#ef4444' : type === 'success' ? '#10a37f' : 'rgba(26,27,35,0.96)'};
      color: #fff;
      padding: 12px 18px;
      border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 0.85rem;
      font-weight: 500;
      box-shadow: 0 10px 40px rgba(0,0,0,.45);
      z-index: 2147483647;
      opacity: 0;
      transition: opacity .25s, transform .25s;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,.12);
      max-width: 88vw;
      text-align: center;
      pointer-events: none;
      line-height: 1.35;
    `;
    document.body.appendChild(t);

    requestAnimationFrame(() => {
      t.style.opacity = '1';
      t.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(-20px)';
      setTimeout(() => t.remove(), 300);
    }, 2400);
  };

  /* ============================================================
     2. SPLASH SCREEN
     ============================================================ */
  window.addEventListener('load', () => {
    setTimeout(() => {
      $('#splashScreen')?.classList.add('hidden');
    }, 700);
  });

  setTimeout(() => $('#splashScreen')?.classList.add('hidden'), 2000);

  /* ============================================================
     3. EFFET PLUIE
     ============================================================ */
  (function createRain() {
    const layer = $('#rainLayer');
    if (!layer) return;
    const DROP_COUNT = window.innerWidth < 480 ? 14 : 22;
    for (let i = 0; i < DROP_COUNT; i++) {
      const d = document.createElement('div');
      d.className = 'drop';
      d.style.left = Math.random() * 100 + '%';
      d.style.animationDuration = (2.5 + Math.random() * 2.5) + 's';
      d.style.animationDelay = (Math.random() * 5) + 's';
      d.style.opacity = 0.2 + Math.random() * 0.5;
      layer.appendChild(d);
    }
  })();

  /* ============================================================
     4. PROFIL UTILISATEUR
     ============================================================ */
  const profileModal = $('#profileModal');
  const saveProfileBtn = $('#saveProfileBtn');
  const userGreeting = $('#userGreeting');
  const profileSummary = $('#profileSummary');
  let userProfile = safeParse('laugra_user_profile', null);

  function renderProfile() {
    if (!userProfile) {
      profileModal.classList.remove('hidden');
      if (profileSummary) profileSummary.textContent = '—';
    } else {
      profileModal.classList.add('hidden');
      if (userGreeting)
        userGreeting.textContent = `Bienvenue, ${userProfile.name} ! ✨`;
      if (profileSummary)
        profileSummary.textContent = `${userProfile.name} · ${userProfile.age} ans`;
    }
  }

  saveProfileBtn?.addEventListener('click', () => {
    const name = $('#userNameInput').value.trim();
    const age = $('#userAgeInput').value.trim();
    if (!name || !age) return toast('Remplis ton prénom et ton âge !', 'error');
    userProfile = { name, age };
    localStorage.setItem('laugra_user_profile', JSON.stringify(userProfile));
    renderProfile();
    toast('Profil enregistré ✨', 'success');
  });

  $('#editProfileBtn')?.addEventListener('click', () => {
    $('#userNameInput').value = userProfile?.name || '';
    $('#userAgeInput').value = userProfile?.age || '';
    profileModal.classList.remove('hidden');
  });

  renderProfile();

  /* ============================================================
     5. THÈME SOMBRE / CLAIR
     ============================================================ */
  const themeToggle = $('#themeToggle');
  const themeToggle2 = $('#themeToggle2');
  let currentTheme = localStorage.getItem('laugra_theme') || 'dark';

  function applyTheme() {
    if (currentTheme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (themeToggle) themeToggle.innerHTML = '<svg class="ic"><use href="#i-sun"/></svg>';
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (themeToggle) themeToggle.innerHTML = '<svg class="ic"><use href="#i-moon"/></svg>';
    }
  }

  function switchTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('laugra_theme', currentTheme);
    applyTheme();
  }

  themeToggle?.addEventListener('click', switchTheme);
  themeToggle2?.addEventListener('click', switchTheme);
  applyTheme();

  /* ============================================================
     6. NAVIGATION PAR ONGLETS
     ============================================================ */
  const tabBar = $('#tabBar');
  const tabIndicator = $('#tabIndicator');
  const tabButtons = $$('.tab-btn');

  function switchTab(tabName) {
    const alreadyActive = document.querySelector('.tab-btn.active')?.dataset.tab === tabName;

    $$('.tab-page').forEach(p => p.classList.remove('active'));
    const page = document.getElementById(`tab-${tabName}`);
    if (page) page.classList.add('active');

    tabButtons.forEach((btn) => {
      const isActive = btn.dataset.tab === tabName;
      btn.classList.toggle('active', isActive);
      if (isActive && tabIndicator) {
        const btnWidth = btn.offsetWidth;
        const offset = btn.offsetLeft;
        tabIndicator.style.transform = `translateX(${offset - 8}px)`;
        tabIndicator.style.width = btnWidth + 'px';
      }
    });

    // Scroll en haut UNIQUEMENT si on change vraiment d'onglet
    if (!alreadyActive) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (tabName === 'fav') renderFavList();
    if (tabName === 'vault') resetVaultView();
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  setTimeout(() => switchTab('home'), 50);
  window.addEventListener('resize', () => {
    const active = $('.tab-btn.active');
    if (active) {
      const btnWidth = active.offsetWidth;
      const offset = active.offsetLeft;
      if (tabIndicator) {
        tabIndicator.style.transform = `translateX(${offset - 8}px)`;
        tabIndicator.style.width = btnWidth + 'px';
      }
    }
  });

  /* ============================================================
     7. VOCAL & CAMÉRA
     ============================================================ */
  const recordVoiceBtn = $('#recordVoiceBtn');
  const recordTimer = $('#recordTimer');
  const cameraInput = $('#cameraInput');
  const mediaStatus = $('#mediaStatus');

  let mediaRecorder = null;
  let audioChunks = [];
  let audioStream = null;
  let isRecording = false;
  let timerInterval = null;
  let secondsRecorded = 0;
  let currentAudioBase64 = null;
  let currentMediaBase64 = null;
  let currentMediaType = null;

  async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return toast('Ton navigateur ne supporte pas le micro.', 'error');
    }
    if (typeof MediaRecorder === 'undefined') {
      return toast('Enregistrement non supporté ici.', 'error');
    }

    try {
      audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
      mediaRecorder = mimeType
        ? new MediaRecorder(audioStream, { mimeType })
        : new MediaRecorder(audioStream);

      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          currentAudioBase64 = reader.result;
          if (mediaStatus) mediaStatus.textContent = '🎙️ Vocal prêt';
          toast('Vocal enregistré 🎙️', 'success');
        };
        reader.readAsDataURL(blob);
        if (audioStream) {
          audioStream.getTracks().forEach(t => t.stop());
          audioStream = null;
        }
      };

      mediaRecorder.start();
      isRecording = true;
      recordVoiceBtn.classList.add('recording');
      recordTimer.classList.remove('hidden');
      secondsRecorded = 0;
      recordTimer.textContent = '00:00';

      timerInterval = setInterval(() => {
        secondsRecorded++;
        const m = String(Math.floor(secondsRecorded / 60)).padStart(2, '0');
        const s = String(secondsRecorded % 60).padStart(2, '0');
        recordTimer.textContent = `${m}:${s}`;
        if (secondsRecorded >= 180) stopRecording();
      }, 1000);

    } catch (err) {
      console.error('Erreur micro:', err);
      if (err.name === 'NotAllowedError')
        toast('Autorise le micro dans les réglages.', 'error');
      else if (err.name === 'NotFoundError')
        toast('Aucun micro détecté.', 'error');
      else
        toast('Impossible d\'accéder au micro.', 'error');
    }
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch {}
    }
    isRecording = false;
    recordVoiceBtn.classList.remove('recording');
    recordTimer.classList.add('hidden');
    clearInterval(timerInterval);
    timerInterval = null;
  }

  recordVoiceBtn?.addEventListener('click', () => {
    if (!isRecording) startRecording();
    else stopRecording();
  });

  cameraInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast('Fichier trop gros (max 5 Mo).', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      currentMediaBase64 = reader.result;
      currentMediaType = file.type.startsWith('video') ? 'video' : 'image';
      if (mediaStatus)
        mediaStatus.textContent = currentMediaType === 'video' ? '🎥 Vidéo prête' : '📸 Photo prête';
    };
    reader.readAsDataURL(file);
  });

  /* ============================================================
     8. GESTION DES IDÉES
     ============================================================ */
  const addBtn = $('#addBtn');
  const ideasList = $('#ideasList');
  let ideas = safeParse('laugra_ideas', []);
  let currentFilter = 'all';

  const CATEGORY_LABELS = {
    app: 'Dev',
    story: 'Histoire',
    video: 'Vidéo',
    other: 'Autre'
  };

  function updateDashboard() {
    const totalEl = $('#totalIdeasCount');
    const favEl = $('#favIdeasCount');
    if (totalEl) totalEl.textContent = ideas.length;
    if (favEl) favEl.textContent = ideas.filter(i => i.fav).length;
  }

  function saveIdeas() {
    try {
      localStorage.setItem('laugra_ideas', JSON.stringify(ideas));
    } catch (err) {
      console.warn('localStorage plein :', err);
      toast('Stockage plein ! Supprime des médias.', 'error');
    }
  }

  function buildIdeaCard(idea) {
    const card = document.createElement('div');
    card.className = 'idea-card glass-card';

    let mediaHTML = '';
    if (idea.audio) {
      mediaHTML += `<audio controls preload="metadata" src="${idea.audio}"></audio>`;
    }
    if (idea.media) {
      mediaHTML += idea.mediaType === 'video'
        ? `<div class="media-preview"><video controls preload="metadata" src="${idea.media}"></video></div>`
        : `<div class="media-preview"><img src="${idea.media}" alt="Média" loading="lazy"/></div>`;
    }

    card.innerHTML = `
      <div class="idea-header">
        <span class="idea-title">
          <span class="fav-star ${idea.fav ? 'active' : ''}" data-fav="${idea.id}" title="Favori">
            <svg class="ic"><use href="#i-${idea.fav ? 'star-fill' : 'star'}"/></svg>
          </span>
          ${escapeHtml(idea.title)}
        </span>
        <span class="badge">${CATEGORY_LABELS[idea.category] || idea.category}</span>
      </div>
      ${idea.text ? `<div class="idea-content">${escapeHtml(idea.text)}</div>` : ''}
      ${mediaHTML}
      <div class="idea-footer">
        <span>${idea.date}</span>
        <div class="action-btns">
          <button class="share-btn" data-share="${idea.id}" title="Partager">
            <svg class="ic"><use href="#i-share"/></svg>
          </button>
          <button class="edit-btn" data-edit="${idea.id}" title="Éditer">
            <svg class="ic"><use href="#i-edit"/></svg>
          </button>
          <button class="delete-btn" data-del="${idea.id}" title="Supprimer">
            <svg class="ic"><use href="#i-trash"/></svg>
          </button>
        </div>
      </div>
    `;
    return card;
  }

  function renderIdeas() {
    if (!ideasList) return;
    ideasList.innerHTML = '';

    const search = ($('#searchInput')?.value || '').toLowerCase().trim();
    let filtered = ideas.filter(i =>
      (i.title || '').toLowerCase().includes(search) ||
      (i.text || '').toLowerCase().includes(search)
    );

    if (currentFilter === 'fav') {
      filtered = filtered.filter(i => i.fav);
    } else if (currentFilter !== 'all') {
      filtered = filtered.filter(i => i.category === currentFilter);
    }

    if (filtered.length === 0) {
      ideasList.innerHTML = `
        <div class="empty-state">
          <svg class="ic"><use href="#i-bulb"/></svg>
          <p>${search ? 'Aucun résultat.' : 'Aucune idée pour l\'instant.<br>Crée ta première ! ✨'}</p>
        </div>`;
      updateDashboard();
      return;
    }

    filtered.forEach(i => ideasList.appendChild(buildIdeaCard(i)));
    updateDashboard();
  }

  function renderFavList() {
    const favList = $('#favList');
    if (!favList) return;
    favList.innerHTML = '';

    const favs = ideas.filter(i => i.fav);
    if (favs.length === 0) {
      favList.innerHTML = `
        <div class="empty-state">
          <svg class="ic"><use href="#i-star"/></svg>
          <p>Aucun favori. Touche ★ sur une idée pour l'ajouter ici.</p>
        </div>`;
      return;
    }
    favs.forEach(i => favList.appendChild(buildIdeaCard(i)));
  }

  addBtn?.addEventListener('click', () => {
    const title = $('#ideaTitle').value.trim();
    const text = $('#ideaText').value.trim();

    if (!title && !text && !currentAudioBase64 && !currentMediaBase64) {
      return toast('Écris quelque chose ou ajoute un média !', 'error');
    }

    const newIdea = {
      id: Date.now(),
      title: title || 'Nouvelle idée',
      text,
      category: $('#ideaCategory').value,
      audio: currentAudioBase64,
      media: currentMediaBase64,
      mediaType: currentMediaType,
      fav: false,
      date: nowFR()
    };

    ideas.unshift(newIdea);
    saveIdeas();
    renderIdeas();

    $('#ideaTitle').value = '';
    $('#ideaText').value = '';
    if (cameraInput) cameraInput.value = '';
    currentAudioBase64 = null;
    currentMediaBase64 = null;
    currentMediaType = null;
    if (mediaStatus) mediaStatus.textContent = 'Aucun média';

    toast('Idée sauvegardée ✅', 'success');
  });

  document.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-fav]');
    if (favBtn) {
      const id = Number(favBtn.dataset.fav);
      const idea = ideas.find(i => i.id === id);
      if (idea) {
        idea.fav = !idea.fav;
        saveIdeas();
        renderIdeas();
        renderFavList();
      }
      return;
    }

    const shareBtn = e.target.closest('[data-share]');
    if (shareBtn && !shareBtn.closest('#shareModal')) {
      const id = Number(shareBtn.dataset.share);
      openShareModal(id);
      return;
    }

    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      const id = Number(editBtn.dataset.edit);
      editIdea(id);
      return;
    }

    const delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      const id = Number(delBtn.dataset.del);
      if (confirm('Supprimer cette idée ?')) {
        ideas = ideas.filter(i => i.id !== id);
        saveIdeas();
        renderIdeas();
        renderFavList();
        toast('Idée supprimée', 'success');
      }
      return;
    }
  });

  function editIdea(id) {
    const idea = ideas.find(i => i.id === id);
    if (!idea) return;

    const newTitle = prompt('Modifier le titre :', idea.title);
    if (newTitle === null) return;
    const newText = prompt('Modifier le contenu :', idea.text || '');
    if (newText === null) return;

    idea.title = newTitle.trim() || 'Sans titre';
    idea.text = newText.trim();
    saveIdeas();
    renderIdeas();
    renderFavList();
    toast('Idée modifiée ✏️', 'success');
  }

  $$('.tag-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tag-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderIdeas();
    });
  });

  $('#searchInput')?.addEventListener('input', renderIdeas);

  const prompts = [
    "Une appli mobile qui prédit la météo selon l'humeur 🌤️",
    "Un script de vidéo Short sur un mystère du Tokuverse 🎬",
    "Un jeu 2D pixel art où le héros utilise la foudre ⚡",
    "Un concept de chaîne YouTube spécialisé dans les théories Manga 📚",
    "Une histoire fantasy d'un phénix ressuscité en détective 🔥",
    "Une app qui transforme tes rêves en comics 🎨",
    "Un podcast sur les théories folles de l'univers 🎙️",
    "Un site qui mélange recettes et culture africaine 🍲",
    "Une app qui te challenge à créer 1 idée par jour 💡"
  ];

  $('#randomPromptBtn')?.addEventListener('click', () => {
    const p = prompts[Math.floor(Math.random() * prompts.length)];
    $('#ideaTitle').value = 'Idée Flash ⚡';
    $('#ideaText').value = p;
    document.querySelector('.add-idea-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  /* ============================================================
     9. COFFRE SECRET (PIN)
     ============================================================ */
  const pinInput = $('#pinInput');
  const pinInstruction = $('#pinInstruction');
  const pinArea = $('#pinArea');
  const secretContent = $('#secretContent');
  const unlockSecretBtn = $('#unlockSecretBtn');

  let savedPin = localStorage.getItem('laugra_secret_pin') || null;
  let secretIdeas = safeParse('laugra_secret_ideas', []);

  function resetVaultView() {
    if (!pinArea || !secretContent) return;
    pinArea.classList.remove('hidden');
    secretContent.classList.add('hidden');
    if (pinInput) pinInput.value = '';
    if (pinInstruction) {
      pinInstruction.textContent = savedPin
        ? 'Entre ton code PIN à 6 chiffres :'
        : 'Crée ton code PIN à 6 chiffres :';
    }
    if (unlockSecretBtn) {
      unlockSecretBtn.textContent = savedPin ? 'Déverrouiller' : 'Créer le code PIN';
    }
  }

  unlockSecretBtn?.addEventListener('click', () => {
    const entered = pinInput.value.trim();
    if (entered.length !== 6 || !/^\d+$/.test(entered)) {
      return toast('Code à 6 chiffres requis !', 'error');
    }

    if (!savedPin) {
      savedPin = entered;
      localStorage.setItem('laugra_secret_pin', savedPin);
      toast('PIN enregistré 🔒', 'success');
    } else if (entered !== savedPin) {
      return toast('Code PIN incorrect', 'error');
    }

    pinArea.classList.add('hidden');
    secretContent.classList.remove('hidden');
    renderSecretIdeas();
  });

  $('#addSecretBtn')?.addEventListener('click', () => {
    const title = $('#secretTitle').value.trim();
    const text = $('#secretText').value.trim();
    if (!title && !text) return toast('Rien à sauvegarder', 'error');

    secretIdeas.unshift({
      id: Date.now(),
      title: title || 'Secret',
      text,
      date: nowFR()
    });
    localStorage.setItem('laugra_secret_ideas', JSON.stringify(secretIdeas));
    renderSecretIdeas();
    $('#secretTitle').value = '';
    $('#secretText').value = '';
    toast('Ajouté au coffre 🔒', 'success');
  });

  function renderSecretIdeas() {
    const container = $('#secretIdeasList');
    if (!container) return;
    container.innerHTML = '';

    if (secretIdeas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="ic"><use href="#i-lock"/></svg>
          <p>Ton coffre est vide.</p>
        </div>`;
      return;
    }

    secretIdeas.forEach(i => {
      const card = document.createElement('div');
      card.className = 'idea-card glass-card';
      card.innerHTML = `
        <div class="idea-header">
          <span class="idea-title">
            <svg class="ic ic-sm"><use href="#i-lock"/></svg>
            ${escapeHtml(i.title)}
          </span>
        </div>
        ${i.text ? `<div class="idea-content">${escapeHtml(i.text)}</div>` : ''}
        <div class="idea-footer">
          <span>${i.date}</span>
          <button class="delete-btn" data-secret-del="${i.id}">
            <svg class="ic"><use href="#i-trash"/></svg>
          </button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  document.addEventListener('click', (e) => {
    const del = e.target.closest('[data-secret-del]');
    if (del) {
      const id = Number(del.dataset.secretDel);
      secretIdeas = secretIdeas.filter(i => i.id !== id);
      localStorage.setItem('laugra_secret_ideas', JSON.stringify(secretIdeas));
      renderSecretIdeas();
    }
  });

  /* ============================================================
     10. ESPACE CRUSH
     ============================================================ */
  const crushModal = $('#crushModal');
  let crushData = safeParse('laugra_crush', {
    name: '', meet: '', birthday: '', notes: ''
  });

  $('#openCrushBtn')?.addEventListener('click', () => {
    $('#crushName').value = crushData.name || '';
    $('#crushMeet').value = crushData.meet || '';
    $('#crushBirthday').value = crushData.birthday || '';
    $('#crushNotes').value = crushData.notes || '';
    crushModal.classList.remove('hidden');
  });

  $('#saveCrushBtn')?.addEventListener('click', () => {
    crushData = {
      name: $('#crushName').value.trim(),
      meet: $('#crushMeet').value,
      birthday: $('#crushBirthday').value,
      notes: $('#crushNotes').value.trim()
    };
    localStorage.setItem('laugra_crush', JSON.stringify(crushData));
    crushModal.classList.add('hidden');
    toast('Espace Crush enregistré 💕', 'success');
  });

  /* ============================================================
     11. PARTAGE
     ============================================================ */
  const shareModal = $('#shareModal');
  const sharePreview = $('#sharePreview');
  let shareIdeaId = null;

  function encodeIdea(idea) {
    const payload = {
      t: idea.title,
      x: idea.text,
      c: idea.category,
      d: idea.date,
      a: !!idea.audio,
      m: !!idea.media
    };
    try {
      return 'LS:' + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    } catch { return ''; }
  }

  function decodeIdea(code) {
    try {
      if (!code.startsWith('LS:')) return null;
      const b64 = code.slice(3).trim();
      const json = decodeURIComponent(escape(atob(b64)));
      const data = JSON.parse(json);
      return {
        title: data.t || 'Idée reçue',
        text: data.x || '',
        category: data.c || 'other',
        date: data.d || nowFR()
      };
    } catch { return null; }
  }

  function openShareModal(id) {
    shareIdeaId = id;
    if (sharePreview) {
      sharePreview.classList.add('hidden');
      sharePreview.textContent = '';
    }
    shareModal.classList.remove('hidden');
  }

  document.addEventListener('click', (e) => {
    const opt = e.target.closest('#shareModal [data-share]');
    if (!opt) return;

    const mode = opt.dataset.share;
    const idea = ideas.find(i => i.id === shareIdeaId);
    if (!idea) return;

    if (mode === 'native') {
      const textToShare = `🚀 ${idea.title}\n\n${idea.text || ''}\n\n— partagé via LaugraStok`;
      if (navigator.share) {
        navigator.share({ title: idea.title, text: textToShare }).catch(() => {});
      } else {
        navigator.clipboard.writeText(textToShare);
        toast('Copié dans le presse-papier', 'success');
      }
    }

    if (mode === 'code') {
      const code = encodeIdea(idea);
      navigator.clipboard.writeText(code).then(() => {
        toast('Code copié ! Envoie-le à un ami 📤', 'success');
      });
      if (sharePreview) {
        sharePreview.textContent = code;
        sharePreview.classList.remove('hidden');
      }
    }

    if (mode === 'download') {
      const textToShare = `${idea.title}\n\n${idea.text || ''}\n\nDate: ${idea.date}\n— LaugraStok`;
      const blob = new Blob([textToShare], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laugrastok-${idea.title.slice(0, 20)}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Fichier téléchargé', 'success');
    }
  });

  /* ============================================================
     12. RECEVOIR UNE IDÉE
     ============================================================ */
  const receiveModal = $('#receiveModal');

  $('#openReceiveBtn')?.addEventListener('click', () => {
    $('#receiveCode').value = '';
    receiveModal.classList.remove('hidden');
  });

  $('#importIdeaBtn')?.addEventListener('click', () => {
    const raw = $('#receiveCode').value.trim();
    if (!raw) return toast('Colle un code d\'abord', 'error');

    const parsed = decodeIdea(raw);
    if (!parsed) return toast('Code invalide', 'error');

    ideas.unshift({
      id: Date.now(),
      title: parsed.title,
      text: parsed.text,
      category: parsed.category,
      audio: null,
      media: null,
      mediaType: null,
      fav: false,
      date: parsed.date
    });
    saveIdeas();
    renderIdeas();
    receiveModal.classList.add('hidden');
    toast('Idée importée 🎉', 'success');
    switchTab('home');
  });

  /* ============================================================
     13. FERMETURE DES MODALES
     ============================================================ */
  document.addEventListener('click', (e) => {
    const closeBtn = e.target.closest('[data-close]');
    if (closeBtn) {
      const id = closeBtn.dataset.close;
      document.getElementById(id)?.classList.add('hidden');
      return;
    }

    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.add('hidden');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $$('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
    }
  });

  /* ============================================================
     14. INITIALISATION
     ============================================================ */
  renderIdeas();
  renderFavList();
  updateDashboard();

  console.log('%c🚀 LaugraStok v2.0 chargé', 'color:#10a37f;font-weight:bold;font-size:14px');

});