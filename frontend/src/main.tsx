import { createRoot } from 'react-dom/client'
import './App.css'
import App from './App.tsx'

console.log('[main.tsx] Starting React app...');
console.log('[main.tsx] Root element:', document.getElementById('root'));

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found!');
  }
  
  console.log('[main.tsx] Creating React root...');
  const root = createRoot(rootElement);
  
  console.log('[main.tsx] Rendering App component...');
  root.render(<App />);
  
  console.log('[main.tsx] React app mounted successfully!');
} catch (error) {
  console.error('[main.tsx] Error mounting React app:', error);
}
