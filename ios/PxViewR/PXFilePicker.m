#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <UniformTypeIdentifiers/UniformTypeIdentifiers.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>

@interface PXFilePicker : NSObject <RCTBridgeModule, UIDocumentPickerDelegate>
@property (nonatomic, copy) RCTPromiseResolveBlock pendingResolve;
@property (nonatomic, copy) RCTPromiseRejectBlock pendingReject;
@end

@implementation PXFilePicker

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

RCT_EXPORT_METHOD(pickJsonFile:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    if (self.pendingResolve != nil) {
      reject(@"E_PICKER_BUSY", @"File picker is already open", nil);
      return;
    }

    UIViewController *presenter = RCTPresentedViewController();
    if (!presenter) {
      reject(@"E_NO_VIEW_CONTROLLER", @"Unable to find presenter view controller", nil);
      return;
    }

    self.pendingResolve = resolve;
    self.pendingReject = reject;

    UIDocumentPickerViewController *picker =
      [[UIDocumentPickerViewController alloc]
        initForOpeningContentTypes:@[UTTypeJSON, UTTypePlainText]
                            asCopy:YES];
    picker.delegate = self;
    picker.allowsMultipleSelection = NO;
    [presenter presentViewController:picker animated:YES completion:nil];
  });
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller
didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  RCTPromiseRejectBlock reject = self.pendingReject;
  self.pendingResolve = nil;
  self.pendingReject = nil;

  if (!resolve || urls.count == 0) {
    if (resolve) {
      resolve([NSNull null]);
    }
    return;
  }

  NSURL *url = urls.firstObject;
  BOOL didStartAccessing = [url startAccessingSecurityScopedResource];
  NSError *error = nil;
  NSString *content = [NSString stringWithContentsOfURL:url
                                               encoding:NSUTF8StringEncoding
                                                  error:&error];
  if (didStartAccessing) {
    [url stopAccessingSecurityScopedResource];
  }

  if (error || !content) {
    if (reject) {
      reject(@"E_READ_FAILED", error.localizedDescription ?: @"Unable to read selected file", error);
    }
    return;
  }

  resolve(@{
    @"uri": url.absoluteString ?: @"",
    @"content": content,
  });
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller
{
  RCTPromiseResolveBlock resolve = self.pendingResolve;
  self.pendingResolve = nil;
  self.pendingReject = nil;
  if (resolve) {
    resolve([NSNull null]);
  }
}

@end
