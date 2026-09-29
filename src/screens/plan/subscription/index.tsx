import { FC, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Check, ChevronRight, X } from 'lucide-react-native';

import { Title } from '@/components/typography/title';
import { ScrollView } from '@/components/primitives/scrollview';
import { Box } from '@/components/primitives/box';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import { Button } from '@/components/buttons/base';
import { Label } from '@/components/forms/label';
import { NumericStepperField } from '@/components/primitives/numeric-stepper-field';
import {
    useActiveSubscription,
    useCreateSubscription,
    useRebuildSubscriptionPlan,
    useSetSubscriptionWorkoutAttendance,
    useTrainers,
    useWorkSchedule,
} from '@/hooks/use-planning';
import { useWorkouts } from '@/hooks/use-workouts';
import { buildTrainerPlans } from '@/helpers/trainer-planner';
import { SubscriptionProgressCard } from '@/components/subscription/progress-card';

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingHorizontal: theme.space(4),
    },
    content: {
        ...theme.screenContentPadding('root'),
        paddingBottom: rt.insets.bottom + theme.space(20),
        gap: theme.space(5),
    },
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(4),
    },
    title: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.xl.fontSize,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    subtitle: {
        color: theme.colors.typography,
        opacity: 0.55,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    metricRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
    },
    metricLabel: {
        color: theme.colors.typography,
        opacity: 0.55,
    },
    metricValue: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    list: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        overflow: 'hidden',
    },
    row: {
        minHeight: theme.space(16),
        paddingHorizontal: theme.space(5),
        paddingVertical: theme.space(3),
        alignItems: 'center',
        gap: theme.space(3),
    },
    rowContent: {
        flex: 1,
        gap: theme.space(0.5),
    },
    rowTitle: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
        textTransform: 'capitalize',
    },
    rowSubtitle: {
        color: theme.colors.typography,
        opacity: 0.5,
        fontSize: theme.fontSize.sm.fontSize,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
        marginLeft: theme.space(5),
    },
    statusDot: (color: string) => ({
        width: theme.space(3),
        height: theme.space(3),
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
    attendanceActions: {
        gap: theme.space(2),
        marginTop: theme.space(2),
    },
    compactAction: {
        minHeight: theme.space(9),
        paddingHorizontal: theme.space(3),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.foreground,
    },
    compactActionText: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    chips: {
        gap: theme.space(2),
        flexWrap: 'wrap',
    },
    chip: (active: boolean) => ({
        minHeight: theme.space(10),
        paddingHorizontal: theme.space(4),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: active ? theme.colors.foreground : theme.colors.background,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    }),
    chipText: (active: boolean) => ({
        color: theme.colors.typography,
        fontWeight: active
            ? theme.fontWeight.semibold.fontWeight
            : theme.fontWeight.medium.fontWeight,
    }),
    warning: {
        color: theme.colors.typography,
        opacity: 0.65,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    preview: {
        gap: theme.space(2),
    },
    previewRow: {
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    previewDate: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    previewTime: {
        color: theme.colors.typography,
        opacity: 0.55,
    },
}));

const SubscriptionScreen: FC = () => {
    const { theme } = useUnistyles();
    const { data: active } = useActiveSubscription();
    const { data: trainers = [] } = useTrainers();
    const { data: workSchedule } = useWorkSchedule();
    const { data: workouts = [] } = useWorkouts();
    const createSubscription = useCreateSubscription();
    const rebuildSubscription = useRebuildSubscriptionPlan();
    const setAttendance = useSetSubscriptionWorkoutAttendance();

    const [target, setTarget] = useState(10);
    const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);

    const hasSchedule = Boolean(
        workSchedule &&
            (Object.keys(workSchedule.config.weekly).length ||
                workSchedule.config.cycle ||
                Object.keys(workSchedule.config.overrides).length),
    );

    const plans = useMemo(() => {
        if (!workSchedule || !hasSchedule || !target) return [];

        return buildTrainerPlans(
            trainers,
            target,
            workSchedule.config,
            workouts,
            new Date(),
        );
    }, [hasSchedule, target, trainers, workSchedule, workouts]);

    const selectedPlan =
        plans.find((plan) => plan.trainer.id === selectedTrainerId) ?? plans[0] ?? null;

    if (active) {
        const courseWorkouts = active.workouts
            .filter(
                (item) =>
                    item.status !== 'cancelled' ||
                    item.attendance === 'missed',
            )
            .sort((a, b) => {
            const aTime = a.startAt ? new Date(a.startAt).getTime() : 0;
            const bTime = b.startAt ? new Date(b.startAt).getTime() : 0;
            return aTime - bTime;
        });

        const attended = courseWorkouts.filter(
            (item) => item.attendance === 'attended' || item.status === 'completed',
        ).length;
        const missed = courseWorkouts.filter((item) => item.attendance === 'missed').length;
        const planned = courseWorkouts.filter(
            (item) =>
                item.attendance !== 'missed' &&
                (item.status === 'planned' || item.status === 'in_progress'),
        );
        const next = planned.find(
            (item) => item.startAt && !dayjs(item.startAt).isBefore(dayjs().subtract(1, 'minute')),
        );
        const color = active.trainer?.color || theme.colors.lime[400];

        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Title type="h1">Абонемент</Title>

                <SubscriptionProgressCard
                    trainerName={active.trainer?.name || 'Тренер'}
                    trainerColor={color}
                    attended={attended}
                    target={active.subscription.targetSessions}
                    missed={missed}
                    nextAt={next?.startAt}
                />

                <VStack style={{ gap: theme.space(3) }}>
                    <Label>Занятия</Label>
                    <VStack style={styles.list}>
                        {courseWorkouts.map((item, index) => {
                            const isAttended =
                                item.attendance === 'attended' || item.status === 'completed';
                            const isMissed = item.attendance === 'missed';
                            const isPastUnresolved =
                                !isAttended &&
                                !isMissed &&
                                item.startAt != null &&
                                dayjs(item.startAt)
                                    .add(60, 'minute')
                                    .isBefore(dayjs());

                            const status = isAttended
                                ? 'Посещено'
                                : isMissed
                                  ? 'Пропущено'
                                  : item.status === 'in_progress'
                                    ? 'Идёт сейчас'
                                    : 'Запланировано';

                            const dot = isAttended
                                ? theme.colors.lime[400]
                                : isMissed
                                  ? theme.colors.red[500]
                                  : color;

                            return (
                                <VStack key={item.id}>
                                    <Pressable
                                        disabled={isMissed || isPastUnresolved}
                                        onPress={() => router.navigate(`/workout/${item.id}`)}
                                    >
                                        <HStack style={styles.row}>
                                            <Box style={styles.statusDot(dot)} />
                                            <VStack style={styles.rowContent}>
                                                <Text style={styles.rowTitle}>
                                                    {item.startAt
                                                        ? dayjs(item.startAt).format(
                                                              'dddd, D MMMM · HH:mm',
                                                          )
                                                        : 'Без даты'}
                                                </Text>
                                                <Text style={styles.rowSubtitle}>{status}</Text>

                                                {isPastUnresolved && (
                                                    <HStack style={styles.attendanceActions}>
                                                        <Pressable
                                                            style={styles.compactAction}
                                                            onPress={() =>
                                                                setAttendance.mutate({
                                                                    workoutId: item.id,
                                                                    attendance: 'attended',
                                                                })
                                                            }
                                                        >
                                                            <HStack
                                                                style={{
                                                                    alignItems: 'center',
                                                                    gap: theme.space(1),
                                                                }}
                                                            >
                                                                <Check
                                                                    size={theme.space(4)}
                                                                    color={theme.colors.typography}
                                                                />
                                                                <Text style={styles.compactActionText}>
                                                                    Ходил
                                                                </Text>
                                                            </HStack>
                                                        </Pressable>

                                                        <Pressable
                                                            style={styles.compactAction}
                                                            onPress={() =>
                                                                setAttendance.mutate({
                                                                    workoutId: item.id,
                                                                    attendance: 'missed',
                                                                })
                                                            }
                                                        >
                                                            <HStack
                                                                style={{
                                                                    alignItems: 'center',
                                                                    gap: theme.space(1),
                                                                }}
                                                            >
                                                                <X
                                                                    size={theme.space(4)}
                                                                    color={theme.colors.typography}
                                                                />
                                                                <Text style={styles.compactActionText}>
                                                                    Не ходил
                                                                </Text>
                                                            </HStack>
                                                        </Pressable>
                                                    </HStack>
                                                )}
                                            </VStack>

                                            {!isMissed && (
                                                <ChevronRight
                                                    size={theme.space(5)}
                                                    color={theme.colors.typography}
                                                    opacity={0.35}
                                                />
                                            )}
                                        </HStack>
                                    </Pressable>
                                    {index < courseWorkouts.length - 1 && (
                                        <Box style={styles.divider} />
                                    )}
                                </VStack>
                            );
                        })}
                    </VStack>
                </VStack>

                <Button
                    type="link"
                    title="Перестроить будущие занятия"
                    loading={rebuildSubscription.isPending}
                    onPress={() =>
                        rebuildSubscription.mutate(active.subscription.id, {
                            onSuccess: (result) => {
                                if (result.reason === 'replanned') {
                                    Alert.alert(
                                        'Расписание обновлено',
                                        'Будущие занятия перестроены под текущий график.',
                                    );
                                    return;
                                }

                                if (result.reason === 'no_full_plan') {
                                    Alert.alert(
                                        'Не удалось перестроить',
                                        'Полный новый вариант пока не помещается в доступные даты. Текущее расписание оставлено без изменений.',
                                    );
                                    return;
                                }

                                Alert.alert(
                                    'Расписание актуально',
                                    'Будущие занятия уже подходят под текущие ограничения.',
                                );
                            },
                        })
                    }
                />
                <Button
                    type="link"
                    title="Тренеры"
                    onPress={() => router.navigate('/subscription-settings/trainers' as any)}
                />
            </ScrollView>
        );
    }

    const activate = async () => {
        if (!selectedPlan?.complete) return;

        await createSubscription.mutateAsync({
            trainerId: selectedPlan.trainer.id,
            targetSessions: target,
            sessions: selectedPlan.sessions,
        });
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Title type="h1">Абонемент</Title>

            <VStack style={styles.card}>
                <Text style={styles.title}>Создать абонемент</Text>
                <Text style={styles.subtitle}>
                    Укажи количество занятий. Skulpt найдёт пересечения твоего графика с
                    расписанием тренеров и сразу создаст будущие тренировки.
                </Text>
            </VStack>

            <VStack style={{ gap: theme.space(3) }}>
                <Label>Количество занятий</Label>
                <VStack style={styles.card}>
                    <NumericStepperField
                        value={target}
                        unit="занятий"
                        min={1}
                        max={99}
                        step={1}
                        decimalPlaces={0}
                        onChange={setTarget}
                        modalTitle="Количество занятий"
                    />
                </VStack>
            </VStack>

            <VStack style={{ gap: theme.space(3) }}>
                <Label>Для расчёта</Label>
                <VStack style={styles.card}>
                    <HStack style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Мой график</Text>
                        <Button
                            type="link"
                            size="sm"
                            title={hasSchedule ? 'Готов' : 'Заполнить'}
                            onPress={() => router.navigate('/settings/schedule' as any)}
                        />
                    </HStack>

                    <HStack style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Тренеры</Text>
                        <Button
                            type="link"
                            size="sm"
                            title={trainers.length ? `${trainers.length}` : 'Добавить'}
                            onPress={() => router.navigate('/subscription-settings/trainers' as any)}
                        />
                    </HStack>
                </VStack>
            </VStack>

            {hasSchedule && trainers.length > 0 && (
                <VStack style={{ gap: theme.space(3) }}>
                    <Label>Подходящие варианты</Label>

                    {plans.length > 0 && (
                        <HStack style={styles.chips}>
                            {plans.map((plan, index) => {
                                const activeChip = selectedPlan?.trainer.id === plan.trainer.id;

                                return (
                                    <Pressable
                                        key={plan.trainer.id}
                                        onPress={() => setSelectedTrainerId(plan.trainer.id)}
                                    >
                                        <Box style={styles.chip(activeChip)}>
                                            <Text style={styles.chipText(activeChip)}>
                                                {plan.trainer.name} · {plan.sessions.length}/{target}
                                                {index === 0 ? ' · по графику' : ''}
                                            </Text>
                                        </Box>
                                    </Pressable>
                                );
                            })}
                        </HStack>
                    )}

                    {selectedPlan && (
                        <VStack style={styles.card}>
                            <TrainerBadge
                                name={selectedPlan.trainer.name}
                                color={selectedPlan.trainer.color}
                            />

                            <HStack style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Занятий</Text>
                                <Text style={styles.metricValue}>
                                    {selectedPlan.sessions.length}/{target}
                                </Text>
                            </HStack>

                            <HStack style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Курс до</Text>
                                <Text style={styles.metricValue}>
                                    {selectedPlan.finishAt
                                        ? dayjs(selectedPlan.finishAt).format('D MMM')
                                        : '—'}
                                </Text>
                            </HStack>

                            <VStack style={styles.preview}>
                                {selectedPlan.sessions.slice(0, 5).map((session) => (
                                    <HStack
                                        key={session.startAt.toISOString()}
                                        style={styles.previewRow}
                                    >
                                        <Text style={styles.previewDate}>
                                            {dayjs(session.startAt).format('ddd, D MMM')}
                                        </Text>
                                        <Text style={styles.previewTime}>
                                            {dayjs(session.startAt).format('HH:mm')}
                                        </Text>
                                    </HStack>
                                ))}
                            </VStack>

                            {!selectedPlan.complete && selectedPlan.missingSchedule && (
                                <Text style={styles.warning}>
                                    Будущий личный график заполнен не полностью. Добавь следующие
                                    даты — это не означает, что тренер не подходит.
                                </Text>
                            )}

                            <Button
                                title={`Выбрать ${selectedPlan.trainer.name}`}
                                disabled={!selectedPlan.complete}
                                loading={createSubscription.isPending}
                                onPress={activate}
                            />
                        </VStack>
                    )}
                </VStack>
            )}
        </ScrollView>
    );
};

export default SubscriptionScreen;
