import { and, eq, gt, ne } from 'drizzle-orm';

import { db } from '@/db';
import {
    appReviewPrompt,
    exercise,
    exerciseSet,
    measurement,
    subscription,
    syncQueue,
    trainer,
    user,
    workout,
    workoutExercise,
    workoutGroup,
    workSchedule,
} from '@/db/schema';
import { SKULPT_EXERCISES_USER_ID } from '@/constants/skulpt';
import { queueSyncOperations, getLastSyncTimestamp } from '@/crud/sync';

let backfillDone = false;

type BackfillTable = {
    name: string;
    table: any;
    updatedAtCol: any;
    getRecordId: (row: any) => string;
};

export const backfillSyncQueue = async (): Promise<void> => {
    if (backfillDone) return;

    const lastSync = await getLastSyncTimestamp();

    const existingEntries = await db
        .select({ tableName: syncQueue.tableName, recordId: syncQueue.recordId })
        .from(syncQueue)
        .where(eq(syncQueue.synced, 0));

    const alreadyQueued = new Set(
        existingEntries.map((entry) => `${entry.tableName}:${entry.recordId}`),
    );

    const tables: BackfillTable[] = [
        { name: 'user', table: user, updatedAtCol: user.updatedAt, getRecordId: (row) => row.id },
        {
            name: 'trainer',
            table: trainer,
            updatedAtCol: trainer.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'subscription',
            table: subscription,
            updatedAtCol: subscription.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'work_schedule',
            table: workSchedule,
            updatedAtCol: workSchedule.updatedAt,
            getRecordId: (row) => row.userId,
        },
        {
            name: 'workout',
            table: workout,
            updatedAtCol: workout.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'workout_group',
            table: workoutGroup,
            updatedAtCol: workoutGroup.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'workout_exercise',
            table: workoutExercise,
            updatedAtCol: workoutExercise.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'exercise_set',
            table: exerciseSet,
            updatedAtCol: exerciseSet.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'measurement',
            table: measurement,
            updatedAtCol: measurement.updatedAt,
            getRecordId: (row) => row.id,
        },
        {
            name: 'app_review_prompt',
            table: appReviewPrompt,
            updatedAtCol: appReviewPrompt.updatedAt,
            getRecordId: (row) => row.id,
        },
    ];

    for (const { name, table, updatedAtCol, getRecordId } of tables) {
        const rows = await db.select().from(table).where(gt(updatedAtCol, lastSync));
        if (rows.length === 0) continue;

        const toQueue = rows.filter((row: any) => {
            const recordId = getRecordId(row);
            return recordId && !alreadyQueued.has(`${name}:${recordId}`);
        });
        if (toQueue.length === 0) continue;

        await queueSyncOperations(
            toQueue.map((row: any) => ({
                tableName: name,
                recordId: getRecordId(row),
                operation: (row.createdAt > lastSync ? 'create' : 'update') as 'create' | 'update',
                timestamp: row.updatedAt as Date,
                data: row,
            })),
        );
    }

    const userExercises = await db
        .select()
        .from(exercise)
        .where(
            and(gt(exercise.updatedAt, lastSync), ne(exercise.userId, SKULPT_EXERCISES_USER_ID)),
        );

    const exercisesToQueue = userExercises.filter(
        (row) => !alreadyQueued.has(`exercise:${row.id}`),
    );

    if (exercisesToQueue.length > 0) {
        await queueSyncOperations(
            exercisesToQueue.map((row) => ({
                tableName: 'exercise',
                recordId: row.id,
                operation: (row.createdAt > lastSync ? 'create' : 'update') as 'create' | 'update',
                timestamp: row.updatedAt,
                data: row as unknown as Record<string, unknown>,
            })),
        );
    }

    backfillDone = true;
};
