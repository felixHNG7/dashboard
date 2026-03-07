export const DASHBOARD_CONFIG = {
  title:           'Dashboard Maison',
  refreshInterval: 60,

  modules: [
    // ── Colonne gauche ─────────────────────────────────────────────
    {
      id:      'departures-rerd',
      type:    'next-departures',
      enabled: true,
      layout:  'col-left row-top',    // grand bloc haut gauche
      params: {
        lineKey:     'RERD',
        stopKey:     'MAISONS_ALFORT_ALFORTVILLE',
        platformName: '2B',
        count:       4,
      },
    },
    {
      id:      'velib-47001',
      type:    'velib',
      enabled: true,
      layout:  'col-left row-bottom', // bloc bas droite
      params:  { stationId: '47001' },
    },

    // ── Colonne droite ─────────────────────────────────────────────
    {
      id:      'status-rerd',
      type:    'line-status',
      enabled: true,
      layout:  'col-right row-top-left', // petit carré haut droite gauche
      params:  { lineKey: 'RERD' },
    },
    {
      id:      'status-metro9',
      type:    'line-status',
      enabled: true,
      layout:  'col-right row-top-right', // petit carré haut droite droite
      params:  { lineKey: 'METRO9' },
    },
    
    {
      id:      'weather-paris',
      type:    'weather',
      enabled: true,
      layout:  'col-right row-bottom', // grand bloc bas gauche
      params: {
        lat: 48.8566,
        lon: 2.3522,
      },
    },
  ],
};
