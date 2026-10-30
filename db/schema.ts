import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const connections = sqliteTable('garmin_connections', {
  userId: text('user_id').primaryKey(),
  encryptedKey: text('encrypted_key').notNull(),
  snapshot: text('snapshot'),
  fetchedAt: text('fetched_at'),
});
