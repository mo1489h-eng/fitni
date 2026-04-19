import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coachbase.coachbase',
  appName: 'CoachBase',
  webDir: 'dist',
  ios: {
    contentInset: 'always'
  },
  android: {
    backgroundColor: '#050505'
  },
  plugins: {
    CapacitorUpdater: {
      appId: 'com.coachbase.coachbase.app'
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      launchFadeOutDuration: 280,
      backgroundColor: '#050505',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'FIT_CENTER'
    }
  }
};

export default config;
