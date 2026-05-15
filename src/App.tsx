import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Download,
  Eye,
  Keyboard,
  Link2,
  Palette,
  PencilLine,
  Plus,
  RefreshCcw,
  Settings2,
  Upload,
  X,
  type LucideIcon
} from 'lucide-react';
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ChangeEvent,
  type ReactNode
} from 'react';
import type { CollectionDraft, CollectionEntry, CollectionTheme } from './types';
import { useIdleReset } from './useIdleReset';

type LoadState = 'loading' | 'ready' | 'error';
type ViewMode = 'studio' | 'gallery';
type FeedbackTone = 'normal' | 'error';
type StudioSettingsTab = 'details' | 'backdrop' | 'kiosk';

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

const STORAGE_KEY = 'webkiosking-innovation-studio-v1';
const GALLERY_UNLOCK_HOLD_MS = 1800;
const GALLERY_UNLOCK_WINDOW_MS = 10 * 60 * 1000;
const modifierOrder = ['Control', 'Alt', 'Shift', 'Meta'] as const;
const modifierSet = new Set<string>(modifierOrder);
const publicBasePath = import.meta.env.BASE_URL;

const defaultTheme: CollectionTheme = {
  backgroundTop: '#fbfdff',
  backgroundMid: '#edf4fb',
  backgroundBottom: '#d3e2fc',
  cloudOne: '#c73523',
  cloudTwo: '#2ca5bd'
};

const studioHeroLabel = 'Innovation Studio Kiosks';

const studioHeroTitle = 'Innovation Studio Web Kiosk Gallery';

const studioHeroOverview =
  'Curate the gallery of public web destinations, QR codes, and return behavior that runs on the Chromebase machines in the Innovation Studio.';

const studioWorkflowNote =
  'Use this studio to build kiosk cards around a public URL, a QR destination, and short curator-facing copy so staff can verify what each machine will launch.';

const studioDeliveryNote =
  'Each collection stores card content, idle reset timing, return hotkeys, and backdrop settings together so the same gallery can be restored or exported to another workstation.';

const defaultGalleryIntro =
  'The Innovation Studio is an exhibition space for sharing student work with a broader audience, as either ongoing exhibits or one-time events. Our interactive projection tables can display digital media, including text, video, and audio, and can incorporate physical or interactive creations.';

const defaultNewEntryDescription =
  'Libraries News:\nShowing news stories tagged with "Innovation Studio"';

const fallbackCollectionSeed: CollectionDraft = {
  id: 'innovation-studio',
  title: 'Innovation Studio',
  subtitle: 'Exhibition Space',
  introText: defaultGalleryIntro,
  gallerySlug: 'innovation-studio',
  theme: defaultTheme,
  idleTimeoutSeconds: 120,
  escapeHotkeys: ['Escape', 'Control+Shift+H'],
  entries: [
    {
      id: 'entry-ongoing-exhibits',
      title: 'Ongoing Exhibits',
      author: 'Course Collaborations',
      description:
        'Flexible installations for student work that can combine digital media, physical material, and interactive elements for a broad public audience.',
      destinationUrl: 'https://example.com/innovation-studio/ongoing-exhibits',
      qrImageUrl: 'qr/innovation-studio-exhibits.svg',
      previewImageUrl: 'thumbnails/innovation-studio-exhibits.svg'
    },
    {
      id: 'entry-exhibiting-guide',
      title: 'Exhibiting Guide',
      author: 'Student Exhibit Support',
      description:
        'Reference material for shaping exhibit content, understanding audience, and planning how text, video, audio, and group work can live in the space.',
      destinationUrl: 'https://example.com/innovation-studio/exhibiting-guide',
      qrImageUrl: 'qr/innovation-studio-guide.svg',
      previewImageUrl: 'thumbnails/innovation-studio-guide.svg'
    },
    {
      id: 'entry-showcase-events',
      title: 'Showcase Events',
      author: 'Open Audience Presentations',
      description:
        'End-of-semester events can mix slide talks, analog table displays, interactive exhibits, screenings, and other formats depending on your goals.',
      destinationUrl: 'https://example.com/innovation-studio/showcase-events',
      qrImageUrl: 'qr/innovation-studio-events.svg',
      previewImageUrl: 'thumbnails/innovation-studio-events.svg'
    }
  ]
};

function resolvePublicPath(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return '';
  }

  if (
    /^(?:[a-z]+:)?\/\//i.test(trimmedValue) ||
    trimmedValue.startsWith('data:') ||
    trimmedValue.startsWith('blob:') ||
    trimmedValue.startsWith('#') ||
    trimmedValue.startsWith(publicBasePath)
  ) {
    return trimmedValue;
  }

  const normalizedPath = trimmedValue.replace(/^\.\//, '').replace(/^\//, '');
  return `${publicBasePath}${normalizedPath}`;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const nextValue = Number(value);

  if (!Number.isFinite(nextValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(nextValue)));
}

function normalizeHexColor(value: unknown, fallback: string) {
  const rawValue = readString(value, fallback).trim();
  const normalized = rawValue.startsWith('#') ? rawValue : `#${rawValue}`;

  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized.toLowerCase() : fallback;
}

function normalizeTheme(value: unknown): CollectionTheme {
  if (!isPlainObject(value)) {
    return defaultTheme;
  }

  return {
    backgroundTop: normalizeHexColor(value.backgroundTop, defaultTheme.backgroundTop),
    backgroundMid: normalizeHexColor(value.backgroundMid, defaultTheme.backgroundMid),
    backgroundBottom: normalizeHexColor(value.backgroundBottom, defaultTheme.backgroundBottom),
    cloudOne: normalizeHexColor(value.cloudOne, defaultTheme.cloudOne),
    cloudTwo: normalizeHexColor(value.cloudTwo, defaultTheme.cloudTwo)
  };
}

