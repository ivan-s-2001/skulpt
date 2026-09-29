import { and, desc, eq } from 'drizzle-orm';

import { db } from '@/db';
import {
    subscription,
    subscriptionSession,
    trainer,
    workSchedule,
    SubscriptionSelect,
    SubscriptionSessionSelect,
    TrainerSelect,
    WorkScheduleSelect,
} from '@/db/schema';
import { getCurrentUser } from '@/crud/user';
import { createWorkout } from '@/crud/workout';
import { nanoid } from '@/helpers/nanoid';
import {
    TrainerSlot,
    WorkScheduleConfig,
    parseTrainerSchedule,
    parseWorkSchedule,
    serializeTrainerSchedule,
    serializeWorkSchedule,
} from '@/helpers/planning';
import { reportError } from '@/services/error-reporting';

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
    sessions: SubscriptionSessionSelect[];
};

const hydrateTrainer = (row: TrainerSelect): TrainerModel => ({
    ...row,
    schedule: parseTrainerSchedule(row.scheduleJson),
});

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

    return hydrateTrainer(updated);
};

export const deleteTrainer = async (id: string): Promise<void> => {
    await db.delete(trainer).where(eq(trainer.id, id));
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

    return await getWorkSchedule();
};

export const getSubscriptionSessions = async (
    subscriptionId: string,
): Promise<SubscriptionSessionSelect[]> =>
    await db
        .select()
        .from(subscriptionSession)
        .where(eq(subscriptionSession.subscriptionId, subscriptionId))
        .orderBy(subscriptionSession.startAt);

export const getActiveSubscription = async (): Promise<ActiveSubscriptionModel | null> => {
    const user = await getCurrentUser();
    if (!user) return null;

    const [active] = await db
        .select()
        .from(subscription)
        .where(and(eq(subscription.userId, user.id), eq(subscription.status, 'active')))
        .orderBy(desc(subscription.createdAt))
        .limit(1);

    if (!active) return null;

    const [trainerRow, sessions] = await Promise.all([
        db.select().from(trainer).where(eq(trainer.id, active.trainerId)).limit(1),
        getSubscriptionSessions(active.id),
    ]);

    return {
        subscription: active,
        trainer: trainerRow[0] ? hydrateTrainer(trainerRow[0]) : null,
        sessions,
    };
};

export const createSubscription = async (input: {
    trainerId: string;
    targetSessions: number;
    sessions: Array<{ startAt: Date; endAt: Date }>;
}): Promise<ActiveSubscriptionModel> => {
    const user = await getCurrentUser();
    if (!user) throw new Error('Current user not found');

    const now = new Date();
    const current = await getActiveSubscription();

    if (current) {
        await db
            .update(subscription)
            .set({
                status: 'cancelled',
                completedAt: now,
                updatedAt: now,
            })
            .where(eq(subscription.id, current.subscription.id));
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

    if (input.sessions.length) {
        const [trainerRow] = await db
            .select()
            .from(trainer)
            .where(eq(trainer.id, input.trainerId))
            .limit(1);

        if (!trainerRow) throw new Error('Trainer not found');

        const sessionRows = [];
        for (const session of input.sessions) {
            const plannedWorkout = await createWorkout({
                name: trainerRow.name,
                status: 'planned',
                startAt: session.startAt,
                userId: user.id,
            });

            sessionRows.push({
                id: nanoid(),
                subscriptionId,
                workoutId: plannedWorkout.id,
                startAt: session.startAt,
                endAt: session.endAt,
                status: 'planned' as const,
                createdAt: now,
                updatedAt: now,
            });
        }

        await db.insert(subscriptionSession).values(sessionRows);
    }

    const created = await getActiveSubscription();
    if (!created) throw new Error('Failed to create subscription');

    return created;
};

export const updateSubscriptionSession = async (
    id: string,
    updates: Partial<Pick<SubscriptionSessionSelect, 'status' | 'workoutId' | 'startAt' | 'endAt'>>,
): Promise<SubscriptionSessionSelect> => {
    try {
        await db
            .update(subscriptionSession)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(subscriptionSession.id, id));

        const [updated] = await db
            .select()
            .from(subscriptionSession)
            .where(eq(subscriptionSession.id, id))
            .limit(1);

        if (!updated) throw new Error('Subscription session not found after update');
        return updated;
    } catch (error) {
        reportError(error, 'Failed to update subscription session:');
        throw error;
    }
};

export const finishSubscriptionIfComplete = async (subscriptionId: string): Promise<void> => {
    const sessions = await getSubscriptionSessions(subscriptionId);
    const attended = sessions.filter((session) => session.status === 'attended').length;

    const [row] = await db
        .select()
        .from(subscription)
        .where(eq(subscription.id, subscriptionId))
        .limit(1);

    if (!row || attended < row.targetSessions) return;

    const now = new Date();
    await db
        .update(subscription)
        .set({
            status: 'completed',
            completedAt: now,
            updatedAt: now,
        })
        .where(eq(subscription.id, subscriptionId));
};

export const markSubscriptionSessionAttendedByWorkout = async (
    workoutId: string,
): Promise<void> => {
    const [session] = await db
        .select()
        .from(subscriptionSession)
        .where(eq(subscriptionSession.workoutId, workoutId))
        .limit(1);

    if (!session || session.status === 'attended') return;

    await updateSubscriptionSession(session.id, {
        status: 'attended',
        workoutId,
    });
    await finishSubscriptionIfComplete(session.subscriptionId);
};
