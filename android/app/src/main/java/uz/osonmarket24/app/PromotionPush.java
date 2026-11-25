package uz.osonmarket24.app;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(name = "PromotionPush")
public class PromotionPush extends Plugin {
    @PluginMethod
    public void subscribe(PluginCall call) {
        try {
            FirebaseMessaging.getInstance().subscribeToTopic("oson_android_promotions")
                    .addOnSuccessListener(result -> call.resolve())
                    .addOnFailureListener(error -> call.reject("Promotion subscription failed"));
        } catch (IllegalStateException error) {
            call.reject("Firebase is unavailable");
        }
    }
}
