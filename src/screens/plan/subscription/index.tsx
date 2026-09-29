import { FC, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

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
    useTrainers,
    useWorkSchedule,
} from '@/hooks/use-planning';
import { useWorkouts } from '@/hooks/use-workouts';
import { buildTrainerPlans } from '@/helpers/trainer-planner';

const styles = StyleSheet.create((theme, rt) => ({
    container: {
        flex: 1,
        paddingHorizontal: theme.space(4),
    },
    content: {
        ...theme.screenContentPadding('root'),
        paddingBottom: rt.insets.bottom + theme.space(8),
        gap: theme.space(5),
    },
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(3),
    },
    title: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.lg.fontSize,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    subtitle: {
        color: theme.colors.typography,
        opacity: 0.55,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
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
        fontWeight: active ? theme.fontWeight.semibold.fontWeight : theme.fontWeight.medium.fontWeight,
    }),
    metricRow: {
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricLabel: {
        color: theme.colors.typography,
        opacity: 0.55,
    },
    metricValue: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    progressTrack: {
        height: theme.space(2),
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
        overflow: 'hidden',
    },
    progressFill: (value: number, color: string) => ({
        width: `${Math.min(100, Math.max(0, value * 100))}%`,
        height: '100%',
        backgroundColor: color,
        borderRadius: theme.radius.full,
    }),
    sessionRow: {
        minHeight: theme.space(14),
        alignItems: 'center',
        gap: theme.space(3),
    },
    sessionDot: (color: string) => ({
        width: theme.space(3),
        height: theme.space(3),
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
    sessionContent: {
        flex: 1,
        gap: theme.space(0.5),
    },
    sessionTitle: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
    },
    sessionSubtitle: {
        color: theme.colors.typography,
        opacity: 0.5,
        fontSize: theme.fontSize.sm.fontSize,
    },
    warning: {
        color: theme.colors.orange?.[500] ?? theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
}));

const SubscriptionScreen: FC = () => {
    const { theme } = useUnistyles();
    const { data: active } = useActiveSubscription();
    const { data: trainers = [] } = useTrainers();
    const { data: workSchedule } = useWorkSchedule();
    const { data: workouts = [] } = useWorkouts();
    const createSubscription = useCreateSubscription();

    const [target, setTarget] = useState(10);
    const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);

    const hasSchedule = Boolean(
        workSchedule &&
            (
                Object.keys(workSchedule.config.weekly).length ||
                workSchedule.config.cycle ||
                Object.keys(workSchedule.config.overrides).length
            ),
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
        const attended = active.sessions.filter((session) => session.status === 'attended').length;
        const missed = active.sessions.filter((session) => session.status === 'missed').length;
        const planned = active.sessions.filter((session) => session.status === 'planned');
        const next = planned.find((session) => dayjs(session.startAt).isAfter(dayjs().subtract(1, 'minute')));
        const color = active.trainer?.color || theme.colors.lime[400];

        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <VStack style={styles.card}>
                    <Text style={styles.title}>{active.trainer?.name || 'Тренер'}</Text>
                    <Text style={styles.subtitle}>Активный абонемент</Text>

                    <HStack style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Прогресс</Text>
                        <Text style={styles.metricValue}>
                            {attended}/{active.subscription.targetSessions}
                        </Text>
                    </HStack>

                    <Box style={styles.progressTrack}>
                        <Box
                            style={styles.progressFill(
                                attended / Math.max(1, active.subscription.targetSessions),
                                color,
                            )}
                        />
                    </Box>

                    <HStack style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Пропущено</Text>
                        <Text style={styles.metricValue}>{missed}</Text>
                    </HStack>

                    <HStack style={styles.metricRow}>
                        <Text style={styles.metricLabel}>Следующее</Text>
                        <Text style={styles.metricValue}>
                            {next ? dayjs(next.startAt).format('D MMM · HH:mm') : '—'}
                        </Text>
                    </HStack>
                </VStack>

                <VStack style={{ gap: theme.space(3) }}>
                    <Label>Все занятия</Label>
                    <VStack style={styles.card}>
                        {active.sessions.map((session) => {
                            const status =
                                session.status === 'attended'
                                    ? 'Посещено'
                                    : session.status === 'missed'
                                      ? 'Пропущено'
                                      : 'Запланировано';

                            const dot =
                                session.status === 'attended'
                                    ? theme.colors.lime[400]
                                    : session.status === 'missed'
                                      ? theme.colors.red[500]
                                      : color;

                            return (
                                <Pressable
                                    key={session.id}
                                    disabled={!session.workoutId}
                                    onPress={() =>
                                        session.workoutId &&
                                        router.navigate(`/workout/${session.workoutId}`)
                                    }
                                >
                                    <HStack style={styles.sessionRow}>
                                        <Box style={styles.sessionDot(dot)} />
                                        <VStack style={styles.sessionContent}>
                                            <Text style={styles.sessionTitle}>
                                                {dayjs(session.startAt).format('dddd, D MMMM · HH:mm')}
                                            </Text>
                                            <Text style={styles.sessionSubtitle}>{status}</Text>
                                        </VStack>
                                    </HStack>
                                </Pressable>
                            );
                        })}
                    </VStack>
                </VStack>

                <Button
                    type="link"
                    title="Тренеры"
                    onPress={() => router.navigate('/plan/trainers' as any)}
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
            <VStack style={{ gap: theme.space(3) }}>
                <Label>Размер абонемента</Label>
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
                            onPress={() => router.navigate('/plan/trainers' as any)}
                        />
                    </HStack>
                </VStack>
            </VStack>

            {hasSchedule && trainers.length > 0 && (
                <VStack style={{ gap: theme.space(3) }}>
                    <Label>Варианты</Label>

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
                                                {index === 0 ? ' · лучший' : ''}
                                            </Text>
                                        </Box>
                                    </Pressable>
                                );
                            })}
                        </HStack>
                    )}

                    {selectedPlan && (
                        <VStack style={styles.card}>
                            <Text style={styles.title}>{selectedPlan.trainer.name}</Text>

                            <HStack style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Занятий</Text>
                                <Text style={styles.metricValue}>
                                    {selectedPlan.sessions.length}/{target}
                                </Text>
                            </HStack>

                            <HStack style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Последнее занятие</Text>
                                <Text style={styles.metricValue}>
                                    {selectedPlan.finishAt
                                        ? dayjs(selectedPlan.finishAt).format('D MMM')
                                        : '—'}
                                </Text>
                            </HStack>

                            {!selectedPlan.complete && selectedPlan.missingSchedule && (
                                <Text style={styles.warning}>
                                    Не хватает будущего личного графика. Заполни следующие даты —
                                    это не означает, что тренер не подходит.
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
