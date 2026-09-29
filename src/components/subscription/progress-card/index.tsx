import { FC } from 'react';
import dayjs from 'dayjs';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { ChevronRight } from 'lucide-react-native';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { VStack } from '@/components/primitives/vstack';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import { TrainerBadge } from '@/components/subscription/trainer-badge';

interface SubscriptionProgressCardProps {
    trainerName: string;
    trainerColor: string;
    attended: number;
    target: number;
    missed: number;
    nextAt?: Date | string | number | null;
    onPress?: () => void;
    compact?: boolean;
}

const styles = StyleSheet.create((theme) => ({
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(4),
    },
    header: {
        alignItems: 'center',
        gap: theme.space(3),
    },
    titleWrap: {
        flex: 1,
        gap: theme.space(1),
    },
    subtitle: {
        color: theme.colors.typography,
        opacity: 0.5,
        fontSize: theme.fontSize.sm.fontSize,
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
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
    metrics: {
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    metric: {
        flex: 1,
        gap: theme.space(0.5),
    },
    metricLabel: {
        color: theme.colors.typography,
        opacity: 0.45,
        fontSize: theme.fontSize.xs.fontSize,
    },
    metricValue: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.default.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
    nextRow: {
        minHeight: theme.space(8),
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.space(3),
    },
    nextValue: {
        flexShrink: 1,
        textAlign: 'right',
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
}));

export const SubscriptionProgressCard: FC<SubscriptionProgressCardProps> = ({
    trainerName,
    trainerColor,
    attended,
    target,
    missed,
    nextAt,
    onPress,
    compact = false,
}) => {
    const { theme } = useUnistyles();
    const remaining = Math.max(0, target - attended);
    const next = nextAt ? dayjs(nextAt).format('D MMM · HH:mm') : '—';

    const content = (
        <VStack style={styles.card}>
            <HStack style={styles.header}>
                <VStack style={styles.titleWrap}>
                    <TrainerBadge
                        name={trainerName}
                        color={trainerColor}
                    />
                    {!compact && (
                        <Text style={styles.subtitle}>
                            Активный абонемент · {target} занятий
                        </Text>
                    )}
                </VStack>

                {onPress && (
                    <ChevronRight
                        size={theme.space(5)}
                        color={theme.colors.typography}
                        opacity={0.35}
                    />
                )}
            </HStack>

            <Box style={styles.progressTrack}>
                <Box
                    style={styles.progressFill(
                        attended / Math.max(1, target),
                        trainerColor,
                    )}
                />
            </Box>

            <HStack style={styles.metrics}>
                <VStack style={styles.metric}>
                    <Text style={styles.metricLabel}>Пройдено</Text>
                    <Text style={styles.metricValue}>
                        {attended}/{target}
                    </Text>
                </VStack>

                <VStack style={styles.metric}>
                    <Text style={styles.metricLabel}>Осталось</Text>
                    <Text style={styles.metricValue}>{remaining}</Text>
                </VStack>

                {!compact && (
                    <VStack style={styles.metric}>
                        <Text style={styles.metricLabel}>Пропущено</Text>
                        <Text style={styles.metricValue}>{missed}</Text>
                    </VStack>
                )}
            </HStack>

            <HStack style={styles.nextRow}>
                <Text style={styles.metricLabel}>Следующее</Text>
                <Text style={styles.nextValue}>{next}</Text>
            </HStack>
        </VStack>
    );

    return onPress ? <Pressable onPress={onPress}>{content}</Pressable> : content;
};
