import dayjs from 'dayjs';

import { WorkoutSelect } from '@/db/schema';
import { getWorkoutDateKey } from '@/helpers/workouts';
import {
    TrainerSlot,
    WorkScheduleConfig,
    WorkShift,
    resolveWorkShift,
} from '@/helpers/planning';
import type { TrainerModel } from '@/crud/planning';

export type PlannedTrainerSession = {
    startAt: Date;
    endAt: Date;
};

export type TrainerPlanCandidate = {
    trainer: TrainerModel;
    sessions: PlannedTrainerSession[];
    target: number;
    complete: boolean;
    finishAt: Date | null;
    penalty: number;
    missingSchedule: boolean;
};

const WORKOUT_MINUTES = 60;
const TRAVEL_MINUTES = 30;

const toMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

const atTime = (dateKey: string, value: string): Date => {
    const [hours, minutes] = value.split(':').map(Number);
    return dayjs(dateKey).hour(hours).minute(minutes).second(0).millisecond(0).toDate();
};

const shiftBlock = (
    dateKey: string,
    shift: WorkShift,
): [number, number] => {
    let start = atTime(dateKey, shift.start).getTime();
    let end = atTime(dateKey, shift.end).getTime();

    if (end <= start) end += 24 * 60 * 60 * 1000;

    return [
        start - TRAVEL_MINUTES * 60 * 1000,
        end + TRAVEL_MINUTES * 60 * 1000,
    ];
};

const blockedWorkIntervals = (
    config: WorkScheduleConfig,
    dateKey: string,
): Array<[number, number]> => {
    const intervals: Array<[number, number]> = [];

    for (const offset of [-1, 0, 1]) {
        const key = dayjs(dateKey).add(offset, 'day').format('YYYY-MM-DD');
        const shift = resolveWorkShift(config, key);
        if (shift) intervals.push(shiftBlock(key, shift));
    }

    return intervals.sort((a, b) => a[0] - b[0]);
};

const subtractIntervals = (
    base: [number, number],
    blocks: Array<[number, number]>,
): Array<[number, number]> => {
    let segments: Array<[number, number]> = [base];

    for (const block of blocks) {
        const next: Array<[number, number]> = [];

        for (const segment of segments) {
            if (block[0] >= segment[1] || block[1] <= segment[0]) {
                next.push(segment);
                continue;
            }

            if (block[0] > segment[0]) {
                next.push([segment[0], Math.min(block[0], segment[1])]);
            }
            if (block[1] < segment[1]) {
                next.push([Math.max(block[1], segment[0]), segment[1]]);
            }
        }

        segments = next;
    }

    return segments;
};

const findSessionForDate = (
    schedule: TrainerSlot[],
    config: WorkScheduleConfig,
    dateKey: string,
): PlannedTrainerSession | null => {
    const weekday = dayjs(dateKey).day();
    const slots = schedule
        .filter((slot) => slot.day === weekday && toMinutes(slot.end) > toMinutes(slot.start))
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    if (!slots.length) return null;

    const blocks = blockedWorkIntervals(config, dateKey);

    for (const slot of slots) {
        const start = atTime(dateKey, slot.start).getTime();
        const end = atTime(dateKey, slot.end).getTime();

        for (const [freeStart, freeEnd] of subtractIntervals([start, end], blocks)) {
            if (freeEnd - freeStart < WORKOUT_MINUTES * 60 * 1000) continue;

            return {
                startAt: new Date(freeStart),
                endAt: new Date(freeStart + WORKOUT_MINUTES * 60 * 1000),
            };
        }
    }

    return null;
};

const isoWeekKey = (date: Date): string => {
    const d = dayjs(date);
    const thursday = d.add(3 - ((d.day() + 6) % 7), 'day');
    const firstThursday = dayjs(new Date(thursday.year(), 0, 4));
    const week =
        1 +
        Math.round(
            (thursday.startOf('day').diff(firstThursday.startOf('day'), 'day') -
                3 +
                ((firstThursday.day() + 6) % 7)) /
                7,
        );

    return `${thursday.year()}-${String(week).padStart(2, '0')}`;
};

