// Protección a prueba de fallos contra SecurityError de PWA / ServiceWorker en iframes de preview
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    const origRegister = navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register = function (...args: [string | URL, RegistrationOptions?]): Promise<ServiceWorkerRegistration> {
      try {
        return origRegister(...args).catch((err: unknown) => {
          console.warn('PWA omitida en preview:', err);
          return null as unknown as ServiceWorkerRegistration;
        });
      } catch (err: unknown) {
        console.warn('PWA omitida en preview:', err);
        return Promise.resolve(null as unknown as ServiceWorkerRegistration);
      }
    };
  }
} catch (err: unknown) {
  console.warn('PWA omitida en preview:', err);
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
