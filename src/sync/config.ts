import { LOCAL_ONLY } from '@/constants/local-only';

export const isSyncEnabled = (): boolean =>
    !LOCAL_ONLY &&
    typeof process.env.EXPO_PUBLIC_SYNC_HOST === 'string' &&
    process.env.EXPO_PUBLIC_SYNC_HOST.length > 0;
