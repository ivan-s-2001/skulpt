import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
    subscription,
    trainer,
    workSchedule,
    workout,
    SubscriptionSelect,
    TrainerSelect,
    WorkScheduleSelect,
    WorkoutSelect,
} from '@/db/schema';
import { getCurrentUser } from '@/crud/user';
import { createWorkout, getWorkouts, updateWorkout } from '@/crud/workout';
import { queueSyncOperation } from '@/crud/sync';
import { nanoid } from '@/helpers/nanoid';
import {
    TrainerSlot,
    WorkScheduleConfig,
    parseTrainerSchedule,
    parseWorkSchedule,
    serializeTrainerSchedule,
    serializeWorkSchedule,
} from '@/helpers/planning';
import { buildTrainerPlan } from '@/helpers/trainer-planner';

export type TrainerModel = TrainerSelect & {
    schedule: TrainerSlot[];
};

export type WorkScheduleModel = {
    row: WorkScheduleSelect | null;
    config: WorkScheduleConfig;
};

export type ActiveSubscriptionModel = {
    subscription: SubscriptionSelect;
    trainer: TrainerModel | null;
    workouts: WorkoutSelect[];
};

export type RebuildSubscriptionPlanResult = {
    subscription: ActiveSubscriptionModel | null;
    changed: boolean;
    reason: 'replanned' | 'unchanged' | 'no_full_plan' | 'inactive';
};

const hydrateTrainer = (row: TrainerSelect): TrainerModel => ({
    ...row,
    schedule: parseTrainerSchedule(row.scheduleJson),
});

const queueCreate = async (
    tableName: string,
    recordId: string,
    row: { updatedAt: Date },
): Promise<void> => {
    await queueSyncOperation({
        tableName,
        recordId,
        operation: 'create',
        timestamp: row.updatedAt,
        data: row as unknown as Record<string, unknown>,
    });
};

const queueUpdate = async (
    tableName: string,
    recordId: string,
    row: { updatedAt: Date },
): Promise<void> => {
    await queueSyncOperation({
        tableName,
        recordId,
        operation: 'update',
        timestamp: row.updatedAt,
        data: row as unknown as Record<string, unknown>,
    });
};

const queueDelete = async (
    tableName: string,
    recordId: string,
    row: Record<string, unknown>,
): Promise<void> => {
    await queueSyncOperation({
        tableName,
        recordId,
        operation: 'delete',
        timestamp: new Date(),
        data: row,
    });
};

const updateSubscriptionRow = async (
    id: string,
    updates: Partial<SubscriptionSelect>,
): Promise<SubscriptionSelect> => {
    await db.update(subscription).set(updates).where(eq(subscription.id, id));

    const [updated] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.id, id))
        .limit(1);

    if (!updated) throw new Error('Subscription not found after update');

    await queueUpdate('subscription', updated.id, updated);
    return updated;
};

export const getTrainers = async (): Promise<TrainerModel[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    const rows = await db
        .select()
        .from(trainer)
        .where(eq(trainer.userId, user.id))
        .orderBy(trainer.createdAt);

    return rows.map(hydrateTrainer);
};

export const createTrainer = async (input: {
    name: string;
    color: string;
    schedule?: TrainerSlot[];
}): Promise<TrainerModel> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Current user not found');

    const now = new Date();
    const id = nanoid();

    await db.insert(trainer).values({
        id,
        userId: user.id,
        name: input.name,
        color: input.color,
        scheduleJson: serializeTrainerSchedule(input.schedule ?? []),
        createdAt: now,
        updatedAt: now,
    });

    const [created] = await db.select().from(trainer).where(eq(trainer.id, id)).limit(1);
    if (!created) throw new Error('Failed to create trainer');

    await queueCreate('trainer', created.id, created);
    return hydrateTrainer(created);
};

