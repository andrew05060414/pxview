import novelRankingSettings from '../../src/common/reducers/novelRankingSettings';
import {
  clearLanguage,
  setLanguage,
} from '../../src/common/actions/novelRankingSettings';
import { NOVEL_RANKING_LANGUAGES } from '../../src/common/constants';

describe('novelRankingSettings reducer', () => {
  test('defaults to no saved preference', () => {
    expect(novelRankingSettings(undefined, {})).toEqual({ language: null });
  });

  test('persists supported choices and can clear back to the default', () => {
    let state = novelRankingSettings(
      undefined,
      setLanguage(NOVEL_RANKING_LANGUAGES.ALL),
    );
    expect(state.language).toBe(NOVEL_RANKING_LANGUAGES.ALL);

    state = novelRankingSettings(state, clearLanguage());
    expect(state.language).toBeNull();
  });

  test('ignores unsupported language values', () => {
    const state = novelRankingSettings(undefined, setLanguage('ja'));
    expect(state).toEqual({ language: null });
  });
});