function hexToRgba(hexColor: string, alpha: number) {
  const cleanHex = hexColor.replace('#', '');
  const red = Number.parseInt(cleanHex.slice(0, 2), 16);
  const green = Number.parseInt(cleanHex.slice(2, 4), 16);
  const blue = Number.parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'collection';
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeKeyToken(token: string) {
  const trimmed = token.trim();

  if (!trimmed) {
    return '';
  }

  const lowered = trimmed.toLowerCase();
  const aliases: Record<string, string> = {
    ctrl: 'Control',
    control: 'Control',
    alt: 'Alt',
    option: 'Alt',
    shift: 'Shift',
    cmd: 'Meta',
    command: 'Meta',
    meta: 'Meta',
    esc: 'Escape',
    escape: 'Escape',
    space: 'Space',
    ' ': 'Space',
    enter: 'Enter',
    return: 'Enter',
    tab: 'Tab',
    backspace: 'Backspace',
    delete: 'Delete',
    home: 'Home',
    end: 'End',
    arrowup: 'ArrowUp',
    arrowdown: 'ArrowDown',
    arrowleft: 'ArrowLeft',
    arrowright: 'ArrowRight'
  };

  if (aliases[lowered]) {
    return aliases[lowered];
  }

  if (trimmed.length === 1) {
    return trimmed.toUpperCase();
  }

  return trimmed[0].toUpperCase() + trimmed.slice(1);
}

function normalizeHotkey(combo: string) {
  const pieces = combo
    .split('+')
    .map((piece) => normalizeKeyToken(piece))
    .filter(Boolean);

  if (pieces.length === 0) {
    return '';
  }

  const modifiers = modifierOrder.filter((modifier) => pieces.includes(modifier));
  const keys = pieces.filter((piece) => !modifierSet.has(piece));

  if (keys.length !== 1) {
    return '';
  }

  return [...modifiers, keys[0]].join('+');
}

function normalizeHotkeys(value: unknown) {
  const values = Array.isArray(value) ? value : [];
  const uniqueHotkeys = Array.from(
    new Set(
      values
        .map((entry) => normalizeHotkey(readString(entry)))
        .filter(Boolean)
    )
  );

  return uniqueHotkeys.length > 0 ? uniqueHotkeys : ['Escape'];
}

function eventToHotkey(event: KeyboardEvent) {
  const key = normalizeKeyToken(event.key);

  if (!key || modifierSet.has(key)) {
    return '';
  }

  const pieces: string[] = [];

  if (event.ctrlKey) {
    pieces.push('Control');
  }

  if (event.altKey) {
    pieces.push('Alt');
  }

  if (event.shiftKey) {
    pieces.push('Shift');
  }

  if (event.metaKey) {
    pieces.push('Meta');
  }

  pieces.push(key);
  return normalizeHotkey(pieces.join('+'));
}

function createBlankEntry(index: number, seed?: Partial<CollectionEntry>): CollectionEntry {
  return {
    id: seed?.id ?? createId('entry'),
    title: seed?.title ?? `Exhibit #${index}`,
    author: seed?.author ?? '',
    description: seed?.description ?? '',
    destinationUrl: seed?.destinationUrl ?? '',
    qrImageUrl: seed?.qrImageUrl ?? '',
    previewImageUrl: seed?.previewImageUrl ?? ''
  };
}

function createEntry(index: number, seed?: Partial<CollectionEntry>): CollectionEntry {
  return createBlankEntry(index, {
    title: `Exhibit #${index}`,
    author: 'Jane Doe',
    description: defaultNewEntryDescription,
    destinationUrl: 'https://go.ncsu.edu/innovation-studio-news',
    qrImageUrl: 'https://go.ncsu.edu/innovation-studio-news.qr',
    ...seed
  });
}

function normalizeEntry(value: unknown, index: number): CollectionEntry {
  if (!isPlainObject(value)) {
    return createEntry(index + 1);
  }

  return createBlankEntry(index + 1, {
    id: readString(value.id, createId('entry')),
    title: readString(value.title, `Exhibit #${index + 1}`),
    author: readString(value.author),
    description: readString(value.description),
    destinationUrl: readString(value.destinationUrl),
    qrImageUrl: readString(value.qrImageUrl),
    previewImageUrl: readString(value.previewImageUrl)
  });
}

function normalizeCollection(value: unknown): CollectionDraft {
  if (!isPlainObject(value)) {
    throw new Error('Collection data must be a single JSON object.');
  }

  const title = readString(value.title, 'New Collection');
  const entriesSource = Array.isArray(value.entries) ? value.entries : [];
  const entries =
    entriesSource.length > 0
      ? entriesSource.map((entry, index) => normalizeEntry(entry, index))
      : [createEntry(1)];

  return {
    id: readString(value.id, createId('collection')),
    title,
    subtitle: readString(value.subtitle, 'Exhibition Space'),
    introText: readString(value.introText, defaultGalleryIntro),
    gallerySlug: slugify(readString(value.gallerySlug) || title),
    theme: normalizeTheme(value.theme),
    idleTimeoutSeconds: clampNumber(value.idleTimeoutSeconds, 45, 1800, 120),
    escapeHotkeys: normalizeHotkeys(value.escapeHotkeys),
    entries
  };
}

function getRequestedViewMode(hash: string): ViewMode {
  return hash === '#studio' ? 'studio' : 'gallery';
}

function formatCountdown(secondsRemaining: number | null) {
  if (secondsRemaining === null) {
    return null;
  }

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = String(secondsRemaining % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function createThemeStyle(theme: CollectionTheme): CSSProperties {
  return {
    '--theme-background-top': theme.backgroundTop,
    '--theme-background-mid': theme.backgroundMid,
    '--theme-background-bottom': theme.backgroundBottom,
    '--theme-cloud-one-soft': hexToRgba(theme.cloudOne, 0.18),
    '--theme-cloud-two-soft': hexToRgba(theme.cloudTwo, 0.22),
    '--theme-halo-one': hexToRgba(theme.cloudOne, 0.24),
    '--theme-halo-two': hexToRgba(theme.cloudTwo, 0.28)
  } as CSSProperties;
}

function App() {
  const [status, setStatus] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [collection, setCollection] = useState<CollectionDraft | null>(null);
  const [seedCollection, setSeedCollection] = useState<CollectionDraft | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [galleryUnlockExpiresAt, setGalleryUnlockExpiresAt] = useState<number | null>(null);
  const [unlockSecondsRemaining, setUnlockSecondsRemaining] = useState<number | null>(null);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isCardEditorOpen, setIsCardEditorOpen] = useState(false);
  const [isUnlockGestureActive, setIsUnlockGestureActive] = useState(false);
  const [settingsTab, setSettingsTab] = useState<StudioSettingsTab>('details');
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const unlockHoldTimerRef = useRef<number | null>(null);

  const isStudioUnlocked = galleryUnlockExpiresAt !== null;
  const currentViewMode: ViewMode = isStudioUnlocked && viewMode === 'studio' ? 'studio' : 'gallery';

  useEffect(() => {
    let cancelled = false;

    async function hydrateCollection() {
      try {
        setStatus('loading');
        setErrorMessage('');

        let seed = normalizeCollection(fallbackCollectionSeed);

        try {
          const response = await fetch(resolvePublicPath('data/collection.json'));

          if (response.ok) {
            seed = normalizeCollection(await response.json());
          }
        } catch {
          setFeedback({
            tone: 'normal',
            message: 'Loaded embedded sample collection because the runtime JSON could not be fetched.'
          });
        }

        let initialCollection = seed;
        const storedValue = window.localStorage.getItem(STORAGE_KEY);

        if (storedValue) {
          try {
            initialCollection = normalizeCollection(JSON.parse(storedValue));
          } catch {
            setFeedback({
              tone: 'error',
              message: 'Saved browser data was invalid and has been replaced with the sample collection.'
            });
          }
        }

        if (cancelled) {
          return;
        }

        setSeedCollection(seed);
        setCollection(initialCollection);
        setSelectedEntryId(initialCollection.entries[0]?.id ?? null);
        setStatus('ready');
      } catch (error) {
        if (cancelled) {
          return;
        }

        setStatus('error');
        setErrorMessage(
          error instanceof Error ? error.message : 'The collection studio could not be loaded.'
        );
      }
    }

    void hydrateCollection();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const requestedViewMode = getRequestedViewMode(window.location.hash);

      if (!isStudioUnlocked && requestedViewMode === 'studio') {
        const galleryUrl = `${window.location.pathname}${window.location.search}#gallery`;
        window.history.replaceState(null, '', galleryUrl);

        startTransition(() => {
          setViewMode('gallery');
          setIsCollectionModalOpen(false);
          setIsCardEditorOpen(false);
          setIsRecordingHotkey(false);
        });

        return;
      }

      startTransition(() => {
        setViewMode(requestedViewMode);

        if (requestedViewMode === 'gallery') {
          setIsCollectionModalOpen(false);
          setIsCardEditorOpen(false);
          setIsRecordingHotkey(false);
        }
      });
    };

    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isStudioUnlocked]);

  useEffect(() => {
    if (unlockHoldTimerRef.current === null) {
      return;
    }

    return () => {
      if (unlockHoldTimerRef.current !== null) {
        window.clearTimeout(unlockHoldTimerRef.current);
        unlockHoldTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (galleryUnlockExpiresAt === null) {
      setUnlockSecondsRemaining(null);
      return;
    }

    const syncUnlockCountdown = () => {
      const remainingMilliseconds = galleryUnlockExpiresAt - Date.now();

      if (remainingMilliseconds <= 0) {
        setGalleryUnlockExpiresAt(null);
        setUnlockSecondsRemaining(null);
        return;
      }

      setUnlockSecondsRemaining(Math.ceil(remainingMilliseconds / 1000));
    };

    syncUnlockCountdown();
    const intervalId = window.setInterval(syncUnlockCountdown, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [galleryUnlockExpiresAt]);

  useEffect(() => {
    if (galleryUnlockExpiresAt !== null) {
      return;
    }

    const galleryUrl = `${window.location.pathname}${window.location.search}#gallery`;

    if (window.location.hash !== '#gallery') {
      window.history.replaceState(null, '', galleryUrl);
    }

    startTransition(() => {
      setViewMode('gallery');
      setIsCollectionModalOpen(false);
      setIsCardEditorOpen(false);
      setIsRecordingHotkey(false);
    });
  }, [galleryUnlockExpiresAt]);

  useEffect(() => {
    if (status !== 'ready' || !collection) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(collection, null, 2));
  }, [collection, status]);

  useEffect(() => {
    if (!collection) {
      return;
    }

    if (!collection.entries.some((entry) => entry.id === selectedEntryId)) {
      setSelectedEntryId(collection.entries[0]?.id ?? null);
    }

    if (activeEntryId && !collection.entries.some((entry) => entry.id === activeEntryId)) {
      setActiveEntryId(null);
    }
  }, [activeEntryId, collection, selectedEntryId]);

  useEffect(() => {
    if (!selectedEntryId) {
      setIsCardEditorOpen(false);
    }
  }, [selectedEntryId]);

  useEffect(() => {
    if (!isRecordingHotkey || !collection) {
      return;
    }

    const handleKeyCapture = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const combo = eventToHotkey(event);

      if (!combo) {
        return;
      }

      if (collection.escapeHotkeys.includes(combo)) {
        setFeedback({ tone: 'normal', message: `${combo} is already assigned.` });
        setIsRecordingHotkey(false);
        return;
      }

      setCollection({
        ...collection,
        escapeHotkeys: [...collection.escapeHotkeys, combo]
      });
      setFeedback({ tone: 'normal', message: `Added ${combo} as a gallery return hotkey.` });
      setIsRecordingHotkey(false);
    };

    window.addEventListener('keydown', handleKeyCapture, true);

    return () => {
      window.removeEventListener('keydown', handleKeyCapture, true);
    };
  }, [collection, isRecordingHotkey]);

  useEffect(() => {
    if (currentViewMode !== 'gallery' || !collection) {
      return;
    }

    const handleGalleryHotkey = (event: KeyboardEvent) => {
      const combo = eventToHotkey(event);

      if (!combo || !collection.escapeHotkeys.includes(combo)) {
        return;
      }

      event.preventDefault();
      setActiveEntryId(null);
      setViewerKey((currentValue) => currentValue + 1);
    };

    window.addEventListener('keydown', handleGalleryHotkey);

    return () => {
      window.removeEventListener('keydown', handleGalleryHotkey);
    };
  }, [collection, currentViewMode]);

  useEffect(() => {
    if (currentViewMode !== 'studio' || isRecordingHotkey || !isCollectionModalOpen) {
      return;
    }

    const handleStudioEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      setIsCollectionModalOpen(false);
      setIsRecordingHotkey(false);
    };

    window.addEventListener('keydown', handleStudioEscape);

    return () => {
      window.removeEventListener('keydown', handleStudioEscape);
    };
  }, [currentViewMode, isCollectionModalOpen, isRecordingHotkey]);

  const selectedEntry =
    collection?.entries.find((entry) => entry.id === selectedEntryId) ?? collection?.entries[0] ?? null;
  const activeEntry = collection?.entries.find((entry) => entry.id === activeEntryId) ?? null;
  const unlockCountdownLabel = formatCountdown(unlockSecondsRemaining);

  const idleCountdown = useIdleReset({
    enabled: currentViewMode === 'gallery' && activeEntry !== null && collection !== null,
    timeoutSeconds: collection?.idleTimeoutSeconds ?? 120,
    onTimeout: () => {
      setActiveEntryId(null);
      setViewerKey((currentValue) => currentValue + 1);
    }
  });

  function cancelUnlockGesture() {
    if (unlockHoldTimerRef.current !== null) {
      window.clearTimeout(unlockHoldTimerRef.current);
      unlockHoldTimerRef.current = null;
    }

    setIsUnlockGestureActive(false);
  }

  function unlockStudioAccess() {
    cancelUnlockGesture();

    const unlockExpiry = Date.now() + GALLERY_UNLOCK_WINDOW_MS;
    const studioUrl = `${window.location.pathname}${window.location.search}#studio`;

    window.history.replaceState(null, '', studioUrl);
    setGalleryUnlockExpiresAt(unlockExpiry);
    setFeedback({ tone: 'normal', message: `Editor unlocked for ${formatCountdown(GALLERY_UNLOCK_WINDOW_MS / 1000)}.` });

    startTransition(() => {
      setViewMode('studio');
      setActiveEntryId(null);
    });
  }

  function beginUnlockGesture() {
    if (isStudioUnlocked) {
      return;
    }

    cancelUnlockGesture();
    setIsUnlockGestureActive(true);
    unlockHoldTimerRef.current = window.setTimeout(unlockStudioAccess, GALLERY_UNLOCK_HOLD_MS);
  }

  function relockStudioAccess() {
    cancelUnlockGesture();
    setGalleryUnlockExpiresAt(null);
  }

  function openCuratorGuide() {
    const guideUrl = new URL('curator-guide.html', window.location.href).toString();
    window.open(guideUrl, '_blank', 'noopener,noreferrer');
  }

  function navigateTo(nextMode: ViewMode) {
    const allowedViewMode = !isStudioUnlocked && nextMode === 'studio' ? 'gallery' : nextMode;
    const nextHash = allowedViewMode === 'gallery' ? 'gallery' : 'studio';

    if (window.location.hash !== `#${nextHash}`) {
      window.location.hash = nextHash;
    }

    startTransition(() => {
      setViewMode(allowedViewMode);
      setIsCollectionModalOpen(false);
      setIsCardEditorOpen(false);
      setIsRecordingHotkey(false);

      if (allowedViewMode === 'studio') {
        setActiveEntryId(null);
      }
    });
  }

  function openCollectionSettings(nextTab: StudioSettingsTab = 'details') {
    setSettingsTab(nextTab);
    setIsCollectionModalOpen(true);
  }

  function openSelectedEntryEditor() {
    if (!selectedEntry) {
      return;
    }

    setIsCardEditorOpen(true);
  }

  function updateCollectionField<K extends keyof CollectionDraft>(field: K, value: CollectionDraft[K]) {
    setCollection((currentCollection) => {
      if (!currentCollection) {
        return currentCollection;
      }

      return {
        ...currentCollection,
        [field]: value
      };
    });
  }

  function updateEntryField<K extends keyof CollectionEntry>(
    entryId: string,
    field: K,
    value: CollectionEntry[K]
  ) {
    setCollection((currentCollection) => {
      if (!currentCollection) {
        return currentCollection;
      }

      return {
        ...currentCollection,
        entries: currentCollection.entries.map((entry) =>
          entry.id === entryId
            ? {
                ...entry,
                [field]: value
              }
            : entry
        )
      };
    });
  }

  function addEntry() {
    if (!collection) {
      return;
    }

    const nextEntry = createEntry(collection.entries.length + 1);
    updateCollectionField('entries', [...collection.entries, nextEntry]);
    setSelectedEntryId(nextEntry.id);
    setIsCardEditorOpen(true);
    setFeedback({ tone: 'normal', message: `Added ${nextEntry.title}.` });
  }

  function removeEntry(entryId: string) {
    if (!collection) {
      return;
    }

    const remainingEntries = collection.entries.filter((entry) => entry.id !== entryId);
    const nextEntries = remainingEntries.length > 0 ? remainingEntries : [createEntry(1)];
    updateCollectionField('entries', nextEntries);
    setSelectedEntryId(nextEntries[0]?.id ?? null);
    setIsCardEditorOpen(false);

    if (activeEntryId === entryId) {
      setActiveEntryId(null);
      setViewerKey((currentValue) => currentValue + 1);
    }

    setFeedback({ tone: 'normal', message: 'Removed kiosk card from this collection.' });
  }

  function removeHotkey(hotkey: string) {
    if (!collection) {
      return;
    }

    const nextHotkeys = collection.escapeHotkeys.filter((entry) => entry !== hotkey);
    updateCollectionField('escapeHotkeys', nextHotkeys.length > 0 ? nextHotkeys : ['Escape']);
  }

  function exportCollection() {
    if (!collection) {
      return;
    }

    const payload = JSON.stringify(collection, null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `${collection.gallerySlug || 'collection'}.json`;
    anchor.click();
    URL.revokeObjectURL(downloadUrl);
    setFeedback({ tone: 'normal', message: `Exported ${collection.title}.` });
  }

  function importCollectionFile(event: ChangeEvent<HTMLInputElement>) {
    const target = event.target;
    const file = target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      try {
        const nextCollection = normalizeCollection(JSON.parse(String(reader.result)));
        setCollection(nextCollection);
        setSelectedEntryId(nextCollection.entries[0]?.id ?? null);
        setActiveEntryId(null);
        setIsCardEditorOpen(false);
        setIsCollectionModalOpen(false);
        setIsRecordingHotkey(false);
        setViewerKey((currentValue) => currentValue + 1);
        setFeedback({ tone: 'normal', message: `Imported ${nextCollection.title}.` });
      } catch (error) {
        setFeedback({
          tone: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'The selected file could not be parsed as a collection JSON export.'
        });
      }

      target.value = '';
    };

    reader.onerror = () => {
      setFeedback({ tone: 'error', message: 'The selected file could not be read.' });
      target.value = '';
    };

    reader.readAsText(file);
  }

  function resetToSample() {
    const nextCollection = normalizeCollection(seedCollection ?? fallbackCollectionSeed);
    setCollection(nextCollection);
    setSelectedEntryId(nextCollection.entries[0]?.id ?? null);
    setActiveEntryId(null);
    setIsCardEditorOpen(false);
    setIsCollectionModalOpen(false);
    setIsRecordingHotkey(false);
    setViewerKey((currentValue) => currentValue + 1);
    setFeedback({ tone: 'normal', message: 'Restored the sample collection.' });
  }

  function openViewer(entryId: string) {
    navigateTo('gallery');
    setActiveEntryId(entryId);
    setViewerKey((currentValue) => currentValue + 1);
  }

  function previewSelectedEntry() {
    if (!selectedEntry) {
      return;
    }

    openViewer(selectedEntry.id);
  }

  if (status === 'loading') {
    return (
      <div className="application-shell">
        <div className="background-halo halo-one" />
        <div className="background-halo halo-two" />
        <section className="glass-panel loading-panel">
          <p className="micro-label">{studioHeroLabel}</p>
          <h1>Preparing the web kiosk gallery editor.</h1>
          <p>Loading the current card collection, public destinations, and saved return hotkeys.</p>
        </section>
      </div>
    );
  }

  if (status === 'error' || !collection) {
    return (
      <div className="application-shell">
        <div className="background-halo halo-one" />
        <div className="background-halo halo-two" />
        <section className="glass-panel loading-panel error-state">
          <p className="micro-label">Load Error</p>
          <h1>The web kiosk gallery editor could not start.</h1>
          <p>{errorMessage}</p>
          <button className="pill-button pill-button-primary" type="button" onClick={() => window.location.reload()}>
            Reload Editor
          </button>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`application-shell ${currentViewMode === 'gallery' ? 'is-gallery' : 'is-studio'}`}
      style={createThemeStyle(collection.theme)}
    >
      <div className="background-halo halo-one" />
      <div className="background-halo halo-two" />

      {currentViewMode === 'studio' ? (
        <header className="glass-panel studio-hero">
          <div className="studio-hero-copy">
            <div className="brand-block">
              <p className="micro-label">{studioHeroLabel}</p>
              <h1>{studioHeroTitle}</h1>
              <p>{studioHeroOverview}</p>
            </div>

            <div className="hero-action-row">
              <ActionButton icon={ArrowUpRight} tone="primary" onClick={() => navigateTo('gallery')}>
                Open Kiosk Gallery
              </ActionButton>
              <ActionButton icon={BookOpen} tone="soft" onClick={openCuratorGuide}>
                Curator Guide
              </ActionButton>
              <ActionButton icon={Settings2} tone="soft" onClick={() => openCollectionSettings('details')}>
                Collection Settings
              </ActionButton>
              <ActionButton
                icon={PencilLine}
                tone="soft"
                onClick={openSelectedEntryEditor}
                disabled={!selectedEntry}
              >
                Edit Selected Card
              </ActionButton>
              <ActionButton icon={Plus} tone="soft" onClick={addEntry}>
                Add Card
              </ActionButton>
            </div>

            <div className="hero-utility-row">
              {unlockCountdownLabel ? <div className="status-pill">Editor unlock window {unlockCountdownLabel}</div> : null}
              <ActionButton icon={X} tone="quiet" onClick={relockStudioAccess}>
                Relock
              </ActionButton>
              <ActionButton icon={Download} tone="quiet" onClick={exportCollection}>
                Export
              </ActionButton>
              <ActionButton icon={Upload} tone="quiet" onClick={() => importInputRef.current?.click()}>
                Import
              </ActionButton>
              <ActionButton icon={RefreshCcw} tone="quiet" onClick={resetToSample}>
                Restore Sample
              </ActionButton>

              <div className={`status-pill ${feedback?.tone === 'error' ? 'status-pill-error' : ''}`}>
                {feedback?.message ?? `${collection.entries.length} cards ready for ${collection.title}`}
              </div>
            </div>
          </div>

          <div className="studio-hero-aside">
            <CollectionProfileCard
              collection={collection}
              onOpenDetails={() => openCollectionSettings('details')}
              onOpenBackdrop={() => openCollectionSettings('backdrop')}
              onOpenKiosk={() => openCollectionSettings('kiosk')}
            />
          </div>
        </header>
      ) : null}

      <main className={currentViewMode === 'studio' ? 'studio-layout' : 'gallery-layout'}>
        {currentViewMode === 'studio' ? (
          <>
            <section className="glass-panel entry-list-panel">
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Cards</p>
                  <h2>Gallery cards</h2>
                  <p className="panel-copy">Select a card to edit its details, remove it from the gallery, or launch it in the kiosk viewer.</p>
                </div>
                <div className="toolbar-actions compact-actions">
                  <ActionButton icon={Plus} tone="primary" onClick={addEntry}>
                    Add Card
                  </ActionButton>
                  <ActionButton
                    icon={PencilLine}
                    tone="soft"
                    onClick={openSelectedEntryEditor}
                    disabled={!selectedEntry}
                  >
                    Edit
                  </ActionButton>
                  <ActionButton
                    icon={Eye}
                    tone="soft"
                    onClick={previewSelectedEntry}
                    disabled={!selectedEntry || !selectedEntry.destinationUrl}
                  >
                    Preview In Kiosk
                  </ActionButton>
                </div>
              </div>

              <div className="entry-list">
                {collection.entries.map((entry, index) => (
                  <EntryListItem
                    key={entry.id}
                    entry={entry}
                    index={index + 1}
                    isActive={entry.id === selectedEntry?.id}
                    onSelect={() => setSelectedEntryId(entry.id)}
                    onRemove={() => removeEntry(entry.id)}
                  />
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="gallery-heading">
              <div className="gallery-heading-bar">
                <div className="gallery-heading-copy">
                  <button
                    className={`hidden-unlock-button ${isUnlockGestureActive ? 'is-primed' : ''}`}
                    type="button"
                    aria-label="Hold to unlock the editor"
                    onPointerDown={beginUnlockGesture}
                    onPointerUp={cancelUnlockGesture}
                    onPointerLeave={cancelUnlockGesture}
                    onPointerCancel={cancelUnlockGesture}
                    onContextMenu={(event) => event.preventDefault()}
                  >
                    <span className="micro-label">{collection.subtitle}</span>
                  </button>
                  <h1>{collection.title}</h1>
                  <p>{collection.introText}</p>
                </div>

                {isStudioUnlocked ? (
                  <div className="gallery-heading-actions">
                    {unlockCountdownLabel ? <div className="status-pill">Editor unlock window {unlockCountdownLabel}</div> : null}
                    <div className="toolbar-actions compact-actions">
                      <ActionButton icon={PencilLine} tone="soft" onClick={() => navigateTo('studio')}>
                        Open Editor
                      </ActionButton>
                      <ActionButton icon={X} tone="quiet" onClick={relockStudioAccess}>
                        Relock
                      </ActionButton>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="gallery-grid">
              {collection.entries.map((entry) => (
                <GalleryCard
                  key={entry.id}
                  entry={entry}
                  subtitle={collection.subtitle}
                  onLaunch={() => openViewer(entry.id)}
                />
              ))}
            </section>
          </>
        )}
      </main>

      {currentViewMode === 'gallery' && activeEntry ? (
        <div className="viewer-overlay">
          <section className="glass-panel viewer-shell">
            <header className="viewer-toolbar">
              <div>
                <p className="micro-label">Now showing</p>
                <h3>{activeEntry.title}</h3>
                <p>{activeEntry.author || 'Author not set'}</p>
              </div>

              <div className="toolbar-actions compact-actions">
                <button className="pill-button pill-button-soft" type="button" onClick={() => setActiveEntryId(null)}>
                  Back To Gallery
                </button>
                <button className="pill-button pill-button-soft" type="button" onClick={() => setViewerKey((currentValue) => currentValue + 1)}>
                  Reload
                </button>
                <div className="status-pill">
                  {idleCountdown !== null ? `Idle reset ${formatCountdown(idleCountdown)}` : 'Return controls active'}
                </div>
              </div>
            </header>

            <div className="viewer-body">
              <div className="viewer-frame">
                <iframe
                  key={`${activeEntry.id}-${viewerKey}`}
                  title={activeEntry.title}
                  src={activeEntry.destinationUrl || 'about:blank'}
                  loading="eager"
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>

              <aside className="viewer-sidepanel">
                <QrPreview src={activeEntry.qrImageUrl} alt={`${activeEntry.title} QR code`} />
                <section className="viewer-copy">
                  <p className="micro-label">Author</p>
                  <h4>{activeEntry.author || 'Author name'}</h4>
                  <p>{activeEntry.description || 'Add short descriptive copy in the editor.'}</p>
                </section>

                <section className="viewer-copy">
                  <p className="micro-label">Destination URL</p>
                  <div className="url-chip">{activeEntry.destinationUrl || 'No URL set'}</div>
                </section>
              </aside>
            </div>
          </section>
        </div>
      ) : null}

      <input
        ref={importInputRef}
        hidden
        type="file"
        accept="application/json"
        onChange={importCollectionFile}
      />

      {currentViewMode === 'studio' && isCollectionModalOpen ? (
        <StudioModal
          kicker="Collection Settings"
          title={collection.title}
          description="Keep the main workbench focused on card review while editing gallery details, Chromebase behavior, and backdrop treatment here."
          onClose={() => {
            setIsCollectionModalOpen(false);
            setIsRecordingHotkey(false);
          }}
        >
          <div className="settings-tabs" role="tablist" aria-label="Collection settings sections">
            <SettingsTabButton
              icon={Settings2}
              label="Details"
              isActive={settingsTab === 'details'}
              onClick={() => setSettingsTab('details')}
            />
            <SettingsTabButton
              icon={Palette}
              label="Backdrop"
              isActive={settingsTab === 'backdrop'}
              onClick={() => setSettingsTab('backdrop')}
            />
            <SettingsTabButton
              icon={Keyboard}
              label="Kiosk"
              isActive={settingsTab === 'kiosk'}
              onClick={() => setSettingsTab('kiosk')}
            />
          </div>

          {settingsTab === 'details' ? (
            <div className="modal-stack">
              <div className="field-grid two-column-grid">
                <label className="field">
                  <span>Collection title</span>
                  <input
                    value={collection.title}
                    onChange={(event) => updateCollectionField('title', event.target.value)}
                    placeholder="Collection title"
                  />
                </label>

                <label className="field">
                  <span>Subtitle</span>
                  <input
                    value={collection.subtitle}
                    onChange={(event) => updateCollectionField('subtitle', event.target.value)}
                    placeholder="Subtitle"
                  />
                </label>

                <label className="field">
                  <span>Gallery slug</span>
                  <input
                    value={collection.gallerySlug}
                    onChange={(event) => updateCollectionField('gallerySlug', slugify(event.target.value))}
                    placeholder="Gallery slug"
                  />
                </label>

                <div className="glass-subpanel studio-inline-card">
                  <p className="micro-label">Collection File</p>
                  <div className="collection-file-meta">
                    <span>{collection.entries.length} cards</span>
                    <span>{collection.escapeHotkeys.length} return keys</span>
                  </div>
                </div>

                <label className="field field-span-full">
                  <span>Intro text</span>
                  <textarea
                    value={collection.introText}
                    onChange={(event) => updateCollectionField('introText', event.target.value)}
                    placeholder="Intro text"
                  />
                </label>
              </div>

              <section className="glass-subpanel space-brief">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="micro-label">Curator Workflow</p>
                    <h3>What this studio configures</h3>
                  </div>
                  <span className="glass-badge">Chromebase ready</span>
                </div>

                <div className="space-copy">
                  <p>{studioWorkflowNote}</p>
                  <p>{studioDeliveryNote}</p>
                </div>
              </section>
            </div>
          ) : null}

          {settingsTab === 'backdrop' ? (
            <section className="glass-subpanel theme-panel">
              <div className="panel-heading compact-heading">
                <div>
                  <p className="micro-label">Backdrop Colors</p>
                  <h3>Cloud gradient</h3>
                </div>
                <span className="glass-badge">Exported with collection</span>
              </div>

              <p className="panel-copy">
                These colors drive the background wash and the two cloud-like haze layers behind the exhibition.
              </p>

              <div className="theme-grid">
                <ColorField
                  label="Sky top"
                  value={collection.theme.backgroundTop}
                  onChange={(nextValue) =>
                    updateCollectionField('theme', {
                      ...collection.theme,
                      backgroundTop: nextValue
                    })
                  }
                />
                <ColorField
                  label="Sky middle"
                  value={collection.theme.backgroundMid}
                  onChange={(nextValue) =>
                    updateCollectionField('theme', {
                      ...collection.theme,
                      backgroundMid: nextValue
                    })
                  }
                />
                <ColorField
                  label="Sky bottom"
                  value={collection.theme.backgroundBottom}
                  onChange={(nextValue) =>
                    updateCollectionField('theme', {
                      ...collection.theme,
                      backgroundBottom: nextValue
                    })
                  }
                />
                <ColorField
                  label="Cloud one"
                  value={collection.theme.cloudOne}
                  onChange={(nextValue) =>
                    updateCollectionField('theme', {
                      ...collection.theme,
                      cloudOne: nextValue
                    })
                  }
                />
                <ColorField
                  label="Cloud two"
                  value={collection.theme.cloudTwo}
                  onChange={(nextValue) =>
                    updateCollectionField('theme', {
                      ...collection.theme,
                      cloudTwo: nextValue
                    })
                  }
                />
              </div>
            </section>
          ) : null}

          {settingsTab === 'kiosk' ? (
            <div className="modal-stack">
              <section className="glass-subpanel kiosk-settings-panel">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="micro-label">Kiosk Timing</p>
                    <h3>Idle reset</h3>
                  </div>
                  <span className="glass-badge">Visitor-safe</span>
                </div>

                <div className="field-grid">
                  <label className="field kiosk-number-field">
                    <span>Idle reset seconds</span>
                    <input
                      type="number"
                      min={45}
                      max={1800}
                      value={collection.idleTimeoutSeconds}
                      onChange={(event) =>
                        updateCollectionField(
                          'idleTimeoutSeconds',
                          clampNumber(event.target.value, 45, 1800, collection.idleTimeoutSeconds)
                        )
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="glass-subpanel">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="micro-label">Escape Keys</p>
                    <h3>Return hotkeys</h3>
                  </div>
                  <ActionButton
                    icon={Keyboard}
                    tone={isRecordingHotkey ? 'primary' : 'soft'}
                    onClick={() => {
                      const nextRecordingState = !isRecordingHotkey;
                      setIsRecordingHotkey(nextRecordingState);
                      setFeedback({
                        tone: 'normal',
                        message: nextRecordingState
                          ? 'Press the key combination you want to use to return to gallery home.'
                          : 'Hotkey recording cancelled.'
                      });
                    }}
                  >
                    {isRecordingHotkey ? 'Recording...' : 'Record Return Key'}
                  </ActionButton>
                </div>

                <p className="panel-copy">
                  Press Record Return Key, then press the key combination you want to use to return the kiosk from an open page back to the exhibition home.
                </p>

                <div className="chip-list">
                  {collection.escapeHotkeys.map((hotkey) => (
                    <span key={hotkey} className="hotkey-chip">
                      {hotkey}
                      <button type="button" aria-label={`Remove ${hotkey}`} onClick={() => removeHotkey(hotkey)}>
                        x
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            </div>
          ) : null}
        </StudioModal>
      ) : null}

      {currentViewMode === 'studio' && isCardEditorOpen && selectedEntry ? (
        <StudioModal
          kicker="Gallery Card Editor"
          title={selectedEntry.title || 'Untitled page'}
          description="Edit the selected kiosk card in a focused form. Changes save automatically in this browser until you export or replace the collection."
          onClose={() => setIsCardEditorOpen(false)}
          closeOnOverlay={false}
        >
          <div className="modal-stack">
            <div className="panel-heading compact-heading modal-heading-bar">
              <div>
                <p className="micro-label">Selected Card</p>
                <h3>{selectedEntry.author || 'Jane Doe'}</h3>
              </div>
              <span className="glass-badge">Autosaves in browser</span>
            </div>

            <div className="field-grid two-column-grid">
              <label className="field">
                <span>Card title</span>
                <input
                  value={selectedEntry.title}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'title', event.target.value)}
                  placeholder="Card title"
                />
              </label>

              <label className="field">
                <span>Author name</span>
                <input
                  value={selectedEntry.author}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'author', event.target.value)}
                  placeholder="Author name"
                />
              </label>

              <label className="field field-span-full">
                <span>Destination public URL</span>
                <input
                  value={selectedEntry.destinationUrl}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'destinationUrl', event.target.value)}
                  placeholder="Destination public URL"
                />
              </label>

              <label className="field field-span-full">
                <span>QR image URL</span>
                <input
                  value={selectedEntry.qrImageUrl}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'qrImageUrl', event.target.value)}
                  placeholder="QR image URL"
                />
              </label>

              <label className="field field-span-full">
                <span>Preview image URL</span>
                <input
                  value={readString(selectedEntry.previewImageUrl)}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'previewImageUrl', event.target.value)}
                  placeholder="Preview image URL"
                />
              </label>

              <label className="field field-span-full">
                <span>Short description</span>
                <textarea
                  value={selectedEntry.description}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'description', event.target.value)}
                  placeholder="Short description"
                />
              </label>
            </div>

            <div className="modal-action-row">
              <button
                className="pill-button pill-button-soft"
                type="button"
                onClick={previewSelectedEntry}
                disabled={!selectedEntry.destinationUrl}
              >
                Preview In Kiosk
              </button>
              <button className="pill-button pill-button-primary" type="button" onClick={() => setIsCardEditorOpen(false)}>
                Done Editing
              </button>
            </div>
          </div>
        </StudioModal>
      ) : null}
    </div>
  );
}

