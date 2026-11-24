package uz.osonmarket24.app;

import android.app.Activity;
import android.content.Intent;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(name = "ChatFileSaver")
public class ChatFileSaver extends Plugin {
    @PluginMethod
    public void save(PluginCall call) {
        String name = call.getString("name", "chat-file").replaceAll("[\\\\/\\p{Cntrl}]", "_");
        String mimeType = call.getString("mimeType", "application/octet-stream");
        String data = call.getString("data");
        if (data == null || data.isEmpty() || data.length() > 28_000_000) {
            call.reject("Invalid chat file");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT)
                .addCategory(Intent.CATEGORY_OPENABLE)
                .setType(mimeType)
                .putExtra(Intent.EXTRA_TITLE, name);
        startActivityForResult(call, intent, "saveSelectedFile");
    }

    @ActivityCallback
    private void saveSelectedFile(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
                || result.getData().getData() == null) {
            call.resolve(new JSObject().put("saved", false));
            return;
        }
        var uri = result.getData().getData();
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "w")) {
            if (output == null) throw new IOException("No output stream");
            output.write(Base64.decode(call.getString("data"), Base64.DEFAULT));
        } catch (IOException | IllegalArgumentException | SecurityException error) {
            call.reject("Could not save chat file");
            return;
        }
        call.resolve(new JSObject().put("saved", true));
    }
}
