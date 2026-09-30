import { router } from 'expo-router';
import { useUnistyles } from 'react-native-unistyles';

import { Stack } from '@/navigators/stack';
import { useScreen } from '@/hooks/use-screen';
import { BackButton } from '@/components/buttons/back';

export default function SubscriptionSettingsLayout() {
    const { options } = useScreen();
    const { theme } = useUnistyles();

    return (
        <Stack
            screenOptions={{
                ...options,
                headerLeft: () => (
                    <BackButton
                        onPressHandler={() => router.back()}
                        backgroundColor={theme.colors.background}
                        iconColor={theme.colors.typography}
                    />
                ),
            }}
        >
            <Stack.Screen name="trainers" options={{ headerTitle: 'Тренеры' }} />
        </Stack>
    );
}
