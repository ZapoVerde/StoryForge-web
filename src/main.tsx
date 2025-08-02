// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client'; // Correct import for React 18+
import App from './App'; // Import your main App component
import './index.css'; // You might have a global CSS file here

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
}```

**Explanation:**
*   `ReactDOM.createRoot`: This is the modern way to initialize a React 18+ application. It creates a "root" to which your React components can be rendered.
*   `document.getElementById('root')`: This looks for an HTML element with the `id="root"` in your `public/index.html` file. This is where your entire React application will be injected.
*   `<React.StrictMode>`: A development tool that helps identify potential problems in your application. It doesn't render any visible UI but activates extra checks and warnings for its descendants.

**2. Verify `public/index.html`**

For `src/main.tsx` to work, your `public/index.html` needs to have a `<div id="root"></div>` element.

**Solution: Ensure `public/index.html` has the root div and the script tag.**

Open `public/index.html` and make sure it looks similar to this. Pay close attention to the `div id="root"` and the script tag:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StoryForge Web</title>
  </head>
  <body>
    <!-- This is where your React app will be mounted! -->
    <div id="root"></div>
    <!-- The script tag below is crucial for Vite to load your app.
         It references the main.tsx file, which Vite compiles. -->
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>