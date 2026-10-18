import { createMatchingService, matchingConfigFromEnv, type MatchingService } from '@workbridge/agent-runtime';
export { candidateContext, vacancyInput } from '@workbridge/agent-runtime';

export function matchingService(): MatchingService {
  return createMatchingService({ ...matchingConfigFromEnv({
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_ENDPOINT: process.env.GOOGLE_MAPS_ENDPOINT,
    GOOGLE_GEOCODING_ENDPOINT: process.env.GOOGLE_GEOCODING_ENDPOINT,
  }), warnings: [] });
}
