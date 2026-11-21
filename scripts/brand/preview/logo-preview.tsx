import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/global.css';
import { Logo } from '@/ui/common/Logo';

const animated = !new URLSearchParams(location.search).has('static');

function Preview() {
  const [run, setRun] = useState(0);
  return (
    <div className="batik-bg bg-ink-900" style={{ height: '100vh', overflow: 'auto', padding: 24 }}>
      <button onClick={() => setRun(run + 1)} style={{ color: '#fff', marginBottom: 24 }}>
        ↻ Replay
      </button>
      <div key={run} style={{ display: 'flex', flexDirection: 'column', gap: 40, alignItems: 'flex-start' }}>
        <Logo size="xl" animated={animated} />
        <Logo size="lg" animated={animated} />
        <Logo size="md" />
        <Logo size="sm" />
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
