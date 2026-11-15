import 'server-only';
import OpenAI from 'openai';
import { Agent, Runner, OpenAIProvider, type AgentInputItem } from '@openai/agents';
import { scoutInstructions } from './knowledge';
import { scoutConfig } from './config';
import type { ScoutMessage } from './contracts';

export type AgentReply = { text: string; usage?: { input_tokens: number; output_tokens: number } };
export interface ScoutModel {
  verify(): Promise<void>;
  reply(messages: ScoutMessage[], signal: AbortSignal, delta: (text: string) => void): Promise<AgentReply>;
}

export function createScoutModel(clientOverride?: OpenAI): ScoutModel {
  const config = scoutConfig();
  const client = clientOverride ?? new OpenAI({ apiKey: config.apiKey, maxRetries: 0, timeout: 45000 });
  const agent = new Agent({ name: 'Scout', instructions: scoutInstructions, model: config.model,
    tools: [], modelSettings: { maxTokens: 700, store: false, timeoutMs: 45000 } });
  const runner = new Runner({ modelProvider: new OpenAIProvider({ openAIClient: client, useResponses: true }), tracingDisabled: true });
  let checked: Promise<void> | undefined;
  let verifiedUntil = 0;
  return {
    async verify() {
      if (Date.now() >= verifiedUntil) checked = undefined;
      if (!checked) {
        verifiedUntil = Date.now() + 5 * 60 * 1000;
        checked = client.models.retrieve(config.model, { timeout: 8000 }).then(() => undefined).catch(() => { checked = undefined; throw new Error('Model unavailable'); });
      }
      await checked;
    },
    async reply(messages, signal, delta) {
      const input: AgentInputItem[] = messages.map(({ role, content }) => role === 'user'
        ? { role: 'user', content }
        : { role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: content }] });
      const result = await runner.run(agent, input, { stream: true, maxTurns: 1, signal });
      // Observe completion immediately so a rejected run cannot become unhandled.
      const completion = result.completed.then(() => null, error => error);
      let text = '';
      for await (const chunk of result.toTextStream()) { text += chunk; delta(chunk); }
      const failure = await completion;
      if (failure) throw failure;
      if (signal.aborted || result.cancelled || !result.finalOutput) throw new Error('Incomplete agent response');
      return { text, usage: { input_tokens: result.state.usage.inputTokens, output_tokens: result.state.usage.outputTokens } };
    },
  };
}
