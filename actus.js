/* ============================================================
   LAUGRASTOK v2.1 — Section Actus & Infos
   Sources : freenewsapi.ai, Open-Meteo, calendrier.api.gouv.fr, worldcup26.ir
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

  async function safeFetch(url, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 10000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      console.warn('⚠️ Fetch fail:', url, err.message);
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

  function showError(msg) {
    const container = $('#newsContent');
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <svg class="ic"><use href="#i-globe"/></svg>
        <p>${msg || 'Impossible de charger'}</p>
      </div>`;
  }

  /* ============================================================
     1. INFOS GÉNÉRALES
     ============================================================ */
  async function loadGeneralNews() {
    const container = $('#newsContent');
    if (!container) return;

    const data = await safeFetch('https://freenewsapi.ai/v1/search?host=www.france24.com&size=6');

    if (!data || !data.articles || data.articles.length === 0) {
      showError('Aucune info pour le moment');
      return;
    }

    container.innerHTML = data.articles.map(function (a) {
      const date = a.published_at
        ? new Date(a.published_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
        : '';
      return `
        <a href="${a.url}" target="_blank" rel="noopener" class="news-card glass-card">
          <div class="news-card-title">${a.title || 'Sans titre'}</div>
          <div class="news-card-meta">
            <span>${a.publisher || 'France 24'}</span>
            <span>${date}</span>
          </div>
        </a>`;
    }).join('');
  }

  /* ============================================================
     2. MÉTÉO
     ============================================================ */
  async function loadWeather() {
    const container = $('#newsContent');
    if (!container) return;

    const data = await safeFetch(
      'https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current_weather=true&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris&forecast_days=4'
    );

    if (!data || !data.current_weather) {
      showError('Météo indisponible');
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
     3. JOURS FÉRIÉS
     ============================================================ */
  async function loadHolidays() {
    const container = $('#newsContent');
    if (!container) return;

    const year = new Date().getFullYear();
    const data = await safeFetch(
      `https://calendrier.api.gouv.fr/jours-feries/metropole/${year}.json`
    );

    if (!data) {
      showError('Jours fériés indisponibles');
      return;
    }

    const entries = Object.entries(data);
    if (entries.length === 0) {
      showError('Aucun jour férié');
      return;
    }

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
     4. FOOT
     ============================================================ */
  async function loadFootball() {
    const container = $('#newsContent');
    if (!container) return;

    const data = await safeFetch('https://worldcup26.ir/get/games');

    if (!data || !Array.isArray(data) || data.length === 0) {
      showError('Scores de foot indisponibles');
      return;
    }

    const games = data.slice(0, 8);

    container.innerHTML = games.map(function (g) {
      const home = g.home_team_name || g.home || '?';
      const away = g.away_team_name || g.away || '?';
      const hs = g.home_score != null ? g.home_score : '-';
      const as = g.away_score != null ? g.away_score : '-';
      const status = g.status || 'À venir';
      const date = g.date ? new Date(g.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : '';

      return `
        <div class="foot-card glass-card">
          <div class="foot-meta">
            <span>${g.competition_name || 'Coupe du Monde'}</span>
            <span>${date}</span>
          </div>
          <div class="foot-score">
            <div class="foot-team">${home}</div>
            <div class="foot-nums">${hs} - ${as}</div>
            <div class="foot-team">${away}</div>
          </div>
          <div class="foot-status">${status}</div>
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

    Promise.resolve(promise).finally(() => { isLoading = false; });
  }

  /* ============================================================
     TOUT
     ============================================================ */
  async function loadAll() {
    const container = $('#newsContent');
    if (!container) return;

    const [news, weather, foot, holidays] = await Promise.all([
      safeFetch('https://freenewsapi.ai/v1/search?host=www.france24.com&size=3'),
      safeFetch('https://api.open-meteo.com/v1/forecast?latitude=48.85&longitude=2.35&current_weather=true&timezone=Europe/Paris'),
      safeFetch('https://worldcup26.ir/get/games'),
      safeFetch(`https://calendrier.api.gouv.fr/jours-feries/metropole/${new Date().getFullYear()}.json`)
    ]);

    let html = '';

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

    if (news && news.articles && news.articles.length > 0) {
      html += `<div class="news-section-title">📰 Infos</div>`;
      html += news.articles.map(function (a) {
        const date = a.published_at
          ? new Date(a.published_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
          : '';
        return `
          <a href="${a.url}" target="_blank" rel="noopener" class="news-card glass-card">
            <div class="news-card-title">${a.title || 'Sans titre'}</div>
            <div class="news-card-meta">
              <span>${a.publisher || 'France 24'}</span>
              <span>${date}</span>
            </div>
          </a>`;
      }).join('');
    }

    if (foot && Array.isArray(foot) && foot.length > 0) {
      html += `<div class="news-section-title">⚽ Foot</div>`;
      html += foot.slice(0, 3).map(function (g) {
        const home = g.home_team_name || g.home || '?';
        const away = g.away_team_name || g.away || '?';
        const hs = g.home_score != null ? g.home_score : '-';
        const as = g.away_score != null ? g.away_score : '-';
        return `
          <div class="foot-card glass-card">
            <div class="foot-score">
              <div class="foot-team">${home}</div>
              <div class="foot-nums">${hs} - ${as}</div>
              <div class="foot-team">${away}</div>
            </div>
          </div>`;
      }).join('');
    }

    if (holidays) {
      const entries = Object.entries(holidays);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = entries
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

    if (!html) html = `<div class="empty-state"><p>Aucune info disponible</p></div>`;
    container.innerHTML = html;
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

    // Charge "Tout" automatiquement quand on ouvre l'onglet
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
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();