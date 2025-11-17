import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // Import main component

// Get the root element from index.html
const rootElement = document.getElementById('root');

if (rootElement) {
  // Create a React root and render the application
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element in index.html");
}