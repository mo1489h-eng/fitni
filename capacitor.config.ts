import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coachbase.coachbase',
  appName: 'CoachBase',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      appId: 'com.coachbase.coachbase'
    }
  }
};

export default config;
