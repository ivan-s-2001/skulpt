// @ts-nocheck
import dayjs from 'dayjs';

import { buildTrainerPlan } from './trainer-planner';

const trainer = {
    id: 't1',
    name: 'Наташа',
    color: '#a3e635',
    scheduleJson: '[]',
    schedule: Array.from({ length: 7 }, (_, day) => ({
        day,
        start: '17:00',
        end: '21:00',
    })),
};

const schedule = {
    weekly: Object.fromEntries(Array.from({ length: 7 }, (_, day) => [String(day), null])),
    cycle: null,
    overrides: {},
};

describe('trainer planner', () => {
    test('builds a full future course with rest days', () => {
        const from = new Date('2026-09-29T12:00:00');
        const plan = buildTrainerPlan(trainer, 10, schedule, [], from);

        expect(plan.complete).toBe(true);
        expect(plan.sessions).toHaveLength(10);

        for (let i = 1; i < plan.sessions.length; i++) {
            const gap = dayjs(plan.sessions[i].startAt)
                .startOf('day')
                .diff(dayjs(plan.sessions[i - 1].startAt).startOf('day'), 'day');
            expect(gap).toBeGreaterThanOrEqual(2);
        }
    });

    test('does not put trainer sessions on existing solo workout dates', () => {
        const from = new Date('2026-09-29T12:00:00');
        const workout = {
            status: 'planned',
            startAt: new Date('2026-09-29T10:00:00'),
            createdAt: new Date(),
        };

        const plan = buildTrainerPlan(trainer, 2, schedule, [workout], from);
        expect(dayjs(plan.sessions[0].startAt).format('YYYY-MM-DD')).not.toBe('2026-09-29');
    });
});
