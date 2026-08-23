import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Dimensions } from 'react-native';
import withWindowWidth from '../../src/components/withWindowWidth';

describe('withWindowWidth', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('passes current width and re-renders on dimension change', () => {
    let changeHandler = null;
    jest
      .spyOn(Dimensions, 'get')
      .mockReturnValue({ width: 400, height: 800 });
    jest
      .spyOn(Dimensions, 'addEventListener')
      .mockImplementation((eventType, handler) => {
        if (eventType === 'change') {
          changeHandler = handler;
        }
        return { remove: jest.fn() };
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
  });
});
