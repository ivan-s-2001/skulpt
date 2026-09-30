import dayjs from 'dayjs';

import { WorkoutSelect } from '@/db/schema';
import { getWorkoutDateKey } from '@/helpers/workout-date';
import { TrainerSlot, WorkScheduleConfig, WorkShift, resolveWorkShift } from '@/helpers/planning';
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

type CandidateSession = PlannedTrainerSession & {
    dateKey: string;
    weekKey: string;
    day: dayjs.Dayjs;
    basePenalty: number;
};

type SearchState = {
    selected: number[];
    penalty: number;
    lastIndex: number;
    weekKey: string | null;
    weekCount: number;
};

type WorkoutContext = {
    occupiedDates: Set<string>;
    trainerDates: dayjs.Dayjs[];
    trainerWeekCounts: Map<string, number>;
    totalWeekCounts: Map<string, number>;
};

const WORKOUT_MINUTES = 60;
const TRAVEL_MINUTES = 30;
const PLANNER_STEP_MINUTES = 15;
const HORIZON_DAYS = 180;
const MAX_TRAINER_PER_WEEK = 3;
const MAX_TOTAL_WORKOUTS_PER_WEEK = 5;

const toMinutes = (value: string): number => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
};

const atTime = (dateKey: string, value: string): Date => {
    const [hours, minutes] = value.split(':').map(Number);
    return dayjs(dateKey).hour(hours).minute(minutes).second(0).millisecond(0).toDate();
};

const ceilToStep = (timestamp: number): number => {
    const stepMs = PLANNER_STEP_MINUTES * 60 * 1000;
    return Math.ceil(timestamp / stepMs) * stepMs;
};

const shiftBlock = (dateKey: string, shift: WorkShift): [number, number] => {
    let start = atTime(dateKey, shift.start).getTime();
    let end = atTime(dateKey, shift.end).getTime();

    if (end <= start) end += 24 * 60 * 60 * 1000;

    return [start - TRAVEL_MINUTES * 60 * 1000, end + TRAVEL_MINUTES * 60 * 1000];
};

const blockedWorkIntervals = (config: WorkScheduleConfig, dateKey: string): [number, number][] => {
    const intervals: [number, number][] = [];

    for (const offset of [-1, 0, 1]) {
        const key = dayjs(dateKey).add(offset, 'day').format('YYYY-MM-DD');
        const shift = resolveWorkShift(config, key);
        if (shift) intervals.push(shiftBlock(key, shift));
    }

    return intervals.sort((a, b) => a[0] - b[0]);
};

