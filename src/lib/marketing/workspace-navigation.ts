/** UI navigation only. Links never grant execution, spending or publication authority. */
export const workflowStages=['discover','create','publish','measure'] as const;
export type WorkflowStage=typeof workflowStages[number];
export function workspaceLink(view:string,opportunity?:string|null,extra:Record<string,string>={}){
 const query=new URLSearchParams({view,...extra});if(opportunity)query.set('opportunity',opportunity);return '?'+query.toString();
}
export function workspaceLocation(raw:string|null,section:string|null){
 const aliases:Record<string,{view:string;section:string}>={opportunities:{view:'discover',section:'opportunities'},keywords:{view:'discover',section:'keywords'},analytics:{view:'measure',section:'traffic'},search:{view:'measure',section:'search'},conversions:{view:'measure',section:'conversions'}};
 const alias=raw?aliases[raw]:undefined,view=alias?.view??raw??'overview';
 const selected=alias?.section??section;
 const tab=view==='discover'&&['opportunities','keywords','plans','analyst'].includes(selected??'')?selected!:view==='measure'&&['articles','traffic','search','conversions'].includes(selected??'')?selected!:view==='discover'?'opportunities':view==='measure'?'articles':'';
 const panel=view==='discover'?({opportunities:'opportunities',keywords:'keywords',plans:'plans',analyst:'analyst'}[tab]):view==='measure'?({articles:'articles',traffic:'analytics',search:'search',conversions:'conversions'}[tab]):view;
 return {view,section:tab,panel};
}
