// Utilities
export { cn } from "./lib/cn";

// Folder icons
export { FolderIcon, FOLDER_ICONS, iconBg, iconBorder } from "./components/folder-icon";

// Platform icon + label
export { PlatformIcon, formatPlatform } from "./components/platform";

// File tree
export { buildTree, formatSize, formatDate, TreeItem } from "./components/file-tree";
export type { TreeNode, FileEntryForTree } from "./components/file-tree";

// UI components
export { Button, buttonVariants } from "./components/button";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./components/card";
export { Input } from "./components/input";
export { Badge, badgeVariants } from "./components/badge";
export { Separator } from "./components/separator";

// Metric chart
export { MetricChart } from "./components/metric-chart";
export type { MetricChartProperties, MetricPoint } from "./components/metric-chart";

// Log parsing
export { parseLogLine, parseLogText, logTimeRange } from "./lib/parse-log";

// Connection status indicator
export { StatusIndicator } from "./components/status-indicator";
export type { StatusDetail, StatusIndicatorProperties } from "./components/status-indicator";

// Log viewer
export { LogViewer, LogDetail } from "./components/log-viewer";
export type {
  LogEntry,
  LogLevel,
  LogViewerProps,
  LogViewerProperties,
  LogDetailProperties,
} from "./components/log-viewer";

// Theme
export type { Theme, ThemeColor, ThemeMode } from "./theme/themes";
export { DEFAULT_THEME, THEME_LABELS, applyTheme } from "./theme/themes";
