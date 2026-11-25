/** Safe in both public/client UI and server code; imports no article registry or private records. */
export function articleHref(slug:string){return `/insights/articles/${slug}`;}
