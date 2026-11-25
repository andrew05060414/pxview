import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import RNBootSplash
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    configureFirebaseIfValid()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "PxViewR",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(app, open: url, options: options)
  }

  func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }

  private func configureFirebaseIfValid() {
    guard FirebaseApp.app() == nil else {
      return
    }
    guard
      let plistPath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
      let dict = NSDictionary(contentsOfFile: plistPath)
    else {
      NSLog("[Firebase] GoogleService-Info.plist not found in bundle; running with Firebase disabled.")
      return
    }

    let projectId = (dict["PROJECT_ID"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let appId = (dict["GOOGLE_APP_ID"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let apiKey = (dict["API_KEY"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

    if isPlaceholder(projectId) || isPlaceholder(appId) || isPlaceholder(apiKey) {
      NSLog("[Firebase] Placeholder or incomplete GoogleService-Info.plist detected; skipping FirebaseApp.configure().")
      return
    }

    if let options = FirebaseOptions(contentsOfFile: plistPath) {
      FirebaseApp.configure(options: options)
    } else {
      NSLog("[Firebase] Invalid GoogleService-Info.plist format; skipping FirebaseApp.configure().")
    }
  }

  private func isPlaceholder(_ value: String) -> Bool {
    if value.isEmpty {
      return true
    }
    let lowered = value.lowercased()
    let markers = ["placeholder", "dummy", "example", "changeme", "your-project", "your_project"]
    if markers.contains(where: { lowered.contains($0) }) {
      return true
    }
    if lowered.hasPrefix("ci-") || lowered.hasPrefix("ci_") || lowered.hasSuffix("-ci") || lowered.hasSuffix("_ci") {
      return true
    }
    return false
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }

  override func customize(_ rootView: RCTRootView) {
    super.customize(rootView)
    RNBootSplash.initWithStoryboard("LaunchScreen", rootView: rootView)
  }
}
