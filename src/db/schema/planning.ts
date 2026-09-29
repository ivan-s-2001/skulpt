import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export type TrainerSelect = typeof trainer.$inferSelect;
export type TrainerInsert = typeof trainer.$inferInsert;
export type SubscriptionSelect = typeof subscription.$inferSelect;
export type SubscriptionInsert = typeof subscription.$inferInsert;
export type WorkScheduleSelect = typeof workSchedule.$inferSelect;
export type WorkScheduleInsert = typeof workSchedule.$inferInsert;

export const trainer = sqliteTable(
    'trainer',
    {
        id: text('id', { length: 21 }).primaryKey(),
        userId: text('user_id', { length: 21 }).notNull(),
        name: text('name').notNull(),
        color: text('color').notNull().default('#a3e635'),
        scheduleJson: text('schedule_json').notNull().default('{}'),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .notNull()
            .default(sql`(strftime('%s','now') * 1000)`),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .notNull()
            .default(sql`(strftime('%s','now') * 1000)`)
            .$onUpdate(() => new Date()),
    },
    (table) => [index('trainer_user_idx').on(table.userId)],
);

export const subscription = sqliteTable(
    'subscription',
    {
        id: text('id', { length: 21 }).primaryKey(),
        userId: text('user_id', { length: 21 }).notNull(),
        trainerId: text('trainer_id', { length: 21 }).notNull(),
        targetSessions: integer('target_sessions').notNull(),
        status: text('status', {
            enum: ['active', 'completed', 'cancelled'],
        })
            .notNull()
            .default('active'),
        startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
        completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
        createdAt: integer('created_at', { mode: 'timestamp_ms' })
            .notNull()
            .default(sql`(strftime('%s','now') * 1000)`),
        updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
            .notNull()
            .default(sql`(strftime('%s','now') * 1000)`)
            .$onUpdate(() => new Date()),
    },
    (table) => [
        index('subscription_user_status_idx').on(table.userId, table.status),
        index('subscription_trainer_idx').on(table.trainerId),
    ],
);

export const workSchedule = sqliteTable('work_schedule', {
    userId: text('user_id', { length: 21 }).primaryKey(),
    configJson: text('config_json').notNull().default('{}'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
        .notNull()
        .default(sql`(strftime('%s','now') * 1000)`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
        .notNull()
        .default(sql`(strftime('%s','now') * 1000)`)
        .$onUpdate(() => new Date()),
});
