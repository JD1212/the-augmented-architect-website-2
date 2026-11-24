/** Bounded diagnostic metadata only: never serialize SDK state, tool input, source bodies or provider messages. */
const errorNames=new Set(['Error','TypeError','RangeError','SyntaxError','ZodError','TimeoutError','AbortError','ModelBehaviorError','ModelRefusalError','ModelTimeoutError','MaxTurnsExceededError','ToolCallError','ToolTimeoutError','InvalidToolInputError','InvalidToolOutputError','UserError','SystemError','MarketingError']);
export function contentFailure(error:unknown,phase:string){
 const chain:Array<{name?:unknown;message?:unknown;stack?:unknown;status?:unknown;issues?:unknown;error?:unknown;originalError?:unknown;cause?:unknown}>=[],seen=new Set<unknown>();
 let current=error;
 while(current&&typeof current==='object'&&!seen.has(current)&&chain.length<4){seen.add(current);const e=current as typeof chain[number];chain.push(e);current=e.originalError??e.error??e.cause;}
 const names=chain.map(e=>typeof e.name==='string'&&errorNames.has(e.name)?e.name:null).filter((n):n is string=>Boolean(n));
 const matches=chain.map(e=>typeof e.message==='string'?/^([A-Z][A-Z_]{2,80})(?: at ([a-zA-Z0-9.]{1,150}))?$/.exec(e.message):null).filter((m):m is RegExpExecArray=>Boolean(m));
 const issues=chain.flatMap(e=>Array.isArray(e.issues)?e.issues.slice(0,5).flatMap(issue=>{if(!issue||typeof issue!=='object')return [];const v=issue as {code?:unknown;path?:unknown};if(typeof v.code!=='string'||!/^[a-z_]{1,60}$/.test(v.code)||!Array.isArray(v.path))return [];const path=v.path.map(p=>String(p)).join('.');return /^[a-zA-Z0-9_.]{0,150}$/.test(path)?[{code:v.code,path}]:[];}):[]).slice(0,5);
 const frames=chain.flatMap(e=>typeof e.stack==='string'?e.stack.split('\n').slice(1,10).flatMap(line=>{const m=/[\/\\]([a-zA-Z0-9_.-]+\.(?:js|mjs|cjs|ts|tsx)):(\d{1,7}):(\d{1,7})\)?$/.exec(line);return m?[{file:m[1],line:Number(m[2]),column:Number(m[3])}]:[];}):[]).slice(0,6);
 const status=chain.find(e=>typeof e.status==='number'&&Number.isInteger(e.status)&&e.status>=400&&e.status<=599)?.status as number|undefined;
 const rule=matches.at(-1)?.[0]??(issues.length?'STRUCTURED_OUTPUT_INVALID':names.findLast(n=>!['Error','TypeError','RangeError'].includes(n))??null),fieldPath=matches.at(-1)?.[2]??issues[0]?.path??null;
 const category=names.includes('ModelRefusalError')?'model_refusal':names.includes('SyntaxError')?'schema_validation':names.some(n=>['ToolCallError','InvalidToolInputError','InvalidToolOutputError'].includes(n))?'tool_execution':names.some(n=>['TimeoutError','AbortError','ModelTimeoutError','ToolTimeoutError'].includes(n))?'timeout':rule&&/CITATION|SOURCE_EXCERPT|CLAIM_SUPPORT|SOURCE_NOT_INSPECTED/.test(rule)?'citation_validation':rule&&/BUDGET|MaxTurnsExceeded/.test(rule)?'execution_limit':issues.length?'schema_validation':status===401||status===403?'access':phase==='persistence'?'persistence':'unclassified';
 return {phase,rule,fieldPath,issues,httpStatus:status??null,errorType:names[0]??null,errorChain:names,frames,category};
}
