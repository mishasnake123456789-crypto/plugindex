export type PluginTagMap = Record<string, string>;

export type PluginSummary = {
  slug: string;
  name: string;
  version: string;
  author: string;
  author_profile?: string;
  short_description: string;
  description?: string;
  rating: number;
  num_ratings: number;
  active_installs: number;
  downloaded?: number;
  tested: string;
  requires: string;
  requires_php: string;
  last_updated: string;
  added: string;
  homepage?: string;
  download_link?: string;
  tags?: PluginTagMap;
  icons?: {
    "1x"?: string;
    "2x"?: string;
    svg?: string;
    default?: string;
  };
  banners?: {
    low?: string;
    high?: string;
  };
};

export type PluginDetails = PluginSummary & {
  sections?: {
    description?: string;
    installation?: string;
    faq?: string;
    changelog?: string;
    screenshots?: string;
    reviews?: string;
  };
  contributors?: Record<string, string>;
  support_url?: string;
  donate_link?: string;
};

export type QueryInfo = {
  page: number;
  pages: number;
  results: number;
};

export type PluginQueryResult = {
  info: QueryInfo;
  plugins: PluginSummary[];
};

export type BrowseKind = "updated" | "new" | "popular" | "featured";
