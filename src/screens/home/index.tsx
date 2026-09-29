import { FC, useMemo } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { useWorkouts, useWorkoutsOverviewMeta } from '@/hooks/use-workouts';
import { useUser } from '@/hooks/use-user';
import { Box } from '@/components/primitives/box';

import { Workouts } from './components';

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
    },
}));

const HomeScreen: FC = () => {
    const { user } = useUser();
    const { data: workouts, isLoading } = useWorkouts();
    const workoutIds = useMemo(() => (workouts ?? []).map((workout) => workout.id), [workouts]);
    const { data: workoutsOverviewMeta = {} } = useWorkoutsOverviewMeta(workoutIds);

    if (isLoading || !workouts) {
        return null;
    }

    return (
        <Box style={styles.container}>
            <Workouts
                workouts={workouts}
                firstWeekday={user?.firstWeekday || 2}
                workoutsOverviewMeta={workoutsOverviewMeta}
            />
        </Box>
    );
};

export default HomeScreen;
