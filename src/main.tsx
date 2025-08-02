// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Assuming you might add a global CSS file here later, currently it might not exist.

// Get the root element from your public/index.html
const rootElement = document.getElementById('root');

if (rootElement) {
  // Create a React root and render your App component
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Root element with ID 'root' not found in the HTML.");
}