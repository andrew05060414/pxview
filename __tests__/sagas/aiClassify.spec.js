import { call, put, select, delay } from 'redux-saga/effects';
import {
  handleClassifyBookmarks,
  normalizeClassificationResults,
  getAiSettings,
  getBookmarkItems,
  getClassificationsState,
} from '../../src/common/sagas/aiClassify';
import {
  classifyBatch,
  classifyProgress,
  classifyFailure,
} from '../../src/common/actions/classifications';
import {
  sendChatRequest,
  buildClassificationMessages,
} from '../../src/common/helpers/llmClient';

describe('aiClassify saga', () => {
  const validAiSettings = {
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test',
    model: 'gpt-4o-mini',
    maxBatchSize: 2,
  };

  const sampleBookmarks = {
    1: { id: '1', title: 'Work 1', tags: ['art'], userName: 'Artist 1' },
    2: { id: '2', title: 'Work 2', tags: ['story'], userName: 'Author 2' },
  };

  const sampleClassState = {
    categories: ['Cat A', 'Cat B'],
    items: {},
  };

  test('fails if AI settings are incomplete', () => {
    const gen = handleClassifyBookmarks();
    expect(gen.next().value).toEqual(select(getAiSettings));
    expect(gen.next({ baseUrl: '' }).value).toEqual(
      put(
        classifyFailure(
          'AI settings incomplete: Please configure API Base URL and API Key',
        ),
      ),
    );
    expect(gen.next().done).toBe(true);
  });

  test('fails if no bookmarks are available', () => {
    const gen = handleClassifyBookmarks();
    expect(gen.next().value).toEqual(select(getAiSettings));
    expect(gen.next(validAiSettings).value).toEqual(select(getBookmarkItems));
    expect(gen.next({}).value).toEqual(select(getClassificationsState));
    expect(gen.next(sampleClassState).value).toEqual(
      put(classifyFailure('No bookmarks available to classify')),
    );
    expect(gen.next().done).toBe(true);
  });

  test('succeeds immediately if all items are already classified', () => {
    const gen = handleClassifyBookmarks();
    expect(gen.next().value).toEqual(select(getAiSettings));
    expect(gen.next(validAiSettings).value).toEqual(select(getBookmarkItems));
    expect(gen.next(sampleBookmarks).value).toEqual(
      select(getClassificationsState),
    );
    expect(
      gen.next({
        categories: ['Cat A'],
        items: { 1: 'Cat A', 2: 'Cat A' },
      }).value,
    ).toEqual(
      put({
        type: 'PIXIV/CLASSIFICATIONS_CLASSIFY_SUCCESS',
        payload: { timestamp: expect.any(Number) },
      }),
    );
    expect(gen.next().done).toBe(true);
  });

  test('classifies unclassified items in batches', () => {
    const gen = handleClassifyBookmarks();
    expect(gen.next().value).toEqual(select(getAiSettings));
    expect(gen.next(validAiSettings).value).toEqual(select(getBookmarkItems));
    expect(gen.next(sampleBookmarks).value).toEqual(
      select(getClassificationsState),
    );

    const batch = [sampleBookmarks[1], sampleBookmarks[2]];
    const messages = buildClassificationMessages(
      batch,
      sampleClassState.categories,
    );

    // First batch call
    expect(gen.next(sampleClassState).value).toEqual(
      call(sendChatRequest, validAiSettings, messages),
    );

    const mockResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify([
              { id: '1', category: 'Cat A' },
              { id: '2', category: 'Cat B' },
            ]),
          },
        },
      ],
    };

    expect(gen.next(mockResponse).value).toEqual(
      put(
        classifyBatch([
          { id: '1', category: 'Cat A' },
          { id: '2', category: 'Cat B' },
        ]),
      ),
    );

    expect(gen.next().value).toEqual(put(classifyProgress(2, 2)));
    expect(gen.next().value).toEqual(delay(300));
    expect(gen.next().value).toEqual(
      put({
        type: 'PIXIV/CLASSIFICATIONS_CLASSIFY_SUCCESS',
        payload: { timestamp: expect.any(Number) },
      }),
    );
    expect(gen.next().done).toBe(true);
  });

  test('separates same-id illust and novel classifications and drops ambiguous raw matches', () => {
    const illustItem = {
      id: '123',
      type: 'illust',
      title: 'Art 123',
      tags: [],
      userName: 'U1',
    };
    const novelItem = {
      id: '123',
      type: 'novel',
      title: 'Novel 123',
      tags: [],
      userName: 'U2',
    };
    const uniqueNovel = {
      id: '456',
      type: 'novel',
      title: 'Unique Novel',
      tags: [],
      userName: 'U3',
    };
    const normalized = normalizeClassificationResults(
      [
        { id: 'illust:123', category: '风景' },
        { id: 'novel:123', category: '恋爱' },
        { id: '456', category: '日常' },
        { id: '123', category: 'AmbiguousShouldBeIgnored' },
      ],
      [illustItem, novelItem, uniqueNovel],
    );
    expect(normalized).toEqual([
      { id: 'illust:123', category: '风景' },
      { id: 'novel:123', category: '恋爱' },
      { id: 'novel:456', category: '日常' },
    ]);
  });
});
