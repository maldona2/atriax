import { HOUR_HEIGHT, START_HOUR, END_HOUR } from './constants';

export function CurrentTimeIndicator() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  if (hours < START_HOUR || hours >= END_HOUR) return null;

  const top = (hours - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;

  return (
    <div
      className="absolute left-0 right-0 z-10 flex items-center"
      style={{ top }}
    >
      <div className="-ml-1 h-2.5 w-2.5 rounded-full bg-destructive" />
      <div className="h-0.5 flex-1 bg-destructive" />
    </div>
  );
}
