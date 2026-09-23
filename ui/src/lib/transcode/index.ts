import { getTranscodeDecision } from '$lib/api/subsonic'
import { createDecisionService } from './decisionService'

export { detectBrowserProfile, type BrowserProfile } from './browserProfile'
export type { DecisionService } from './decisionService'

export const decisionService = createDecisionService(getTranscodeDecision)
