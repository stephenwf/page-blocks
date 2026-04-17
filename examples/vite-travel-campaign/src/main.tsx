import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'page-blocks/react/style.css';
import 'page-blocks/react-editor/style.css';
import 'page-blocks/web-components/style.css';
import './styles.css';
import { App } from './app.js';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Missing #root element');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
