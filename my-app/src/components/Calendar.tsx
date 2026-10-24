import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CalendarBody,
  CalendarContainer,
  CalendarHeader,
  type EventItem,
} from '@howljs/calendar-kit';
import type { TimetableClass } from '@/api/timetable.api';
import { Colors, Spacing } from '@/constants/theme';

interface CalendarProps {
  classes: TimetableClass[];
}

const WEEKDAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const EVENT_COLORS = ['#3478C7', '#188B72', '#A85BB5', '#D47A25', '#5268B1'];

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function timeParts(value: string): [number, number, number] {
  const [hours = 0, minutes = 0, seconds = 0] = value
    .split(':')
    .map(Number);
  return [hours, minutes, seconds];
}

function dateTime(date: Date, time: string): string {
  const [hours, minutes, seconds] = timeParts(time);
  const eventDate = new Date(date);
  eventDate.setHours(hours, minutes, seconds, 0);

  const year = eventDate.getFullYear();
  const month = String(eventDate.getMonth() + 1).padStart(2, '0');
  const day = String(eventDate.getDate()).padStart(2, '0');
  const hour = String(eventDate.getHours()).padStart(2, '0');
  const minute = String(eventDate.getMinutes()).padStart(2, '0');
  const second = String(eventDate.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(value: string): Date {
  const [year = 0, month = 1, day = 1] = value
    .slice(0, 10)
    .split('-')
    .map(Number);
  return new Date(year, month - 1, day);
}

function getTimeRange(classes: TimetableClass[]) {
  if (!classes.length) return { start: 7 * 60, end: 21 * 60 };

  const startMinutes = Math.min(
    ...classes.map(({ start_time }) => {
      const [hours, minutes] = timeParts(start_time);
      return hours * 60 + minutes;
    }),
  );
  const endMinutes = Math.max(
    ...classes.map(({ end_time }) => {
      const [hours, minutes] = timeParts(end_time);
      return hours * 60 + minutes;
    }),
  );

  return {
    start: Math.max(0, Math.floor(startMinutes / 60) * 60 - 60),
    end: Math.min(24 * 60, Math.ceil(endMinutes / 60) * 60 + 60),
  };
}

function toCalendarEvents(classes: TimetableClass[]): EventItem[] {
  const thisWeek = startOfWeek(new Date());

  return classes.map((entry) => {
    const classDate = new Date(thisWeek);
    classDate.setDate(
      thisWeek.getDate() + ((entry.day_of_week + 6) % 7),
    );

    return {
      id: `class-${entry.id}`,
      title: entry.course_name,
      start: { dateTime: dateTime(classDate, entry.start_time) },
      end: { dateTime: dateTime(classDate, entry.end_time) },
      recurrence: `FREQ=WEEKLY;BYDAY=${WEEKDAY_CODES[entry.day_of_week]}`,
      color: EVENT_COLORS[entry.id % EVENT_COLORS.length],
    };
  });
}

export function Calendar({ classes }: CalendarProps) {
  const events = useMemo(() => toCalendarEvents(classes), [classes]);
  const timeRange = useMemo(() => getTimeRange(classes), [classes]);
  const [selectedDate, setSelectedDate] = useState(() => dateKey(new Date()));
  const selectedDay = dateFromKey(selectedDate);
  const selectedClasses = classes
    .filter(({ day_of_week }) => day_of_week === selectedDay.getDay())
    .sort((first, second) =>
      first.start_time.localeCompare(second.start_time),
    );
  const selectedDateLabel = selectedDay.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Weekly timetable</Text>
      <View style={styles.calendar}>
        <CalendarContainer
          end={timeRange.end}
          events={events}
          firstDay={1}
          initialDate={selectedDate}
          numberOfDays={7}
          onDateChanged={setSelectedDate}
          onPressDayNumber={setSelectedDate}
          scrollToNow
          start={timeRange.start}
          theme={{
            colors: {
              primary: '#2563EB',
              onPrimary: '#FFFFFF',
              background: '#FFFFFF',
              onBackground: '#202124',
              border: '#DADCE0',
              text: '#202124',
              surface: '#F1F3F4',
              onSurface: '#5F6368',
            },
            hourBackgroundColor: '#FFFFFF',
            headerBackgroundColor: '#FFFFFF',
            dayBarBorderColor: '#DADCE0',
          }}
        >
          <CalendarHeader />
          <CalendarBody />
        </CalendarContainer>
      </View>
      <View style={styles.agenda}>
        <Text style={styles.agendaTitle}>Schedule for {selectedDateLabel}</Text>
        {selectedClasses.length ? (
          selectedClasses.map((entry) => (
            <View key={entry.id} style={styles.agendaItem}>
              <Text style={styles.agendaTime}>
                {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
              </Text>
              <Text style={styles.agendaCourse}>{entry.course_name}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyAgenda}>
            No classes scheduled for this day.
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: Colors.light.backgroundElement,
  },
  title: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '700',
  },
  calendar: {
    height: 480,
    overflow: 'hidden',
    borderRadius: 8,
    backgroundColor: Colors.light.background,
  },
  agenda: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DADCE0',
  },
  agendaTitle: {
    color: Colors.light.text,
    fontSize: 16,
    fontWeight: '700',
  },
  agendaItem: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
  },
  agendaTime: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  agendaCourse: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: '500',
  },
  emptyAgenda: {
    color: Colors.light.textSecondary,
  },
});