const subtractIntervals = (
    base: [number, number],
    blocks: [number, number][],
): [number, number][] => {
    let segments: [number, number][] = [base];

    for (const block of blocks) {
        const next: [number, number][] = [];

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
    notBefore?: Date,
): PlannedTrainerSession | null => {
    const weekday = dayjs(dateKey).day();
    const slots = schedule
        .filter((slot) => slot.day === weekday && toMinutes(slot.end) !== toMinutes(slot.start))
        .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    if (!slots.length) return null;

    const blocks = blockedWorkIntervals(config, dateKey);

    for (const slot of slots) {
        const start = atTime(dateKey, slot.start).getTime();
        let end = atTime(dateKey, slot.end).getTime();
        if (end <= start) end += 24 * 60 * 60 * 1000;

        for (const [freeStart, freeEnd] of subtractIntervals([start, end], blocks)) {
            const effectiveStart = Math.max(
                freeStart,
                notBefore ? ceilToStep(notBefore.getTime()) : freeStart,
            );

            if (freeEnd - effectiveStart < WORKOUT_MINUTES * 60 * 1000) continue;

            return {
                startAt: new Date(effectiveStart),
                endAt: new Date(effectiveStart + WORKOUT_MINUTES * 60 * 1000),
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

const increment = (map: Map<string, number>, key: string): void => {
    map.set(key, (map.get(key) ?? 0) + 1);
};

const getWorkoutContext = (
    workouts: WorkoutSelect[],
    trainerId: string,
    from: dayjs.Dayjs,
): WorkoutContext => {
    const occupiedDates = new Set<string>();
    const trainerDates: dayjs.Dayjs[] = [];
    const trainerWeekCounts = new Map<string, number>();
    const totalWeekCounts = new Map<string, number>();

    const contextFrom = from.subtract(6, 'day');

    for (const workout of workouts) {
        if (workout.status === 'cancelled') continue;

        const dateKey = getWorkoutDateKey(workout);
        if (!dateKey || dayjs(dateKey).isBefore(contextFrom, 'day')) continue;

        occupiedDates.add(dateKey);
        increment(totalWeekCounts, isoWeekKey(dayjs(dateKey).toDate()));

        if (workout.trainerId === trainerId && workout.attendance !== 'missed') {
            const date = dayjs(dateKey).startOf('day');
            trainerDates.push(date);
            increment(trainerWeekCounts, isoWeekKey(date.toDate()));
        }
    }

    return {
        occupiedDates,
        trainerDates,
        trainerWeekCounts,
        totalWeekCounts,
    };
};

const candidateBasePenalty = (date: dayjs.Dayjs, context: WorkoutContext): number => {
    let penalty = 0;

    if (context.occupiedDates.has(date.subtract(1, 'day').format('YYYY-MM-DD'))) {
        penalty += 1;
    }
    if (context.occupiedDates.has(date.add(1, 'day').format('YYYY-MM-DD'))) {
        penalty += 1;
    }

    return penalty;
};

const gapPenalty = (previous: CandidateSession | null, current: CandidateSession): number => {
    if (!previous) return 0;

    const gap = current.day.diff(previous.day, 'day');
    return gap > 3 ? gap - 3 : 0;
};

const isBetterState = (
    candidate: SearchState,
    current: SearchState | undefined,
    candidates: CandidateSession[],
): boolean => {
    if (!current) return true;
    if (candidate.penalty !== current.penalty) {
        return candidate.penalty < current.penalty;
    }

    const candidateFinish =
        candidate.lastIndex >= 0
            ? candidates[candidate.lastIndex].endAt.getTime()
            : Number.POSITIVE_INFINITY;
    const currentFinish =
        current.lastIndex >= 0
            ? candidates[current.lastIndex].endAt.getTime()
            : Number.POSITIVE_INFINITY;

    return candidateFinish < currentFinish;
};

const optimizeCourse = (
    candidates: CandidateSession[],
    target: number,
    context: WorkoutContext,
): SearchState => {
    let states = new Map<string, SearchState>();
    states.set('0|-1|0', {
        selected: [],
        penalty: 0,
        lastIndex: -1,
        weekKey: null,
        weekCount: 0,
    });

    for (let index = 0; index < candidates.length; index++) {
        const currentCandidate = candidates[index];
        const next = new Map<string, SearchState>();

        const put = (state: SearchState) => {
            const key = `${state.selected.length}|${state.lastIndex}|${state.weekCount}`;
            const existing = next.get(key);
            if (isBetterState(state, existing, candidates)) {
                next.set(key, state);
            }
        };

        for (const state of states.values()) {
            const normalizedWeekCount =
                state.weekKey === currentCandidate.weekKey ? state.weekCount : 0;

            put({
                ...state,
                weekKey: currentCandidate.weekKey,
                weekCount: normalizedWeekCount,
            });

            if (state.selected.length >= target) continue;

            const previous = state.lastIndex >= 0 ? candidates[state.lastIndex] : null;

            if (previous && currentCandidate.day.diff(previous.day, 'day') < 2) {
                continue;
            }

            const existingTrainerCount =
                context.trainerWeekCounts.get(currentCandidate.weekKey) ?? 0;
            if (existingTrainerCount + normalizedWeekCount >= MAX_TRAINER_PER_WEEK) {
                continue;
            }

            const totalBefore =
                (context.totalWeekCounts.get(currentCandidate.weekKey) ?? 0) + normalizedWeekCount;
            const overloadPenalty = Math.max(0, totalBefore + 1 - MAX_TOTAL_WORKOUTS_PER_WEEK) * 2;

            put({
                selected: [...state.selected, index],
                penalty:
                    state.penalty +
                    currentCandidate.basePenalty +
                    gapPenalty(previous, currentCandidate) +
                    overloadPenalty,
                lastIndex: index,
                weekKey: currentCandidate.weekKey,
                weekCount: normalizedWeekCount + 1,
            });
        }

        states = next;
    }

    const completed = [...states.values()]
        .filter((state) => state.selected.length === target)
        .sort((a, b) => {
            if (a.penalty !== b.penalty) return a.penalty - b.penalty;

            const aFinish =
                a.lastIndex >= 0
                    ? candidates[a.lastIndex].endAt.getTime()
                    : Number.POSITIVE_INFINITY;
            const bFinish =
                b.lastIndex >= 0
                    ? candidates[b.lastIndex].endAt.getTime()
                    : Number.POSITIVE_INFINITY;

            return aFinish - bFinish;
        });

    if (completed[0]) return completed[0];

    return (
        [...states.values()].sort((a, b) => {
            if (a.selected.length !== b.selected.length) {
                return b.selected.length - a.selected.length;
            }
            if (a.penalty !== b.penalty) return a.penalty - b.penalty;

            const aFinish =
                a.lastIndex >= 0
                    ? candidates[a.lastIndex].endAt.getTime()
                    : Number.POSITIVE_INFINITY;
            const bFinish =
                b.lastIndex >= 0
                    ? candidates[b.lastIndex].endAt.getTime()
                    : Number.POSITIVE_INFINITY;

            return aFinish - bFinish;
        })[0] ?? {
            selected: [],
            penalty: 0,
            lastIndex: -1,
            weekKey: null,
            weekCount: 0,
        }
    );
};

export const buildTrainerPlan = (
    trainer: TrainerModel,
    target: number,
    config: WorkScheduleConfig,
    workouts: WorkoutSelect[],
    startDate: Date = new Date(),
): TrainerPlanCandidate => {
    const startMoment = dayjs(startDate);
    const from = startMoment.startOf('day');
    const context = getWorkoutContext(workouts, trainer.id, from);
    const candidates: CandidateSession[] = [];
    let missingSchedule = false;

    for (let offset = 0; offset <= HORIZON_DAYS; offset++) {
        const date = from.add(offset, 'day');
        const dateKey = date.format('YYYY-MM-DD');

        const shift = resolveWorkShift(config, dateKey);
        if (shift === undefined) {
            missingSchedule = true;
            continue;
        }

        if (context.occupiedDates.has(dateKey)) continue;

        if (context.trainerDates.some((existing) => Math.abs(date.diff(existing, 'day')) < 2)) {
            continue;
        }

        const notBefore = dateKey === from.format('YYYY-MM-DD') ? startMoment.toDate() : undefined;
        const session = findSessionForDate(trainer.schedule, config, dateKey, notBefore);
        if (!session) continue;

        candidates.push({
            ...session,
            dateKey,
            weekKey: isoWeekKey(session.startAt),
            day: date.startOf('day'),
            basePenalty: candidateBasePenalty(date, context),
        });
    }

    const optimized = optimizeCourse(candidates, Math.max(0, target), context);
    const sessions = optimized.selected.map((index) => {
        const candidate = candidates[index];
        return {
            startAt: candidate.startAt,
            endAt: candidate.endAt,
        };
    });

    return {
        trainer,
        sessions,
        target,
        complete: sessions.length === target,
        finishAt: sessions.at(-1)?.endAt ?? null,
        penalty: optimized.penalty,
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
