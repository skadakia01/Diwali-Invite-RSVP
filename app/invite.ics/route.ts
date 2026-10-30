import { END, FULL_TITLE, PARTY, SITE_URL, START, utcStamp } from '@/lib/party';

const text = (s: string) => s.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');

// Apple Calendar / Outlook invite with two built-in alerts.
export function GET() {
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Diwali Invite//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:diwali-${utcStamp(START)}@diwali-invite`,
    `DTSTAMP:${utcStamp(START)}`,
    `DTSTART:${utcStamp(START)}`,
    `DTEND:${utcStamp(END)}`,
    `SUMMARY:${text(FULL_TITLE)}`,
    `LOCATION:${text(PARTY.venue)}`,
    `DESCRIPTION:${text(`${PARTY.dressTheme}\nRSVP & live photo wall: ${SITE_URL}`)}`,
    `URL:${SITE_URL}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(`${FULL_TITLE} is tomorrow`)}`, 'TRIGGER:-P1D', 'END:VALARM',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${text(`${FULL_TITLE} starts in 2 hours`)}`, 'TRIGGER:-PT2H', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return new Response(ics, {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="diwali-night.ics"' },
  });
}
