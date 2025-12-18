module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ต้องอยู่บรรทัดสุดท้ายของ plugins เสมอ
      'react-native-reanimated/plugin',
    ],
  };
};