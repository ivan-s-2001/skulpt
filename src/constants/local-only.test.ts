import { describe, expect, test } from '@jest/globals';

import { LOCAL_ONLY } from './local-only';
import { buildExerciseGifUrl } from './skulpt';
import { isSyncEnabled } from '@/sync/config';

describe('local-only application', () => {
    test('ignores a configured sync server', () => {
        const previous = process.env.EXPO_PUBLIC_SYNC_HOST;
        process.env.EXPO_PUBLIC_SYNC_HOST = 'https://api.example.test';
        try {
            expect(LOCAL_ONLY).toBe(true);
            expect(isSyncEnabled()).toBe(false);
        } finally {
            if (previous === undefined) delete process.env.EXPO_PUBLIC_SYNC_HOST;
            else process.env.EXPO_PUBLIC_SYNC_HOST = previous;
        }
    });

    test('allows optional hosted exercise media', () => {
        expect(buildExerciseGifUrl('squat', 180)).toMatch(/\/squat-180\.gif$/);
    });
});
