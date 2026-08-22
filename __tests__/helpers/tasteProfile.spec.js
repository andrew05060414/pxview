import {
  buildTasteProfile,
  scoreItemByTaste,
  rankItemsByTaste,
  buildTasteSummaryPrompt,
} from '../../src/common/helpers/tasteProfile';

describe('tasteProfile', () => {
  const sampleItems = [
    {
      id: '1',
      title: 'Item 1',
      type: 'illust',
      tags: ['Genshin', 'Furina'],
      userId: 'u1',
      totalBookmarks: 2000,
    },
    {
      id: '2',
      title: 'Item 2',
      type: 'novel',
      tags: ['Genshin', 'Story'],
      userId: 'u1',
      totalBookmarks: 1000,
      textLength: 20000,
    },
    {
      id: '3',
      title: 'Item 3',
      type: 'novel',
      tags: ['Arknights'],
      userId: 'u2',
      totalBookmarks: 500,
      textLength: 40000,
    },
  ];

  const classificationsMap = {
    1: '同人/二次创作',
    2: '奇幻/异世界',
  };

  test('buildTasteProfile calculates weights, ratios, and averages', () => {
    const profile = buildTasteProfile(sampleItems, classificationsMap);
    expect(profile.total).toBe(3);
    expect(profile.tagWeights.genshin).toBeCloseTo(2 / 3, 2);
    expect(profile.authorWeights.u1).toBeCloseTo(2 / 3, 2);
    expect(profile.typeRatio.illust).toBeCloseTo(0.33, 2);
    expect(profile.typeRatio.novel).toBeCloseTo(0.67, 2);
    expect(profile.preferredLength.avg).toBe(30000);
    expect(profile.topCategories['同人/二次创作']).toBe(1);
  });

  test('handles empty bookmark items', () => {
    const emptyProfile = buildTasteProfile([]);
    expect(emptyProfile.total).toBe(0);
    expect(emptyProfile.tagWeights).toEqual({});
  });

  test('scoreItemByTaste scores items based on tags and author', () => {
    const profile = buildTasteProfile(sampleItems, classificationsMap);

    const goodCandidate = {
      id: '10',
      title: 'Good Candidate',
      tags: ['genshin', 'furina'],
      userId: 'u1',
      totalBookmarks: 3000,
    };
    const score = scoreItemByTaste(goodCandidate, profile);
    expect(score).toBeGreaterThan(10);

    // Muted candidate
    const muted = scoreItemByTaste(goodCandidate, profile, ['furina']);
    expect(muted).toBe(-1);
  });

  test('rankItemsByTaste sorts candidates by taste score and excludes muted items', () => {
    const profile = buildTasteProfile(sampleItems, classificationsMap);
    const candidates = [
      { id: 'c1', tags: ['other'], userId: 'u9' },
      { id: 'c2', tags: ['genshin'], userId: 'u1' },
      { id: 'c3', tags: ['muted_tag'], userId: 'u1' },
    ];

    const ranked = rankItemsByTaste(candidates, profile, ['muted_tag']);
    expect(ranked.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  test('buildTasteSummaryPrompt formats system and user prompt with profile data', () => {
    const profile = buildTasteProfile(sampleItems, classificationsMap);
    const prompt = buildTasteSummaryPrompt(profile);
    expect(prompt).toHaveLength(2);
    expect(prompt[0].role).toBe('system');
    expect(prompt[1].role).toBe('user');
    expect(prompt[1].content).toContain('我的收藏总数: 3');
  });
});
