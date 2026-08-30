const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to ensure Android 15 (API 35+) 16 KB ELF page size compatibility.
 */
function with16KbPageSize(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      if (!config.modResults.contents.includes('max-page-size=16384')) {
        config.modResults.contents = config.modResults.contents.replace(
          /defaultConfig\s*\{/,
          `defaultConfig {\n        externalNativeBuild {\n            cmake {\n                arguments "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON", "-DCMAKE_SHARED_LINKER_FLAGS=-Wl,-z,max-page-size=16384"\n            }\n            ndkBuild {\n                arguments "APP_LDFLAGS=-Wl,-z,max-page-size=16384"\n            }\n        }`
        );
      }
    }
    return config;
  });
}

module.exports = with16KbPageSize;
