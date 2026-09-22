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
  attendeeNotes?: string;
  startUtc: string;
  endUtc: string;
  status: string;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
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
  appUrl: string
): { subject: string; html: string; text: string } {
  const { dateStr, timeRangeStr } = formatZonedRange(
    snapshot.startUtc,
    snapshot.endUtc,
    snapshot.attendeeTimeZone
  );

  const bookingUrl = `${appUrl}/public/bookings/${snapshot.bookingId}`;
  const cancelUrl = `${appUrl}/public/bookings/${snapshot.bookingId}`;

  const subject = `Confirmed: ${snapshot.eventTitle} with ${snapshot.hostName}`;

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-success">Confirmed</span>
      <h1>You're scheduled!</h1>
      <p>A calendar invitation has been attached to this email for your session with <strong>${snapshot.hostName}</strong>.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${snapshot.eventTitle}</span></div>
      <div class="details-row"><span class="details-label">Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Time:</span><span class="details-value">${timeRangeStr}</span></div>
      <div class="details-row"><span class="details-label">Duration:</span><span class="details-value">${snapshot.durationMinutes} mins</span></div>
      <div class="details-row"><span class="details-label">Host:</span><span class="details-value">${snapshot.hostName} (${snapshot.hostEmail})</span></div>
      ${
        snapshot.attendeeNotes
          ? `<div class="details-row"><span class="details-label">Your Notes:</span><span class="details-value">${snapshot.attendeeNotes}</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${bookingUrl}" class="btn">View Booking Details</a>
    </div>

    <p style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 20px;">
      Need to make changes? <a href="${cancelUrl}" style="color: #ef4444; text-decoration: underline;">Cancel or reschedule booking</a>
    </p>
  `);

  const text = `CONFIRMED: ${snapshot.eventTitle} with ${snapshot.hostName}

You are scheduled with ${snapshot.hostName}!

Date: ${dateStr}
Time: ${timeRangeStr}
Duration: ${snapshot.durationMinutes} minutes
Host: ${snapshot.hostName} (${snapshot.hostEmail})
${snapshot.attendeeNotes ? `Your Notes: ${snapshot.attendeeNotes}\n` : ""}
View Booking: ${bookingUrl}
Cancel or Manage: ${cancelUrl}
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

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-success">New Booking</span>
      <h1>New meeting scheduled!</h1>
      <p><strong>${snapshot.attendeeName}</strong> has booked a slot on your calendar.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${snapshot.eventTitle}</span></div>
      <div class="details-row"><span class="details-label">Attendee:</span><span class="details-value">${snapshot.attendeeName} (${snapshot.attendeeEmail})</span></div>
      <div class="details-row"><span class="details-label">Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Time:</span><span class="details-value">${timeRangeStr}</span></div>
      <div class="details-row"><span class="details-label">Duration:</span><span class="details-value">${snapshot.durationMinutes} mins</span></div>
      <div class="details-row"><span class="details-label">Attendee Timezone:</span><span class="details-value">${snapshot.attendeeTimeZone}</span></div>
      ${
        snapshot.attendeeNotes
          ? `<div class="details-row"><span class="details-label">Attendee Notes:</span><span class="details-value">${snapshot.attendeeNotes}</span></div>`
          : ""
      }
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${dashboardUrl}" class="btn">Open Host Dashboard</a>
    </div>
  `);

  const text = `NEW BOOKING: ${snapshot.attendeeName} - ${snapshot.eventTitle}

A new meeting has been scheduled on your calendar!

Attendee: ${snapshot.attendeeName} (${snapshot.attendeeEmail})
Date: ${dateStr}
Time: ${timeRangeStr}
Duration: ${snapshot.durationMinutes} minutes
Attendee Timezone: ${snapshot.attendeeTimeZone}
${snapshot.attendeeNotes ? `Notes: ${snapshot.attendeeNotes}\n` : ""}
Host Dashboard: ${dashboardUrl}
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

  const rebookUrl = `${appUrl}/public/${snapshot.hostUsername}`;
  const subject = `Cancelled: ${snapshot.eventTitle} with ${snapshot.hostName}`;

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-danger">Cancelled</span>
      <h1>Meeting Cancelled</h1>
      <p>Your upcoming session with <strong>${snapshot.hostName}</strong> has been cancelled by the host.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${snapshot.eventTitle}</span></div>
      <div class="details-row"><span class="details-label">Scheduled Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Scheduled Time:</span><span class="details-value">${timeRangeStr}</span></div>
      ${
        snapshot.cancellationReason
          ? `<div class="details-row"><span class="details-label">Host Reason:</span><span class="details-value" style="color: #dc2626;">"${snapshot.cancellationReason}"</span></div>`
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

  const html = baseHtml(`
    <div style="text-align: center; margin-bottom: 20px;">
      <span class="badge badge-danger">Cancelled</span>
      <h1>Attendee Cancelled</h1>
      <p><strong>${snapshot.attendeeName}</strong> has cancelled their scheduled booking. The slot has been released back into your availability.</p>
    </div>

    <div class="details-box">
      <div class="details-row"><span class="details-label">Event:</span><span class="details-value">${snapshot.eventTitle}</span></div>
      <div class="details-row"><span class="details-label">Attendee:</span><span class="details-value">${snapshot.attendeeName} (${snapshot.attendeeEmail})</span></div>
      <div class="details-row"><span class="details-label">Scheduled Date:</span><span class="details-value">${dateStr}</span></div>
      <div class="details-row"><span class="details-label">Scheduled Time:</span><span class="details-value">${timeRangeStr}</span></div>
      ${
        snapshot.cancellationReason
          ? `<div class="details-row"><span class="details-label">Attendee Reason:</span><span class="details-value" style="color: #dc2626;">"${snapshot.cancellationReason}"</span></div>`
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
