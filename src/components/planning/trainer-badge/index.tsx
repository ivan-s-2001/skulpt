import { FC } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

const styles = StyleSheet.create((theme) => ({
    container: {
        alignItems: 'center',
        gap: theme.space(1.5),
    },
    dot: (color: string) => ({
        width: theme.space(2),
        height: theme.space(2),
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
    label: (onAccent: boolean) => ({
        color: onAccent ? theme.colors.neutral[950] : theme.colors.typography,
        opacity: onAccent ? 0.8 : 0.6,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.medium.fontWeight,
    }),
}));

interface TrainerBadgeProps {
    name: string;
    color: string;
    onAccent?: boolean;
    prefix?: string;
}

export const TrainerBadge: FC<TrainerBadgeProps> = ({
    name,
    color,
    onAccent = false,
    prefix = 'С',
}) => (
    <HStack style={styles.container}>
        <Box style={styles.dot(color)} />
        <Text style={styles.label(onAccent)}>
            {prefix} {name}
        </Text>
    </HStack>
);
