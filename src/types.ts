export interface CollectionEntry {
  id: string;
  title: string;
  author: string;
  description: string;
  destinationUrl: string;
  qrImageUrl: string;
}

export interface CollectionTheme {
  backgroundTop: string;
  backgroundMid: string;
  backgroundBottom: string;
  cloudOne: string;
  cloudTwo: string;
}

export interface CollectionDraft {
  id: string;
  title: string;
  subtitle: string;
  introText: string;
  gallerySlug: string;
  theme: CollectionTheme;
  idleTimeoutSeconds: number;
  escapeHotkeys: string[];
  entries: CollectionEntry[];
}
