import { FC, useCallback, useMemo } from 'react';
import dayjs from 'dayjs';
import { router } from 'expo-router';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Dumbbell, UserRound } from 'lucide-react-native';

import { Title } from '@/components/typography/title';
import { ScrollView } from '@/components/primitives/scrollview';
import { Box } from '@/components/primitives/box';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import { Label } from '@/components/forms/label';
import { Button } from '@/components/buttons/base';
import { useEditor } from '@/hooks/use-editor';
import { useWorkouts } from '@/hooks/use-workouts';

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
    heroHeader: {
        alignItems: 'center',
        gap: theme.space(3),
    },
    iconContainer: {
        width: theme.space(11),
        height: theme.space(11),
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.foreground,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroText: {
        flex: 1,
        gap: theme.space(1),
    },
    heroTitle: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.lg.fontSize,
        fontWeight: theme.fontWeight.bold.fontWeight,
    },
    heroDescription: {
        color: theme.colors.typography,
        opacity: 0.55,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    list: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        overflow: 'hidden',
    },
    row: {
        minHeight: theme.space(16),
        alignItems: 'center',
        paddingHorizontal: theme.space(5),
        gap: theme.space(3),
    },
    rowContent: {
        flex: 1,
        gap: theme.space(0.5),
    },
    rowTitle: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
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
    empty: {
        padding: theme.space(5),
        gap: theme.space(2),
        alignItems: 'center',
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
    const { t, i18n } = useTranslation(['screens']);
    const { theme } = useUnistyles();
    const { navigate } = useEditor();
    const { data: workouts = [] } = useWorkouts();

    const plannedSolo = useMemo(
        () =>
            workouts
                .filter((workout) => {
                    if (workout.status !== 'planned' || !workout.startAt) return false;
                    return dayjs(workout.startAt).isAfter(dayjs().startOf('day'));
                })
                .sort(
                    (a, b) =>
                        new Date(a.startAt!).getTime() - new Date(b.startAt!).getTime(),
                )
                .slice(0, 4),
        [workouts],
    );

    const handleAddSolo = useCallback(() => {
        navigate({ type: 'workout__create' });
    }, [navigate]);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Title type="h1">{t('plan.title', { ns: 'screens' })}</Title>

            <VStack style={styles.section}>
                <Label>{t('plan.subscription.section', { ns: 'screens' })}</Label>
                <VStack style={styles.card}>
                    <HStack style={styles.heroHeader}>
                        <Box style={styles.iconContainer}>
                            <UserRound
                                size={theme.space(6)}
                                color={theme.colors.typography}
                                strokeWidth={1.8}
                            />
                        </Box>
                        <VStack style={styles.heroText}>
                            <Text style={styles.heroTitle}>
                                {t('plan.subscription.title', { ns: 'screens' })}
                            </Text>
                            <Text style={styles.heroDescription}>
                                {t('plan.subscription.emptyDescription', { ns: 'screens' })}
                            </Text>
                        </VStack>
                    </HStack>
                    <Button
                        title={t('plan.subscription.action', { ns: 'screens' })}
                        onPress={() => router.navigate('/plan/subscription' as any)}
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

                <VStack style={styles.list}>
                    {plannedSolo.length ? (
                        plannedSolo.map((workout, index) => {
                            const date = dayjs(workout.startAt)
                                .locale(i18n.language)
                                .format('ddd, D MMM · HH:mm');

                            return (
                                <VStack key={workout.id}>
                                    <Pressable onPress={() => router.navigate(`/workout/${workout.id}`)}>
                                        <HStack style={styles.row}>
                                            <Box style={styles.iconContainer}>
                                                <Dumbbell
                                                    size={theme.space(5)}
                                                    color={theme.colors.typography}
                                                    strokeWidth={1.8}
                                                />
                                            </Box>
                                            <VStack style={styles.rowContent}>
                                                <Text style={styles.rowTitle}>{workout.name}</Text>
                                                <Text style={styles.rowSubtitle}>{date}</Text>
                                            </VStack>
                                            <ChevronRight
                                                size={theme.space(5)}
                                                color={theme.colors.typography}
                                                opacity={0.45}
                                            />
                                        </HStack>
                                    </Pressable>
                                    {index < plannedSolo.length - 1 && <Box style={styles.divider} />}
                                </VStack>
                            );
                        })
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
            </VStack>

            <Text style={styles.note}>{t('plan.note', { ns: 'screens' })}</Text>
        </ScrollView>
    );
};

export default PlanScreen;
