import {
  Archive,
  BookOpen,
  Briefcase,
  Camera,
  Code2,
  Coffee,
  Database,
  DollarSign,
  Dumbbell,
  FileText,
  FolderOpen,
  Globe,
  Heart,
  Home,
  Image,
  type LucideIcon,
  Music,
  Package,
  Smile,
  Star,
  Terminal,
  Video,
} from "lucide-react";

export const FOLDER_ICONS: Record<string, LucideIcon> = {
  folder: FolderOpen,
  file: FileText,
  book: BookOpen,
  image: Image,
  music: Music,
  video: Video,
  camera: Camera,
  code: Code2,
  terminal: Terminal,
  database: Database,
  globe: Globe,
  home: Home,
  star: Star,
  heart: Heart,
  briefcase: Briefcase,
  package: Package,
  archive: Archive,
  coffee: Coffee,
  dumbbell: Dumbbell,
  dollar: DollarSign,
  smile: Smile,
};

export function iconBg(color: string | undefined): string {
  if (!color) return "hsl(var(--brand-from) / 0.1)";
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.1)`;
}

export function iconBorder(color: string | undefined): string {
  if (!color) return "hsl(var(--brand-from) / 0.2)";
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.2)`;
}

export function FolderIcon({
  iconKey,
  color,
  className,
}: {
  iconKey: string;
  color?: string;
  className?: string;
}) {
  const Icon = FOLDER_ICONS[iconKey] ?? FolderOpen;
  return <Icon className={className} style={color ? { color } : undefined} />;
}
