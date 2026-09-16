import {
  NOVEL_LANGUAGE_UNKNOWN,
  detectNovelTextLanguage,
  extractNovelData,
  extractNovelText,
  getNovelLanguageFromMetadata,
} from '../../src/common/helpers/novelRankingLanguage';
import { NOVEL_RANKING_LANGUAGES } from '../../src/common/constants';

describe('novel ranking language detection', () => {
  test('accepts Simplified Chinese text with decisive characters', () => {
    expect(
      detectNovelTextLanguage(
        '这是一个简体中文小说内容，里面有很多故事和角色。',
      ),
    ).toBe(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE);
  });

  test('does not label Traditional Chinese, Japanese, or ambiguous text', () => {
    expect(detectNovelTextLanguage('這是一個繁體中文小說內容')).toBe(
      NOVEL_LANGUAGE_UNKNOWN,
    );
    expect(detectNovelTextLanguage('これは日本語の小説です')).toBe(
      NOVEL_LANGUAGE_UNKNOWN,
    );
    expect(detectNovelTextLanguage('山川日月天地人')).toBe(
      NOVEL_LANGUAGE_UNKNOWN,
    );
  });

  test('uses only explicit metadata values as reliable metadata', () => {
    expect(getNovelLanguageFromMetadata({ language: 'zh-CN' })).toBe(
      NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE,
    );
    expect(getNovelLanguageFromMetadata({ language: 'zh' })).toBe(
      NOVEL_LANGUAGE_UNKNOWN,
    );
    expect(getNovelLanguageFromMetadata({})).toBeNull();
  });

  test('extracts the full novel body from the existing webview response', () => {
    const rawResponse =
      'window.__state = { novel: {"7":{"id":"7","text":"这是一个简体中文故事内容。"}}, };';
    expect(extractNovelText(rawResponse, 7)).toBe('这是一个简体中文故事内容。');
  });

  test('preserves language metadata from the webview response', () => {
    const response =
      'window.__state = { novel: {"7":{"language":"zh_CN","text":"这是正文"}}, };';

    const novelData = extractNovelData(response, '7');
    expect(novelData).toEqual({
      language: 'zh_CN',
      text: '这是正文',
    });
    expect(getNovelLanguageFromMetadata(novelData)).toBe(
      NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE,
    );
  });
});
