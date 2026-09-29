import { FC } from 'react';
import { StyleSheet } from 'react-native-unistyles';

import { Box } from '@/components/primitives/box';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';

interface TrainerBadgeProps {
    name: string;
    color: string;
    subtle?: boolean;
}

const styles = StyleSheet.create((theme) => ({
    container: (subtle: boolean) => ({
        alignSelf: 'flex-start',
        alignItems: 'center',
        gap: theme.space(1.5),
        minHeight: theme.space(8),
        paddingHorizontal: theme.space(3),
        borderRadius: theme.radius.full,
        backgroundColor: subtle ? 'transparent' : theme.colors.foreground,
    }),
    dot: (color: string) => ({
        width: theme.space(2.5),
        height: theme.space(2.5),
        borderRadius: theme.radius.full,
        backgroundColor: color,
    }),
    label: {
        color: theme.colors.typography,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: theme.fontWeight.semibold.fontWeight,
    },
}));

export const TrainerBadge: FC<TrainerBadgeProps> = ({
    name,
    color,
    subtle = false,
}) => (
    <HStack style={styles.container(subtle)}>
        <Box style={styles.dot(color)} />
        <Text style={styles.label}>{name}</Text>
    </HStack>
);
