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
import { HStack } from '@/components/primitives/hstack';
import { Button } from '@/components/buttons/base';
import { useRunningWorkoutStatic, useRunningWorkoutTicker } from '@/hooks/use-running-workout';
import type { WorkoutOverviewMetaMap } from '@/hooks/use-workouts';
import { Pushes } from '@/components/promo/pushes';
import { getWorkoutDateKey } from '@/helpers/workouts';
import { useTrainers, useWorkSchedule } from '@/hooks/use-planning';
import { EMPTY_WORK_SCHEDULE, resolveWorkShift } from '@/helpers/planning';
import { useEditor } from '@/hooks/use-editor';

import { WorkoutCard } from '../workout-card';
import { Header } from '../header';
import { WeekStats } from '../week';

interface WorkoutsProps {
    workouts: WorkoutSelect[];
    firstWeekday: number;
    workoutsOverviewMeta: WorkoutOverviewMetaMap;
}

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
    selectedDayHeader: {
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    selectedDayText: {
        flex: 1,
        gap: theme.space(1),
    },
    selectedDayMeta: {
        fontSize: theme.fontSize.sm.fontSize,
        color: theme.colors.typography,
        opacity: 0.62,
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
    const { data: trainers = [] } = useTrainers();
    const { data: workSchedule } = useWorkSchedule();
    const { navigate: openEditor } = useEditor();
    const [selectedDate, setSelectedDate] = useState(() => dayjs().format('YYYY-MM-DD'));

    const trainerById = useMemo(
        () =>
            Object.fromEntries(
                trainers.map((trainer) => [
                    trainer.id,
                    { name: trainer.name, color: trainer.color },
                ]),
            ),
        [trainers],
    );

    const trainerColorById = useMemo(
        () =>
            Object.fromEntries(
                trainers.map((trainer) => [trainer.id, trainer.color]),
            ),
        [trainers],
    );

    const selectedWorkouts = useMemo(
        () =>
            workouts
                .filter((workout) => {
                    if (
                        workout.status === 'cancelled' &&
                        workout.attendance !== 'missed'
                    ) {
                        return false;
                    }
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

    const selectedShift = useMemo(
        () =>
            resolveWorkShift(
                workSchedule?.config ?? EMPTY_WORK_SCHEDULE,
                selectedDate,
            ),
        [selectedDate, workSchedule?.config],
    );

    const selectedDayScheduleLabel = useMemo(() => {
        if (selectedShift === null) return 'Выходной';
        if (selectedShift) return `Работа · ${selectedShift.start}–${selectedShift.end}`;
        return 'Рабочий график не указан';
    }, [selectedShift]);

    const selectedDaySubtitle = useMemo(() => {
        const count = selectedWorkouts.length;
        if (count === 0) return 'Тренировок нет';
        return `${count} ${count === 1 ? 'тренировка' : count < 5 ? 'тренировки' : 'тренировок'}`;
    }, [selectedWorkouts.length]);

    const handleAddSolo = useCallback(() => {
        let startAt = dayjs(selectedDate)
            .hour(18)
            .minute(0)
            .second(0)
            .millisecond(0);

        if (
            selectedDate === dayjs().format('YYYY-MM-DD') &&
            startAt.isBefore(dayjs())
        ) {
            startAt = dayjs().add(1, 'hour').startOf('hour');
        }

        openEditor({
            type: 'workout__create',
            payload: {
                startAt: startAt.toDate(),
            },
        });
    }, [openEditor, selectedDate]);

    const renderHeader = useCallback(
        () => (
            <VStack style={styles.headerContent}>
                <Header />
                <WeekStats
                    workouts={workouts}
                    firstWeekday={firstWeekday}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    trainerColorById={trainerColorById}
                />
                <VStack style={styles.selectedDayContainer}>
                    <HStack style={styles.selectedDayHeader}>
                        <VStack style={styles.selectedDayText}>
                            <Text style={styles.selectedDayTitle}>
                                {selectedDayTitle}
                            </Text>
                            <Text style={styles.selectedDayMeta}>
                                {selectedDayScheduleLabel}
                            </Text>
                            <Text style={styles.selectedDaySubtitle}>
                                {selectedDaySubtitle}
                            </Text>
                        </VStack>

                        <Button
                            type="link"
                            size="sm"
                            title="+ Соло"
                            onPress={handleAddSolo}
                        />
                    </HStack>
                </VStack>
            </VStack>
        ),
        [
            firstWeekday,
            selectedDate,
            handleAddSolo,
            selectedDayScheduleLabel,
            selectedDaySubtitle,
            selectedDayTitle,
            trainerColorById,
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
                        trainerName={
                            item.trainerId ? trainerById[item.trainerId]?.name : null
                        }
                        trainerColor={
                            item.trainerId ? trainerById[item.trainerId]?.color : null
                        }
                    />
                </Box>
            );
        },
        [
            elapsedFormated,
            handleWorkoutPress,
            runningWorkout?.id,
            trainerById,
            workoutsOverviewMeta,
        ],
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
