import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const platformEnum = pgEnum("platform", ["windows", "macos", "linux"]);

export const resolutionEnum = pgEnum("conflict_resolution", [
  "keep_local",
  "keep_remote",
  "keep_both",
]);

export const users = pgTable("users", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const devices = pgTable(
  "devices",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    platform: platformEnum("platform").notNull(),
    appVersion: varchar("app_version", { length: 50 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("devices_user_id_idx").on(table.userId)],
);

export const syncFolders = pgTable(
  "sync_folders",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    iconKey: varchar("icon_key", { length: 50 }).default("folder"),
    iconColor: varchar("icon_color", { length: 7 }), // hex color, null = use theme color
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sync_folders_user_id_idx").on(table.userId)],
);

export const deviceFolderLinks = pgTable(
  "device_folder_links",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    syncFolderId: uuid("sync_folder_id")
      .notNull()
      .references(() => syncFolders.id, { onDelete: "cascade" }),
    localPath: text("local_path").notNull(),
  },
  (table) => [
    unique("device_folder_unique").on(table.deviceId, table.syncFolderId),
    index("device_folder_links_sync_folder_id_idx").on(table.syncFolderId),
  ],
);

export const fileBlobs = pgTable("file_blobs", {
  contentHash: varchar("content_hash", { length: 64 }).primaryKey(),
  size: integer("size").notNull(),
  compressed: boolean("compressed").notNull().default(false),
  refCount: integer("ref_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fileEntries = pgTable(
  "file_entries",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    syncFolderId: uuid("sync_folder_id")
      .notNull()
      .references(() => syncFolders.id, { onDelete: "cascade" }),
    relativePath: text("relative_path").notNull(),
    contentHash: varchar("content_hash", { length: 64 }).references(() => fileBlobs.contentHash, {
      onDelete: "set null",
    }),
    size: integer("size").notNull().default(0),
    mtime: timestamp("mtime", { withTimezone: true }).notNull(),
    version: integer("version").notNull().default(1),
    updatedByDeviceId: uuid("updated_by_device_id").references(() => devices.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    unique("file_entry_unique").on(table.syncFolderId, table.relativePath),
    index("file_entries_sync_folder_id_idx").on(table.syncFolderId),
    index("file_entries_content_hash_idx").on(table.contentHash),
  ],
);

export const conflicts = pgTable(
  "conflicts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fileEntryId: uuid("file_entry_id")
      .notNull()
      .references(() => fileEntries.id, { onDelete: "cascade" }),
    syncFolderId: uuid("sync_folder_id")
      .notNull()
      .references(() => syncFolders.id, { onDelete: "cascade" }),
    relativePath: text("relative_path").notNull(),
    localHash: varchar("local_hash", { length: 64 }).notNull(),
    remoteHash: varchar("remote_hash", { length: 64 }).notNull(),
    localMtime: timestamp("local_mtime", { withTimezone: true }).notNull(),
    remoteMtime: timestamp("remote_mtime", { withTimezone: true }).notNull(),
    localDeviceName: varchar("local_device_name", { length: 255 }).notNull(),
    remoteDeviceName: varchar("remote_device_name", { length: 255 }).notNull(),
    resolution: resolutionEnum("resolution"),
    resolved: boolean("resolved").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("conflicts_sync_folder_id_idx").on(table.syncFolderId),
    index("conflicts_resolved_idx").on(table.resolved),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("refresh_tokens_user_id_idx").on(table.userId)],
);

// Time-series snapshots of server-wide metrics (storage, files, devices,
// request throughput). Written periodically by the metrics sampler and read
// by the dashboard charts. Server-wide, so no userId column.
export const metricSamples = pgTable(
  "metric_samples",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    metric: varchar("metric", { length: 64 }).notNull(),
    value: bigint("value", { mode: "number" }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("metric_samples_metric_captured_idx").on(table.metric, table.capturedAt)],
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  devices: many(devices),
  syncFolders: many(syncFolders),
  refreshTokens: many(refreshTokens),
}));

export const devicesRelations = relations(devices, ({ one, many }) => ({
  user: one(users, { fields: [devices.userId], references: [users.id] }),
  folderLinks: many(deviceFolderLinks),
}));

export const syncFoldersRelations = relations(syncFolders, ({ one, many }) => ({
  user: one(users, {
    fields: [syncFolders.userId],
    references: [users.id],
  }),
  deviceLinks: many(deviceFolderLinks),
  fileEntries: many(fileEntries),
  conflicts: many(conflicts),
}));

export const deviceFolderLinksRelations = relations(deviceFolderLinks, ({ one }) => ({
  device: one(devices, {
    fields: [deviceFolderLinks.deviceId],
    references: [devices.id],
  }),
  syncFolder: one(syncFolders, {
    fields: [deviceFolderLinks.syncFolderId],
    references: [syncFolders.id],
  }),
}));

export const fileEntriesRelations = relations(fileEntries, ({ one, many }) => ({
  syncFolder: one(syncFolders, {
    fields: [fileEntries.syncFolderId],
    references: [syncFolders.id],
  }),
  blob: one(fileBlobs, {
    fields: [fileEntries.contentHash],
    references: [fileBlobs.contentHash],
  }),
  conflicts: many(conflicts),
}));

export const conflictsRelations = relations(conflicts, ({ one }) => ({
  fileEntry: one(fileEntries, {
    fields: [conflicts.fileEntryId],
    references: [fileEntries.id],
  }),
  syncFolder: one(syncFolders, {
    fields: [conflicts.syncFolderId],
    references: [syncFolders.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
