#import <Foundation/Foundation.h>
#import <Photos/Photos.h>
#import <React/RCTBridgeModule.h>

@interface PXPhotoSaver : NSObject <RCTBridgeModule>
@end

@implementation PXPhotoSaver

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

RCT_EXPORT_METHOD(saveImage:(NSString *)filePath
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  if (!filePath || filePath.length == 0) {
    reject(@"E_INVALID_PATH", @"Image file path is empty", nil);
    return;
  }

  NSURL *fileURL = [filePath hasPrefix:@"file://"]
    ? [NSURL URLWithString:filePath]
    : [NSURL fileURLWithPath:filePath];

  if (!fileURL || !fileURL.isFileURL) {
    reject(@"E_INVALID_PATH", @"Invalid image file URL", nil);
    return;
  }

  void (^performSave)(void) = ^{
    [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
      [PHAssetChangeRequest creationRequestForAssetFromImageAtFileURL:fileURL];
    } completionHandler:^(BOOL success, NSError * _Nullable error) {
      if (success) {
        resolve(@(YES));
      } else {
        reject(
          @"E_UNABLE_TO_SAVE",
          error.localizedDescription ?: @"Unable to save image to photo library",
          error
        );
      }
    }];
  };

  if (@available(iOS 14, *)) {
    PHAuthorizationStatus status =
      [PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelAddOnly];
    if (status == PHAuthorizationStatusAuthorized || status == PHAuthorizationStatusLimited) {
      performSave();
    } else if (status == PHAuthorizationStatusNotDetermined) {
      [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelAddOnly
                                                 handler:^(PHAuthorizationStatus newStatus) {
        if (newStatus == PHAuthorizationStatusAuthorized || newStatus == PHAuthorizationStatusLimited) {
          performSave();
        } else {
          reject(@"E_PHOTO_LIBRARY_AUTH_DENIED", @"Access to photo library was denied", nil);
        }
      }];
    } else {
      reject(@"E_PHOTO_LIBRARY_AUTH_DENIED", @"Access to photo library was denied", nil);
    }
  } else {
    [PHPhotoLibrary requestAuthorization:^(PHAuthorizationStatus status) {
      if (status == PHAuthorizationStatusAuthorized) {
        performSave();
      } else {
        reject(@"E_PHOTO_LIBRARY_AUTH_DENIED", @"Access to photo library was denied", nil);
      }
    }];
  }
}

@end
