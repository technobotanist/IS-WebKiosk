import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

registerSW({ immediate: true });

// Note: React StrictMode is intentionally not used here. In development it double-mounts
// components, which aborts the viewer iframe's in-flight navigation (net::ERR_ABORTED)
// and leaves embedded pages blank. This does not affect production, but disabling it
// keeps the dev experience consistent with the deployed kiosk.
ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
