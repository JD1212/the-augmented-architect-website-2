/** Client-side pagination for already-authorized, bounded inventories. No data is fetched here. */
export function recordPage<T>(rows:readonly T[],page:number,size=10){const pages=Math.max(1,Math.ceil(rows.length/size)),current=Math.min(Math.max(1,page),pages);return {rows:rows.slice((current-1)*size,current*size),page:current,pages,total:rows.length};}
export const matchesText=(query:string,...values:(string|null|undefined)[])=>!query.trim()||values.some(v=>v?.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