export const updateTrainer = async (
    id: string,
    input: Partial<{
        name: string;
        color: string;
        schedule: TrainerSlot[];
    }>,
): Promise<TrainerModel> => {
    const updates: Partial<TrainerSelect> = {
        updatedAt: new Date(),
    };

    if (input.name !== undefined) updates.name = input.name;
    if (input.color !== undefined) updates.color = input.color;
    if (input.schedule !== undefined) {
        updates.scheduleJson = serializeTrainerSchedule(input.schedule);
    }

    await db.update(trainer).set(updates).where(eq(trainer.id, id));

    const [updated] = await db.select().from(trainer).where(eq(trainer.id, id)).limit(1);
    if (!updated) throw new Error('Trainer not found after update');

    await queueUpdate('trainer', updated.id, updated);
    return hydrateTrainer(updated);
};

export const deleteTrainer = async (id: string): Promise<void> => {
    const active = await db
        .select({ id: subscription.id })
        .from(subscription)
        .where(and(eq(subscription.trainerId, id), eq(subscription.status, 'active')))
        .limit(1);

    if (active.length) {
        throw new Error('Нельзя удалить тренера активного абонемента');
    }

    const [existing] = await db.select().from(trainer).where(eq(trainer.id, id)).limit(1);
    if (!existing) return;

    await db.delete(trainer).where(eq(trainer.id, id));
    await queueDelete('trainer', id, existing as unknown as Record<string, unknown>);
};

export const getWorkSchedule = async (): Promise<WorkScheduleModel> => {
    const user = await getCurrentUser();
    if (!user) return { row: null, config: parseWorkSchedule('{}') };

    const [row] = await db
        .select()
        .from(workSchedule)
        .where(eq(workSchedule.userId, user.id))
        .limit(1);

    return {
        row: row ?? null,
        config: parseWorkSchedule(row?.configJson),
    };
};

export const saveWorkSchedule = async (
    config: WorkScheduleConfig,
): Promise<WorkScheduleModel> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Current user not found');

    const existing = await getWorkSchedule();
    const now = new Date();

    if (existing.row) {
        await db
            .update(workSchedule)
            .set({
                configJson: serializeWorkSchedule(config),
                updatedAt: now,
            })
            .where(eq(workSchedule.userId, user.id));
    } else {
        await db.insert(workSchedule).values({
            userId: user.id,
            configJson: serializeWorkSchedule(config),
            createdAt: now,
            updatedAt: now,
        });
    }

    const saved = await getWorkSchedule();
    if (!saved.row) throw new Error('Failed to save work schedule');

    if (existing.row) {
        await queueUpdate('work_schedule', user.id, saved.row);
    } else {
        await queueCreate('work_schedule', user.id, saved.row);
    }

    return saved;
};

const getSubscriptionWorkouts = async (subscriptionId: string): Promise<WorkoutSelect[]> =>
    await db
        .select()
        .from(workout)
        .where(eq(workout.subscriptionId, subscriptionId))
        .orderBy(asc(workout.startAt));

const getActiveSubscriptionRow = async (): Promise<SubscriptionSelect | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const [active] = await db
        .select()
        .from(subscription)
        .where(and(eq(subscription.userId, user.id), eq(subscription.status, 'active')))
        .orderBy(desc(subscription.createdAt))
        .limit(1);

    return active ?? null;
};

export const getActiveSubscription = async (): Promise<ActiveSubscriptionModel | null> => {
    const active = await getActiveSubscriptionRow();
    if (!active) return null;

    const [trainerRows, workouts] = await Promise.all([
        db.select().from(trainer).where(eq(trainer.id, active.trainerId)).limit(1),
        getSubscriptionWorkouts(active.id),
    ]);

    return {
        subscription: active,
        trainer: trainerRows[0] ? hydrateTrainer(trainerRows[0]) : null,
        workouts,
    };
};

