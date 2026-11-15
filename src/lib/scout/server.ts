import 'server-only';
import { createScoutModel, type ScoutModel } from './agent';
import { createScoutStore } from './store';
import { createScoutService } from './service';
import { createRequestLimiter, createScoutHandlers } from './http';
import { createSharedRequestLimiter } from './request-limits';

let service: ReturnType<typeof createScoutService> | undefined;
let model: ScoutModel | undefined;
const localLimit = createRequestLimiter();
const sharedLimit = createSharedRequestLimiter();
export const scoutHandlers = createScoutHandlers(() => {
  if (!service) service = createScoutService(createScoutStore(), {
    verify: () => (model ??= createScoutModel()).verify(),
    reply: (...args) => (model ??= createScoutModel()).reply(...args),
  }, process.env.OPENAI_SCOUT_MODEL ?? '');
  return service;
}, async (request, action, maximum, windowMs) => {
  localLimit(request, action, maximum, windowMs);
  await sharedLimit(request, action);
});
