import { FC, useMemo } from 'react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { WorkoutSelect } from '@/db/schema';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { VStack } from '@/components/primitives/vstack';
import { Pressable } from '@/components/primitives/pressable';
import { getWorkoutDateKey } from '@/helpers/workouts';

interface WeekStatsProps {
    workouts: WorkoutSelect[];
    firstWeekday: number;
    selectedDate: string;
    onSelectDate: (dateKey: string) => void;
    trainerColorById?: Record<string, string>;
}

const getWeekStart = (date: dayjs.Dayjs, firstWeekday: number): dayjs.Dayjs => {
    const day = date.day();
    const offset = firstWeekday === 1 ? day : day === 0 ? 6 : day - 1;
    return date.subtract(offset, 'day').startOf('day');
};

const styles = StyleSheet.create((theme) => ({
    wrapper: {
        paddingHorizontal: theme.space(4),
    },
    container: {
        gap: theme.space(2),
    },
    weekdaysRow: {
        justifyContent: 'space-between',
    },
    weekdayCell: {
        width: theme.space(11),
        alignItems: 'center',
        justifyContent: 'center',
    },
    weekdayLabel: {
        ...theme.fontSize.sm,
        color: theme.colors.typography,
        opacity: 0.45,
        textTransform: 'capitalize',
    },
    weekdayLabelToday: {
        opacity: 1,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    daysRow: {
        justifyContent: 'space-between',
    },
    dayCell: {
        width: theme.space(11),
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCircle: {
        height: theme.space(11),
        width: theme.space(11),
        borderRadius: theme.radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: theme.space(0.25),
        borderColor: theme.colors.border,
    },
    dayCirclePlanned: {
        backgroundColor: theme.colors.foreground,
    },
    dayCircleCompleted: {
        backgroundColor: theme.colors.lime[400],
        borderColor: theme.colors.lime[400],
    },
    dayCircleSelected: {
        borderWidth: theme.space(0.5),
        borderColor: theme.colors.typography,
    },
    dayCircleToday: {
        borderColor: theme.colors.typography,
    },
    dayText: {
        ...theme.fontSize.default,
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
        opacity: 0.6,
    },
    dayTextCompleted: {
        color: theme.colors.neutral[950],
        opacity: 1,
    },
    dayTextSelected: {
        opacity: 1,
    },
    indicators: {
        position: 'absolute',
        bottom: theme.space(1),
        flexDirection: 'row',
        gap: theme.space(0.75),
    },
    indicator: (color: string) => ({
        width: theme.space(1),
        height: theme.space(1),
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
}));

export const WeekStats: FC<WeekStatsProps> = ({
    workouts,
    firstWeekday,
    selectedDate,
    onSelectDate,
    trainerColorById = {},
}) => {
    const { i18n } = useTranslation(['screens']);
    const { theme } = useUnistyles();

    const workoutStateByDate = useMemo(() => {
        const map = new Map<
            string,
            {
                planned: boolean;
                inProgress: boolean;
                completed: boolean;
                missed: boolean;
                hasSolo: boolean;
                trainerColors: Set<string>;
            }
        >();

        workouts.forEach((workout) => {
            if (
                workout.status === 'cancelled' &&
                workout.attendance !== 'missed'
            ) {
                return;
            }

            const dateKey = getWorkoutDateKey(workout);
            if (!dateKey) return;

            const state = map.get(dateKey) ?? {
                planned: false,
                inProgress: false,
                completed: false,
                missed: false,
                hasSolo: false,
                trainerColors: new Set<string>(),
            };

            if (workout.attendance === 'missed') state.missed = true;
            else if (workout.status === 'planned') state.planned = true;
            else if (workout.status === 'in_progress') state.inProgress = true;
            else if (workout.status === 'completed') state.completed = true;

            if (workout.trainerId) {
                const color = trainerColorById[workout.trainerId];
                if (color) state.trainerColors.add(color);
            } else {
                state.hasSolo = true;
            }

            map.set(dateKey, state);
        });

        return map;
    }, [trainerColorById, workouts]);

    const weekDays = useMemo(() => {
        const today = dayjs();
        const weekStart = getWeekStart(today, firstWeekday);
        const weekdayFormatter = new Intl.DateTimeFormat(i18n.language, {
            weekday: 'short',
        });
        const todayKey = today.format('YYYY-MM-DD');

        return Array.from({ length: 7 }, (_, index) => {
            const date = weekStart.add(index, 'day');
            const dateKey = date.format('YYYY-MM-DD');
            const weekday = weekdayFormatter.format(date.toDate());
            const state = workoutStateByDate.get(dateKey);

            return {
                dateKey,
                day: date.date(),
                weekday,
                isToday: dateKey === todayKey,
                isSelected: dateKey === selectedDate,
                state,
            };
        });
    }, [firstWeekday, i18n.language, selectedDate, workoutStateByDate]);

    return (
        <Box style={styles.wrapper}>
            <VStack style={styles.container}>
                <HStack style={styles.weekdaysRow}>
                    {weekDays.map((item) => (
                        <Box key={`weekday-${item.dateKey}`} style={styles.weekdayCell}>
                            <Text
                                style={[
                                    styles.weekdayLabel,
                                    item.isToday && styles.weekdayLabelToday,
                                ]}
                            >
                                {item.weekday}
                            </Text>
                        </Box>
                    ))}
                </HStack>

                <HStack style={styles.daysRow}>
                    {weekDays.map((item) => {
                        const state = item.state;
                        const hasPlanned = Boolean(state?.planned || state?.inProgress);
                        const onlyCompleted = Boolean(
                            state?.completed &&
                                !hasPlanned &&
                                !state.missed,
                        );

                        const indicators: string[] = [];
                        if (state?.hasSolo) indicators.push('solo');
                        if (state?.trainerColors) {
                            indicators.push(...Array.from(state.trainerColors));
                        }
                        if (state?.missed) indicators.push('missed');

                        return (
                            <Box key={item.dateKey} style={styles.dayCell}>
                                <Pressable onPress={() => onSelectDate(item.dateKey)}>
                                    <Box
                                        style={[
                                            styles.dayCircle,
                                            hasPlanned && styles.dayCirclePlanned,
                                            onlyCompleted && styles.dayCircleCompleted,
                                            item.isToday && styles.dayCircleToday,
                                            item.isSelected && styles.dayCircleSelected,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.dayText,
                                                onlyCompleted && styles.dayTextCompleted,
                                                item.isSelected && styles.dayTextSelected,
                                            ]}
                                        >
                                            {item.day}
                                        </Text>

                                        {indicators.length > 0 && (
                                            <HStack style={styles.indicators}>
                                                {indicators.slice(0, 3).map((indicator, index) => {
                                                    const color =
                                                        indicator === 'solo'
                                                            ? onlyCompleted
                                                                ? theme.colors.neutral[950]
                                                                : theme.colors.lime[400]
                                                            : indicator === 'missed'
                                                              ? theme.colors.red[500]
                                                              : indicator;

                                                    return (
                                                        <Box
                                                            key={`${indicator}-${index}`}
                                                            style={styles.indicator(color)}
                                                        />
                                                    );
                                                })}
                                            </HStack>
                                        )}
                                    </Box>
                                </Pressable>
                            </Box>
                        );
                    })}
                </HStack>
            </VStack>
        </Box>
    );
};
