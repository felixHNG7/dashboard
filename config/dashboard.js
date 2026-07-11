export const DASHBOARD_CONFIG = {
  title:           'Dashboard Maison',
  refreshInterval: 60,

  modules: [
    // ── Ligne 1 : bloc principal pleine largeur, prend le plus de hauteur ──
    {
      id:      'departures-rerd',
      type:    'next-departures',
      enabled: true,
      layout:  'row-main',            // bloc principal, pleine largeur, flex-grow
      params: {
        lineKey:     'RERD',
        stopKey:     'MAISONS_ALFORT_ALFORTVILLE',
        platformName: '2B',
        count:       4,
      },
    },

    // ── Ligne 2 : divisée en 2 colonnes égales ──────────────────────
    {
      id:      'tempo-edf',
      type:    'tempo',
      enabled: true,
      layout:  'row-split-left',      // moitié gauche de la ligne 2
      params:  {},
    },
    {
      id:      'status-metro9',
      type:    'line-status',
      enabled: true,
      layout:  'row-split-right',     // moitié droite de la ligne 2
      params:  { lineKey: 'METRO9' },
    },

    // ── Ligne 3 : pleine largeur ─────────────────────────────────────
    {
      id:      'weather-paris',
      type:    'weather',
      enabled: true,
      layout:  'row-weather',
      params: {
        lat: 48.8566,
        lon: 2.3522,
      },
    },

    // ── Ligne 4 : pleine largeur ─────────────────────────────────────
    {
      id:      'velib-47001',
      type:    'velib',
      enabled: true,
      layout:  'row-velib',
      params:  {
        stationId:    '47001',  // vélos mécaniques
        docksStationId: '40008', // places libres (station distincte)
      },
    },
  ],
};
