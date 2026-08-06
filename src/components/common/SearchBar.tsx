import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { theme } from "@/theme/colors";

interface SearchBarProps extends TextInputProps {
  onClear?: () => void;
}

export function SearchBar({ onClear, className, ...props }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const hasValue = (props.value?.length ?? 0) > 0;

  return (
    <View className={`flex-row items-center px-4 h-14 rounded-2xl border-1.5 gap-2.5 bg-surface ${focused ? "border-primary" : "border-border"} ${className ?? ""}`}>
      <Ionicons name="search" size={20} color={focused ? theme.primary : theme.textMuted} />
      <TextInput
        className="flex-1 text-base text-text-primary"
        placeholderTextColor={theme.textMuted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        autoCorrect={false}
        returnKeyType="search"
        {...props}
      />
      {hasValue && (
        <Pressable onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={20} color={theme.textMuted} />
        </Pressable>
      )}
    </View>
  );
}
