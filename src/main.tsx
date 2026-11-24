import {createRoot} from 'react-dom/client';
import {Capacitor} from '@capacitor/core';
import App from './App.tsx';
import {AndroidPullToRefresh} from './components/AndroidPullToRefresh.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    {Capacitor.getPlatform() === 'android' && <AndroidPullToRefresh />}
  </>,
);
