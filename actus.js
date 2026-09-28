/* ============================================================
   LAUGRASTOK v2.2 — Actus avec fallback
   APIs ultra-fiables + contenu de secours si échec
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  let currentFilter = 'all';
  let isLoading = false;

  const WEATHER_CODES = {
    0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux',
    3: 'Couvert', 45: 'Brouillard', 48: 'Brouillard givrant',
    51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
    61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
    71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte',
    80: 'Averses légères', 81: 'Averses modérées', 82: 'Averses violentes',
    95: 'Orage', 96: 'Orage avec grêle', 99: 'Orage violent'
  };

  const WEATHER_ICONS = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌧️', 61: '🌧️', 63: '🌧️', 65: '🌧️',
    71: '❄️', 73: '❄️', 75: '❄️', 80: '🌦️', 81: '🌧️', 82: '⛈️',
    95: '⛈️', 96: '⛈️', 99: '⛈️'
  };

  // ============================================================
  // FALLBACK : contenu statique si toutes les APIs échouent
  // ============================================================
  const FALLBACK_NEWS = [
    { title: 'Bienvenue dans LaugraStok !', meta: 'Tes actus apparaîtront ici', url: '#' },
    { title: 'Vérifie ta connexion internet', meta: 'Les infos en direct nécessitent le réseau', url: '#' },
    { title: 'Tu peux créer des idées hors ligne ✨', meta: 'Elles se sauvegardent localement', url: '#' }
  ];

  const FALLBACK_FOOT = [
    { home: 'Arsenal', away: 'Chelsea', hs: '-', as: '-', meta: 'Premier League' },
    { home: 'Man City', away: 'Liverpool', hs: '-', as: '-', meta: 'Premier League' },
    { home: 'Real Madrid', away: 'Barcelone', hs: '-', as: '-', meta: 'Liga' }
  ];

  // ============================================================
  // Fetch robuste avec timeout
  // ============================================================
  async function safeFetch(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      console.warn('⚠️ Échec:', url, err.message);
      return null;
    }
  }

  function showLoading() {
    const container = $('#newsContent');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <svg class="ic"><use href="#i-globe"/></svg>
        <p>Chargement...</p>
      </div>`;
  }

  /* ============================================================
     1. INFOS — Hacker News via Algolia (API ultra-fiable)
     ============================================================ */
  async function loadGeneralNews() {
    const container = $('#newsContent');
    if (!container) return;

    const data = await safeFetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=8');

    let items = [];
    if (data && data.hits && data.hits.length > 0) {
      items = data.hits.map(function (h) {
        return {
          title: h.title || h.story_title || 'Sans titre',
          url: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
          date: h.created_at
            ? new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
            : '',
          source: h.url ? new URL(h.url).hostname.replace('www.', '') : 'Hacker News'
        };
      });
    }

    if (items.length === 0) {
      // Fallback statique
      items = FALLBACK_NEWS;
    }

    container.innerHTML = items.map(function (a) {
      return `
        <a href="${a.url}" target="_blank" rel="noopener" class="news-card glass-card">
          <div class="news-card-title">${escapeHtml(a.title)}</div>
          <div class="news-card-meta">
            <span>${escapeHtml(a.source || 'Actus')}</span>
            <span>${a.date || ''}</span>
          </div>
        </a>`;
    }).join('');
  }

  /* ============================================================
     2. MÉTÉO — Open-Meteo (fiable)
     ============================================================ */
  async function loadWeather() {
    const container = $('#newsContent');
    if (!container) return;

    const data = await safeFetch(
      'https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris&forecast_days=4'
    );

    if (!data || !data.current_weather) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="ic"><use href="#i-globe"/></svg>
          <p>Météo indisponible.<br>Vérifie ta connexion.</p>
        </div>`;
      return;
    }

    const cw = data.current_weather;
    const code = cw.weathercode;
    const icon = WEATHER_ICONS[code] || '🌡️';
    const desc = WEATHER_CODES[code] || 'Inconnu';

    let dailyHTML = '';
    if (data.daily) {
      const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
      dailyHTML = data.daily.time.map(function (t, i) {
        const d = new Date(t);
        const dayName = days[d.getDay()];
        const max = Math.round(data.daily.temperature_2m_max[i]);
        const min = Math.round(data.daily.temperature_2m_min[i]);
        const dc = data.daily.weathercode[i];
        return `
          <div class="weather-day">
            <div class="weather-day-name">${dayName}</div>
            <div class="weather-day-icon">${WEATHER_ICONS[dc] || '🌡️'}</div>
            <div class="weather-day-temp">${max}° <span>${min}°</span></div>
          </div>`;
      }).join('');
    }

    container.innerHTML = `
      <div class="glass-card weather-main">
        <div class="weather-city">Paris</div>
        <div class="weather-now">
          <div class="weather-icon-big">${icon}</div>
          <div>
            <div class="weather-temp">${Math.round(cw.temperature)}°C</div>
            <div class="weather-desc">${desc}</div>
          </div>
        </div>
        <div class="weather-details">
          <span>Vent : ${Math.round(cw.windspeed)} km/h</span>
        </div>
      </div>
      <div class="glass-card weather-forecast">${dailyHTML}</div>
    `;
  }

  /* ============================================================
     3. JOURS FÉRIÉS — API du gouvernement (fiable)
     ============================================================ */
  async function loadHolidays() {
    const container = $('#newsContent');
    if (!container) return;

    const year = new Date().getFullYear();
    const data = await safeFetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`
    );

    if (!data) {
      container.innerHTML = `
        <div class="empty-state">
          <svg class="ic"><use href="#i-globe"/></svg>
          <p>Jours fériés indisponibles</p>
        </div>`;
      return;
    }

    const entries = Object.entries(data);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    container.innerHTML = entries.map(function (e) {
      const date = new Date(e[0]);
      const name = e[1];
      const formatted = date.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      let badge = '';
      if (isToday) badge = '<span class="badge-now">Aujourd\'hui</span>';
      else if (!isPast) {
        const diff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        badge = `<span class="badge-future">Dans ${diff}j</span>`;
      }
      return `
        <div class="holiday-card glass-card ${isPast ? 'past' : ''}">
          <div class="holiday-date">${formatted}</div>
          <div class="holiday-name">${name} ${badge}</div>
        </div>`;
    }).join('');
  }

  /* ============================================================
     4. FOOT — TheSportsDB (clé test "3" gratuite)
     ============================================================ */
  async function loadFootball() {
    const container = $('#newsContent');
    if (!container) return;

    // 4328 = English Premier League, 4335 = La Liga, 4331 = Bundesliga
    const leagues = [
      { id: 4328, name: 'Premier League' },
      { id: 4335, name: 'La Liga' },
      { id: 4332, name: 'Serie A' }
    ];

    let allEvents = [];

    for (const league of leagues) {
      const data = await safeFetch(
        `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.id}`
      );
      if (data && data.events && data.events.length > 0) {
        data.events.slice(0, 3).forEach(function (e) {
          allEvents.push({
            home: e.strHomeTeam,
            away: e.strAwayTeam,
            date: e.dateEvent,
            time: e.strTime,
            league: league.name
          });
        });
      }
      if (allEvents.length >= 8) break;
    }

    if (allEvents.length === 0) {
      // Fallback statique
      container.innerHTML = FALLBACK_FOOT.map(function (m) {
        return `
          <div class="foot-card glass-card">
            <div class="foot-meta"><span>${m.meta}</span></div>
            <div class="foot-score">
              <div class="foot-team">${m.home}</div>
              <div class="foot-nums">vs</div>
              <div class="foot-team">${m.away}</div>
            </div>
          </div>`;
      }).join('') + `
        <div class="empty-state" style="padding: 20px;">
          <p class="muted small">Prochains matchs — données en direct indisponibles</p>
        </div>`;
      return;
    }

    container.innerHTML = allEvents.slice(0, 10).map(function (m) {
      const date = m.date
        ? new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : '';
      return `
        <div class="foot-card glass-card">
          <div class="foot-meta">
            <span>${m.league}</span>
            <span>${date}${m.time ? ' · ' + m.time.slice(0, 5) : ''}</span>
          </div>
          <div class="foot-score">
            <div class="foot-team">${escapeHtml(m.home)}</div>
            <div class="foot-nums">vs</div>
            <div class="foot-team">${escapeHtml(m.away)}</div>
          </div>
        </div>`;
    }).join('');
  }

  /* ============================================================
     ROUTEUR
     ============================================================ */
  function loadContent(filter) {
    if (isLoading) return;
    isLoading = true;
    showLoading();

    let promise;
    if (filter === 'all')            promise = loadAll();
    else if (filter === 'general')   promise = loadGeneralNews();
    else if (filter === 'weather')   promise = loadWeather();
    else if (filter === 'foot')      promise = loadFootball();
    else if (filter === 'holidays')  promise = loadHolidays();

    Promise.resolve(promise)
      .catch(function (err) { console.error(err); })
      .finally(function () { isLoading = false; });
  }

  /* ============================================================
     VUE "TOUT"
     ============================================================ */
  async function loadAll() {
    const container = $('#newsContent');
    if (!container) return;

    const [news, weather, foot, holidays] = await Promise.all([
      safeFetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=3'),
      safeFetch('https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current_weather=true&timezone=Europe/Paris'),
      safeFetch('https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=4328'),
      safeFetch(`https://calendrier.api.gouv.fr/jours-feries/metropole/${new Date().getFullYear()}.json`)
    ]);

    let html = '';

    // --- Météo en haut ---
    if (weather && weather.current_weather) {
      const cw = weather.current_weather;
      const code = cw.weathercode;
      html += `
        <div class="glass-card weather-main compact">
          <div class="weather-city">Paris</div>
          <div class="weather-now">
            <div class="weather-icon-big">${WEATHER_ICONS[code] || '🌡️'}</div>
            <div>
              <div class="weather-temp">${Math.round(cw.temperature)}°C</div>
              <div class="weather-desc">${WEATHER_CODES[code] || ''}</div>
            </div>
          </div>
        </div>`;
    }

    // --- Infos ---
    if (news && news.hits && news.hits.length > 0) {
      html += `<div class="news-section-title">📰 Infos</div>`;
      html += news.hits.slice(0, 3).map(function (h) {
        const url = h.url || ('https://news.ycombinator.com/item?id=' + h.objectID);
        const host = h.url ? h.url.replace(/https?:\/\/(www\.)?/, '').split('/')[0] : 'HN';
        return `
          <a href="${url}" target="_blank" rel="noopener" class="news-card glass-card">
            <div class="news-card-title">${escapeHtml(h.title || h.story_title || '')}</div>
            <div class="news-card-meta">
              <span>${host}</span>
              <span>${h.created_at ? new Date(h.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : ''}</span>
            </div>
          </a>`;
      }).join('');
    }

    // --- Foot ---
    if (foot && foot.events && foot.events.length > 0) {
      html += `<div class="news-section-title">⚽ Foot</div>`;
      html += foot.events.slice(0, 3).map(function (e) {
        const date = e.dateEvent
          ? new Date(e.dateEvent).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
          : '';
        return `
          <div class="foot-card glass-card">
            <div class="foot-meta">
              <span>${e.strLeague || 'Premier League'}</span>
              <span>${date}</span>
            </div>
            <div class="foot-score">
              <div class="foot-team">${escapeHtml(e.strHomeTeam || '')}</div>
              <div class="foot-nums">vs</div>
              <div class="foot-team">${escapeHtml(e.strAwayTeam || '')}</div>
            </div>
          </div>`;
      }).join('');
    }

    // --- Fériés ---
    if (holidays) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = Object.entries(holidays)
        .map(function (e) { return { date: new Date(e[0]), name: e[1] }; })
        .filter(function (e) { return e.date >= today; })
        .slice(0, 2);

      if (upcoming.length > 0) {
        html += `<div class="news-section-title">📅 Prochains fériés</div>`;
        html += upcoming.map(function (h) {
          const diff = Math.ceil((h.date - today) / (1000 * 60 * 60 * 24));
          return `
            <div class="holiday-card glass-card">
              <div class="holiday-date">${h.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <div class="holiday-name">${h.name} <span class="badge-future">Dans ${diff}j</span></div>
            </div>`;
        }).join('');
      }
    }

    if (!html) {
      html = `<div class="empty-state">
        <svg class="ic"><use href="#i-globe"/></svg>
        <p>Aucune info.<br>Vérifie ta connexion internet.</p>
      </div>`;
    }

    container.innerHTML = html;
  }

  /* ============================================================
     UTILITAIRE
     ============================================================ */
  function escapeHtml(t) {
    if (!t) return '';
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /* ============================================================
     INITIALISATION
     ============================================================ */
  function init() {
    const filterBtns = $$('.news-filter-btn');
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        currentFilter = btn.dataset.news;
        loadContent(currentFilter);
      });
    });

    const newsTab = document.getElementById('tab-news');
    if (newsTab) {
      let loaded = false;
      const obs = new MutationObserver(function () {
        if (newsTab.classList.contains('active') && !loaded) {
          loaded = true;
          loadContent('all');
        }
      });
      obs.observe(newsTab, { attributes: true, attributeFilter: ['class'] });
    }

    console.log('📰 Actus v2.2 prêt');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();