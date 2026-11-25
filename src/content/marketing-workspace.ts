export const primaryWorkspaceViews = [
  ['overview','Overview','Your next decisions, in focus.'],
  ['discover','Discover','Find the work worth doing.'],
  ['create','Create','Turn approved research into useful content.'],
  ['publish','Publish','Review the revision. Choose the destination.'],
  ['measure','Measure','Understand what happened next.'],
] as const;
export const secondaryWorkspaceViews = [
  ['agents','Agents','Your independent intelligence team.'],
  ['activity','Activity','An accountable record.'],
  ['integrations','Integrations','Connected. Read-only. Secure.'],
  ['settings','Settings','Your private workspace.'],
] as const;
export const workspaceViews = [...primaryWorkspaceViews,...secondaryWorkspaceViews] as const;
export type WorkspaceView = typeof workspaceViews[number][0];
export const marketingAgents = [
  {id:'seo-analyst',name:'SEO Analyst',specialty:'Search intelligence',tone:'cyan',description:'Find meaningful search opportunities, investigate query performance, and recommend focused improvements.',tools:['Search Console reporting','GA4 landing-page reporting'],context:'Approved website content, search evidence, and prior recommendations.',output:'Prioritized opportunities with supporting queries, pages, and evidence.'},
  {id:'content-strategist',name:'Content Strategist',specialty:'Content & editorial',tone:'violet',description:'Turn owner-approved opportunities into thoughtful content briefs, page proposals, and editorial updates.',tools:['Approved opportunities','Website content reference'],context:'Brand positioning, audience needs, approved opportunities, and editorial guidance.',output:'Reviewable briefs and drafts. Publishing always requires owner approval.'},
  {id:'performance-analyst',name:'Performance Analyst',specialty:'Measurement & outcomes',tone:'blue',description:'Compare results, investigate changes, and measure performance after approved improvements.',tools:['GA4 reporting','Search Console reporting','Historical report snapshots'],context:'Reporting periods, approved changes, and historical measurements.',output:'Evidence-backed comparisons that distinguish observations from hypotheses.'},
] as const;
export type MarketingAgent = typeof marketingAgents[number];