interface EntryListItemProps {
  entry: CollectionEntry;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function EntryListItem({ entry, index, isActive, onSelect, onRemove }: EntryListItemProps) {
  return (
    <article className={`entry-list-item ${isActive ? 'is-active' : ''}`}>
      <button className="entry-select" type="button" onClick={onSelect}>
        <span className="entry-index">{String(index).padStart(2, '0')}</span>
        <div className="entry-select-copy">
          <h3>{entry.title || 'Untitled page'}</h3>
          <p>{entry.author || 'Author name'}</p>
          <div className="entry-list-footer">
            <div className="entry-list-meta">
              <span className="entry-meta-pill">{entry.destinationUrl.trim() ? 'Launch ready' : 'Needs URL'}</span>
              <span className="entry-meta-pill">{entry.qrImageUrl.trim() ? 'QR linked' : 'QR pending'}</span>
              <span className="entry-meta-pill">{readString(entry.previewImageUrl).trim() ? 'Preview image' : 'No image'}</span>
            </div>
            <span className="entry-action-cue">{isActive ? 'Selected for editing' : 'Click to edit'}</span>
          </div>
        </div>
      </button>

      <button className="entry-remove" type="button" onClick={onRemove} aria-label={`Remove ${entry.title}`}>
        Remove
      </button>
    </article>
  );
}

interface GalleryCardProps {
  entry: CollectionEntry;
  subtitle: string;
  onLaunch: () => void;
}

interface GalleryCardContentProps {
  entry: CollectionEntry;
  subtitle: string;
}

function GalleryCardContent({ entry, subtitle }: GalleryCardContentProps) {
  return (
    <>
      <GalleryCardPreviewImage src={readString(entry.previewImageUrl)} alt={`${entry.title} preview image`} />

      <div className="gallery-card-copy">
        <p className="author-label">{entry.author || subtitle}</p>
        <h3>{entry.title || 'Untitled page'}</h3>
        <p>{entry.description || 'Add a short description in the editor to populate this card.'}</p>
      </div>

      <div className="gallery-card-footer">
        <span className="glass-badge">Launch page</span>
        <div className="gallery-card-qr">
          <QrPreview src={entry.qrImageUrl} alt={`${entry.title} QR code`} compact />
        </div>
      </div>
    </>
  );
}

interface GalleryCardPreviewImageProps {
  src: string;
  alt: string;
}

function GalleryCardPreviewImage({ src, alt }: GalleryCardPreviewImageProps) {
  const [isBroken, setIsBroken] = useState(false);
  const resolvedSrc = resolvePublicPath(src);

  useEffect(() => {
    setIsBroken(false);
  }, [resolvedSrc]);

  if (!resolvedSrc) {
    return null;
  }

  if (isBroken) {
    return <div className="gallery-card-media-placeholder">Preview image unavailable</div>;
  }

  return (
    <div className="gallery-card-media">
      <img src={resolvedSrc} alt={alt} onError={() => setIsBroken(true)} />
    </div>
  );
}

function GalleryCard({ entry, subtitle, onLaunch }: GalleryCardProps) {
  return (
    <button
      className="gallery-card"
      type="button"
      onClick={onLaunch}
      disabled={!entry.destinationUrl.trim()}
    >
      <GalleryCardContent entry={entry} subtitle={subtitle} />
    </button>
  );
}

interface QrPreviewProps {
  src: string;
  alt: string;
  compact?: boolean;
}

function QrPreview({ src, alt, compact = false }: QrPreviewProps) {
  const [isBroken, setIsBroken] = useState(false);
  const resolvedSrc = resolvePublicPath(src);

  useEffect(() => {
    setIsBroken(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || isBroken) {
    return <div className={`qr-placeholder ${compact ? 'compact-qr' : ''}`}>QR image</div>;
  }

  return (
    <div className={`qr-frame ${compact ? 'compact-qr' : ''}`}>
      <img src={resolvedSrc} alt={alt} onError={() => setIsBroken(true)} />
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <div className="color-input-row">
        <input
          className="color-swatch"
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={label}
        />
        <span className="color-value">{value}</span>
      </div>
    </label>
  );
}

interface ActionButtonProps {
  icon: LucideIcon;
  children: string;
  tone?: 'primary' | 'soft' | 'quiet';
  disabled?: boolean;
  onClick: () => void;
}

function ActionButton({ icon: Icon, children, tone = 'soft', disabled = false, onClick }: ActionButtonProps) {
  const className =
    tone === 'primary'
      ? 'pill-button pill-button-primary action-button'
      : tone === 'quiet'
        ? 'pill-button pill-button-quiet action-button'
        : 'pill-button pill-button-soft action-button';

  return (
    <button className={className} type="button" onClick={onClick} disabled={disabled}>
      <Icon className="button-icon" size={16} strokeWidth={2} />
      <span>{children}</span>
    </button>
  );
}

interface SettingsTabButtonProps {
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function SettingsTabButton({ icon: Icon, label, isActive, onClick }: SettingsTabButtonProps) {
  return (
    <button
      className={`settings-tab-button ${isActive ? 'is-active' : ''}`}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
    >
      <Icon className="button-icon" size={16} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

interface CollectionProfileCardProps {
  collection: CollectionDraft;
  onOpenDetails: () => void;
  onOpenBackdrop: () => void;
  onOpenKiosk: () => void;
}

function CollectionProfileCard({
  collection,
  onOpenDetails,
  onOpenBackdrop,
  onOpenKiosk
}: CollectionProfileCardProps) {
  return (
    <section className="glass-subpanel collection-profile-card">
      <div className="profile-heading">
        <div>
          <p className="micro-label">Collection Editor</p>
          <h3>Current Collection</h3>
        </div>
        <span className="glass-badge">{collection.gallerySlug}</span>
      </div>

      <section className="profile-editor-summary">
        <div className="profile-editor-copy">
          <p className="micro-label">Editing Now</p>
          <h4>Gallery Header</h4>
        </div>

        <div className="profile-editor-fields">
          <div className="profile-editor-field">
            <span>Gallery title</span>
            <strong>{collection.title}</strong>
          </div>
          <div className="profile-editor-field">
            <span>Gallery subtitle</span>
            <strong>{collection.subtitle}</strong>
          </div>
          <div className="profile-editor-field profile-editor-field-full">
            <span>Intro text</span>
            <p>{collection.introText}</p>
          </div>
        </div>
      </section>

      <div className="profile-metric-grid">
        <MetricTile icon={Link2} label="Cards" value={String(collection.entries.length)} />
        <MetricTile icon={Clock3} label="Idle reset" value={`${collection.idleTimeoutSeconds}s`} />
        <MetricTile icon={Keyboard} label="Return keys" value={String(collection.escapeHotkeys.length)} />
        <MetricTile icon={Palette} label="Backdrop" value="Custom" />
      </div>

      <div className="profile-action-grid">
        <ActionButton icon={Settings2} tone="soft" onClick={onOpenDetails}>
          Edit Details
        </ActionButton>
        <ActionButton icon={Palette} tone="soft" onClick={onOpenBackdrop}>
          Refine Backdrop
        </ActionButton>
        <ActionButton icon={Keyboard} tone="soft" onClick={onOpenKiosk}>
          Tune Kiosk Rules
        </ActionButton>
      </div>
    </section>
  );
}

interface MetricTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function MetricTile({ icon: Icon, label, value }: MetricTileProps) {
  return (
    <div className="metric-tile">
      <Icon className="button-icon" size={16} strokeWidth={2} />
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

interface StudioModalProps {
  kicker: string;
  title: string;
  description: string;
  onClose: () => void;
  closeOnOverlay?: boolean;
  children: ReactNode;
}

function StudioModal({
  kicker,
  title,
  description,
  onClose,
  closeOnOverlay = true,
  children
}: StudioModalProps) {
  return (
    <div className="studio-modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <section
        className="glass-panel studio-modal-shell"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="studio-modal-header">
          <div className="modal-title-block">
            <p className="micro-label">{kicker}</p>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>

          <button className="modal-close-button" type="button" onClick={onClose} aria-label="Close dialog">
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className="studio-modal-body">{children}</div>
      </section>
    </div>
  );
}

export default App;
