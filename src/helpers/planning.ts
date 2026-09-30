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
        days: (WorkShift | null)[];
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
                parsed?.overrides && typeof parsed.overrides === 'object' ? parsed.overrides : {},
        };
    } catch {
        return EMPTY_WORK_SCHEDULE;
    }
};

export const serializeWorkSchedule = (config: WorkScheduleConfig): string => JSON.stringify(config);

const normalizeTime = (hours: string, minutes: string): string => {
    const h = Number(hours);
    const m = Number(minutes);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) {
        throw new Error('Invalid time');
    }

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const parseShiftLine = (line: string): WorkShift | null | undefined => {
    const value = line.trim();
    if (!value) return undefined;
    if (/^[-—–]$/.test(value)) return null;

    const match = value.match(
        /^(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:до|[-–—])\s*(\d{1,2})\s*[:.]\s*(\d{2})$/i,
    );

    if (!match) return undefined;

    try {
        return {
            start: normalizeTime(match[1], match[2]),
            end: normalizeTime(match[3], match[4]),
        };
    } catch {
        return undefined;
    }
};

export const parseMonthShiftList = (
    month: string,
    raw: string,
): {
    overrides: Record<string, WorkShift | null>;
    warnings: string[];
} => {
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = dayjs(`${year}-${String(monthNumber).padStart(2, '0')}-01`).daysInMonth();
    const lines = raw.replace(/\r/g, '').split('\n');
    const overrides: Record<string, WorkShift | null> = {};
    const warnings: string[] = [];

    for (let index = 0; index < Math.min(lines.length, daysInMonth); index++) {
        const parsed = parseShiftLine(lines[index]);
        if (parsed === undefined) {
            if (lines[index].trim()) warnings.push(`${index + 1}: ${lines[index].trim()}`);
            continue;
        }

        const dateKey = `${month}-${String(index + 1).padStart(2, '0')}`;
        overrides[dateKey] = parsed;
    }

    if (lines.length > daysInMonth) {
        warnings.push(`Строк после ${daysInMonth}-го дня: ${lines.length - daysInMonth}`);
    }

    return { overrides, warnings };
};

export const parseCycleShiftList = (
    raw: string,
): {
    days: (WorkShift | null)[];
    warnings: string[];
} => {
    const days: (WorkShift | null)[] = [];
    const warnings: string[] = [];

    raw.replace(/\r/g, '')
        .split('\n')
        .forEach((line, index) => {
            const parsed = parseShiftLine(line);
            if (parsed === undefined) {
                if (line.trim()) warnings.push(`${index + 1}: ${line.trim()}`);
                return;
            }

            days.push(parsed);
        });

    return { days, warnings };
};

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
