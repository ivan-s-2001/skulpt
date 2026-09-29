import { FC, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { ScrollView } from '@/components/primitives/scrollview';
import { Box } from '@/components/primitives/box';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import { Input } from '@/components/primitives/input';
import { Button } from '@/components/buttons/base';
import { Label } from '@/components/forms/label';
import { useSaveWorkSchedule, useWorkSchedule } from '@/hooks/use-planning';
import {
    EMPTY_WORK_SCHEDULE,
    WorkShift,
    parseCycleShiftList,
    parseMonthShiftList,
} from '@/helpers/planning';

type ScheduleMode = 'week' | 'list' | 'cycle';

const DAYS = [
    { day: 1, label: 'Понедельник' },
    { day: 2, label: 'Вторник' },
    { day: 3, label: 'Среда' },
    { day: 4, label: 'Четверг' },
    { day: 5, label: 'Пятница' },
    { day: 6, label: 'Суббота' },
    { day: 0, label: 'Воскресенье' },
];

const MODES: Array<{ value: ScheduleMode; label: string }> = [
    { value: 'week', label: 'Неделя' },
    { value: 'list', label: 'Списком' },
    { value: 'cycle', label: 'Цикл' },
];

const CYCLE_TEMPLATES = [
    {
        label: '2/2',
        value: '08:00–20:00\n08:00–20:00\n-\n-',
    },
    {
        label: '3/3',
        value: '08:00–20:00\n08:00–20:00\n08:00–20:00\n-\n-\n-',
    },
    {
        label: 'День / ночь',
        value: '08:00–20:00\n20:00–08:00\n-\n-',
    },
];

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
    section: {
        gap: theme.space(3),
    },
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(4),
    },
    modeRow: {
        gap: theme.space(2),
    },
    modeButton: (active: boolean) => ({
        flex: 1,
        minHeight: theme.space(11),
        borderRadius: theme.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: active ? theme.colors.foreground : 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    }),
    modeText: (active: boolean) => ({
        color: theme.colors.typography,
        opacity: active ? 1 : 0.62,
        fontWeight: active
            ? theme.fontWeight.semibold.fontWeight
            : theme.fontWeight.medium.fontWeight,
    }),
    day: {
        gap: theme.space(2),
        paddingVertical: theme.space(1),
    },
    dayHeader: {
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: theme.space(2),
    },
    dayTitle: {
        color: theme.colors.typography,
        fontWeight: theme.fontWeight.medium.fontWeight,
        flex: 1,
    },
    chips: {
        gap: theme.space(1.5),
        flexWrap: 'wrap',
    },
    chip: (active: boolean) => ({
        minHeight: theme.space(9),
        paddingHorizontal: theme.space(3),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: active ? theme.colors.foreground : 'transparent',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    }),
    chipText: (active: boolean) => ({
        color: theme.colors.typography,
        opacity: active ? 1 : 0.65,
        fontSize: theme.fontSize.sm.fontSize,
        fontWeight: active
            ? theme.fontWeight.semibold.fontWeight
            : theme.fontWeight.medium.fontWeight,
    }),
    timeRow: {
        gap: theme.space(2),
        alignItems: 'center',
    },
    timeInput: {
        flex: 1,
        minHeight: theme.space(11),
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.foreground,
        color: theme.colors.typography,
        textAlign: 'center',
        fontSize: theme.fontSize.default.fontSize,
    },
    input: {
        minHeight: theme.space(12),
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.foreground,
        color: theme.colors.typography,
        paddingHorizontal: theme.space(4),
        fontSize: theme.fontSize.default.fontSize,
    },
    textarea: {
        minHeight: theme.space(36),
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.foreground,
        color: theme.colors.typography,
        paddingHorizontal: theme.space(4),
        paddingVertical: theme.space(3),
        fontSize: theme.fontSize.default.fontSize,
        textAlignVertical: 'top',
    },
    hint: {
        color: theme.colors.typography,
        opacity: 0.5,
        fontSize: theme.fontSize.sm.fontSize,
        lineHeight: theme.fontSize.sm.lineHeight,
    },
    warning: {
        color: theme.colors.red[500],
        fontSize: theme.fontSize.sm.fontSize,
    },
}));

