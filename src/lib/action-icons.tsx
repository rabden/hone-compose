import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  ArrowRight,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  Clock,
  Code,
  Crown,
  Eye,
  Feather,
  FileText,
  Flag,
  Globe,
  Hash,
  Heart,
  Languages,
  Lightbulb,
  Link,
  List,
  Lock,
  Mail,
  Maximize2,
  MessageSquare,
  Mic,
  Minimize2,
  Paintbrush,
  PenLine,
  Play,
  Quote,
  RefreshCw,
  Scissors,
  Search,
  Settings,
  Share,
  Shield,
  Smile,
  Sparkles,
  Star,
  Sun,
  Tag,
  Target,
  Terminal,
  ThumbsUp,
  Trash2,
  Type,
  User,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";

export const DEFAULT_ACTION_ICON = "Sparkles";

export const ACTION_ICON_OPTIONS = [
  { name: "Sparkles", label: "AI / Magic" },
  { name: "Wand2", label: "Transform" },
  { name: "Feather", label: "Writing" },
  { name: "PenLine", label: "Edit" },
  { name: "RefreshCw", label: "Rewrite" },
  { name: "Check", label: "Grammar" },
  { name: "Languages", label: "Translate" },
  { name: "FileText", label: "Document" },
  { name: "MessageSquare", label: "Message" },
  { name: "Mail", label: "Email" },
  { name: "Type", label: "Typography" },
  { name: "AlignLeft", label: "Format" },
  { name: "List", label: "List" },
  { name: "Quote", label: "Quote" },
  { name: "BookOpen", label: "Reading" },
  { name: "Lightbulb", label: "Ideas" },
  { name: "Search", label: "Refine" },
  { name: "Globe", label: "Web" },
  { name: "Hash", label: "Tags" },
  { name: "Briefcase", label: "Professional" },
  { name: "Heart", label: "Friendly" },
  { name: "Smile", label: "Casual" },
  { name: "Zap", label: "Energetic" },
  { name: "Minimize2", label: "Shorter" },
  { name: "Maximize2", label: "Longer" },
  { name: "ArrowRight", label: "Forward" },
  { name: "Code", label: "Code" },
  { name: "Terminal", label: "Terminal" },
  { name: "Clock", label: "Time" },
  { name: "Calendar", label: "Schedule" },
  { name: "Eye", label: "Preview" },
  { name: "Flag", label: "Priority" },
  { name: "Link", label: "Link" },
  { name: "Lock", label: "Secure" },
  { name: "Mic", label: "Voice" },
  { name: "Paintbrush", label: "Design" },
  { name: "Play", label: "Play" },
  { name: "Scissors", label: "Cut" },
  { name: "Settings", label: "Settings" },
  { name: "Share", label: "Share" },
  { name: "Shield", label: "Protect" },
  { name: "Star", label: "Favorite" },
  { name: "Sun", label: "Brightness" },
  { name: "Tag", label: "Label" },
  { name: "Target", label: "Precise" },
  { name: "ThumbsUp", label: "Feedback" },
  { name: "Trash2", label: "Remove" },
  { name: "User", label: "Personal" },
  { name: "Volume2", label: "Volume" },
  { name: "Crown", label: "Premium" },
] as const;

export type ActionIconName = (typeof ACTION_ICON_OPTIONS)[number]["name"];

const ICON_COMPONENTS: Record<ActionIconName, LucideIcon> = {
  Sparkles,
  Wand2,
  Feather,
  PenLine,
  RefreshCw,
  Check,
  Languages,
  FileText,
  MessageSquare,
  Mail,
  Type,
  AlignLeft,
  List,
  Quote,
  BookOpen,
  Lightbulb,
  Search,
  Globe,
  Hash,
  Briefcase,
  Heart,
  Smile,
  Zap,
  Minimize2,
  Maximize2,
  ArrowRight,
  Code,
  Terminal,
  Clock,
  Calendar,
  Eye,
  Flag,
  Link,
  Lock,
  Mic,
  Paintbrush,
  Play,
  Scissors,
  Settings,
  Share,
  Shield,
  Star,
  Sun,
  Tag,
  Target,
  ThumbsUp,
  Trash2,
  User,
  Volume2,
  Crown,
};

export function isActionIconName(name: string): name is ActionIconName {
  return name in ICON_COMPONENTS;
}

export function normalizeActionIconName(
  icon: string | undefined,
): ActionIconName {
  if (icon && isActionIconName(icon)) return icon;
  return DEFAULT_ACTION_ICON;
}

export function getActionIconComponent(
  icon: string | undefined,
): LucideIcon {
  const name = normalizeActionIconName(icon);
  return ICON_COMPONENTS[name];
}

export function renderActionIcon(
  icon: string | undefined,
  options?: { size?: number; color?: string; className?: string },
) {
  const Icon = getActionIconComponent(icon);
  const size = options?.size ?? 12;
  return (
    <Icon
      className={options?.className}
      style={{
        width: size,
        height: size,
        color: options?.color,
        flexShrink: 0,
      }}
      strokeWidth={2}
      aria-hidden
    />
  );
}
