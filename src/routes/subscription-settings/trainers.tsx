import TrainersScreen from '@/screens/plan/trainers';
import { useAnalyticsScreen } from '@/hooks/use-analytics-screen';

export default function TrainersRoute() {
    useAnalyticsScreen('subscription_trainers');
    return <TrainersScreen />;
}
