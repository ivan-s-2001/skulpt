import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
    createSubscription,
    createTrainer,
    deleteTrainer,
    getActiveSubscription,
    getTrainers,
    getWorkSchedule,
    rebuildFutureSubscriptionPlan,
    saveWorkSchedule,
    setSubscriptionWorkoutAttendance,
    updateTrainer,
} from '@/crud/planning';

export const useTrainers = () =>
    useQuery({
        queryKey: ['planning', 'trainers'],
        queryFn: getTrainers,
    });

export const useCreateTrainer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createTrainer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'trainers'] });
        },
    });
};

export const useUpdateTrainer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, input }: { id: string; input: Parameters<typeof updateTrainer>[1] }) =>
            updateTrainer(id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'trainers'] });
            queryClient.invalidateQueries({ queryKey: ['planning', 'subscription'] });
        },
    });
};

export const useDeleteTrainer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteTrainer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'trainers'] });
        },
    });
};

export const useWorkSchedule = () =>
    useQuery({
        queryKey: ['planning', 'work-schedule'],
        queryFn: getWorkSchedule,
    });

export const useSaveWorkSchedule = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: saveWorkSchedule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'work-schedule'] });
            queryClient.invalidateQueries({ queryKey: ['planning', 'subscription'] });
        },
    });
};

export const useActiveSubscription = () =>
    useQuery({
        queryKey: ['planning', 'subscription'],
        queryFn: getActiveSubscription,
    });

export const useCreateSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createSubscription,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'subscription'] });
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
};

export const useSetSubscriptionWorkoutAttendance = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({
            workoutId,
            attendance,
        }: {
            workoutId: string;
            attendance: 'attended' | 'missed';
        }) => setSubscriptionWorkoutAttendance(workoutId, attendance),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'subscription'] });
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
};

export const useRebuildSubscriptionPlan = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (subscriptionId: string) => rebuildFutureSubscriptionPlan(subscriptionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['planning', 'subscription'] });
            queryClient.invalidateQueries({ queryKey: ['workouts'] });
        },
    });
};
