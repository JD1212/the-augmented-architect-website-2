'use client';
import {useEffect} from 'react';
import {registerArticleAnalytics,type ArticleAnalyticsPage} from '@/lib/analytics';
/** Receives only public metadata from the already-rendered Insights page. No database client or private records. */
export function ArticleMeasurement({pages}:{pages:readonly ArticleAnalyticsPage[]}){
 useEffect(()=>{registerArticleAnalytics(pages);window.dispatchEvent(new Event('aa:article-registry-ready'));},[pages]);
 return null;
}
