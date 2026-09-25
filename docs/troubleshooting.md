# Sched Production Troubleshooting Guide

## 1. Google Calendar Sync Issues

### Symptoms:
- Booking confirmed in Sched but does not appear on Google Calendar.
- Sync job remains in `FAILED` or `DEAD_LETTER` state.

### Diagnosing via Logs:
Query structured logs for `event: "WORKER_DEAD_LETTER"` or `event: "WORKER_RETRY_SCHEDULED"`:
```bash
grep "Google Calendar" /var/log/sched/api.log | grep -E "DEAD_LETTER|RETRY"
```

### Common Causes & Resolution:

#### A. Token Expired or Revoked by User (`GoogleAuthRevokedError`):
- **Reason**: The user revoked calendar access in Google Account permissions or credentials expired.
- **System Action**: Sched automatically marks the integration status as `REVOKED` and clears encrypted secrets to avoid invalid API requests.
- **Resolution**: Prompt the user to reconnect Google Calendar via Dashboard -> Integrations.

#### B. Rate Limit Exceeded (Google Calendar API 403 / 429):
- **Reason**: Exceeded Google's query quota.
- **Resolution**: The background worker automatically retries up to 5 times with exponential backoff. If quota is permanently exhausted, request quota increase in Google Cloud Console.

---

## 2. Transactional Email Delivery Failures

### Symptoms:
- Attendee reports they did not receive confirmation or reminder email.

### Diagnosing via Database:
```sql
SELECT id, type, recipient_email, status, attempts, last_error, next_run_at 
FROM notification_jobs 
WHERE recipient_email = 'attendee@example.com' 
ORDER BY created_at DESC;
```

### Common Causes & Resolution:

#### A. SMTP Connection / Authentication Timeout:
- **Reason**: Invalid `SMTP_USER` or `SMTP_PASS`, or port blocked by firewall.
- **Resolution**: Test SMTP credentials with a scratch test script. Ensure port 587 (STARTTLS) or port 465 (SSL) is accessible.

#### B. Dead-Letter Job Recovery:
- If a temporary mail server outage caused jobs to transition to `DEAD_LETTER`, you can re-queue them safely:
```sql
UPDATE notification_jobs 
SET status = 'PENDING', attempts = 0, next_run_at = NOW() 
WHERE status = 'DEAD_LETTER' AND created_at > NOW() - INTERVAL '24 hours';
```

---

## 3. Booking Conflicts & Slot Collisions

### Symptoms:
- User receives `409 Conflict: This time slot has already been booked by someone else.`

### Verification:
1. Sched utilizes two layers of concurrency protection:
   - In-memory availability check against existing bookings and Google Calendar busy intervals.
   - PostgreSQL GiST exclusion constraint (`no_overlapping_confirmed_bookings`).
2. When two attendees attempt to confirm the exact same slot concurrently, the first transaction commits, and the second transaction is safely rolled back with `SLOT_ALREADY_BOOKED`.
3. The frontend prompts the attendee to choose another available time slot.
