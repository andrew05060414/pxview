import { all, apply, call, delay, put } from 'redux-saga/effects';
import { runSaga, stdChannel } from 'redux-saga';
import pixiv from '../../src/common/helpers/apiClient';
import { fetchRanking } from '../../src/common/actions/ranking';
import {
  RANKING_FOR_UI,
  NOVEL_RANKING_LANGUAGES,
} from '../../src/common/constants';
import {
  filterSimplifiedChineseNovels,
  getNovelRankingLanguage,
  handleFetchRanking,
  watchFetchRanking,
} from '../../src/common/sagas/ranking';

const novel = (id, extra = {}) => ({
  id,
  visible: true,
  title: `novel-${id}`,
  user: { id: 10, name: 'author' },
  ...extra,
});

describe('novel ranking language filtering', () => {
  test.each([
    [RANKING_FOR_UI.DAILY_MALE_NOVEL, 'day_male'],
    [RANKING_FOR_UI.DAILY_FEMALE_NOVEL, 'day_female'],
  ])(
    'filters %s without sending language state upstream',
    (rankingMode, apiMode) => {
      const action = {
        payload: {
          rankingMode,
          options: { language: NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE },
        },
      };
      const generator = handleFetchRanking(action);
      const novels = [novel(1), novel(2)];

      expect(generator.next().value).toEqual(
        apply(pixiv, pixiv.novelRanking, [{ mode: apiMode }]),
      );
      expect(generator.next({ novels }).value).toEqual(
        call(filterSimplifiedChineseNovels, novels),
      );
      expect(generator.next([novels[0]]).value).toEqual(
        put(
          expect.objectContaining({
            type: 'PIXIV/RANKING_SUCCESS',
            payload: expect.objectContaining({
              items: [1],
              rankingMode,
              nextUrl: undefined,
            }),
          }),
        ),
      );
    },
  );

  test('keeps all languages without requesting novel bodies', () => {
    const action = {
      payload: {
        rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
        options: { language: NOVEL_RANKING_LANGUAGES.ALL },
      },
    };
    const generator = handleFetchRanking(action);
    const novels = [novel(1)];

    generator.next();
    expect(generator.next({ novels }).value).toEqual(
      put(
        expect.objectContaining({
          type: 'PIXIV/RANKING_SUCCESS',
          payload: expect.objectContaining({
            items: [1],
            rankingMode: RANKING_FOR_UI.DAILY_MALE_NOVEL,
            nextUrl: undefined,
          }),
        }),
      ),
    );
  });

  test('excludes unknown bodies from Simplified Chinese results', () => {
    const novels = [novel(1), novel(2)];
    const generator = filterSimplifiedChineseNovels(novels);
    expect(generator.next().value).toEqual(
      all([
        call(getNovelRankingLanguage, novels[0]),
        call(getNovelRankingLanguage, novels[1]),
      ]),
    );
    expect(
      generator.next([NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE, 'unknown'])
        .value,
    ).toEqual([novels[0]]);
  });

  test('looks up pages in batches of four with a pause between batches', () => {
    const novels = [1, 2, 3, 4, 5].map((id) => novel(id));
    const generator = filterSimplifiedChineseNovels(novels);

    expect(generator.next().value).toEqual(
      all(
        novels.slice(0, 4).map((item) => call(getNovelRankingLanguage, item)),
      ),
    );
    expect(
      generator.next(Array(4).fill(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE))
        .value,
    ).toEqual(delay(700));
    expect(generator.next().value).toEqual(
      all([call(getNovelRankingLanguage, novels[4])]),
    );
    expect(
      generator.next([NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE]).value,
    ).toEqual(novels);
  });
  test('falls back to the existing novel webview body when metadata is absent', () => {
    const generator = getNovelRankingLanguage(novel(7));
    expect(generator.next().value).toEqual(
      apply(pixiv, pixiv.novelWebview, [7, true]),
    );
    const result = generator.next(
      'window.__state = { novel: {"7":{"id":"7","text":"这是一个简体中文故事内容。"}}, };',
    );
    expect(result.value).toBe(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE);
    expect(result.done).toBe(true);
  });

  test('uses webview language metadata before body detection', () => {
    const generator = getNovelRankingLanguage(novel(8));
    expect(generator.next().value).toEqual(
      apply(pixiv, pixiv.novelWebview, [8, true]),
    );
    const result = generator.next({
      language: 'zh-CN',
      text: 'ambiguous body',
    });

    expect(result.value).toBe(NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE);
    expect(result.done).toBe(true);
  });

  test.each([
    RANKING_FOR_UI.DAILY_MALE_NOVEL,
    RANKING_FOR_UI.DAILY_FEMALE_NOVEL,
  ])(
    'does not append late all-language results after switching to Simplified Chinese (%s)',
    async (mode) => {
      const channel = stdChannel();
      const dispatch = jest.fn();
      let finishUnfilteredRequest;
      const unfilteredResponse = new Promise((resolve) => {
        finishUnfilteredRequest = resolve;
      });
      const ranking = jest
        .spyOn(pixiv, 'novelRanking')
        .mockReturnValueOnce(unfilteredResponse)
        .mockReturnValueOnce({ novels: [novel(2, { language: 'zh-CN' })] });
      const task = runSaga({ channel, dispatch }, watchFetchRanking);

      try {
        channel.put(
          fetchRanking(mode, { language: NOVEL_RANKING_LANGUAGES.ALL }),
        );
        channel.put(
          fetchRanking(mode, {
            language: NOVEL_RANKING_LANGUAGES.SIMPLIFIED_CHINESE,
          }),
        );
        finishUnfilteredRequest({ novels: [novel(1, { language: 'ja' })] });
        await unfilteredResponse;

        expect(ranking).toHaveBeenCalledTimes(2);
        expect(dispatch).toHaveBeenCalledTimes(1);
        expect(dispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'PIXIV/RANKING_SUCCESS',
            payload: expect.objectContaining({ items: [2], rankingMode: mode }),
          }),
        );
      } finally {
        task.cancel();
        ranking.mockRestore();
      }
    },
  );

  test('male and female ranking requests do not cancel each other', async () => {
    const channel = stdChannel();
    const dispatch = jest.fn();
    let finishMaleRequest;
    const maleResponse = new Promise((resolve) => {
      finishMaleRequest = resolve;
    });
    const ranking = jest
      .spyOn(pixiv, 'novelRanking')
      .mockReturnValueOnce(maleResponse)
      .mockReturnValueOnce({ novels: [novel(2)] });
    const task = runSaga({ channel, dispatch }, watchFetchRanking);
    const options = { language: NOVEL_RANKING_LANGUAGES.ALL };

    try {
      channel.put(fetchRanking(RANKING_FOR_UI.DAILY_MALE_NOVEL, options));
      channel.put(fetchRanking(RANKING_FOR_UI.DAILY_FEMALE_NOVEL, options));
      finishMaleRequest({ novels: [novel(1)] });
      await maleResponse;

      const loaded = dispatch.mock.calls.map(([action]) => [
        action.payload.rankingMode,
        action.payload.items,
      ]);
      expect(loaded).toEqual(
        expect.arrayContaining([
          [RANKING_FOR_UI.DAILY_MALE_NOVEL, [1]],
          [RANKING_FOR_UI.DAILY_FEMALE_NOVEL, [2]],
        ]),
      );
      expect(loaded).toHaveLength(2);
    } finally {
      task.cancel();
      ranking.mockRestore();
    }
  });
});
