import * as Icons from "lucide-react";

export const DynamicIcon = ({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) => {
  const LucideIcon = (Icons as any)[name];
  if (!LucideIcon) return <Icons.HelpCircle className={className} style={style} />;
  return <LucideIcon className={className} style={style} />;
};
