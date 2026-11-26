#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node24.sh"

"$REPO_ROOT/scripts/test-jest.sh"

DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export DEVELOPER_DIR
XCODEBUILD="${XCODEBUILD:-/usr/bin/xcodebuild}"

XCODE_SDK="${PXVIEW_IOS_SDK:-iphonesimulator}"
XCODE_DESTINATION="${PXVIEW_IOS_DESTINATION:-generic/platform=iOS Simulator}"
DERIVED_DATA="${PXVIEW_IOS_DERIVED_DATA:-build}"
XCODE_ARCHS="${PXVIEW_IOS_ARCHS:-arm64}"
CODE_SIGNING_ALLOWED="${PXVIEW_IOS_CODE_SIGNING_ALLOWED:-NO}"
CODE_SIGNING_REQUIRED="${PXVIEW_IOS_CODE_SIGNING_REQUIRED:-NO}"
CODE_SIGN_IDENTITY="${PXVIEW_IOS_CODE_SIGN_IDENTITY:-}"

cd "$REPO_ROOT/ios"
"$XCODEBUILD" \
  -workspace PxViewR.xcworkspace \
  -scheme PxViewR \
  -configuration Release \
  -sdk "$XCODE_SDK" \
  -destination "$XCODE_DESTINATION" \
  -derivedDataPath "$DERIVED_DATA" \
  ARCHS="$XCODE_ARCHS" \
  ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED="$CODE_SIGNING_ALLOWED" \
  CODE_SIGNING_REQUIRED="$CODE_SIGNING_REQUIRED" \
  CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" \
  build
