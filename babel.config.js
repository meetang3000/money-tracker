module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ต้องอยู่บรรทัดสุดท้ายเสมอ
      'react-native-reanimated/plugin',
    ],
  };
};