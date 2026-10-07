const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // These React Compiler rules misread React Native's Animated and PanResponder idioms
    // (useRef(new Animated.Value()).current, handlers built in useMemo) as render-time work.
    // The compiler isn't enabled for this app, so they only produce false positives here.
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
]);
