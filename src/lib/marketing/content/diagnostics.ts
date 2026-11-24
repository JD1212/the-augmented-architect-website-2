/** Preserve actionable failure identity without retaining prompts, provider bodies or secrets. */
export function contentFailure(error:unknown,phase:string){
 const e=error as {name?:unknown;message?:unknown;status?:unknown;issues?:unknown};
 const message=typeof e?.message==='string'?e.message:'';
 const match=/^([A-Z][A-Z_]{2,80})(?: at ([a-zA-Z0-9.]{1,150}))?$/.exec(message);
 const issues=Array.isArray(e?.issues)?e.issues.slice(0,5).flatMap(issue=>{if(!issue||typeof issue!=='object')return [];const value=issue as {code?:unknown;path?:unknown};if(typeof value.code!=='string'||!/^[a-z_]{1,60}$/.test(value.code)||!Array.isArray(value.path))return [];const path=value.path.map(p=>String(p)).join('.');return /^[a-zA-Z0-9_.]{0,150}$/.test(path)?[{code:value.code,path}]:[];}):[];
 const name=typeof e?.name==='string'&&['ZodError','TimeoutError','AbortError','ModelBehaviorError','MaxTurnsExceededError'].includes(e.name)?e.name:null;
 return {phase,rule:match?.[0]??(issues.length?'STRUCTURED_OUTPUT_INVALID':name),fieldPath:match?.[2]??issues[0]?.path??null,issues,httpStatus:typeof e?.status==='number'&&Number.isInteger(e.status)&&e.status>=400&&e.status<=599?e.status:null};
}
