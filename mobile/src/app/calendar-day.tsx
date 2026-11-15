import { Stack, useLocalSearchParams } from 'expo-router';
import { isDateKey } from '@/features/calendar/calendar-plan';
import { DayDetail } from '@/features/calendar/day/day-detail';
import { dayTitle } from '@/features/calendar/day/day-detail-model';
import { en } from '@/i18n/en';

/** /calendar-day?date=YYYY-MM-DD (calendar-v2-spec §B), pushed over the tab bar. */
export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  if (!isDateKey(date)) return <Stack.Screen options={{ title: en.calendar.title }} />;
  return (
    <>
      <Stack.Screen options={{ title: dayTitle(date), headerBackTitle: en.tabs.moments, headerShadowVisible: false }} />
      <DayDetail date={date} />
    </>
  );
}
