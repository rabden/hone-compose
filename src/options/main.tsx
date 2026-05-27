import React from 'react';
import { createRoot } from 'react-dom/client';
import { MaterialRegistry } from '@/components/material-registry';
import Options from './options';
import '../index.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <MaterialRegistry />
      <Options />
    </React.StrictMode>
  );
}