const createSubscriptionWorkout = async (input: {
    userId: string;
    trainer: TrainerModel;
    subscriptionId: string;
    startAt: Date;
}): Promise<WorkoutSelect> =>
    await createWorkout({
        name: 'Тренировка',
        status: 'planned',
        startAt: input.startAt,
        trainerId: input.trainer.id,
        subscriptionId: input.subscriptionId,
        attendance: null,
        userId: input.userId,
    });

export const createSubscription = async (input: {
    trainerId: string;
    targetSessions: number;
    sessions: Array<{ startAt: Date; endAt: Date }>;
}): Promise<ActiveSubscriptionModel> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Current user not found');

    const [trainerRow] = await db
        .select()
        .from(trainer)
        .where(eq(trainer.id, input.trainerId))
        .limit(1);
    if (!trainerRow) throw new Error('Trainer not found');

    const trainerModel = hydrateTrainer(trainerRow);
    const now = new Date();
    const current = await getActiveSubscriptionRow();

    if (current) {
        await updateSubscriptionRow(current.id, {
            status: 'cancelled',
            completedAt: now,
            updatedAt: now,
        });

        const planned = await db
            .select()
            .from(workout)
            .where(
                and(
                    eq(workout.subscriptionId, current.id),
                    eq(workout.status, 'planned'),
                ),
            );

        for (const item of planned) {
            await updateWorkout(item.id, { status: 'cancelled' });
        }
    }

    const subscriptionId = nanoid();

    await db.insert(subscription).values({
        id: subscriptionId,
        userId: user.id,
        trainerId: input.trainerId,
        targetSessions: input.targetSessions,
        status: 'active',
        startedAt: now,
        createdAt: now,
        updatedAt: now,
    });

    const [createdSubscription] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.id, subscriptionId))
        .limit(1);
    if (!createdSubscription) throw new Error('Failed to create subscription');

    await queueCreate('subscription', createdSubscription.id, createdSubscription);

    for (const session of input.sessions) {
        await createSubscriptionWorkout({
            userId: user.id,
            trainer: trainerModel,
            subscriptionId,
            startAt: session.startAt,
        });
    }

    const created = await getActiveSubscription();
    if (!created) throw new Error('Failed to create subscription');

    return created;
};

export const finishSubscriptionIfComplete = async (subscriptionId: string): Promise<void> => {
    const [row, workouts] = await Promise.all([
        db.select().from(subscription).where(eq(subscription.id, subscriptionId)).limit(1),
        getSubscriptionWorkouts(subscriptionId),
    ]);

    const current = row[0];
    if (!current || current.status !== 'active') return;

    const attended = workouts.filter(
        (item) => item.attendance === 'attended' || item.status === 'completed',
    ).length;

    if (attended < current.targetSessions) return;

    const now = new Date();
    await updateSubscriptionRow(subscriptionId, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
    });
};

