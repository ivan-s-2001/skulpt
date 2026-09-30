import SubscriptionScreen from '@/screens/plan/subscription';
import { useAnalyticsScreen } from '@/hooks/use-analytics-screen';

const SubscriptionRoute = () => {
    useAnalyticsScreen('subscription');
    return <SubscriptionScreen />;
};

export default SubscriptionRoute;
