import recommendedIllusts from '../../src/common/reducers/recommendedIllusts';
import {
  fetchRecommendedIllustsFailure,
  fetchRecommendedIllustsSuccess,
  fetchRecommendedIllusts,
} from '../../src/common/actions/recommendedIllusts';

describe('network recovery reducer state', () => {
  it('clears the previous error when a failed list is retried and succeeds', () => {
    const failed = recommendedIllusts(
      undefined,
      fetchRecommendedIllustsFailure(),
    );
    expect(failed.error).toBe(true);
    expect(failed.loaded).toBe(false);

    const retrying = recommendedIllusts(
      failed,
      fetchRecommendedIllusts(undefined, undefined, true),
    );
    expect(retrying.error).toBe(false);
    expect(retrying.loading).toBe(true);

    const recovered = recommendedIllusts(
      retrying,
      fetchRecommendedIllustsSuccess({}, [], null),
    );
    expect(recovered.error).toBe(false);
    expect(recovered.loaded).toBe(true);
  });
});
