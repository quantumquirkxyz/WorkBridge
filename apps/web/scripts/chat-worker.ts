import { processOneChatJob } from '../lib/chat-worker';
import {
  persistChatSession,
  readCandidatePreferences,
  readCandidateProfile,
  readChatSession,
} from '../lib/neon-repository';

/**
 * Dedicated Node worker entry (spec #90): claims one durable chat job at a time
 * with a lease, runs the chat seam, and commits the optimistic session before
 * acknowledging. Run with `npm run start:worker`.
 */
const sessionStore = { get: readChatSession, save: persistChatSession };
const IDLE_POLL_MS = 1000;

let running = true;
const stop = () => {
  running = false;
};
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  while (running) {
    const result = await processOneChatJob({
      sessionStore,
      contextFor: async (candidateId) => ({
        profile: await readCandidateProfile(candidateId).catch(() => undefined),
        preferences: await readCandidatePreferences(candidateId).catch(() => undefined),
      }),
    });
    if (result.outcome === 'idle') await sleep(IDLE_POLL_MS);
  }
}

await main();
