import dayjs from 'dayjs';

import type { WorkoutSelect } from '@/db/schema';

export const getWorkoutDateKey = (workout: WorkoutSelect): string | null => {
    const date =
        workout.subscriptionId && workout.startAt
            ? workout.startAt
            : workout.status === 'planned'
              ? workout.startAt
              : workout.status === 'completed'
                ? workout.completedAt
                : (workout.startedAt ?? workout.startAt);

    if (!date) return null;

    const parsed = dayjs(date);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
};
