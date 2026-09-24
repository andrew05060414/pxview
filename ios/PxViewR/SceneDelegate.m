#import <UIKit/UIKit.h>

#import "AppDelegate.h"

@interface SceneDelegate : UIResponder <UIWindowSceneDelegate>

@property (nonatomic, strong) UIWindow *window;

@end

@implementation SceneDelegate

- (void)scene:(UIScene *)scene
    willConnectToSession:(UISceneSession *)session
               options:(UISceneConnectionOptions *)connectionOptions
{
  if (![scene isKindOfClass:[UIWindowScene class]]) {
    return;
  }

    AppDelegate *appDelegate = (AppDelegate *)UIApplication.sharedApplication.delegate;
    self.window = [[UIWindow alloc] initWithWindowScene:(UIWindowScene *)scene];
    self.window.backgroundColor = UIColor.whiteColor;
    self.window.rootViewController = appDelegate.rootViewController;
    appDelegate.window = self.window;
    appDelegate.rootViewController.view.frame = self.window.bounds;
    appDelegate.rootViewController.view.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;
    [self.window makeKeyAndVisible];
  }

@end
