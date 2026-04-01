# Conventions

## Language And Style
- JavaScript is the dominant language; Flow annotations appear in some shared infrastructure files such as `src/common/store/getStoredStateMigrateToFileSystemStorage.js`.
- Formatting/style rules are enforced through Airbnb + hooks + Prettier in `.eslintrc`.
- Single quotes and trailing commas are preferred per `.eslintrc`.
- JSX lives in `.js` files rather than `.jsx`.

## Redux Slice Pattern
- Feature slices usually follow a repeatable trio:
  - action creators in `src/common/actions/<slice>.js`
  - reducer in `src/common/reducers/<slice>.js`
  - saga in `src/common/sagas/<slice>.js`
- Action constants are generated with `redux-define` in `src/common/constants/actionTypes.js`.
- Request lifecycles commonly use `.REQUEST`, `.SUCCESS`, `.FAILURE`, with optional `.CLEAR`, `.CLEAR_ALL`, `.ADD`, `.REMOVE`, `.SET`, or `.RESTORE`.
- Reducers usually keep `loading`, `loaded`, `refreshing`, `items`, pagination, and timestamps.

## Entity And Selector Conventions
- Network responses are normalized before storage, then denormalized in selectors.
- Shared entities are merged into `src/common/reducers/entities.js`.
- Selector factories are preferred for route-bound data needs, using names like `makeGetUserIllustsItems` in `src/common/selectors/index.js`.
- Memoization is customized with shallow equality and domain-specific comparisons in `src/common/selectors/index.js`.

## UI Composition
- Route screens live under `src/screens/`.
- Reusable presentational pieces live under `src/components/`.
- Connected wrappers and modal bridges live under `src/containers/`.
- The codebase mixes class components and function components; newer/simple surfaces often use hooks while older screens remain class-based.
- The custom `PX*` component family acts as an internal design system, for example `src/components/PXImage.js`, `src/components/PXTouchable.js`, and `src/components/PXSearchBar.js`.

## Localization And Theme
- Localization is context-driven through `src/components/Localization/LocalizationProvider.js` and `src/components/Localization/connectLocalization.js`.
- Screens/components commonly expect injected `i18n` and `lang` props rather than importing strings directly.
- Theme colors are read from React Native Paper and shared style helpers in `src/styles/index.js`.
- Global string catalogs are JSON-based under `src/common/constants/strings/`.

## Persistence Conventions
- Important user-state slices are whitelisted in `src/common/store/configureStore.js`.
- Manual backup/restore only covers selected settings/history slices, also in `src/screens/MyPage/Backup.js`.
- Migrations are handled in store setup instead of separate migration modules per slice.

## Error Handling
- Network sagas usually catch exceptions, dispatch a local failure action, then dispatch `addError(...)`, for example `src/common/sagas/recommendedIllusts.js`.
- Some UI flows swallow errors with empty catches, notably `src/screens/MyPage/Backup.js`.
- Console noise is disabled in production in `src/screens/App/Root.js`.

## Naming And File Organization
- Files are predominantly PascalCase for components/screens and camelCase for common modules.
- Constants use upper snake case in `src/common/constants/actionTypes.js`.
- Platform-specific component splits use suffixes like `.android.js` and `.ios.js`, for example `src/components/UgoiraView.android.js`.
- Legacy and current navigation code coexist; active navigation is in `src/navigations/*.js`, while `src/navigations/routeConfigs/` looks partially historical.

## Repeated Implementation Patterns
- Many feature sagas are near-clones with different Pixiv endpoints.
- Many reducers share the same request-success-failure shape.
- Screens often own direct navigation-header configuration and view-specific side effects.
- This repetition makes the codebase easy to pattern-match, but expensive to update globally.