export const rebuildFutureSubscriptionPlan = async (
    subscriptionId: string,
    startDate: Date = new Date(),
): Promise<RebuildSubscriptionPlanResult> => {
    const user = await getCurrentUser();
    if (!user) {
        return {
            subscription: null,
            changed: false,
            reason: 'inactive',
        };
    }

    const [rows, schedule, allWorkouts] = await Promise.all([
        db.select().from(subscription).where(eq(subscription.id, subscriptionId)).limit(1),
        getWorkSchedule(),
        getWorkouts(),
    ]);

    const current = rows[0];
    if (!current || current.status !== 'active') {
        return {
            subscription: await getActiveSubscription(),
            changed: false,
            reason: 'inactive',
        };
    }

    const [trainerRow] = await db
        .select()
        .from(trainer)
        .where(eq(trainer.id, current.trainerId))
        .limit(1);

    if (!trainerRow) {
        return {
            subscription: await getActiveSubscription(),
            changed: false,
            reason: 'inactive',
        };
    }

    const trainerModel = hydrateTrainer(trainerRow);
    const own = allWorkouts.filter((item) => item.subscriptionId === subscriptionId);

    const attended = own.filter(
        (item) => item.attendance === 'attended' || item.status === 'completed',
    ).length;

    const inProgress = own.filter(
        (item) => item.attendance !== 'missed' && item.status === 'in_progress',
    );

    const from = new Date(startDate);
    from.setHours(0, 0, 0, 0);

    const futurePlanned = own.filter(
        (item) =>
            item.attendance !== 'missed' &&
            item.status === 'planned' &&
            item.startAt != null &&
            new Date(item.startAt).getTime() >= from.getTime(),
    );

    const remainingToPlan = Math.max(
        0,
        current.targetSessions - attended - inProgress.length,
    );

    const futurePlannedIds = new Set(futurePlanned.map((item) => item.id));
    const planningWorkouts = allWorkouts.filter(
        (item) => !futurePlannedIds.has(item.id),
    );

    const plan = buildTrainerPlan(
        trainerModel,
        remainingToPlan,
        schedule.config,
        planningWorkouts,
        startDate,
    );

    if (!plan.complete) {
        return {
            subscription: await getActiveSubscription(),
            changed: false,
            reason: 'no_full_plan',
        };
    }

    const currentDates = futurePlanned
        .map((item) => item.startAt?.getTime() ?? 0)
        .sort((a, b) => a - b);
    const nextDates = plan.sessions
        .map((session) => session.startAt.getTime())
        .sort((a, b) => a - b);

    const unchanged =
        currentDates.length === nextDates.length &&
        currentDates.every((value, index) => value === nextDates[index]);

    if (unchanged) {
        return {
            subscription: await getActiveSubscription(),
            changed: false,
            reason: 'unchanged',
        };
    }

    for (const item of futurePlanned) {
        await updateWorkout(item.id, { status: 'cancelled' });
    }

    for (const session of plan.sessions) {
        await createSubscriptionWorkout({
            userId: user.id,
            trainer: trainerModel,
            subscriptionId,
            startAt: session.startAt,
        });
    }

    return {
        subscription: await getActiveSubscription(),
        changed: true,
        reason: 'replanned',
    };
};

export const markSubscriptionWorkoutAttendedByWorkout = async (
    workoutId: string,
): Promise<void> => {
    const [item] = await db.select().from(workout).where(eq(workout.id, workoutId)).limit(1);
    if (!item?.subscriptionId || !item.trainerId) return;

    if (item.attendance !== 'attended') {
        await updateWorkout(workoutId, {
            attendance: 'attended',
        });
    }

    await finishSubscriptionIfComplete(item.subscriptionId);
};

export const setSubscriptionWorkoutAttendance = async (
    workoutId: string,
    attendance: 'attended' | 'missed',
): Promise<WorkoutSelect> => {
    const [item] = await db.select().from(workout).where(eq(workout.id, workoutId)).limit(1);
    if (!item?.subscriptionId || !item.trainerId) {
        throw new Error('Workout is not part of a subscription');
    }

    const now = new Date();

    if (attendance === 'attended') {
        await updateWorkout(workoutId, {
            attendance: 'attended',
            status: 'completed',
            startedAt: item.startedAt ?? item.startAt ?? now,
            completedAt: item.completedAt ?? now,
        });

        await finishSubscriptionIfComplete(item.subscriptionId);
    } else {
        await updateWorkout(workoutId, {
            attendance: 'missed',
            status: 'cancelled',
        });

        const replanFrom = new Date(now);
        replanFrom.setDate(replanFrom.getDate() + 1);
        replanFrom.setHours(0, 0, 0, 0);

        await rebuildFutureSubscriptionPlan(item.subscriptionId, replanFrom);
    }

    const [updated] = await db.select().from(workout).where(eq(workout.id, workoutId)).limit(1);
    if (!updated) throw new Error('Workout not found after attendance update');

    return updated;
};
