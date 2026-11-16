/** An explicit booking CTA supplies user intent, not new agent instructions. */
export const consultationIntent = "I'd like to schedule a free 30-minute consultation.\n\n";
export function consultationMessage(details: string): string | null {
  const message = consultationIntent + details.trim();
  return details.trim() && message.length <= 1000 ? message : null;
}
