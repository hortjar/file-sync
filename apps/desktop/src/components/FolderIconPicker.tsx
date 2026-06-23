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
import { useState } from "react";

import { cn } from "../lib/cn";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Separator } from "./ui/separator";

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

type ColorOption = { label: string; value: string | undefined };

const COLOR_OPTIONS: ColorOption[] = [
  { label: "Theme", value: undefined },
  { label: "Red", value: "#ef4444" },
  { label: "Orange", value: "#f97316" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Green", value: "#22c55e" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
];

function iconFg(color: string | undefined): string {
  return color ?? "hsl(var(--brand-from))";
}

function iconBg(color: string | undefined): string {
  if (!color) return "hsl(var(--brand-from) / 0.12)";
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.12)`;
}

type FolderIconPickerProperties = {
  open: boolean;
  currentIcon: string;
  currentColor: string | undefined;
  onPick: (icon: string, color: string | undefined) => void;
  onClose: () => void;
};

export function FolderIconPicker({
  open,
  currentIcon,
  currentColor,
  onPick,
  onClose,
}: FolderIconPickerProperties) {
  const [selectedIcon, setSelectedIcon] = useState(currentIcon);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(currentColor);

  function handleApply() {
    onPick(selectedIcon, selectedColor);
    onClose();
  }

  const PreviewIcon = FOLDER_ICONS[selectedIcon] ?? FolderOpen;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Folder Appearance</DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="flex justify-center py-2">
          <div
            className="flex size-14 items-center justify-center rounded-2xl transition-all"
            style={{ backgroundColor: iconBg(selectedColor) }}
          >
            <PreviewIcon className="size-7" style={{ color: iconFg(selectedColor) }} />
          </div>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Icon grid */}
        <div>
          <p className="mb-2 text-xs font-medium text-[hsl(var(--text-faint))]">Icon</p>
          <div className="grid grid-cols-7 gap-1.5">
            {Object.entries(FOLDER_ICONS).map(([key, Icon]) => (
              <button
                key={key}
                onClick={() => setSelectedIcon(key)}
                className={cn(
                  "flex size-9 items-center justify-center rounded-lg border transition-all",
                  selectedIcon === key
                    ? "border-transparent text-white"
                    : "border-white/[0.07] bg-white/[0.03] text-[hsl(var(--text-muted))] hover:border-white/[0.15] hover:text-[hsl(var(--text))]",
                )}
                style={
                  selectedIcon === key
                    ? { backgroundColor: iconBg(selectedColor), color: iconFg(selectedColor) }
                    : undefined
                }
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-white/[0.06]" />

        {/* Color swatches */}
        <div>
          <p className="mb-2 text-xs font-medium text-[hsl(var(--text-faint))]">Color</p>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_OPTIONS.map(({ label, value }) => (
              <button
                key={label}
                title={label}
                onClick={() => setSelectedColor(value)}
                className={cn(
                  "size-7 rounded-full border-2 transition-all",
                  selectedColor === value
                    ? "border-white scale-110"
                    : "border-transparent hover:scale-105",
                )}
                style={{
                  backgroundColor: value ?? "hsl(var(--brand-from))",
                }}
              />
            ))}

            {/* Custom hex picker */}
            <div className="relative size-7">
              <div
                className={cn(
                  "size-7 cursor-pointer overflow-hidden rounded-full border-2 transition-all",
                  selectedColor && COLOR_OPTIONS.every((c) => c.value !== selectedColor)
                    ? "border-white scale-110"
                    : "border-dashed border-white/30 hover:border-white/60",
                )}
                style={{
                  backgroundColor:
                    selectedColor && COLOR_OPTIONS.every((c) => c.value !== selectedColor)
                      ? selectedColor
                      : "transparent",
                }}
                title="Custom color"
              >
                <input
                  type="color"
                  className="absolute inset-0 cursor-pointer opacity-0"
                  value={selectedColor ?? "#8b5cf6"}
                  onChange={(event) => setSelectedColor(event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
