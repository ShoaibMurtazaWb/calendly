import { escapeHtml } from "../../shared/utils/html-escape";

export interface SnapshotPayload {
  bookingId: string;
  eventTypeId: string;
  eventTitle: string;
  eventSlug: string;
  durationMinutes: number;
  hostId: string;
  hostName: string;
  hostUsername: string;
  hostEmail: string;
  hostTimeZone: string;
  attendeeName: string;
  attendeeEmail: string;
  attendeeTimeZone: string;
  attendeePhoneNumber?: string | null;
  attendeeNotes?: string;
  locationType?: string | null;
  locationData?: Record<string, unknown> | null;
  customResponses?: Array<{
    questionId: string;
    label: string;
    type: string;
    value: string | boolean;
    selectedOptionLabel?: string | null;
  }> | null;
  startUtc: string;
  endUtc: string;
  status: string;
  sequence: number;
  tokenVersion: number;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  previousStartUtc?: string | null;
  previousEndUtc?: string | null;
  rescheduleReason?: string | null;
  rescheduledBy?: string | null;
}

export function formatZonedDateTime(
  dateIso: string | Date,
  timeZone: string
): { formattedDate: string; formattedTime: string; tzLabel: string } {
  const date = new Date(dateIso);

  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    formattedDate: dateFormatter.format(date),
    formattedTime: timeFormatter.format(date),
    tzLabel: timeZone,
  };
}

export function formatZonedRange(
  startIso: string | Date,
  endIso: string | Date,
  timeZone: string
): { dateStr: string; timeRangeStr: string } {
  const start = formatZonedDateTime(startIso, timeZone);
  const end = formatZonedDateTime(endIso, timeZone);

  return {
    dateStr: start.formattedDate,
    timeRangeStr: `${start.formattedTime} – ${end.formattedTime} (${timeZone})`,
  };
}

function renderLocationHtml(snapshot: SnapshotPayload, recipient: "ATTENDEE" | "HOST"): string {
  if (!snapshot.locationType || !snapshot.locationData) {
    return "";
  }

  const data = snapshot.locationData;
  const safeNotes = typeof data.extraNotes === "string" && data.extraNotes ? `<br><small style="color: #64748b;">${escapeHtml(data.extraNotes)}</small>` : "";

  switch (snapshot.locationType) {
    case "IN_PERSON": {
      const address = typeof data.address === "string" ? escapeHtml(data.address) : "In-Person Venue";
      return `<div class="details-row"><span class="details-label">Location:</span><span class="details-value">📍 ${address}${safeNotes}</span></div>`;
    }
    case "HOST_CALLS_ATTENDEE": {
      const phone = snapshot.attendeePhoneNumber ? escapeHtml(snapshot.attendeePhoneNumber) : "Phone Call";
      if (recipient === "HOST") {
        return `<div class="details-row"><span class="details-label">Dial-in:</span><span class="details-value">📞 You will call attendee at: <strong>${phone}</strong>${safeNotes}</span></div>`;
      } else {
        return `<div class="details-row"><span class="details-label">Dial-in:</span><span class="details-value">📞 Host will call you at: <strong>${phone}</strong>${safeNotes}</span></div>`;
      }
    }
    case "ATTENDEE_CALLS_HOST": {
      const hostPhone = typeof data.hostPhoneNumber === "string" ? escapeHtml(data.hostPhoneNumber) : "Host Phone";
      if (recipient === "ATTENDEE") {
        return `<div class="details-row"><span class="details-label">Dial-in:</span><span class="details-value">📞 Call host at: <strong>${hostPhone}</strong>${safeNotes}</span></div>`;
      } else {
        return `<div class="details-row"><span class="details-label">Dial-in:</span><span class="details-value">📞 Attendee will call you at: <strong>${hostPhone}</strong>${safeNotes}</span></div>`;
      }
    }
    case "CUSTOM_LINK":
    case "STATIC_VIDEO": {
      const url = typeof data.url === "string" ? data.url : "";
      const safeUrl = escapeHtml(url);
      return `<div class="details-row"><span class="details-label">Meeting Link:</span><span class="details-value"><a href="${safeUrl}" style="color: #2563eb; text-decoration: underline;" target="_blank" rel="noopener noreferrer">${safeUrl}</a>${safeNotes}</span></div>`;
    }
    default:
      return "";
  }
}

