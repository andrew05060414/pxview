import React from 'react';
import renderer, { act } from 'react-test-renderer';
import UgoiraView from '../../src/components/UgoiraView';

describe('UgoiraView (cross-platform JS frame player)', () => {
  const originalRaf = global.requestAnimationFrame;
  const originalCancelRaf = global.cancelAnimationFrame;

  beforeEach(() => {
    let nextId = 1;
    global.requestAnimationFrame = jest.fn(() => nextId++);
    global.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRaf;
    global.cancelAnimationFrame = originalCancelRaf;
    jest.restoreAllMocks();
  });

  it('renders current frame image and cancels animation frame on unmount', () => {
    const frames = [
      { uri: 'file:///cache/000000.jpg', delay: 100 },
      { uri: 'file:///cache/000001.jpg', delay: 100 },
    ];
    let tree;
    act(() => {
      tree = renderer.create(
        <UgoiraView
          images={frames}
          paused={false}
          width={300}
          height={200}
          resizeMode="contain"
        />,
      );
    });

    const image = tree.root.findByType('Image');
    expect(image.props.source).toEqual({ uri: 'file:///cache/000000.jpg' });
    expect(global.requestAnimationFrame).toHaveBeenCalledTimes(1);

    act(() => {
      tree.unmount();
    });
    expect(global.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('returns null safely when images is empty', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <UgoiraView images={[]} width={300} height={200} resizeMode="contain" />,
      );
    });
    expect(tree.toJSON()).toBeNull();
  });
});
