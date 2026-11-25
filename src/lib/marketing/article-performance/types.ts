import type {DateRange,ReportTable} from '../types';
export type MetricState='observed'|'zero'|'partial'|'unavailable'|'outside_period';
export type ArticleMetric={value:number|null;state:MetricState};
export type ArticleIdentity={id:string;documentId:string;title:string;path:string;url:string;publishedDate:string;firstLiveAt:string;revisionId:string;publicVersion:string};
export type ProviderState={status:'connected'|'empty'|'partial'|'unavailable'|'not_configured';updatedAt:string|null;message:string;timeZone?:string};
export type ArticleMetrics={views:ArticleMetric;impressions:ArticleMetric;clicks:ArticleMetric;consultationStarts:ArticleMetric;bookings:ArticleMetric;engagements:ArticleMetric;engagementSeconds:ArticleMetric};
export type ArticleRow=ArticleIdentity&{metrics:ArticleMetrics};
export type ArticlePerformance={range:DateRange;articles:ArticleRow[];sources:{traffic:ProviderState;events:ProviderState;search:ProviderState;bookings:ProviderState};retrievedAt:string;cached:boolean};
export type ArticleDetail={article:ArticleRow;range:DateRange;traffic:ReportTable|null;search:ReportTable|null;queries:ReportTable|null;context:{origin:'agent'|'owner-authored'|'unknown';opportunityId:string|null;opportunityTitle:string|null;keywords:string[]};notes:string[];sources:ArticlePerformance['sources'];querySource:ProviderState;firstPartyBookings:null};
