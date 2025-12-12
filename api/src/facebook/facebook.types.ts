export interface FacebookTokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
}

export interface FacebookPostSummary {
  total_count: number;
}

export interface FacebookLikes {
  summary: FacebookPostSummary;
}

export interface FacebookComments {
  summary: FacebookPostSummary;
}

export interface FacebookShares {
  count: number;
}

export interface FacebookPost {
  id: string;
  message?: string;
  created_time: string;
  permalink_url?: string;
  full_picture?: string;
  likes?: FacebookLikes;
  comments?: FacebookComments;
  shares?: FacebookShares;
}

export interface FacebookPagingCursors {
  before?: string;
  after?: string;
}

export interface FacebookPaging {
  cursors?: FacebookPagingCursors;
  next?: string;
  previous?: string;
}

export interface FacebookFeedResponse {
  data: FacebookPost[];
  paging?: FacebookPaging;
}

export interface FacebookInsightValue {
  value: number | Record<string, number>;
}

export interface FacebookInsight {
  name: string;
  period: string;
  values: FacebookInsightValue[];
  title?: string;
  description?: string;
  id?: string;
}

export interface FacebookInsightsResponse {
  data: FacebookInsight[];
  paging?: FacebookPaging;
}
