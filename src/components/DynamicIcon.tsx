import * as Icons from "lucide-react";

export const DynamicIcon = ({ name, className, style, size }: { name: string; className?: string; style?: React.CSSProperties; size?: number }) => {
  const LucideIcon = (Icons as any)[name];
  if (!LucideIcon) return <Icons.HelpCircle className={className} style={style} size={size} />;
  return <LucideIcon className={className} style={style} size={size} />;
};
