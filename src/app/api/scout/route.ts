import { scoutHandlers } from '@/lib/scout/server';

// Cache Components uses the default Node.js runtime; a runtime override is unsupported.
export const maxDuration = 90;
export const GET = scoutHandlers.GET;
export const POST = scoutHandlers.POST;
export const DELETE = scoutHandlers.DELETE;
