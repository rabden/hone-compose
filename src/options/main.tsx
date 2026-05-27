import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { MaterialRegistry } from '@/components/material-registry';
import Options from './options';
import '../index.css';

function App() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    handler(mq);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <React.StrictMode>
      <MaterialRegistry />
      <Options />
    </React.StrictMode>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<App />);
}
