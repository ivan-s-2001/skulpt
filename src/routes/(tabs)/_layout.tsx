import React from 'react';
import { Tabs } from 'expo-router';

import { Menu } from '@/components/overlays/menu';
import { useExercisesTab } from '@/screens/exercises/exercises/hooks';
import { useScreen } from '@/hooks/use-screen';
import { useHomeTab } from '@/screens/home/hooks';
import { useSubscriptionTab } from '@/screens/plan/subscription/hooks';
import { useSettingsTab } from '@/screens/settings/settings/hooks';
import { useResultsTab } from '@/screens/results/results/hooks';

export default function TabLayout() {
    const { options } = useScreen();

    const home = useHomeTab();
    const subscription = useSubscriptionTab();
    const exercises = useExercisesTab();
    const settings = useSettingsTab();
    const results = useResultsTab();

    return (
        <Tabs
            tabBar={(props) => <Menu {...props} />}
            screenOptions={{
                ...options,
                headerTitle: () => null,
                headerLeft: () => null,
            }}
        >
            <Tabs.Screen {...home} />
            <Tabs.Screen {...subscription} />
            <Tabs.Screen {...results} />
            <Tabs.Screen {...exercises} />
            <Tabs.Screen {...settings} />
        </Tabs>
    );
}
