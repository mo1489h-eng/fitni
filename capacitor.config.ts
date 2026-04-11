import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coachbase.coachbase',
  appName: 'CoachBase',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#000000',
  },
  plugins: {
    CapacitorUpdater: {
      appId: 'com.coachbase.coachbase'
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
    },
  }
};

export default config;
