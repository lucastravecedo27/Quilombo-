import type { CapacitorConfig } from '@capacitor/cli';

// App de iPhone: la misma build de Vite (dist/) dentro de un WKWebView
const config: CapacitorConfig = {
  appId: 'com.lucastravecedo.quilombo',
  appName: 'Quilombo',
  webDir: 'dist',
  // scrollEnabled: false → la vista web entera no rebota (cada pantalla tiene su propio scroll con rebote de iOS);
  // sin vista previa de links al mantener presionado (la app usa mantener presionado para sus propios menús)
  ios: { contentInset: 'never', scrollEnabled: false, allowsLinkPreview: false, preferredContentMode: 'mobile' },
  plugins: {
    // La pantalla de arranque (logo) se queda hasta que la app web termina de montar (src/main.ts la quita)
    SplashScreen: { launchAutoHide: false, launchFadeOutDuration: 250, showSpinner: false }
  }
};

export default config;
