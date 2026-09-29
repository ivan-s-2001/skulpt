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

import { WorkoutCard } from '../workout-card';
import { Header } from '../header';
import { WeekStats } from '../week';

interface WorkoutsProps {
    workouts: WorkoutSelect[];
    firstWeekday: number;
    workoutsOverviewMeta: WorkoutOverviewMetaMap;
}

const getWorkoutDateKey = (workout: WorkoutSelect): string | null => {
    const date =
        workout.status === 'planned'
            ? workout.startAt
            : workout.status === 'completed'
              ? workout.completedAt
              : workout.startedAt ?? workout.startAt;

    if (!date) return null;

    const parsed = dayjs(date);
    return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null;
};

const getWorkoutTimestamp = (workout: WorkoutSelect): number => {
    const date =
        workout.status === 'planned'
            ? workout.startAt
            : workout.status === 'completed'
              ? workout.completedAt
              : workout.startedAt ?? workout.startAt ?? workout.createdAt;

    return date ? new Date(date).getTime() : 0;
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
        const date = dayjs(selectedDate).locale(i18n.language);
        const today = dayjs().format('YYYY-MM-DD');

        if (selectedDate === today) {
            return t('today', { ns: 'common', defaultValue: 'Сегодня' });
        }

        return date.format('dddd, D MMMM');
    }, [i18n.language, selectedDate, t]);

    const selectedDaySubtitle = useMemo(() => {
        const count = selectedWorkouts.length;
        if (count === 0) return 'Тренировок нет';
        return `${count} ${count === 1 ? 'тренировка' : count < 5 ? 'тренировки' : 'тренировок'}`;
    }, [selectedWorkouts.length]);

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
                <Text style={styles.emptyTitle}>Свободный день</Text>
                <Text style={styles.emptyDescription}>
                    Здесь появятся соло-тренировки и занятия с тренером на выбранную дату.
                </Text>
            </VStack>
        ),
        [],
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
