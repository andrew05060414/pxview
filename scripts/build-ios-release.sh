#!/usr/bin/env sh
set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

. "$REPO_ROOT/scripts/use-node14.sh"

"$REPO_ROOT/scripts/test-jest.sh"
"$REPO_ROOT/scripts/bundle-ios-release.sh"

DEVELOPER_DIR="${DEVELOPER_DIR:-/Applications/Xcode.app/Contents/Developer}"
export DEVELOPER_DIR

NODE_BINARY="$PXVIEW_NODE"
export NODE_BINARY
export PATH="$(dirname "$PXVIEW_NODE"):$PATH"
export REACT_NATIVE_MAX_WORKERS=1
XCODEBUILD="${XCODEBUILD:-/usr/bin/xcodebuild}"

XCODE_SDK="${PXVIEW_IOS_SDK:-iphoneos}"
XCODE_DESTINATION="${PXVIEW_IOS_DESTINATION:-generic/platform=iOS}"
DERIVED_DATA="${PXVIEW_IOS_DERIVED_DATA:-build}"
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
  CODE_SIGNING_ALLOWED="$CODE_SIGNING_ALLOWED" \
  CODE_SIGNING_REQUIRED="$CODE_SIGNING_REQUIRED" \
  CODE_SIGN_IDENTITY="$CODE_SIGN_IDENTITY" \
  clean build
