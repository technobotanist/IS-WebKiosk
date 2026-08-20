export interface CollectionEntry {
  id: string;
  title: string;
  author: string;
  description: string;
  longDescription: string;
  destinationUrl: string;
  showQrCode: boolean;
  qrImageUrl: string;
  previewImageUrl: string;
}

export interface CollectionTheme {
  backgroundTop: string;
  backgroundMid: string;
  backgroundBottom: string;
  cloudOne: string;
  cloudTwo: string;
  hazeIntensity: number;
  launchButtonColor: string;
  galleryTitleScale: number;
  galleryIntroScale: number;
  cardTitleScale: number;
  cardBodyScale: number;
}

export interface CollectionDraft {
  id: string;
  title: string;
  subtitle: string;
  introText: string;
  launchButtonLabel: string;
  gallerySlug: string;
  theme: CollectionTheme;
  idleTimeoutSeconds: number;
  escapeHotkeys: string[];
  entries: CollectionEntry[];
}
