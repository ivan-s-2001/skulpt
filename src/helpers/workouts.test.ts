// @ts-nocheck
import { getWorkoutDateKey } from './workout-date';

const workout = (status, fields = {}) => ({
    status,
    createdAt: new Date('2026-09-01T10:00:00'),
    ...fields,
});

describe('getWorkoutDateKey', () => {
    test('uses the date that represents each workout status', () => {
        expect(
            getWorkoutDateKey(workout('planned', { startAt: new Date('2026-10-02T18:00:00') })),
        ).toBe('2026-10-02');

        expect(
            getWorkoutDateKey(
                workout('completed', { completedAt: new Date('2026-10-03T18:00:00') }),
            ),
        ).toBe('2026-10-03');

        expect(
            getWorkoutDateKey(
                workout('in_progress', { startedAt: new Date('2026-10-04T18:00:00') }),
            ),
        ).toBe('2026-10-04');
    });

    test('keeps subscription workout on its scheduled date', () => {
        expect(
            getWorkoutDateKey(
                workout('completed', {
                    subscriptionId: 'subscription-1',
                    startAt: new Date('2026-10-03T23:30:00'),
                    completedAt: new Date('2026-10-04T00:30:00'),
                }),
            ),
        ).toBe('2026-10-03');
    });
});
