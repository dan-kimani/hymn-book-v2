import { forwardRef } from "react";
import { Text, type TextProps } from "react-native";

type Variant = "title" | "heading" | "body" | "caption" | "label";

const variantClasses: Record<Variant, string> = {
  title: "text-3xl font-extrabold tracking-tight text-text-primary",
  heading: "text-lg font-bold text-text-primary",
  body: "text-base text-text-primary",
  caption: "text-sm text-text-secondary",
  label: "text-xs font-semibold text-text-muted uppercase tracking-wider",
};

interface ThemedTextProps extends TextProps {
  variant?: Variant;
  muted?: boolean;
}

export const ThemedText = forwardRef<Text, ThemedTextProps>(({ variant = "body", muted, className, ...props }, ref) => <Text ref={ref} className={`${variantClasses[variant]} ${muted ? "text-text-muted" : ""} ${className ?? ""}`} {...props} />);

ThemedText.displayName = "ThemedText";