function renderLocationText(snapshot: SnapshotPayload, recipient: "ATTENDEE" | "HOST"): string {
  if (!snapshot.locationType || !snapshot.locationData) {
    return "";
  }

  const data = snapshot.locationData;
  const extraNotes = typeof data.extraNotes === "string" && data.extraNotes ? ` (${data.extraNotes})` : "";

  switch (snapshot.locationType) {
    case "IN_PERSON": {
      return `Location: 📍 ${data.address || "In-Person Venue"}${extraNotes}\n`;
    }
    case "HOST_CALLS_ATTENDEE": {
      const phone = snapshot.attendeePhoneNumber || "phone";
      return recipient === "HOST"
        ? `Location: 📞 You will call attendee at: ${phone}${extraNotes}\n`
        : `Location: 📞 Host will call you at: ${phone}${extraNotes}\n`;
    }
    case "ATTENDEE_CALLS_HOST": {
      const hostPhone = data.hostPhoneNumber || "host phone";
      return recipient === "ATTENDEE"
        ? `Location: 📞 Call host at: ${hostPhone}${extraNotes}\n`
        : `Location: 📞 Attendee will call you at: ${hostPhone}${extraNotes}\n`;
    }
    case "CUSTOM_LINK":
    case "STATIC_VIDEO": {
      return `Meeting Link: ${data.url || ""}${extraNotes}\n`;
    }
    default:
      return "";
  }
}

function renderCustomResponsesHtml(snapshot: SnapshotPayload): string {
  if (!snapshot.customResponses || snapshot.customResponses.length === 0) {
    return "";
  }

  return snapshot.customResponses
    .map((r) => {
      const safeLabel = escapeHtml(r.label);
      let displayValue = "";
      if (r.type === "CHECKBOX") {
        displayValue = r.value ? "✓ Yes" : "No";
      } else if (r.type === "SELECT") {
        displayValue = r.selectedOptionLabel ? escapeHtml(r.selectedOptionLabel) : escapeHtml(String(r.value));
      } else {
        displayValue = escapeHtml(String(r.value));
      }
      return `<div class="details-row"><span class="details-label">${safeLabel}:</span><span class="details-value">${displayValue}</span></div>`;
    })
    .join("");
}

function renderCustomResponsesText(snapshot: SnapshotPayload): string {
  if (!snapshot.customResponses || snapshot.customResponses.length === 0) {
    return "";
  }

  return snapshot.customResponses
    .map((r) => {
      let displayValue = "";
      if (r.type === "CHECKBOX") {
        displayValue = r.value ? "Yes" : "No";
      } else if (r.type === "SELECT") {
        displayValue = r.selectedOptionLabel ? r.selectedOptionLabel : String(r.value);
      } else {
        displayValue = String(r.value);
      }
      return `${r.label}: ${displayValue}\n`;
    })
    .join("");
}

