package com.utopia.pxviewr.SystemBars;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowManager;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SystemBarsModule extends ReactContextBaseJavaModule {

  public static final String NAME = "SystemBars";

  public SystemBarsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  public static void applyTransparentNavigationBar(Activity activity, boolean isDark) {
    if (activity == null) {
      return;
    }
    Window window = activity.getWindow();
    if (window == null) {
      return;
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
      window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_NAVIGATION);
      window.setNavigationBarColor(Color.TRANSPARENT);
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.setNavigationBarContrastEnforced(false);
    }
    View decorView = window.getDecorView();
    if (decorView != null) {
      int flags = decorView.getSystemUiVisibility();
      flags |= View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        if (isDark) {
          flags &= ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        } else {
          flags |= View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
        }
      }
      decorView.setSystemUiVisibility(flags);
    }
    final View contentView = activity.findViewById(android.R.id.content);
    if (contentView != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
      contentView.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
        @Override
        public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
          int topInset = insets.getSystemWindowInsetTop();
          if (v.getPaddingTop() != topInset || v.getPaddingBottom() != 0) {
            v.setPadding(v.getPaddingLeft(), topInset, v.getPaddingRight(), 0);
          }
          return insets;
        }
      });
      contentView.requestApplyInsets();
    }
  }

  @ReactMethod
  public void setNavigationBarTheme(final boolean isDark) {
    final Activity activity = getCurrentActivity();
    if (activity == null) {
      return;
    }
    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        applyTransparentNavigationBar(activity, isDark);
      }
    });
  }

  @ReactMethod
  public void getNavigationBarInsetBottom(final Promise promise) {
    final Activity activity = getCurrentActivity();
    if (activity == null) {
      promise.resolve(0);
      return;
    }
    activity.runOnUiThread(new Runnable() {
      @Override
      public void run() {
        int insetPx = 0;
        Window window = activity.getWindow();
        View decorView = window != null ? window.getDecorView() : null;
        if (decorView != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          WindowInsets insets = decorView.getRootWindowInsets();
          if (insets != null) {
            insetPx = insets.getSystemWindowInsetBottom();
          }
        }
        DisplayMetrics metrics = activity.getResources().getDisplayMetrics();
        float density = metrics != null && metrics.density > 0 ? metrics.density : 1f;
        promise.resolve(insetPx / density);
      }
    });
  }
}
