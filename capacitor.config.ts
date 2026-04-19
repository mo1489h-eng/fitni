import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coachbase.coachbase.app',
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
      autoUpdate: true,
      statsUrl: 'https://api.capgo.app/stats',
      channelUrl: 'https://api.capgo.app/channel_self',
      updateUrl: 'https://api.capgo.app/updates'
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
