jest.mock('react-native', () => ({
  View: 'View',
  Image: 'Image',
  StyleSheet: {
    create: (styles) => styles,
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Platform: {
    OS: 'android',
  },
  StatusBar: {
    currentHeight: 24,
  },
}));

jest.mock('react-native-zoom-toolkit', () => ({
  ResumableZoom: 'ResumableZoom',
}));

import React from 'react';
import PXPhotoView from '../../src/components/PXPhotoView';

describe('PXPhotoView component', () => {
  it('instantiates with default props and initial unzoomed state', () => {
    const view = new PXPhotoView({ ...PXPhotoView.defaultProps, uri: 'https://example.com/test.jpg' });
    expect(view.props.uri).toBe('https://example.com/test.jpg');
    expect(view.props.minScale).toBe(1);
    expect(view.props.maxScale).toBe(3);
    expect(view.state.isZoomed).toBe(false);
  });

  it('calls onLoad with image uri when loaded', () => {
    const onLoad = jest.fn();
    const uri = 'https://example.com/test.jpg';
    const view = new PXPhotoView({ uri, onLoad });
    view.handleOnLoad();
    expect(onLoad).toHaveBeenCalledWith(uri);
  });

  it('calls onTap or onViewTap when single tapped', () => {
    const onTap = jest.fn();
    const viewWithOnTap = new PXPhotoView({ uri: 'https://example.com/test.jpg', onTap });
    viewWithOnTap.handleTap({ x: 100, y: 100 });
    expect(onTap).toHaveBeenCalledWith({ x: 100, y: 100 });

    const onViewTap = jest.fn();
    const viewWithOnViewTap = new PXPhotoView({ uri: 'https://example.com/test.jpg', onViewTap });
    viewWithOnViewTap.handleTap({ x: 150, y: 150 });
    expect(onViewTap).toHaveBeenCalledWith({ x: 150, y: 150 });
  });

  it('updates isZoomed flag on gesture end based on zoom ref state', () => {
    const view = new PXPhotoView({ ...PXPhotoView.defaultProps, uri: 'https://example.com/test.jpg' });
    view.setState = jest.fn((newState) => {
      Object.assign(view.state, newState);
    });

    // When scale > 1.05, should be zoomed
    view.zoomRef = { current: { getState: () => ({ scale: 1.5 }) } };
    view.handleGestureEnd();
    expect(view.setState).toHaveBeenCalledWith({ isZoomed: true });
    expect(view.state.isZoomed).toBe(true);

    // When scale resets to 1.0, should reset isZoomed to false
    view.zoomRef = { current: { getState: () => ({ scale: 1.0 }) } };
    view.handleGestureEnd();
    expect(view.setState).toHaveBeenCalledWith({ isZoomed: false });
    expect(view.state.isZoomed).toBe(false);
  });
});
