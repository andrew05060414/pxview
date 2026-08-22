const locales = {
  en: require('../../src/common/constants/strings/en.json'),
  ja: require('../../src/common/constants/strings/ja.json'),
  zh: require('../../src/common/constants/strings/zh.json'),
  'zh-TW': require('../../src/common/constants/strings/zh-TW.json'),
  'zh-HK': require('../../src/common/constants/strings/zh-HK.json'),
  'zh-MO': require('../../src/common/constants/strings/zh-MO.json'),
};

describe('localization catalogs', () => {
  it('keep the same keys in every supported locale', () => {
    const [baseLocale, ...otherLocales] = Object.entries(locales);
    const baseKeys = Object.keys(baseLocale[1]).sort();

    otherLocales.forEach(([, strings]) => {
      expect(Object.keys(strings).sort()).toEqual(baseKeys);
    });
  });
});
