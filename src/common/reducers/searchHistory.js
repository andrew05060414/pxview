import { SEARCH_HISTORY } from '../constants/actionTypes';

export default function searchHistory(
  state = {
    items: [],
  },
  action = {},
) {
  switch (action.type) {
    case SEARCH_HISTORY.ADD: {
      let newItems;
      const { items } = state;
      const newItem = action.payload.item;
      if (items && items.length) {
        newItems = [
          newItem,
          ...items.filter((item) => item !== newItem).slice(0, 99),
        ];
      } else {
        newItems = [newItem];
      }
      return {
        ...state,
        items: newItems,
      };
    }
    case SEARCH_HISTORY.REMOVE:
      return {
        ...state,
        items: state.items.filter((item) => item !== action.payload.item),
      };
    case SEARCH_HISTORY.CLEAR:
      return {
        ...state,
        items: [],
      };
    case SEARCH_HISTORY.RESTORE: {
      const restored = action.payload && action.payload.state;
      const validItems =
        restored && Array.isArray(restored.items)
          ? restored.items.filter((item) => typeof item === 'string')
          : state.items;
      return {
        ...state,
        items: validItems,
      };
    }
    default:
      return state;
  }
}
