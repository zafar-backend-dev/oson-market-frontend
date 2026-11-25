package uz.osonmarket24.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "BranchMaps")
public class BranchMaps extends Plugin {
    @PluginMethod
    public void open(PluginCall call) {
        Uri uri = Uri.parse(call.getString("url", ""));
        boolean geo = "geo".equals(uri.getScheme());
        boolean mapLink = "https".equals(uri.getScheme())
            && ("www.google.com".equals(uri.getHost()) || "yandex.com".equals(uri.getHost()))
            && uri.getPath() != null && uri.getPath().startsWith("/maps/");
        if (!geo && !mapLink) {
            call.reject("Unsupported map URL");
            return;
        }

        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (ActivityNotFoundException exception) {
            call.reject("No app can open this map");
        }
    }
}