function baseHtml(content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sched Notification</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; padding: 32px 16px; box-sizing: border-box; }
    .card { background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-success { background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
    .badge-info { background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
    .badge-danger { background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    h1 { font-size: 20px; font-weight: 700; margin: 16px 0 8px 0; color: #0f172a; }
    p { font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0; }
    .details-box { background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0; }
    .details-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
    .details-row:last-child { border-bottom: none; }
    .details-label { color: #64748b; font-weight: 500; }
    .details-value { color: #0f172a; font-weight: 600; text-align: right; }
    .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: 600; text-align: center; margin-top: 12px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #94a3b8; }
    .strikethrough { text-decoration: line-through; color: #94a3b8; margin-right: 8px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      Powered by <strong>Sched</strong> — Conflict-Free Scheduling
    </div>
  </div>
</body>
</html>`;
}

export function renderBookingConfirmedAttendee(
  snapshot: SnapshotPayload,
  manageUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr, timeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.attendeeTimeZone
  );

  const subject = `Confirmed: ${snapshot.eventTitle} with ${snapshot.hostName}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeHostName = escapeHtml(snapshot.hostName);
  const safeHostEmail = escapeHtml(snapshot.hostEmail);
  const safeAttendeeNotes = snapshot.attendeeNotes ? escapeHtml(snapshot.attendeeNotes) : "";
  const locationHtml = renderLocationHtml(snapshot, "ATTENDEE");
  const locationText = renderLocationText(snapshot, "ATTENDEE");
  const customResponsesHtml = renderCustomResponsesHtml(snapshot);
  const customResponsesText = renderCustomResponsesText(snapshot);

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-success">Confirmed</span>
      <h1>You're scheduled!</h1>
      <p>A calendar invitation has been attached to this email for your session with <strong>${safeHostName}</strong>.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${safeEventTitle}</span></div>
      <div class="details-row"><span class="details-label">Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Time:</span><span class="details-value">${timeRangeStr}</span></div>
      <div class="details-row"><span class="details-label">Duration:</span><span class="details-value">${snapshot.durationMinutes} mins</span></div>
      <div class="details-row"><span class="details-label">Host:</span><span class="details-value">${safeHostName} (${safeHostEmail})</span></div>
      ${locationHtml}
      ${customResponsesHtml}
      ${
        safeAttendeeNotes
          ? `<div class="details-row"><span class="details-label">Your Notes:</span><span class="details-value">${safeAttendeeNotes}</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${manageUrl}" class="btn">View Booking Details</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
      Need to make changes? <a href="${manageUrl}" style="color: #ef4444; text-decoration: underline;">Cancel or reschedule booking</a>
    </p>
  `);

  const text = `CONFIRMED: ${snapshot.eventTitle} with ${snapshot.hostName}

You are scheduled with ${snapshot.hostName}!

Date: ${dateStr}
Time: ${timeRangeStr}
Duration: ${snapshot.durationMinutes} minutes
Host: ${snapshot.hostName} (${snapshot.hostEmail})
${locationText}${customResponsesText}${snapshot.attendeeNotes ? `Your Notes: ${snapshot.attendeeNotes}\n` : ""}
Manage / Reschedule: ${manageUrl}
`;

  return { subject, html, text };
}

export function renderBookingConfirmedHost(
  snapshot: SnapshotPayload,
  appUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr, timeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.hostTimeZone
  );

  const dashboardUrl = `${appUrl}/dashboard/bookings`;
  const subject = `New Booking: ${snapshot.attendeeName} - ${snapshot.eventTitle}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeAttendeeName = escapeHtml(snapshot.attendeeName);
  const safeAttendeeEmail = escapeHtml(snapshot.attendeeEmail);
  const safeAttendeeNotes = snapshot.attendeeNotes ? escapeHtml(snapshot.attendeeNotes) : "";
  const locationHtml = renderLocationHtml(snapshot, "HOST");
  const locationText = renderLocationText(snapshot, "HOST");
  const customResponsesHtml = renderCustomResponsesHtml(snapshot);
  const customResponsesText = renderCustomResponsesText(snapshot);

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-info">New Booking</span>
      <h1>New Session Scheduled</h1>
      <p><strong>${safeAttendeeName}</strong> has scheduled a new meeting with you.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${safeEventTitle}</span></div>
      <div class="details-row"><span class="details-label">Attendee:</span><span class="details-value">${safeAttendeeName} (${safeAttendeeEmail})</span></div>
      <div class="details-row"><span class="details-label">Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Time:</span><span class="details-value">${timeRangeStr}</span></div>
      <div class="details-row"><span class="details-label">Duration:</span><span class="details-value">${snapshot.durationMinutes} mins</span></div>
      ${locationHtml}
      ${customResponsesHtml}
      ${
        safeAttendeeNotes
          ? `<div class="details-row"><span class="details-label">Attendee Notes:</span><span class="details-value">${safeAttendeeNotes}</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" class="btn">View in Dashboard</a>
    </div>
  `);

  const text = `NEW BOOKING: ${snapshot.attendeeName} - ${snapshot.eventTitle}

A new meeting has been booked on your schedule.

Attendee: ${snapshot.attendeeName} (${snapshot.attendeeEmail})
Date: ${dateStr}
Time: ${timeRangeStr}
Duration: ${snapshot.durationMinutes} minutes
${locationText}${customResponsesText}${snapshot.attendeeNotes ? `Attendee Notes: ${snapshot.attendeeNotes}\n` : ""}
Dashboard: ${dashboardUrl}
`;

  return { subject, html, text };
}

export function renderBookingRescheduledAttendee(
  snapshot: SnapshotPayload,
  manageUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr: newDateStr, timeRangeStr: newTimeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.attendeeTimeZone
  );

  let previousTimeStr = "";
  if (snapshot.previousStartUtc && snapshot.previousEndUtc) {
    const prev = formatZonedRange(
      snapshot.previousStartUtc,
      snapshot.previousEndUtc,
      snapshot.attendeeTimeZone
    );
    previousTimeStr = `${prev.dateStr}, ${prev.timeRangeStr}`;
  }

  const subject = `Rescheduled: ${snapshot.eventTitle} with ${snapshot.hostName}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeHostName = escapeHtml(snapshot.hostName);
  const safeHostEmail = escapeHtml(snapshot.hostEmail);
  const safeReason = snapshot.rescheduleReason ? escapeHtml(snapshot.rescheduleReason) : "";
  const locationHtml = renderLocationHtml(snapshot, "ATTENDEE");
  const locationText = renderLocationText(snapshot, "ATTENDEE");

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-info">Rescheduled</span>
      <h1>Meeting Rescheduled</h1>
      <p>Your meeting with <strong>${safeHostName}</strong> has been rescheduled to a new time. An updated calendar invitation is attached.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${safeEventTitle}</span></div>
      <div class="details-row"><span class="details-label">New Date:</span><span class="details-value">${newDateStr}</span></div>
      <div class="details-row"><span class="details-label">New Time:</span><span class="details-value" style="color: #2563eb;">${newTimeRangeStr}</span></div>
      ${
        previousTimeStr
          ? `<div class="details-row"><span class="details-label">Previous Time:</span><span class="details-value strikethrough">${previousTimeStr}</span></div>`
          : ""
      }
      <div class="details-row"><span class="details-label">Host:</span><span class="details-value">${safeHostName} (${safeHostEmail})</span></div>
      ${locationHtml}
      ${
        safeReason
          ? `<div class="details-row"><span class="details-label">Reason:</span><span class="details-value">"${safeReason}"</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${manageUrl}" class="btn">View Updated Details</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
      Need to make changes? <a href="${manageUrl}" style="color: #ef4444; text-decoration: underline;">Cancel or reschedule booking</a>
    </p>
  `);

  const text = `RESCHEDULED: ${snapshot.eventTitle} with ${snapshot.hostName}

Your meeting has been moved to a new time.

New Date: ${newDateStr}
New Time: ${newTimeRangeStr}
${previousTimeStr ? `Previous Time: ${previousTimeStr}\n` : ""}Host: ${snapshot.hostName} (${snapshot.hostEmail})
${locationText}${snapshot.rescheduleReason ? `Reason: "${snapshot.rescheduleReason}"\n` : ""}
Manage / Reschedule: ${manageUrl}
`;

  return { subject, html, text };
}

export function renderBookingRescheduledHost(
  snapshot: SnapshotPayload,
  appUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr: newDateStr, timeRangeStr: newTimeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.hostTimeZone
  );

  let previousTimeStr = "";
  if (snapshot.previousStartUtc && snapshot.previousEndUtc) {
    const prev = formatZonedRange(
      snapshot.previousStartUtc,
      snapshot.previousEndUtc,
      snapshot.hostTimeZone
    );
    previousTimeStr = `${prev.dateStr}, ${prev.timeRangeStr}`;
  }

  const dashboardUrl = `${appUrl}/dashboard/bookings`;
  const subject = `Booking Rescheduled: ${snapshot.attendeeName} - ${snapshot.eventTitle}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeAttendeeName = escapeHtml(snapshot.attendeeName);
  const safeAttendeeEmail = escapeHtml(snapshot.attendeeEmail);
  const safeReason = snapshot.rescheduleReason ? escapeHtml(snapshot.rescheduleReason) : "";
  const locationHtml = renderLocationHtml(snapshot, "HOST");
  const locationText = renderLocationText(snapshot, "HOST");

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-info">Rescheduled</span>
      <h1>Booking Rescheduled</h1>
      <p>The session with <strong>${safeAttendeeName}</strong> has been updated to a new time on your schedule.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${safeEventTitle}</span></div>
      <div class="details-row"><span class="details-label">Attendee:</span><span class="details-value">${safeAttendeeName} (${safeAttendeeEmail})</span></div>
      <div class="details-row"><span class="details-label">New Date:</span><span class="details-value">${newDateStr}</span></div>
      <div class="details-row"><span class="details-label">New Time:</span><span class="details-value" style="color: #2563eb;">${newTimeRangeStr}</span></div>
      ${
        previousTimeStr
          ? `<div class="details-row"><span class="details-label">Previous Time:</span><span class="details-value strikethrough">${previousTimeStr}</span></div>`
          : ""
      }
      ${locationHtml}
      ${
        safeReason
          ? `<div class="details-row"><span class="details-label">Reason:</span><span class="details-value">"${safeReason}"</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" class="btn">View in Dashboard</a>
    </div>
  `);

  const text = `BOOKING RESCHEDULED: ${snapshot.attendeeName} - ${snapshot.eventTitle}

The scheduled meeting has been moved to a new time.

Attendee: ${snapshot.attendeeName} (${snapshot.attendeeEmail})
New Date: ${newDateStr}
New Time: ${newTimeRangeStr}
${previousTimeStr ? `Previous Time: ${previousTimeStr}\n` : ""}${locationText}${snapshot.rescheduleReason ? `Reason: "${snapshot.rescheduleReason}"\n` : ""}
Dashboard: ${dashboardUrl}
`;

  return { subject, html, text };
}

export function renderBookingCancelledAttendee(
  snapshot: SnapshotPayload,
  appUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr, timeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.attendeeTimeZone
  );

  const rebookUrl = `${appUrl}/public/${snapshot.hostUsername}/${snapshot.eventSlug}`;
  const subject = `Cancelled: ${snapshot.eventTitle} with ${snapshot.hostName}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeHostName = escapeHtml(snapshot.hostName);
  const safeReason = snapshot.cancellationReason ? escapeHtml(snapshot.cancellationReason) : "";

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-danger">Cancelled</span>
      <h1>Meeting Cancelled</h1>
      <p>Your session with <strong>${safeHostName}</strong> has been cancelled.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${safeEventTitle}</span></div>
      <div class="details-row"><span class="details-label">Scheduled Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Scheduled Time:</span><span class="details-value">${timeRangeStr}</span></div>
      ${
        safeReason
          ? `<div class="details-row"><span class="details-label">Host Reason:</span><span class="details-value" style="color: #dc2626;">"${safeReason}"</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${rebookUrl}" class="btn">Book Another Time</a>
    </div>
  `);

  const text = `CANCELLED: ${snapshot.eventTitle} with ${snapshot.hostName}

Your meeting has been cancelled by ${snapshot.hostName}.

Scheduled Date: ${dateStr}
Scheduled Time: ${timeRangeStr}
${snapshot.cancellationReason ? `Reason: "${snapshot.cancellationReason}"\n` : ""}
Book another time: ${rebookUrl}
`;

  return { subject, html, text };
}

export function renderBookingCancelledHost(
  snapshot: SnapshotPayload,
  appUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr, timeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.hostTimeZone
  );

  const dashboardUrl = `${appUrl}/dashboard/bookings`;
  const subject = `Booking Cancelled: ${snapshot.attendeeName} - ${snapshot.eventTitle}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeAttendeeName = escapeHtml(snapshot.attendeeName);
  const safeAttendeeEmail = escapeHtml(snapshot.attendeeEmail);
  const safeReason = snapshot.cancellationReason ? escapeHtml(snapshot.cancellationReason) : "";

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-danger">Cancelled</span>
      <h1>Attendee Cancelled</h1>
      <p><strong>${safeAttendeeName}</strong> has cancelled their scheduled booking. The slot has been released back into your availability.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${safeEventTitle}</span></div>
      <div class="details-row"><span class="details-label">Attendee:</span><span class="details-value">${safeAttendeeName} (${safeAttendeeEmail})</span></div>
      <div class="details-row"><span class="details-label">Scheduled Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Scheduled Time:</span><span class="details-value">${timeRangeStr}</span></div>
      ${
        safeReason
          ? `<div class="details-row"><span class="details-label">Attendee Reason:</span><span class="details-value" style="color: #dc2626;">"${safeReason}"</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" class="btn">View Bookings Dashboard</a>
    </div>
  `);

  const text = `BOOKING CANCELLED: ${snapshot.attendeeName} - ${snapshot.eventTitle}

${snapshot.attendeeName} has cancelled their booking. The time slot has been freed on your calendar.

Scheduled Date: ${dateStr}
Scheduled Time: ${timeRangeStr}
Attendee: ${snapshot.attendeeName} (${snapshot.attendeeEmail})
${snapshot.cancellationReason ? `Reason: "${snapshot.cancellationReason}"\n` : ""}
Dashboard: ${dashboardUrl}
`;

  return { subject, html, text };
}

export function renderBookingReminderAttendee(
  snapshot: SnapshotPayload,
  manageUrl: string,
  timeframeLabel = "in 24 hours"
): { subject: string; html: string; text: string } {
  const { dateStr, timeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.attendeeTimeZone
  );

  const subject = `Reminder: ${snapshot.eventTitle} with ${snapshot.hostName} is coming up ${timeframeLabel}`;

  const safeEventTitle = escapeHtml(snapshot.eventTitle);
  const safeHostName = escapeHtml(snapshot.hostName);
  const locationHtml = renderLocationHtml(snapshot, "ATTENDEE");
  const customQuestionsHtml = renderCustomResponsesHtml(snapshot);

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-info">Upcoming Meeting Reminder</span>
      <h1>${safeEventTitle}</h1>
      <p>Hi <strong>${escapeHtml(snapshot.attendeeName)}</strong>, this is a reminder that your meeting with <strong>${safeHostName}</strong> is starting ${timeframeLabel}.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Host:</span><span class="details-value">${safeHostName}</span></div>
      <div class="details-row"><span class="details-label">Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Time:</span><span class="details-value">${timeRangeStr}</span></div>
      ${locationHtml}
      ${customQuestionsHtml}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${manageUrl}" class="btn">Manage / Reschedule Booking</a>
    </div>
  `);

  const locationText = renderLocationText(snapshot, "ATTENDEE");
  const customQuestionsText = renderCustomResponsesText(snapshot);

  const text = `REMINDER: ${snapshot.eventTitle} with ${snapshot.hostName} is starting ${timeframeLabel}

Hi ${snapshot.attendeeName},

This is a reminder for your upcoming meeting with ${snapshot.hostName}.

Date: ${dateStr}
Time: ${timeRangeStr}
${locationText ? `${locationText}\n` : ""}${customQuestionsText ? `${customQuestionsText}\n` : ""}
Manage, reschedule, or cancel:
${manageUrl}
`;

  return { subject, html, text };
}

export function renderWelcomeVerificationEmail(
  user: { name: string; email: string; username: string },
  appUrl: string
): { subject: string; html: string; text: string } {
  const subject = `Welcome to Sched, ${user.name}! Verify your account`;
  const safeName = escapeHtml(user.name);
  const safeEmail = escapeHtml(user.email);
  const safeUsername = escapeHtml(user.username);
  const dashboardUrl = `${appUrl}/dashboard`;
  const publicProfileUrl = `${appUrl}/public/${user.username}`;

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-success">Account Created</span>
      <h1>Welcome to Sched, ${safeName}! 🎉</h1>
      <p>Thank you for signing up. Your scheduling account is ready to use. Share your custom booking link with clients, colleagues, and friends to schedule meetings without the email back-and-forth.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Full Name:</span><span class="details-value">${safeName}</span></div>
      <div class="details-row"><span class="details-label">Account Email:</span><span class="details-value">${safeEmail}</span></div>
      <div class="details-row"><span class="details-label">Username:</span><span class="details-value">@${safeUsername}</span></div>
      <div class="details-row"><span class="details-label">Public Booking Page:</span><span class="details-value"><a href="${publicProfileUrl}" style="color: #0069ff; text-decoration: none;">${publicProfileUrl}</a></span></div>
    </div>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${dashboardUrl}" class="btn" style="background-color: #0069ff; padding: 12px 28px; font-size: 14px;">Verify & Open Dashboard</a>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
      Need help setting up your event types or connecting Google Calendar? Visit your account settings anytime.
    </div>
  `);

  const text = `WELCOME TO SCHED, ${user.name}!

Your scheduling account is ready to use.

Account Details:
- Name: ${user.name}
- Email: ${user.email}
- Username: @${user.username}
- Public Booking Page: ${publicProfileUrl}

Get started and access your dashboard:
${dashboardUrl}

Powered by Sched
`;

  return { subject, html, text };
}

export function renderLoginSecurityAlertEmail(
  user: { name: string; email: string },
  loginInfo: { timeIso: string; ip?: string; userAgent?: string },
  appUrl: string
): { subject: string; html: string; text: string } {
  const subject = `Security Alert: New sign-in to your Sched account`;
  const safeName = escapeHtml(user.name);
  const safeEmail = escapeHtml(user.email);
  const formattedDate = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(loginInfo.timeIso));
  const dashboardUrl = `${appUrl}/dashboard`;
  const settingsUrl = `${appUrl}/dashboard/settings`;

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 24px;">
      <span class="badge badge-info">Security Notice</span>
      <h1>New Sign-in Detected</h1>
      <p>Hi <strong>${safeName}</strong>, we noticed a new successful sign-in to your Sched account (<strong>${safeEmail}</strong>).</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Time:</span><span class="details-value">${formattedDate} (UTC)</span></div>
      ${loginInfo.ip ? `<div class="details-row"><span class="details-label">IP Address:</span><span class="details-value">${escapeHtml(loginInfo.ip)}</span></div>` : ""}
      ${loginInfo.userAgent ? `<div class="details-row"><span class="details-label">Device / Browser:</span><span class="details-value" style="font-size: 11px; max-width: 260px; word-break: break-all;">${escapeHtml(loginInfo.userAgent)}</span></div>` : ""}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
      <strong>If this was you:</strong> You can safely ignore this email.<br>
      <strong>If you did NOT sign in:</strong> Please <a href="${settingsUrl}" style="color: #dc2626; font-weight: 600;">change your password immediately</a> to secure your account.
    </div>
  `);

  const text = `SECURITY ALERT: New sign-in to your Sched account

Hi ${user.name},

A new sign-in was detected for your account (${user.email}).

Time: ${formattedDate} (UTC)
${loginInfo.ip ? `IP Address: ${loginInfo.ip}\n` : ""}${loginInfo.userAgent ? `Device/Browser: ${loginInfo.userAgent}\n` : ""}
If this was you, you can safely ignore this notice.
If this was not you, please change your password immediately:
${settingsUrl}

Dashboard: ${dashboardUrl}
`;

  return { subject, html, text };
}