const WorkScheduleScreen: FC = () => {
    const { theme } = useUnistyles();
    const { data } = useWorkSchedule();
    const saveSchedule = useSaveWorkSchedule();

    const config = data?.config ?? EMPTY_WORK_SCHEDULE;

    const [mode, setMode] = useState<ScheduleMode>('week');
    const [weekly, setWeekly] = useState(config.weekly);
    const [month, setMonth] = useState(dayjs().format('YYYY-MM'));
    const [monthRaw, setMonthRaw] = useState('');
    const [cycleStart, setCycleStart] = useState(dayjs().format('YYYY-MM-DD'));
    const [cycleRaw, setCycleRaw] = useState('');

    useEffect(() => {
        setWeekly(config.weekly);

        if (config.cycle) {
            setCycleStart(config.cycle.startDate);
            setCycleRaw(
                config.cycle.days
                    .map((shift) => (shift ? shift.start + '–' + shift.end : '-'))
                    .join('\n'),
            );
        }
    }, [config.cycle, config.weekly]);

    const monthPreview = useMemo(
        () => parseMonthShiftList(month, monthRaw),
        [month, monthRaw],
    );
    const cyclePreview = useMemo(
        () => parseCycleShiftList(cycleRaw),
        [cycleRaw],
    );

    const setWeeklyKind = (
        day: number,
        kind: 'work' | 'off' | 'unknown',
    ) => {
        setWeekly((current) => {
            const next = { ...current };

            if (kind === 'unknown') {
                delete next[String(day)];
            } else if (kind === 'off') {
                next[String(day)] = null;
            } else {
                next[String(day)] =
                    next[String(day)] ?? {
                        start: '08:00',
                        end: '17:00',
                    };
            }

            return next;
        });
    };

    const setWeeklyTime = (
        day: number,
        field: keyof WorkShift,
        value: string,
    ) => {
        setWeekly((current) => ({
            ...current,
            [String(day)]: {
                ...(current[String(day)] || {
                    start: '08:00',
                    end: '17:00',
                }),
                [field]: value,
            },
        }));
    };

    const applyFiveTwo = () => {
        setWeekly({
            '1': { start: '08:00', end: '17:00' },
            '2': { start: '08:00', end: '17:00' },
            '3': { start: '08:00', end: '17:00' },
            '4': { start: '08:00', end: '17:00' },
            '5': { start: '08:00', end: '17:00' },
            '6': null,
            '0': null,
        });
    };

    const saveWeekly = async () => {
        await saveSchedule.mutateAsync({
            ...config,
            weekly,
        });

        Alert.alert('Сохранено', 'Недельный график обновлён.');
    };

    const saveMonth = async () => {
        if (monthPreview.warnings.length) {
            Alert.alert(
                'Проверь строки',
                monthPreview.warnings.slice(0, 6).join('\n'),
            );
            return;
        }

        const overrides = Object.fromEntries(
            Object.entries(config.overrides).filter(
                ([date]) => !date.startsWith(month + '-'),
            ),
        );

        await saveSchedule.mutateAsync({
            ...config,
            overrides: {
                ...overrides,
                ...monthPreview.overrides,
            },
        });

        Alert.alert('Сохранено', 'График месяца импортирован.');
    };

    const saveCycle = async () => {
        if (!cyclePreview.days.length || cyclePreview.warnings.length) {
            Alert.alert(
                'Проверь цикл',
                cyclePreview.warnings.length
                    ? cyclePreview.warnings.slice(0, 6).join('\n')
                    : 'Добавь хотя бы один день цикла.',
            );
            return;
        }

        await saveSchedule.mutateAsync({
            ...config,
            cycle: {
                startDate: cycleStart,
                days: cyclePreview.days,
            },
        });

        Alert.alert('Сохранено', 'Повторяющийся цикл обновлён.');
    };

    const clearCycle = async () => {
        setCycleRaw('');

        await saveSchedule.mutateAsync({
            ...config,
            cycle: null,
        });
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
        >
            <VStack style={styles.section}>
                <Label>Как заполнить</Label>

                <HStack style={styles.modeRow}>
                    {MODES.map((item) => {
                        const active = mode === item.value;

                        return (
                            <Pressable
                                key={item.value}
                                style={styles.modeButton(active)}
                                onPress={() => setMode(item.value)}
                            >
                                <Text style={styles.modeText(active)}>
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </HStack>
            </VStack>

            {mode === 'week' && (
                <VStack style={styles.section}>
                    <HStack
                        style={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Label>По дням недели</Label>
                        <Button
                            type="link"
                            size="sm"
                            title="5/2"
                            onPress={applyFiveTwo}
                        />
                    </HStack>

                    <VStack style={styles.card}>
                        {DAYS.map(({ day, label }) => {
                            const has = Object.prototype.hasOwnProperty.call(
                                weekly,
                                String(day),
                            );
                            const shift = weekly[String(day)];
                            const kind = !has
                                ? 'unknown'
                                : shift === null
                                  ? 'off'
                                  : 'work';

                            return (
                                <VStack key={day} style={styles.day}>
                                    <HStack style={styles.dayHeader}>
                                        <Text style={styles.dayTitle}>
                                            {label}
                                        </Text>

                                        <HStack style={styles.chips}>
                                            {[
                                                ['work', 'Работа'],
                                                ['off', 'Вых'],
                                                ['unknown', '—'],
                                            ].map(([value, title]) => (
                                                <Pressable
                                                    key={value}
                                                    onPress={() =>
                                                        setWeeklyKind(
                                                            day,
                                                            value as
                                                                | 'work'
                                                                | 'off'
                                                                | 'unknown',
                                                        )
                                                    }
                                                >
                                                    <Box
                                                        style={styles.chip(
                                                            kind === value,
                                                        )}
                                                    >
                                                        <Text
                                                            style={styles.chipText(
                                                                kind === value,
                                                            )}
                                                        >
                                                            {title}
                                                        </Text>
                                                    </Box>
                                                </Pressable>
                                            ))}
                                        </HStack>
                                    </HStack>

                                    {kind === 'work' && shift && (
                                        <HStack style={styles.timeRow}>
                                            <Input
                                                value={shift.start}
                                                onChangeText={(value) =>
                                                    setWeeklyTime(
                                                        day,
                                                        'start',
                                                        value,
                                                    )
                                                }
                                                style={styles.timeInput}
                                            />
                                            <Text>—</Text>
                                            <Input
                                                value={shift.end}
                                                onChangeText={(value) =>
                                                    setWeeklyTime(
                                                        day,
                                                        'end',
                                                        value,
                                                    )
                                                }
                                                style={styles.timeInput}
                                            />
                                        </HStack>
                                    )}
                                </VStack>
                            );
                        })}

                        <Button
                            title="Сохранить неделю"
                            loading={saveSchedule.isPending}
                            onPress={saveWeekly}
                        />
                    </VStack>
                </VStack>
            )}

            {mode === 'list' && (
                <VStack style={styles.section}>
                    <Label>Вставить месяц списком</Label>

                    <VStack style={styles.card}>
                        <Input
                            value={month}
                            onChangeText={setMonth}
                            placeholder="2026-10"
                            style={styles.input}
                        />

                        <Text style={styles.hint}>
                            Одна строка — один день месяца. Например:
                            08:00–17:00, 15:00–00:00 или «-» для выходного.
                        </Text>

                        <Input
                            value={monthRaw}
                            onChangeText={setMonthRaw}
                            multiline
                            placeholder={
                                '08:00–17:00\n08:00–17:00\n-\n15:00–00:00'
                            }
                            style={styles.textarea}
                        />

                        {monthPreview.warnings.length > 0 && (
                            <Text style={styles.warning}>
                                Не распознано строк:{' '}
                                {monthPreview.warnings.length}
                            </Text>
                        )}

                        <Button
                            title="Сохранить месяц"
                            loading={saveSchedule.isPending}
                            onPress={saveMonth}
                        />
                    </VStack>
                </VStack>
            )}

            {mode === 'cycle' && (
                <VStack style={styles.section}>
                    <Label>Повторяющийся цикл</Label>

                    <HStack style={styles.chips}>
                        {CYCLE_TEMPLATES.map((template) => (
                            <Pressable
                                key={template.label}
                                onPress={() => setCycleRaw(template.value)}
                            >
                                <Box style={styles.chip(false)}>
                                    <Text style={styles.chipText(false)}>
                                        {template.label}
                                    </Text>
                                </Box>
                            </Pressable>
                        ))}
                    </HStack>

                    <VStack style={styles.card}>
                        <Text style={styles.hint}>
                            Подходит для 2/2, 3/3, день/ночь и любого
                            повторяющегося графика. Первая строка действует
                            с указанной даты.
                        </Text>

                        <Input
                            value={cycleStart}
                            onChangeText={setCycleStart}
                            placeholder="2026-10-01"
                            style={styles.input}
                        />

                        <Input
                            value={cycleRaw}
                            onChangeText={setCycleRaw}
                            multiline
                            placeholder={
                                '08:00–20:00\n08:00–20:00\n-\n-'
                            }
                            style={styles.textarea}
                        />

                        {cyclePreview.warnings.length > 0 && (
                            <Text style={styles.warning}>
                                Не распознано строк:{' '}
                                {cyclePreview.warnings.length}
                            </Text>
                        )}

                        <Button
                            title="Сохранить цикл"
                            loading={saveSchedule.isPending}
                            onPress={saveCycle}
                        />

                        {config.cycle && (
                            <Button
                                type="link"
                                title="Отключить цикл"
                                onPress={clearCycle}
                            />
                        )}
                    </VStack>
                </VStack>
            )}

            <Text style={styles.hint}>
                Конкретные даты из списка имеют приоритет над циклом, а цикл —
                над шаблоном недели. Неуказанный день считается неизвестным,
                а не выходным.
            </Text>
        </ScrollView>
    );
};

export default WorkScheduleScreen;
