/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.meract.app',
  appName: 'Meract',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#0092FE',
    },
  },
};

module.exports = config;
