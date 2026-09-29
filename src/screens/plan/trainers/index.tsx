import { FC, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { Plus, Trash2 } from 'lucide-react-native';

import { ScrollView } from '@/components/primitives/scrollview';
import { Box } from '@/components/primitives/box';
import { VStack } from '@/components/primitives/vstack';
import { HStack } from '@/components/primitives/hstack';
import { Text } from '@/components/primitives/text';
import { Pressable } from '@/components/primitives/pressable';
import { Input } from '@/components/primitives/input';
import { Button } from '@/components/buttons/base';
import { Label } from '@/components/forms/label';
import {
    useActiveSubscription,
    useCreateTrainer,
    useDeleteTrainer,
    useRebuildSubscriptionPlan,
    useTrainers,
    useUpdateTrainer,
} from '@/hooks/use-planning';
import type { TrainerSlot } from '@/helpers/planning';

const COLORS = ['#a3e635', '#60a5fa', '#c084fc', '#fb7185', '#f59e0b', '#2dd4bf'];

const DAYS = [
    { day: 1, label: 'Пн' },
    { day: 2, label: 'Вт' },
    { day: 3, label: 'Ср' },
    { day: 4, label: 'Чт' },
    { day: 5, label: 'Пт' },
    { day: 6, label: 'Сб' },
    { day: 0, label: 'Вс' },
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
    chips: {
        gap: theme.space(2),
        flexWrap: 'wrap',
    },
    chip: (active: boolean) => ({
        minHeight: theme.space(10),
        paddingHorizontal: theme.space(4),
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: active ? theme.colors.foreground : theme.colors.background,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: theme.colors.border,
    }),
    chipText: (active: boolean) => ({
        color: theme.colors.typography,
        fontWeight: active ? theme.fontWeight.semibold.fontWeight : theme.fontWeight.medium.fontWeight,
    }),
    card: {
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius['4xl'],
        padding: theme.space(5),
        gap: theme.space(4),
    },
    field: {
        gap: theme.space(2),
    },
    input: {
        minHeight: theme.space(12),
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.foreground,
        color: theme.colors.typography,
        paddingHorizontal: theme.space(4),
        fontSize: theme.fontSize.default.fontSize,
    },
    colorRow: {
        gap: theme.space(2),
        flexWrap: 'wrap',
    },
    colorButton: {
        width: theme.space(11),
        height: theme.space(11),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
    },
    colorDot: (color: string, active: boolean) => ({
        width: theme.space(7),
        height: theme.space(7),
        borderRadius: theme.radius.full,
        backgroundColor: color,
        borderWidth: active ? theme.space(0.75) : 0,
        borderColor: theme.colors.typography,
    }),
    slotRow: {
        gap: theme.space(2),
        alignItems: 'center',
    },
    slotInput: {
        flex: 1,
        minHeight: theme.space(11),
        borderRadius: theme.radius.xl,
        backgroundColor: theme.colors.foreground,
        color: theme.colors.typography,
        textAlign: 'center',
        fontSize: theme.fontSize.default.fontSize,
    },
    trash: {
        width: theme.space(11),
        height: theme.space(11),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.full,
        backgroundColor: theme.colors.foreground,
    },
    empty: {
        color: theme.colors.typography,
        opacity: 0.5,
        textAlign: 'center',
        paddingVertical: theme.space(5),
    },
}));

