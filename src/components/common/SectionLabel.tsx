import { Text } from "@/components/common/Text";

interface SectionLabelProps {
  children: string;
  className?: string;
}

export function SectionLabel({ children, className = "" }: SectionLabelProps) {
  return (
    <Text className={`text-[11px] font-semibold tracking-[1.5px] uppercase text-text-muted dark:text-gray-500 ${className}`}>
      {children}
    </Text>
  );
}
