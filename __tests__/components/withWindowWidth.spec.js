import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import withWindowWidth from '../../src/components/withWindowWidth';

describe('withWindowWidth', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('passes current width and re-renders on dimension change (subscription object API)', () => {
    let changeHandler = null;
    const removeSpy = jest.fn();
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 400, height: 800 });
    jest
      .spyOn(Dimensions, 'addEventListener')
      .mockImplementation((eventType, handler) => {
        if (eventType === 'change') {
          changeHandler = handler;
        }
        return { remove: removeSpy };
      });

    const Probe = ({ windowWidth }) => <div data-width={windowWidth} />;
    const Wrapped = withWindowWidth(Probe);
    let tree;
    act(() => {
      tree = renderer.create(<Wrapped />);
    });
    expect(tree.root.findByType(Probe).props.windowWidth).toBe(400);

    act(() => {
      changeHandler({ window: { width: 800, height: 1200 } });
    });
    expect(tree.root.findByType(Probe).props.windowWidth).toBe(800);

    tree.unmount();
    expect(removeSpy).toHaveBeenCalledTimes(1);
  });

  test('unmounts cleanly when Dimensions.addEventListener returns undefined (RN 0.63 legacy API)', () => {
    const removeEventListenerSpy = jest
      .spyOn(Dimensions, 'removeEventListener')
      .mockImplementation(() => {});
    jest.spyOn(Dimensions, 'get').mockReturnValue({ width: 360, height: 640 });
    jest
      .spyOn(Dimensions, 'addEventListener')
      .mockImplementation(() => undefined);

    const Probe = ({ windowWidth }) => <div data-width={windowWidth} />;
    const Wrapped = withWindowWidth(Probe);
    let tree;
    act(() => {
      tree = renderer.create(<Wrapped />);
    });
    expect(tree.root.findByType(Probe).props.windowWidth).toBe(360);

    // Unmounting should NOT throw TypeError: Cannot read property 'remove' of undefined
    expect(() => {
      tree.unmount();
    }).not.toThrow();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });
});
