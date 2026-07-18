import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.meract.app',
  appName: 'Meract',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Для разработки можно указать URL сервера:
    // url: 'https://meract.com',
    // cleartext: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0092FE',
      sound: 'beep.wav',
    },
  },
};

export default config;
