package uz.osonmarket24.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.ImageDecoder;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.ByteBuffer;

@CapacitorPlugin(name = "AvatarPicker")
public class AvatarPicker extends Plugin {
    private static final int MAX_SOURCE_BYTES = 25 * 1024 * 1024;
    private static final int MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
    private static final int TARGET_EDGE = 1536;

    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(Boolean.TRUE.equals(call.getBoolean("allFiles", false)) ? "*/*" : "image/*");
        try {
            startActivityForResult(call, intent, "selected");
        } catch (android.content.ActivityNotFoundException error) {
            call.reject("No file picker is available", "NO_PICKER");
        }
    }

    @ActivityCallback
    private void selected(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent intent = result.getData();
        Uri uri = intent == null ? null : intent.getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            call.resolve(new JSObject().put("cancelled", true));
            return;
        }
        getBridge().execute(() -> readSelection(call, uri));
    }

    private void readSelection(PluginCall call, Uri uri) {
        var resolver = getContext().getContentResolver();
        try (var input = resolver.openInputStream(uri)) {
            if (input == null) throw new IOException("Empty input stream");
            var source = new ByteArrayOutputStream();
            byte[] buffer = new byte[64 * 1024];
            int count;
            while ((count = input.read(buffer)) != -1) {
                if (source.size() + count > MAX_SOURCE_BYTES) {
                    call.reject("Image exceeds 25 MB", "FILE_TOO_LARGE");
                    return;
                }
                source.write(buffer, 0, count);
            }
            byte[] bytes = source.toByteArray();
            if (bytes.length == 0) throw new IOException("Empty file");
            byte[] jpeg = encodeAvatar(bytes);
            String type = resolver.getType(uri);
            String name = "avatar";
            if (jpeg == null) {
                try (var row = resolver.query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (row != null && row.moveToFirst() && row.getString(0) != null) name = row.getString(0);
                } catch (RuntimeException ignored) {
                    // A provider may allow reading the file without exposing its name.
                }
            }
            call.resolve(new JSObject()
                    .put("name", jpeg == null ? name : "avatar.jpg")
                    .put("mimeType", jpeg != null ? "image/jpeg" : type == null ? "application/octet-stream" : type)
                    .put("normalized", jpeg != null)
                    .put("data", Base64.encodeToString(jpeg == null ? bytes : jpeg, Base64.NO_WRAP)));
        } catch (IOException | RuntimeException error) {
            call.reject("Could not read selected image", "FILE_READ");
        }
    }

    private byte[] encodeAvatar(byte[] source) {
        Bitmap bitmap = null;
        if (Build.VERSION.SDK_INT >= 28) {
            try {
                bitmap = ImageDecoder.decodeBitmap(ImageDecoder.createSource(ByteBuffer.wrap(source)),
                        (decoder, info, ignored) -> {
                            decoder.setAllocator(ImageDecoder.ALLOCATOR_SOFTWARE);
                            var size = info.getSize();
                            double scale = Math.min(1.0, (double) TARGET_EDGE / Math.max(size.getWidth(), size.getHeight()));
                            decoder.setTargetSize(Math.max(1, (int) (size.getWidth() * scale)),
                                    Math.max(1, (int) (size.getHeight() * scale)));
                        });
            } catch (IOException | RuntimeException ignored) {
                // Try the legacy decoder before returning the original file.
            }
        }
        if (bitmap == null) {
            var options = new BitmapFactory.Options();
            options.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(source, 0, source.length, options);
            if (options.outWidth < 1 || options.outHeight < 1) return null;
            options.inJustDecodeBounds = false;
            options.inSampleSize = 1;
            while (Math.max(options.outWidth, options.outHeight) / options.inSampleSize > TARGET_EDGE) {
                options.inSampleSize *= 2;
            }
            bitmap = BitmapFactory.decodeByteArray(source, 0, source.length, options);
        }
        if (bitmap == null) return null;
        try {
            var output = new ByteArrayOutputStream();
            for (int quality : new int[]{92, 82, 68, 50}) {
                output.reset();
                if (bitmap.compress(Bitmap.CompressFormat.JPEG, quality, output) && output.size() <= MAX_UPLOAD_BYTES) {
                    return output.toByteArray();
                }
            }
            return null;
        } finally {
            bitmap.recycle();
        }
    }
}
