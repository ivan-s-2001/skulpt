import dayjs from 'dayjs';

export type WorkShift = {
    start: string;
    end: string;
};

export type TrainerSlot = {
    day: number;
    start: string;
    end: string;
};

export type WorkScheduleConfig = {
    weekly: Record<string, WorkShift | null>;
    cycle: {
        startDate: string;
        days: Array<WorkShift | null>;
    } | null;
    overrides: Record<string, WorkShift | null>;
};

export const EMPTY_WORK_SCHEDULE: WorkScheduleConfig = {
    weekly: {},
    cycle: null,
    overrides: {},
};

export const parseTrainerSchedule = (value?: string | null): TrainerSlot[] => {
    try {
        const parsed = JSON.parse(value || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const serializeTrainerSchedule = (slots: TrainerSlot[]): string => JSON.stringify(slots);

export const parseWorkSchedule = (value?: string | null): WorkScheduleConfig => {
    try {
        const parsed = JSON.parse(value || '{}');
        return {
            weekly: parsed?.weekly && typeof parsed.weekly === 'object' ? parsed.weekly : {},
            cycle:
                parsed?.cycle &&
                typeof parsed.cycle === 'object' &&
                typeof parsed.cycle.startDate === 'string' &&
                Array.isArray(parsed.cycle.days)
                    ? parsed.cycle
                    : null,
            overrides:
                parsed?.overrides && typeof parsed.overrides === 'object'
                    ? parsed.overrides
                    : {},
        };
    } catch {
        return EMPTY_WORK_SCHEDULE;
    }
};

export const serializeWorkSchedule = (config: WorkScheduleConfig): string =>
    JSON.stringify(config);

export const resolveWorkShift = (
    config: WorkScheduleConfig,
    dateKey: string,
): WorkShift | null | undefined => {
    if (Object.prototype.hasOwnProperty.call(config.overrides, dateKey)) {
        return config.overrides[dateKey];
    }

    const cycle = config.cycle;
    if (cycle?.days.length) {
        const start = dayjs(cycle.startDate).startOf('day');
        const date = dayjs(dateKey).startOf('day');
        const diff = date.diff(start, 'day');

        if (diff >= 0) {
            return cycle.days[diff % cycle.days.length];
        }
    }

    const weekday = String(dayjs(dateKey).day());
    if (Object.prototype.hasOwnProperty.call(config.weekly, weekday)) {
        return config.weekly[weekday];
    }

    return undefined;
};
