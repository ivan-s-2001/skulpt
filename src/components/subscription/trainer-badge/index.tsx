import { FC } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

interface TrainerBadgeProps {
    name: string;
    color: string;
    subtle?: boolean;
    onAccent?: boolean;
    prefix?: string;
}

const styles = StyleSheet.create((theme) => ({
    container: (subtle: boolean) => ({
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: theme.space(1.5),
        minHeight: subtle ? undefined : theme.space(8),
        paddingHorizontal: subtle ? 0 : theme.space(3),
        borderRadius: theme.radius.full,
        backgroundColor: subtle ? 'transparent' : theme.colors.foreground,
    }),
    dot: (color: string) => ({
        width: theme.space(2),
        height: theme.space(2),
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
    label: (onAccent: boolean) => ({
        color: onAccent ? theme.colors.neutral[950] : theme.colors.typography,
        opacity: onAccent ? 0.82 : 0.64,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.medium.fontWeight,
    }),
}));

export const TrainerBadge: FC<TrainerBadgeProps> = ({
    name,
    color,
    subtle = true,
    onAccent = false,
    prefix = 'Тренер ·',
}) => (
    <HStack style={styles.container(subtle)}>
        <Box style={styles.dot(color)} />
        <Text style={styles.label(onAccent)}>
            {prefix ? `${prefix} ${name}` : name}
        </Text>
    </HStack>
);
