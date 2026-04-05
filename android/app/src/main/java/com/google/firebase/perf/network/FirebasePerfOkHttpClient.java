package com.google.firebase.perf.network;

import java.io.IOException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.Response;

/**
 * Compatibility shim for builds where RN networking was instrumented for Firebase perf
 * but the perf runtime is not packaged. It forwards requests without instrumentation.
 */
public final class FirebasePerfOkHttpClient {
  private FirebasePerfOkHttpClient() {}

  public static Response execute(Call call) throws IOException {
    return call.execute();
  }

  public static void enqueue(Call call, Callback callback) {
    call.enqueue(callback);
  }
}
