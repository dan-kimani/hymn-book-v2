import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/common/Text";
import { useFontScale } from "@/hooks/useFontScale";
import { theme } from "@/theme/colors";

interface AIStudyModalProps {
  visible: boolean;
  reference: string;
  onClose: () => void;
}

const PROMPT = (ref: string) =>
  `I am doing an in-depth Bible study and would like a thorough theological elaboration of ${ref}. While keeping your responses short and direct to the point, please go beyond surface-level explanation and provide the following:

1. Historical Context — the cultural, political, and religious setting in which this passage was written. What was happening at the time? Who was the original audience, and what circumstances were they facing?

2. Literary Structure — the genre, literary devices, and placement within the book and the broader canon. How does the author structure their argument or narrative?

3. Theological Themes — the key doctrines, concepts, and truths revealed in this passage. How does it reveal God's character, human nature, sin, redemption, covenant, or eschatology?

4. Canonical Connections — how this passage connects to the rest of Scripture. Are there cross-references, allusions, fulfillments, or echoes in other books? How does the biblical storyline develop these themes?`;

export function AIStudyModal({ visible, reference, onClose }: AIStudyModalProps) {
  const insets = useSafeAreaInsets();
  const { body } = useFontScale();
  const [mountKey, setMountKey] = useState(0);
  const [ready, setReady] = useState(false);

  const chatUrl = `https://www.perplexity.ai/?q=${encodeURIComponent(PROMPT(reference))}`;

  if (!visible) return null;

  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={onClose}
      onShow={() => {
        setMountKey((k) => k + 1);
        setReady(false);
      }}
    >
      <View className="flex-1 bg-white dark:bg-slate-950" style={{ paddingTop: insets.top }}>
        <View className="flex-row items-center gap-2.5 px-5 py-3 border-b border-gray-100 dark:border-slate-800">
          <View className="w-8 h-8 rounded-lg bg-primary/10 items-center justify-center">
            <Ionicons name="sparkles-outline" size={16} color={theme.primary} />
          </View>
          <View className="flex-1">
            <Text className="font-bold text-text-primary dark:text-gray-100" style={{ fontSize: body }}>
              AI Bible Study
            </Text>
            <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: 12 }}>
              {reference}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={8} className="p-1">
            <Ionicons name="close" size={22} color={theme.textMuted} />
          </Pressable>
        </View>

        <View className="flex-1">
          <WebView
            key={mountKey}
            source={{ uri: chatUrl }}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            onLoadEnd={() => setTimeout(() => setReady(true), 1000)}
            injectedJavaScript={`(function(){
              function hide(){
                try{
                  // hide the header, chat input box
                  const classNamesToHide = ['mt-headerHeight', 'h-headerHeight', 'bottom-safeAreaInsetBottom'];
                  classNamesToHide.forEach(className => {
                    const elements = document.getElementsByClassName(className);
                    for (let k = 0; k < elements.length; k++) {
                      elements[k].style.display = 'none';
                    }
                  });
                  // remove the prompt
                  document.getElementById('radix-_r_3_-content-default')?.firstElementChild?.firstElementChild?.remove();
                }catch(e){}
              }
              hide();
            })();`}
          />

          {!ready && (
            <View className="absolute inset-0 bg-white dark:bg-slate-950 items-center justify-center gap-3">
              <ActivityIndicator size="large" color={theme.primary} />
              <Text className="text-text-muted dark:text-gray-500" style={{ fontSize: 14 }}>
                Loading Bible Study...
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
