import type { WorkspaceView } from '@/content/marketing-workspace';
const paths:Record<WorkspaceView|string,string>={
  opportunities:'M5 3h14v18H5zM8 8h8M8 12h8M8 16h5',
  overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  analytics:'M4 20V10m8 10V4m8 16v-7M2 21h20',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  conversions:'M4 4h16l-6 8v7l-4 2V12z',agents:'M5 8h14v12H5zM12 3v5M9 12v2m6-2v2M9 17h6M2 12v5m20-5v5',
  activity:'M2 12h4l3-8 5 16 3-8h5',integrations:'M8 2v5m8-5v5M6 7h12v4a6 6 0 0 1-12 0zM12 17v5',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  arrow:'M5 12h14m-5-5 5 5-5 5',refresh:'M20 7v5h-5M4 17v-5h5M19 8a8 8 0 0 0-14-3M5 16a8 8 0 0 0 14 3',
  close:'m6 6 12 12M6 18 18 6',menu:'M4 6h16M4 12h16M4 18h16',logout:'M9 3H4v18h5M9 12h12m-5-5 5 5-5 5',shield:'m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6zM8 12l3 3 5-6',
};
export function WorkspaceIcon({name,className}:{name:string;className?:string}) {return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.overview}/></svg>;}
