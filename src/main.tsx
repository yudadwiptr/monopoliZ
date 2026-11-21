import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Dev-only debugging handle (stripped from production builds).
if (import.meta.env.DEV) {
  void Promise.all([import('./store/gameStore'), import('./store/settingsStore')]).then(([g, st]) => {
    (window as unknown as Record<string, unknown>).__mz = { useGame: g.useGame, useSettings: st.useSettings };
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
