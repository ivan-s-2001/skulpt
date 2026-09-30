import { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';

import { Title } from '@/components/typography/title';
import { ScrollView } from '@/components/primitives/scrollview';
import { VStack } from '@/components/primitives/vstack';
import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { Label } from '@/components/forms/label';
import { useWorkoutStats } from '@/hooks/use-workouts';
import { useUser } from '@/hooks/use-user';
import { useActiveSubscription } from '@/hooks/use-planning';
import { SubscriptionProgressCard } from '@/components/subscription/progress-card';

import { ActivitySummary } from './components/activity-summary';
import { MonthStats } from './components/month';
import { Scale } from './components/scale';
import { StrengthStats } from './components/strength';

const styles = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        paddingHorizontal: theme.space(4),
    },
    content: {
        ...theme.screenContentPadding('root'),
        gap: theme.space(5),
    },
    statsContainer: {
        flex: 1,
        backgroundColor: theme.colors.foreground,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(4),
    },
    statsWrapper: {
        flex: 1,
    },
    statContainer: {
        minHeight: theme.space(8),
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(3),
    },
    statTitleContainer: {
        gap: theme.space(2),
    },
    statTitle: {
        color: theme.colors.typography,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: theme.colors.border,
        marginVertical: theme.space(2),
    },
    fieldContainer: {
        gap: theme.space(3),
    },
    label: {
        ...theme.fontSize['2xl'],
        fontWeight: theme.fontWeight.bold.fontWeight,
        color: theme.colors.typography,
        opacity: 1,
    },
}));

const ResultsScreen = () => {
    const { t } = useTranslation(['common', 'screens']);
    const { user } = useUser();
    const stats = useWorkoutStats();
    const { data: activeSubscription } = useActiveSubscription();
    const [isChartScrubbing, setIsChartScrubbing] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const statsData = useMemo(() => {
        return [
            {
                title: t('results.stats.trainingWeeks.title', { ns: 'screens' }),
                value: stats.trainingWeeks
                    ? t('number', { value: stats.trainingWeeks, ns: 'common' })
                    : '-',
            },
            {
                title: t('results.stats.trainingDays.title', { ns: 'screens' }),
                value: stats.trainingDays
                    ? t('number', { value: stats.trainingDays, ns: 'common' })
                    : '-',
            },
            {
                title: t('results.stats.trainingHours.title', { ns: 'screens' }),
                value: stats.trainingHours
                    ? t('number', { value: stats.trainingHours, ns: 'common' })
                    : '-',
            },
            {
                title: t('results.stats.workoutsCount.title', { ns: 'screens' }),
                value: stats.workoutsCount
                    ? t('number', { value: stats.workoutsCount, ns: 'common' })
                    : '-',
            },
            {
                title: t('results.stats.volume.title', { ns: 'screens' }),
                value: stats.volume
                    ? t('weight.weight', {
                          value: stats.volume,
                          context: user?.weightUnits ?? undefined,
                          ns: 'common',
                      })
                    : '-',
            },
            {
                title: t('results.stats.exercisesCount.title', { ns: 'screens' }),
                value: stats.exercisesCount
                    ? t('number', { value: stats.exercisesCount, ns: 'common' })
                    : '-',
            },
            {
                title: t('results.stats.setsCount.title', { ns: 'screens' }),
                value: stats.setsCount
                    ? t('number', { value: stats.setsCount, ns: 'common' })
                    : '-',
            },
            {
                title: t('results.stats.repsCount.title', { ns: 'screens' }),
                value: stats.repsCount
                    ? t('number', { value: stats.repsCount, ns: 'common' })
                    : '-',
            },
        ];
    }, [stats, user?.weightUnits, t]);

    const subscriptionStats = useMemo(() => {
        if (!activeSubscription) return null;

        const attended = activeSubscription.workouts.filter(
            (item) => item.attendance === 'attended' || item.status === 'completed',
        ).length;
        const missed = activeSubscription.workouts.filter(
            (item) => item.attendance === 'missed',
        ).length;
        const remaining = Math.max(0, activeSubscription.subscription.targetSessions - attended);
        const next = activeSubscription.workouts
            .filter(
                (item) =>
                    item.attendance !== 'missed' &&
                    (item.status === 'planned' || item.status === 'in_progress') &&
                    item.startAt,
            )
            .sort((a, b) => new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime())
            .find((item) => new Date(item.startAt!).getTime() >= now);

        return { attended, missed, remaining, next };
    }, [activeSubscription, now]);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            scrollEnabled={!isChartScrubbing}
        >
            <Title type="h1">{t('results.title', { ns: 'screens' })}</Title>

            {activeSubscription && subscriptionStats && (
                <VStack style={styles.fieldContainer}>
                    <Label style={styles.label}>Абонемент</Label>
                    <SubscriptionProgressCard
                        trainerName={activeSubscription.trainer?.name || 'Тренер'}
                        trainerColor={activeSubscription.trainer?.color}
                        attended={subscriptionStats.attended}
                        target={activeSubscription.subscription.targetSessions}
                        missed={subscriptionStats.missed}
                        nextAt={subscriptionStats.next?.startAt}
                        onPress={() => router.navigate('/subscription')}
                    />
                </VStack>
            )}

            <MonthStats />
            <ActivitySummary onScrubbingChange={setIsChartScrubbing} />
            <StrengthStats />
            <Scale />

            <VStack style={styles.fieldContainer}>
                <Label style={styles.label}>{t('results.stats.title', { ns: 'screens' })}</Label>
                <VStack style={styles.statsContainer}>
                    <VStack style={styles.statsWrapper}>
                        {statsData.map((stat, index) => (
                            <VStack key={index}>
                                <HStack style={styles.statContainer}>
                                    <VStack style={styles.statTitleContainer}>
                                        <Box>
                                            <Text fontWeight="medium" style={styles.statTitle}>
                                                {stat.title}
                                            </Text>
                                        </Box>
                                    </VStack>
                                    <Box>
                                        <Text fontWeight="medium" style={styles.statTitle}>
                                            {stat.value}
                                        </Text>
                                    </Box>
                                </HStack>
                                {index < statsData.length - 1 && <Box style={styles.divider} />}
                            </VStack>
                        ))}
                    </VStack>
                </VStack>
            </VStack>
        </ScrollView>
    );
};

export default ResultsScreen;
