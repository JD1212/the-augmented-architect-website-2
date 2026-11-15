import 'server-only';
import { ScoutError } from './errors';

export function scoutDatabaseConfig(env: NodeJS.ProcessEnv = process.env) {
  const { SUPABASE_URL: url, SUPABASE_SECRET_KEY: secret } = env;
  if (!url || !secret) throw new ScoutError(503, 'Scout is not connected yet. Please try again later or visit Contact.');
  // Pin this website to its dedicated project; fail closed on another app's URL.
  if (url.replace(/\/$/, '') !== 'https://cjldcaiybqguklzqtdjj.supabase.co' || !secret.startsWith('sb_secret_')) {
    throw new ScoutError(503, 'Scout is temporarily unavailable. Please try again later.');
  }
  return { url, secret };
}

export function scoutConfig(env: NodeJS.ProcessEnv = process.env) {
  const { OPENAI_API_KEY: apiKey, OPENAI_SCOUT_MODEL: model } = env;
  if (!apiKey || !model) throw new ScoutError(503, 'Scout is not connected yet. Please try again later or visit Contact.');
  return { apiKey, model, ...scoutDatabaseConfig(env) };
}
