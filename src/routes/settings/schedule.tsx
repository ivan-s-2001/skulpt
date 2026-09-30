import WorkScheduleScreen from '@/screens/settings/schedule';
import { useAnalyticsScreen } from '@/hooks/use-analytics-screen';

export default function WorkScheduleRoute() {
    useAnalyticsScreen('settings_schedule');
    return <WorkScheduleScreen />;
}
