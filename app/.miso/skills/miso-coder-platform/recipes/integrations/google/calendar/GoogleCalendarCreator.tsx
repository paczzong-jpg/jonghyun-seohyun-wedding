import { FormEvent, useState } from "react";

import { getGoogleAccessToken, GOOGLE_CALENDAR_EVENTS_SCOPE } from "@/lib/googleAccessToken";
import { getRuntimeBase } from "@/lib/miso-sdk/site-client";

type CalendarResult = {
  ok?: boolean;
  id?: string;
  htmlLink?: string;
  hangoutLink?: string;
  error?: string;
  details?: unknown;
};

export function GoogleCalendarCreator() {
  const [summary, setSummary] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [timeZone, setTimeZone] = useState("Asia/Seoul");
  const [attendees, setAttendees] = useState("");
  const [createMeet, setCreateMeet] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CalendarResult | null>(null);

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !summary.trim() || !startDateTime || !endDateTime) return;

    setSaving(true);
    setResult(null);

    try {
      const accessToken = await getGoogleAccessToken(GOOGLE_CALENDAR_EVENTS_SCOPE);
      const response = await fetch(`${getRuntimeBase()}/api/google/calendar/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken,
          calendarId: "primary",
          summary,
          startDateTime,
          endDateTime,
          timeZone,
          attendees: attendees
            .split(",")
            .map((email) => email.trim())
            .filter(Boolean),
          createMeet,
        }),
      });

      const payload = (await response.json()) as CalendarResult;
      if (!response.ok) {
        setResult({ error: payload.error || "Calendar event creation failed", details: payload.details });
        return;
      }

      setResult(payload);
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : "Calendar event creation failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={createEvent}>
      <label>
        Summary
        <input value={summary} onChange={(event) => setSummary(event.target.value)} required />
      </label>
      <label>
        Starts
        <input
          type="datetime-local"
          value={startDateTime}
          onChange={(event) => setStartDateTime(event.target.value)}
          required
        />
      </label>
      <label>
        Ends
        <input
          type="datetime-local"
          value={endDateTime}
          onChange={(event) => setEndDateTime(event.target.value)}
          required
        />
      </label>
      <label>
        Time zone
        <input value={timeZone} onChange={(event) => setTimeZone(event.target.value)} required />
      </label>
      <label>
        Attendees
        <input value={attendees} onChange={(event) => setAttendees(event.target.value)} />
      </label>
      <label>
        <input type="checkbox" checked={createMeet} onChange={(event) => setCreateMeet(event.target.checked)} />
        Add Google Meet
      </label>
      <button type="submit" disabled={saving || !summary.trim() || !startDateTime || !endDateTime}>
        {saving ? "Creating..." : "Create Google Calendar event"}
      </button>
      {result?.error ? <p role="alert">{result.error}</p> : null}
      {result?.htmlLink ? (
        <p>
          Created: <a href={result.htmlLink}>Open event</a>
        </p>
      ) : null}
      {result?.hangoutLink ? <p>Meet: {result.hangoutLink}</p> : null}
    </form>
  );
}
