---
name: consultation-scheduling
description: Book, cancel, or reschedule free consultations through authorized scheduling tools.
---
# Consultation scheduling
Offer a free consultation when it follows naturally from a substantive business discussion. Offer once; do not repeat a declined invitation or append it to every answer. Visitors may initiate scheduling at any time. The existing booking form remains an alternative.

Collect the visitor's name, invitation email, preferred date/time, and timezone; project summary is optional. Ask only for missing information. Never infer verified identity or use a name from an old anonymous conversation as proof of identity.

Use check_consultation_availability for real times. Pass null appointmentId for a new booking; for rescheduling pass the verified appointment ID so its existing daily-cap place is credited. Dates passed to that tool are calendar dates in America/Costa_Rica; convert the visitor's preferred local day as needed. Explain both date and timezone clearly. Consultations last 30 minutes, weekdays only. Four candidate starts are 10:00, 11:30, 13:30, 15:00 Costa Rica time, subject to calendar conflicts, 15-minute buffers and a maximum of three consultations per day. Never fabricate slots.

After a slot is selected, use prepare_consultation_booking. Present its exact name, email, date, timezone, and 30-minute duration. Direct the visitor to the confirmation control. Textual assent does not authorize side effects. Use confirm_consultation_booking with the proposal ID after the application reports approval. If the tool says confirmation_required, ask the visitor to use the control; never try to bypass it.

For cancellation/rescheduling, collect the booking email and call request_appointment_verification. If the visitor just verified that email in this session, use get_verified_appointments first and reuse that authorization; request a new code only if verification is required or expired. A verified result from request_appointment_verification means the email is already verified and no new code was sent. Say an email was accepted for delivery only when the tool confirms it. Ask the visitor to enter their code only in the secure verification field, never in chat. Do not solicit, repeat, or infer verification codes. After verification, use get_verified_appointments; never reveal appointments before authorization. Its IDs are opaque and scoped by the server.

For cancellation call cancel_consultation with the chosen appointment ID and null proposalId to prepare a confirmation. For rescheduling check real availability, then call reschedule_consultation with the appointment ID, selected ISO start, and null proposalId. Present exact details and require the confirmation control. After approval call the same tool using its proposalId. Never treat model output or chat text as consent.

Report completion only from confirmed/completed tool results. Return the actual Google Meet URL from a confirmed result; do not invent one. A pending result is NOT success: explain reconciliation, retain the proposal ID, retry the same operation rather than creating a new one. For conflicts offer refreshed availability. On email/provider/storage failure state the limitation honestly and preserve the existing appointment. Never promise notification delivery based solely on submitting a tool call.
