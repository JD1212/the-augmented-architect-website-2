/** Owner-facing states only; server authorization remains authoritative. */
export function draftReadiness(input:{approved:boolean;verifiedSources:number;executionEnabled:boolean;approvalConsumed:boolean;targetMatches:boolean;busy:boolean;running:boolean;dirty:boolean;hasDraft:boolean}){
 const evidenceReady=input.verifiedSources>=2;
 let explanation='One draft-generation run is ready. Nothing will be published.';
 if(input.running||input.busy)explanation='An action is in progress. Wait for its result before continuing.';
 else if(!input.approved)explanation='Review the research and choose Approve for drafting. This approves the topic only; it does not run the agent or approve publication.';
 else if(!evidenceReady)explanation='More supporting evidence needs review before drafting. At least two reviewed primary sources are required.';
 else if(input.approvalConsumed)explanation='The authorized draft-generation attempt has been used. Review its result or error below; another attempt needs fresh authorization.';
 else if(!input.targetMatches)explanation='This controlled test is reserved for a different opportunity. Select the approved test opportunity.';
 else if(!input.executionEnabled)explanation='The topic is approved. Generation is disabled until you separately authorize one controlled Preview run and its secure server configuration is ready.';
 else if(input.dirty)explanation='Save or discard your current edits before requesting another draft.';
 return {evidenceReady,canGenerate:input.approved&&evidenceReady&&input.executionEnabled&&!input.approvalConsumed&&input.targetMatches&&!input.busy&&!input.running&&!input.dirty,explanation,title:evidenceReady?'Research ready for drafting':'Research needs review',next:input.running||input.busy?'Wait for the current action':!input.approved?'Review research → Approve for drafting':!evidenceReady?'Review supporting sources':input.approvalConsumed?'Review the completed attempt':!input.targetMatches?'Select the authorized opportunity':!input.executionEnabled?'Authorize one draft-generation run':input.dirty?'Save your edits':input.hasDraft?'Review or revise the draft':'Generate website article + LinkedIn draft'};
}