const canPlace = (
    session: PlannedTrainerSession,
    sessions: PlannedTrainerSession[],
): boolean => {
    const date = dayjs(session.startAt).startOf('day');

    if (
        sessions.some(
            (item) => Math.abs(date.diff(dayjs(item.startAt).startOf('day'), 'day')) < 2,
        )
    ) {
        return false;
    }

    const week = isoWeekKey(session.startAt);
    return sessions.filter((item) => isoWeekKey(item.startAt) === week).length < 3;
};

const getFutureWorkoutDates = (workouts: WorkoutSelect[], from: dayjs.Dayjs): Set<string> =>
    new Set(
        workouts
            .filter((workout) => workout.status !== 'cancelled')
            .map(getWorkoutDateKey)
            .filter((date): date is string => Boolean(date && !dayjs(date).isBefore(from, 'day'))),
    );

const cadencePenalty = (
    sessions: PlannedTrainerSession[],
    soloDates: Set<string>,
): number => {
    let penalty = 0;
    const sorted = [...sessions].sort(
        (a, b) => a.startAt.getTime() - b.startAt.getTime(),
    );

    for (let i = 1; i < sorted.length; i++) {
        const gap = dayjs(sorted[i].startAt)
            .startOf('day')
            .diff(dayjs(sorted[i - 1].startAt).startOf('day'), 'day');

        if (gap > 3) penalty += gap - 3;
    }

    for (const session of sorted) {
        const date = dayjs(session.startAt);
        if (soloDates.has(date.subtract(1, 'day').format('YYYY-MM-DD'))) penalty += 1;
        if (soloDates.has(date.add(1, 'day').format('YYYY-MM-DD'))) penalty += 1;
    }

    return penalty;
};

export const buildTrainerPlan = (
    trainer: TrainerModel,
    target: number,
    config: WorkScheduleConfig,
    workouts: WorkoutSelect[],
    startDate: Date = new Date(),
): TrainerPlanCandidate => {
    const from = dayjs(startDate).startOf('day');
    const soloDates = getFutureWorkoutDates(workouts, from);
    const sessions: PlannedTrainerSession[] = [];
    let missingSchedule = false;

    for (let offset = 0; offset <= 180 && sessions.length < target; offset++) {
        const date = from.add(offset, 'day');
        const dateKey = date.format('YYYY-MM-DD');

        const shift = resolveWorkShift(config, dateKey);
        if (shift === undefined) {
            missingSchedule = true;
            continue;
        }

        if (soloDates.has(dateKey)) continue;

        const session = findSessionForDate(trainer.schedule, config, dateKey);
        if (!session || !canPlace(session, sessions)) continue;

        sessions.push(session);
    }

    return {
        trainer,
        sessions,
        target,
        complete: sessions.length === target,
        finishAt: sessions.at(-1)?.endAt ?? null,
        penalty: cadencePenalty(sessions, soloDates),
        missingSchedule,
    };
};

export const buildTrainerPlans = (
    trainers: TrainerModel[],
    target: number,
    config: WorkScheduleConfig,
    workouts: WorkoutSelect[],
    startDate: Date = new Date(),
): TrainerPlanCandidate[] =>
    trainers
        .filter((trainer) => trainer.schedule.length > 0)
        .map((trainer) => buildTrainerPlan(trainer, target, config, workouts, startDate))
        .sort((a, b) => {
            if (a.complete !== b.complete) return a.complete ? -1 : 1;
            if (a.sessions.length !== b.sessions.length) {
                return b.sessions.length - a.sessions.length;
            }
            if (a.penalty !== b.penalty) return a.penalty - b.penalty;

            return (
                (a.finishAt?.getTime() ?? Number.POSITIVE_INFINITY) -
                (b.finishAt?.getTime() ?? Number.POSITIVE_INFINITY)
            );
        });
