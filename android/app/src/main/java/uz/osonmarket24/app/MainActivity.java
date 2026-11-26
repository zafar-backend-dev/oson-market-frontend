package uz.osonmarket24.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ChatFileSaver.class);
        registerPlugin(AvatarPicker.class);
        registerPlugin(BranchMaps.class);
        registerPlugin(PromotionPush.class);
        super.onCreate(savedInstanceState);
    }
}
