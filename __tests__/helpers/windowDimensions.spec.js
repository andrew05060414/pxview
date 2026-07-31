import { Dimensions } from 'react-native';
import { globalStyleVariables } from '../../src/styles';

describe('window dimension helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('reads the current window size instead of a startup snapshot', () => {
    const dimensions = jest.spyOn(Dimensions, 'get');
    dimensions
      .mockReturnValueOnce({ width: 800, height: 1200 })
      .mockReturnValueOnce({ width: 1200, height: 800 });

    expect(globalStyleVariables.getWindowWidth()).toBe(800);
    expect(globalStyleVariables.getWindowHeight()).toBe(800);
  });
});
