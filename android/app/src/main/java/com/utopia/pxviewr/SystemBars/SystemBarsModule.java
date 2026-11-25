package com.utopia.pxviewr.SystemBars;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.Window;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class SystemBarsModule extends ReactContextBaseJavaModule {

  public static final String NAME = "SystemBars";
  private static final int LIGHT_STATUS_BAR_SCRIM = Color.rgb(33, 123, 178);
  private static final int DARK_STATUS_BAR_SCRIM = Color.parseColor("#1a1a1a");

  public SystemBarsModule(ReactApplicationContext reactContext) {
    super(reactContext);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @SuppressWarnings("deprecation")
  public static void applyTransparentNavigationBar(Activity activity, boolean isDark) {
    if (activity == null) {
      return;
    }
    Window window = activity.getWindow();
    if (window == null) {
      return;
    }

    WindowCompat.setDecorFitsSystemWindows(window, false);

    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
      window.setNavigationBarColor(Color.TRANSPARENT);
      window.setStatusBarColor(Color.TRANSPARENT);
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      window.setNavigationBarContrastEnforced(false);
    }

    View decorView = window.getDecorView();
    if (decorView != null) {
      WindowInsetsControllerCompat controller =
          WindowCompat.getInsetsController(window, decorView);
      if (controller != null) {
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(!isDark);
      }
    }

    final View contentView = activity.findViewById(android.R.id.content);
    if (contentView != null) {
      contentView.setBackgroundColor(isDark ? DARK_STATUS_BAR_SCRIM : LIGHT_STATUS_BAR_SCRIM);
      ViewCompat.setOnApplyWindowInsetsListener(
          contentView,
          (v, insets) -> {
            Insets topBars =
                insets.getInsets(
                    WindowInsetsCompat.Type.statusBars()
                        | WindowInsetsCompat.Type.displayCutout());
            if (v.getPaddingTop() != topBars.top || v.getPaddingBottom() != 0) {
              v.setPadding(v.getPaddingLeft(), topBars.top, v.getPaddingRight(), 0);
            }
            return insets;
          });
      ViewCompat.requestApplyInsets(contentView);
    }
  }

  @ReactMethod
  public void setNavigationBarTheme(final boolean isDark) {
    final Activity activity = getCurrentActivity();
    if (activity == null) {
      return;
    }
    activity.runOnUiThread(() -> applyTransparentNavigationBar(activity, isDark));
  }

  @ReactMethod
  public void getNavigationBarInsetBottom(final Promise promise) {
    final Activity activity = getCurrentActivity();
    if (activity == null) {
      promise.resolve(0);
      return;
    }
    activity.runOnUiThread(
        () -> {
          int insetPx = 0;
          Window window = activity.getWindow();
          View decorView = window != null ? window.getDecorView() : null;
          if (decorView != null) {
            WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(decorView);
            if (insets != null) {
              insetPx = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
            }
          }
          DisplayMetrics metrics = activity.getResources().getDisplayMetrics();
          float density = metrics != null && metrics.density > 0 ? metrics.density : 1f;
          promise.resolve(insetPx / density);
        });
  }
}
