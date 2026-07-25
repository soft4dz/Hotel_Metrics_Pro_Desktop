export interface GuideArticle {
  slug: string;
  title: string;
  summary: string;
  filename: string;
  sectionId: string;
}

export interface GuideDetail extends GuideArticle {
  content: string;
}

export interface GuideSection {
  id: string;
  label: string;
  slugs: string[];
}
