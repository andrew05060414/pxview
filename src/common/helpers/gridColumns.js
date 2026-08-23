// Column breakpoints for responsive grids: phones stay at the classic
// 3-column layout, unfolded foldables / tablets gain columns so thumbnails
// do not blow up on wide windows.
export const GRID_COLUMN_BREAKPOINTS = [
  { minWidth: 900, columns: 5 },
  { minWidth: 600, columns: 4 },
];

export const getResponsiveGridColumns = (windowWidth, baseColumns = 3) => {
  if (!windowWidth || windowWidth <= 0) {
    return baseColumns;
  }
  const matched = GRID_COLUMN_BREAKPOINTS.find(
    (breakpoint) => windowWidth >= breakpoint.minWidth,
  );
  return matched ? matched.columns : baseColumns;
};
