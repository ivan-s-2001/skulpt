import { useScreen } from '@/hooks/use-screen';

export const usePlanTab = () => {
    const { options } = useScreen();

    return {
        name: 'plan',
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
