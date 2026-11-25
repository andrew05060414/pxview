package com.utopia.pxviewr.FilePicker;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public class PXFilePickerModule extends ReactContextBaseJavaModule implements ActivityEventListener {

  public static final String NAME = "PXFilePicker";
  private static final int PICK_JSON_REQUEST_CODE = 51091;
  private static final int MAX_BACKUP_BYTES = 20 * 1024 * 1024;

  private Promise pendingPromise;

  public PXFilePickerModule(ReactApplicationContext reactContext) {
    super(reactContext);
    reactContext.addActivityEventListener(this);
  }

  @Override
  public String getName() {
    return NAME;
  }

  @ReactMethod
  public void pickJsonFile(Promise promise) {
    Activity activity = getCurrentActivity();
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "Current activity is unavailable");
      return;
    }
    if (pendingPromise != null) {
      promise.reject("E_PICKER_BUSY", "File picker is already open");
      return;
    }

    pendingPromise = promise;
    try {
      Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
      intent.addCategory(Intent.CATEGORY_OPENABLE);
      intent.setType("*/*");
      intent.putExtra(
          Intent.EXTRA_MIME_TYPES,
          new String[] {"application/json", "text/plain", "application/octet-stream"});
      activity.startActivityForResult(intent, PICK_JSON_REQUEST_CODE);
    } catch (Exception e) {
      Promise toReject = pendingPromise;
      pendingPromise = null;
      if (toReject != null) {
        toReject.reject("E_PICKER_LAUNCH_FAILED", e.getMessage(), e);
      }
    }
  }

  @Override
  public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
    if (requestCode != PICK_JSON_REQUEST_CODE) {
      return;
    }
    Promise promise = pendingPromise;
    pendingPromise = null;
    if (promise == null) {
      return;
    }

    if (resultCode != Activity.RESULT_OK || data == null || data.getData() == null) {
      promise.resolve(null);
      return;
    }

    Uri uri = data.getData();
    try (InputStream in = getReactApplicationContext().getContentResolver().openInputStream(uri)) {
      if (in == null) {
        promise.reject("E_READ_FAILED", "Unable to open selected file");
        return;
      }
      ByteArrayOutputStream buffer = new ByteArrayOutputStream();
      byte[] chunk = new byte[8192];
      int total = 0;
      int read;
      while ((read = in.read(chunk)) != -1) {
        total += read;
        if (total > MAX_BACKUP_BYTES) {
          promise.reject("E_FILE_TOO_LARGE", "Selected backup file exceeds size limit");
          return;
        }
        buffer.write(chunk, 0, read);
      }
      String content = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
      WritableMap result = Arguments.createMap();
      result.putString("uri", uri.toString());
      result.putString("content", content);
      promise.resolve(result);
    } catch (IOException e) {
      promise.reject("E_READ_FAILED", e.getMessage(), e);
    }
  }

  @Override
  public void onNewIntent(Intent intent) {
    // No-op
  }
}
