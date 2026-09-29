import { FC, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import { Title } from '@/components/typography/title';
import { ScrollView } from '@/components/primitives/scrollview';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { Label } from '@/components/forms/label';
import { Button } from '@/components/buttons/base';
import { useEditor } from '@/hooks/use-editor';
import { useWorkouts } from '@/hooks/use-workouts';
import { useActiveSubscription } from '@/hooks/use-planning';
import { WorkoutCard } from '@/screens/home/components/workout-card';

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
    section: {
        gap: theme.space(3),
    },
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(4),
    },
    title: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.lg.fontSize,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    description: {
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
    workouts: {
        gap: theme.space(2),
    },
    empty: {
        padding: theme.space(5),
        gap: theme.space(2),
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
    },
    emptyTitle: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    emptyDescription: {
        color: theme.colors.typography,
        opacity: 0.5,
        fontSize: theme.fontSize.sm.fontSize,
        textAlign: 'center',
    },
    note: {
        color: theme.colors.typography,
        opacity: 0.45,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
        textAlign: 'center',
        paddingHorizontal: theme.space(5),
    },
}));

const PlanScreen: FC = () => {
    const { t } = useTranslation(['screens']);
    const { navigate } = useEditor();
    const { data: workouts = [] } = useWorkouts();
    const { data: active } = useActiveSubscription();

    const trainerWorkoutIds = useMemo(
        () =>
            new Set(
                (active?.sessions || [])
                    .map((session) => session.workoutId)
                    .filter((id): id is string => Boolean(id)),
            ),
        [active?.sessions],
    );

    const plannedSolo = useMemo(
        () =>
            workouts
                .filter(
                    (workout) =>
                        workout.status === 'planned' &&
                        workout.startAt &&
                        !trainerWorkoutIds.has(workout.id) &&
                        dayjs(workout.startAt).isAfter(dayjs().startOf('day')),
                )
                .sort(
                    (a, b) =>
                        new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime(),
                )
                .slice(0, 4),
        [trainerWorkoutIds, workouts],
    );

    const handleAddSolo = useCallback(() => {
        navigate({ type: 'workout__create' });
    }, [navigate]);

    const attended =
        active?.sessions.filter((session) => session.status === 'attended').length ?? 0;
    const nextSession = active?.sessions.find(
        (session) =>
            session.status === 'planned' &&
            !dayjs(session.startAt).isBefore(dayjs().subtract(1, 'minute')),
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Title type="h1">{t('plan.title', { ns: 'screens' })}</Title>

            <VStack style={styles.section}>
                <Label>{t('plan.subscription.section', { ns: 'screens' })}</Label>
                <VStack style={styles.card}>
                    <Text style={styles.title}>
                        {active?.trainer?.name || t('plan.subscription.title', { ns: 'screens' })}
                    </Text>

                    {active ? (
                        <>
                            <HStack style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Прогресс</Text>
                                <Text style={styles.metricValue}>
                                    {attended}/{active.subscription.targetSessions}
                                </Text>
                            </HStack>
                            <HStack style={styles.metricRow}>
                                <Text style={styles.metricLabel}>Следующее</Text>
                                <Text style={styles.metricValue}>
                                    {nextSession
                                        ? dayjs(nextSession.startAt).format('D MMM · HH:mm')
                                        : '—'}
                                </Text>
                            </HStack>
                        </>
                    ) : (
                        <Text style={styles.description}>
                            {t('plan.subscription.emptyDescription', { ns: 'screens' })}
                        </Text>
                    )}

                    <Button
                        title={active ? 'Открыть абонемент' : t('plan.subscription.action', { ns: 'screens' })}
                        onPress={() => router.navigate('/plan/subscription' as any)}
                    />
                    <Button
                        type="link"
                        title="Тренеры"
                        onPress={() => router.navigate('/plan/trainers' as any)}
                    />
                </VStack>
            </VStack>

            <VStack style={styles.section}>
                <HStack style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Label>{t('plan.solo.section', { ns: 'screens' })}</Label>
                    <Button
                        type="link"
                        size="sm"
                        title={t('plan.solo.add', { ns: 'screens' })}
                        onPress={handleAddSolo}
                    />
                </HStack>

                {plannedSolo.length ? (
                    <VStack style={styles.workouts}>
                        {plannedSolo.map((workout) => (
                            <WorkoutCard
                                key={workout.id}
                                workout={workout}
                                onPress={(id) => router.navigate(`/workout/${id}`)}
                                activeElapsedFormatted={null}
                            />
                        ))}
                    </VStack>
                ) : (
                    <VStack style={styles.empty}>
                        <Text style={styles.emptyTitle}>
                            {t('plan.solo.emptyTitle', { ns: 'screens' })}
                        </Text>
                        <Text style={styles.emptyDescription}>
                            {t('plan.solo.emptyDescription', { ns: 'screens' })}
                        </Text>
                    </VStack>
                )}
            </VStack>

            <Text style={styles.note}>{t('plan.note', { ns: 'screens' })}</Text>
        </ScrollView>
    );
};

export default PlanScreen;
