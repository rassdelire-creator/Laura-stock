/* ============================================================
   LAUGRASTOK — Enregistrement du Service Worker
   Fichier séparé pour garder script.js propre
   ============================================================ */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => {
        console.log('✅ Service Worker enregistré');

        // Détection de mise à jour
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('Une nouvelle version de LaugraStok est dispo. Recharger ?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((err) => console.warn('SW non enregistré :', err));
  });

  // Recharge auto quand un nouveau SW prend le contrôle
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}