import { useScreen } from '@/hooks/use-screen';

export const useSubscriptionTab = () => {
    const { options } = useScreen();

    return {
        name: 'subscription',
        options: {
            ...options,
            headerTransparent: true,
            headerStyle: {
                ...options.headerStyle,
                backgroundColor: 'transparent',
            },
        },
    };
};
