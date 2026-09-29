import { FC, useCallback, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import dayjs from 'dayjs';

import { Box } from '@/components/primitives/box';
import { Text } from '@/components/primitives/text';
import { WorkoutSelect } from '@/db/schema';
import { VStack } from '@/components/primitives/vstack';
import { useRunningWorkoutStatic, useRunningWorkoutTicker } from '@/hooks/use-running-workout';
import type { WorkoutOverviewMetaMap } from '@/hooks/use-workouts';
import { Pushes } from '@/components/promo/pushes';
import { Button } from '@/components/buttons/base';
import { useEditor } from '@/hooks/use-editor';

import { WorkoutCard } from '../workout-card';
import { Header } from '../header';
import { WeekStats } from '../week';

interface WorkoutsProps {
    workouts: WorkoutSelect[];
    firstWeekday: number;
    workoutsOverviewMeta: WorkoutOverviewMetaMap;
}

const getWorkoutDateKey = (workout: WorkoutSelect): string | null => {
    if (workout.status === 'cancelled') return null;

    const date =
        workout.status === 'planned'
            ? workout.startAt
            : workout.status === 'completed'
              ? workout.completedAt ?? workout.startedAt ?? workout.startAt ?? workout.createdAt
              : workout.startedAt ?? workout.startAt ?? workout.createdAt;

    if (!date) return null;

    const parsed = dayjs(date);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
};

const getWorkoutTimestamp = (workout: WorkoutSelect): number => {
    const date =
        workout.status === 'planned'
            ? workout.startAt
            : workout.status === 'completed'
              ? workout.completedAt ?? workout.startedAt ?? workout.startAt ?? workout.createdAt
              : workout.startedAt ?? workout.startAt ?? workout.createdAt;

    if (!date) return 0;

    const parsed = dayjs(date);
    return parsed.isValid() ? parsed.valueOf() : 0;
};

const statusOrder: Record<WorkoutSelect['status'], number> = {
    in_progress: 0,
    planned: 1,
    completed: 2,
    cancelled: 3,
};

const styles = StyleSheet.create((theme, rt) => ({
    listContainer: {
        flex: 1,
    },
    listContent: {
        ...theme.screenContentPadding('root'),
        paddingBottom: rt.insets.bottom + theme.space(4),
    },
    headerContent: {
        gap: theme.space(5),
        paddingBottom: theme.space(4),
    },
    selectedDayContainer: {
        paddingHorizontal: theme.space(4),
        gap: theme.space(1),
    },
    selectedDayTitle: {
        fontSize: theme.fontSize.xl.fontSize,
        fontWeight: theme.fontWeight.bold.fontWeight,
        color: theme.colors.typography,
        textTransform: 'capitalize',
    },
    selectedDaySubtitle: {
        fontSize: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.5,
    },
    cardContainer: {
        paddingHorizontal: theme.space(4),
        marginTop: theme.space(2),
    },
    emptyContainer: {
        paddingHorizontal: theme.space(8),
        paddingVertical: theme.space(12),
        alignItems: 'center',
        gap: theme.space(2),
    },
    emptyTitle: {
        fontSize: theme.fontSize.lg.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
        color: theme.colors.typography,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.5,
        textAlign: 'center',
    },
    emptyAction: {
        width: '100%',
        marginTop: theme.space(3),
    },
    footer: {
        paddingTop: theme.space(6),
    },
}));

export const Workouts: FC<WorkoutsProps> = ({
    workouts,
    firstWeekday,
    workoutsOverviewMeta,
}) => {
    const { t, i18n } = useTranslation(['screens']);
    const router = useRouter();
    const { navigate } = useEditor();
    const { runningWorkout } = useRunningWorkoutStatic();
    const { elapsedFormated } = useRunningWorkoutTicker();
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));

    const selectedWorkouts = useMemo(
        () =>
            workouts
                .filter((workout) => {
                    if (workout.status === 'cancelled') return false;
                    return getWorkoutDateKey(workout) === selectedDate;
                })
                .sort((a, b) => {
                    const statusDelta = statusOrder[a.status] - statusOrder[b.status];
                    if (statusDelta !== 0) return statusDelta;
                    return getWorkoutTimestamp(a) - getWorkoutTimestamp(b);
                }),
        [selectedDate, workouts],
    );

    const handleWorkoutPress = useCallback(
        (workoutId: string) => {
            router.navigate(`/workout/${workoutId}`);
        },
        [router],
    );

    const selectedDayTitle = useMemo(() => {
        const today = dayjs().format('YYYY-MM-DD');

        if (selectedDate === today) {
            return t('home.schedule.today', { ns: 'screens' });
        }

        const date = dayjs(selectedDate);
        return new Intl.DateTimeFormat(i18n.language, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
        }).format(date.toDate());
    }, [i18n.language, selectedDate, t]);

    const selectedDaySubtitle = useMemo(() => {
        const count = selectedWorkouts.length;

        if (count === 0) {
            return t('home.schedule.noWorkouts', { ns: 'screens' });
        }

        return t('home.workoutsCount', {
            ns: 'screens',
            count,
        });
    }, [selectedWorkouts.length, t]);

    const handleCreateWorkout = useCallback(() => {
        navigate({ type: 'workout__create' });
    }, [navigate]);

    const renderHeader = useCallback(
        () => (
            <VStack style={styles.headerContent}>
                <Header />
                <WeekStats
                    workouts={workouts}
                    firstWeekday={firstWeekday}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                />
                <VStack style={styles.selectedDayContainer}>
                    <Text style={styles.selectedDayTitle}>{selectedDayTitle}</Text>
                    <Text style={styles.selectedDaySubtitle}>{selectedDaySubtitle}</Text>
                </VStack>
            </VStack>
        ),
        [
            firstWeekday,
            selectedDate,
            selectedDaySubtitle,
            selectedDayTitle,
            workouts,
        ],
    );

    const renderWorkout = useCallback(
        ({ item }: { item: WorkoutSelect }) => {
            const activeElapsedFormatted =
                item.status === 'in_progress' && item.id === runningWorkout?.id
                    ? elapsedFormated
                    : null;

            return (
                <Box style={styles.cardContainer}>
                    <WorkoutCard
                        workout={item}
                        onPress={handleWorkoutPress}
                        activeElapsedFormatted={activeElapsedFormatted}
                        overviewMeta={workoutsOverviewMeta[item.id]}
                    />
                </Box>
            );
        },
        [elapsedFormated, handleWorkoutPress, runningWorkout?.id, workoutsOverviewMeta],
    );

    const renderEmpty = useCallback(
        () => (
            <VStack style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                    {t('home.schedule.freeDay', { ns: 'screens' })}
                </Text>
                <Text style={styles.emptyDescription}>
                    {t('home.schedule.emptyDescription', { ns: 'screens' })}
                </Text>
                <Box style={styles.emptyAction}>
                    <Button
                        title={t('home.schedule.addWorkout', { ns: 'screens' })}
                        onPress={handleCreateWorkout}
                    />
                </Box>
            </VStack>
        ),
        [handleCreateWorkout, t],
    );

    const renderFooter = useCallback(
        () => (
            <Box style={styles.footer}>
                <Pushes />
            </Box>
        ),
        [],
    );

    return (
        <FlashList
            data={selectedWorkouts}
            renderItem={renderWorkout}
            keyExtractor={(item) => item.id}
            drawDistance={320}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            ListFooterComponent={renderFooter}
            contentContainerStyle={styles.listContent}
            style={styles.listContainer}
            showsVerticalScrollIndicator={false}
            extraData={`${selectedDate}:${runningWorkout?.id || ''}:${elapsedFormated}`}
        />
    );
};