const TrainersScreen: FC = () => {
    const { theme } = useUnistyles();
    const { data: trainers = [] } = useTrainers();
    const { data: activeSubscription } = useActiveSubscription();
    const createTrainer = useCreateTrainer();
    const updateTrainer = useUpdateTrainer();
    const deleteTrainer = useDeleteTrainer();
    const rebuildSubscription = useRebuildSubscriptionPlan();

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [day, setDay] = useState(1);
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]);
    const [schedule, setSchedule] = useState<TrainerSlot[]>([]);

    const selected = useMemo(
        () => trainers.find((trainer) => trainer.id === selectedId) ?? trainers[0] ?? null,
        [selectedId, trainers],
    );

    useEffect(() => {
        if (!selected) {
            setSelectedId(null);
            setName('');
            setColor(COLORS[0]);
            setSchedule([]);
            return;
        }

        if (selectedId !== selected.id) setSelectedId(selected.id);
        setName(selected.name);
        setColor(selected.color);
        setSchedule(selected.schedule);
    }, [selected?.id]);

    const slots = schedule
        .map((slot, index) => ({ slot, index }))
        .filter(({ slot }) => slot.day === day);

    const addTrainer = async () => {
        const created = await createTrainer.mutateAsync({
            name: `Тренер ${trainers.length + 1}`,
            color: COLORS[trainers.length % COLORS.length],
            schedule: [],
        });
        setSelectedId(created.id);
    };

    const save = async () => {
        if (!selected) return;

        const scheduleChanged =
            JSON.stringify(schedule) !== JSON.stringify(selected.schedule);

        await updateTrainer.mutateAsync({
            id: selected.id,
            input: {
                name: name.trim() || 'Тренер',
                color,
                schedule,
            },
        });

        const affectsActiveSubscription =
            scheduleChanged &&
            activeSubscription?.trainer?.id === selected.id;

        if (!affectsActiveSubscription || !activeSubscription) {
            Alert.alert('Сохранено', 'Данные тренера обновлены.');
            return;
        }

        Alert.alert(
            'Расписание тренера изменено',
            'Перестроить будущие занятия активного абонемента?',
            [
                {
                    text: 'Позже',
                    style: 'cancel',
                },
                {
                    text: 'Перестроить',
                    onPress: async () => {
                        const result = await rebuildSubscription.mutateAsync(
                            activeSubscription.subscription.id,
                        );

                        if (result.reason === 'replanned') {
                            Alert.alert(
                                'Расписание обновлено',
                                'Будущие занятия перестроены.',
                            );
                        } else if (result.reason === 'no_full_plan') {
                            Alert.alert(
                                'Текущий план сохранён',
                                'Полный новый вариант пока не помещается в доступные даты.',
                            );
                        } else {
                            Alert.alert(
                                'Расписание актуально',
                                'Будущие занятия уже подходят под новое расписание тренера.',
                            );
                        }
                    },
                },
            ],
        );
    };

    const addSlot = () => {
        setSchedule((current) => [
            ...current,
            {
                day,
                start: '17:00',
                end: '21:00',
            },
        ]);
    };

    const updateSlot = (index: number, field: 'start' | 'end', value: string) => {
        setSchedule((current) =>
            current.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot)),
        );
    };

    const removeSlot = (index: number) => {
        setSchedule((current) => current.filter((_, i) => i !== index));
    };

    const removeTrainer = () => {
        if (!selected) return;
        Alert.alert('Удалить тренера?', selected.name, [
            { text: 'Отмена', style: 'cancel' },
            {
                text: 'Удалить',
                style: 'destructive',
                onPress: async () => {
                    await deleteTrainer.mutateAsync(selected.id);
                    setSelectedId(null);
                },
            },
        ]);
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <VStack style={{ gap: theme.space(3) }}>
                <HStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Label>Тренеры</Label>
                    <Button
                        type="link"
                        size="sm"
                        title="Добавить"
                        prefix={<Plus size={theme.space(4)} color={theme.colors.typography} />}
                        onPress={addTrainer}
                    />
                </HStack>

                {trainers.length > 0 && (
                    <HStack style={styles.chips}>
                        {trainers.map((trainer) => {
                            const active = trainer.id === selected?.id;
                            return (
                                <Pressable key={trainer.id} onPress={() => setSelectedId(trainer.id)}>
                                    <Box style={styles.chip(active)}>
                                        <Text style={styles.chipText(active)}>
                                            {trainer.name}
                                        </Text>
                                    </Box>
                                </Pressable>
                            );
                        })}
                    </HStack>
                )}
            </VStack>

            {!selected ? (
                <VStack style={styles.card}>
                    <Text style={styles.empty}>
                        Добавь тренера, чтобы указать его рабочие дни и время.
                    </Text>
                    <Button title="Добавить тренера" onPress={addTrainer} />
                </VStack>
            ) : (
                <>
                    <VStack style={styles.card}>
                        <VStack style={styles.field}>
                            <Label>Имя</Label>
                            <Input value={name} onChangeText={setName} style={styles.input} />
                        </VStack>

                        <VStack style={styles.field}>
                            <Label>Цвет в графике</Label>
                            <HStack style={styles.colorRow}>
                                {COLORS.map((item) => (
                                    <Pressable
                                        key={item}
                                        style={styles.colorButton}
                                        onPress={() => setColor(item)}
                                    >
                                        <Box style={styles.colorDot(item, color === item)} />
                                    </Pressable>
                                ))}
                            </HStack>
                        </VStack>
                    </VStack>

                    <VStack style={{ gap: theme.space(3) }}>
                        <Label>Рабочее время</Label>
                        <HStack style={styles.chips}>
                            {DAYS.map((item) => {
                                const active = day === item.day;
                                const hasSlots = schedule.some((slot) => slot.day === item.day);
                                return (
                                    <Pressable key={item.day} onPress={() => setDay(item.day)}>
                                        <Box style={styles.chip(active)}>
                                            <Text style={styles.chipText(active)}>
                                                {item.label}{hasSlots ? ' •' : ''}
                                            </Text>
                                        </Box>
                                    </Pressable>
                                );
                            })}
                        </HStack>

                        <VStack style={styles.card}>
                            {slots.length === 0 && (
                                <Text style={styles.empty}>В этот день тренер не работает.</Text>
                            )}

                            {slots.map(({ slot, index }) => (
                                <HStack key={index} style={styles.slotRow}>
                                    <Input
                                        value={slot.start}
                                        onChangeText={(value) => updateSlot(index, 'start', value)}
                                        placeholder="17:00"
                                        style={styles.slotInput}
                                    />
                                    <Text>—</Text>
                                    <Input
                                        value={slot.end}
                                        onChangeText={(value) => updateSlot(index, 'end', value)}
                                        placeholder="21:00"
                                        style={styles.slotInput}
                                    />
                                    <Pressable
                                        style={styles.trash}
                                        onPress={() => removeSlot(index)}
                                    >
                                        <Trash2
                                            size={theme.space(5)}
                                            color={theme.colors.red[500]}
                                        />
                                    </Pressable>
                                </HStack>
                            ))}

                            <Button
                                type="link"
                                title="Добавить интервал"
                                prefix={<Plus size={theme.space(4)} color={theme.colors.typography} />}
                                onPress={addSlot}
                            />
                        </VStack>
                    </VStack>

                    <Button
                        title="Сохранить"
                        loading={updateTrainer.isPending}
                        onPress={save}
                    />
                    <Button
                        type="link"
                        title="Удалить тренера"
                        textStyle={{ color: theme.colors.red[500] }}
                        onPress={removeTrainer}
                    />
                </>
            )}
        </ScrollView>
    );
};

export default TrainersScreen;
