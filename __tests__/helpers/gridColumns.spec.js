import { getResponsiveGridColumns } from '../../src/common/helpers/gridColumns';

describe('getResponsiveGridColumns', () => {
  test('keeps 3 columns on phone widths', () => {
    expect(getResponsiveGridColumns(360)).toBe(3);
    expect(getResponsiveGridColumns(411)).toBe(3);
    expect(getResponsiveGridColumns(599)).toBe(3);
  });

  test('uses 4 columns on unfolded foldable widths', () => {
    expect(getResponsiveGridColumns(600)).toBe(4);
    expect(getResponsiveGridColumns(768)).toBe(4);
    expect(getResponsiveGridColumns(899)).toBe(4);
  });

  test('uses 5 columns on tablet / unfolded landscape widths', () => {
    expect(getResponsiveGridColumns(900)).toBe(5);
    expect(getResponsiveGridColumns(1280)).toBe(5);
  });

  test('falls back to base columns for invalid width', () => {
    expect(getResponsiveGridColumns(undefined)).toBe(3);
    expect(getResponsiveGridColumns(0)).toBe(3);
    expect(getResponsiveGridColumns(-100)).toBe(3);
    expect(getResponsiveGridColumns(undefined, 2)).toBe(2);
  });
});
