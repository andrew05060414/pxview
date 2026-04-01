# Testing

## Current Coverage Snapshot
- Jest is the only explicit test runner configured, via the `test` and `test:watch` scripts in `package.json`.
- Jest config is embedded directly in `package.json`.
- Visible automated test coverage is limited to a single saga spec: `__tests__/sagas/auth.spec.js`.
- Mock modules live in `__mocks__/react-native-localization.js` and `__mocks__/react-native-device-info.js`.

## What Is Being Tested
- `__tests__/sagas/auth.spec.js` exercises auth saga control flow using `@redux-saga/testing-utils`.
- The auth tests validate generator behavior for:
  - authorize/token exchange
  - refresh token flow
  - logout behavior
  - signup flow
  - rehydrate flow
- Tests focus on yielded saga effects rather than mounted UI behavior.

## What Is Not Covered
- No visible component tests for `src/components/`.
- No screen tests for `src/screens/`.
- No selector tests for `src/common/selectors/index.js`.
- No reducer tests for the many Redux slices.
- No native Android/iOS unit tests beyond the default iOS test target scaffold under `ios/PxViewRTests/`.
- No end-to-end mobile automation is present in the repo.

## Mocking Strategy
- Tests rely on static mocks and saga-effect assertions rather than full app integration.
- The auth test imports the real helper module path `src/common/helpers/apiClient` but asserts yielded `apply(...)` effects instead of making network calls.
- Device and localization dependencies are mocked through the `__mocks__/` directory.

## Verification Workflow In Practice
- Expected local checks from `README.md` are:
  - `npm test`
  - `npm run lint`
- Native smoke testing is likely manual through:
  - `npm run android`
  - `npm run ios`
- Because the app is React Native and content-heavy, visual/manual checks on detail, reader, search, and login flows are still important.

## Testability Characteristics
- Saga slices are fairly testable because side effects are isolated in `src/common/sagas/`.
- Selectors are also testable in principle, but `src/common/selectors/index.js` is large and would benefit from being split for focused unit tests.
- UI layers mix hooks, class components, navigation, and localization injection, which raises the setup cost for component tests.

## Major Gaps
- No regression coverage for the Pixiv reader/detail experiences that define the product.
- No explicit tests around NSFW/equb content parsing in `src/common/helpers/novelTextParser.js`.
- No tests around persistence migration in `src/common/store/getStoredStateMigrateToFileSystemStorage.js`.
- No visible CI gate to ensure tests/lint actually run on every change.

## Recommended Next Testing Areas
- Add selector tests for the mute/highlight filtering logic in `src/common/selectors/index.js`.
- Add reducer tests for high-risk persisted settings and entity mutation in `src/common/reducers/entities.js`.
- Add helper tests for PKCE, deep-link parsing, and novel parsing helpers.
- Add smoke coverage for login, detail, and reader navigation flows before major refactors.
