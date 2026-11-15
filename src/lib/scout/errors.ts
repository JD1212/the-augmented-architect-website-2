export class ScoutError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const temporaryFailure = 'Scout could not finish this reply. Please retry in a moment.';
