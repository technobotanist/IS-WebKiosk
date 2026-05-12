import { startTransition, useEffect, useRef, useState, type CSSProperties, type ChangeEvent } from 'react';
import type { CollectionDraft, CollectionEntry, CollectionTheme } from './types';
import { useIdleReset } from './useIdleReset';

type LoadState = 'loading' | 'ready' | 'error';
type ViewMode = 'studio' | 'gallery';
type FeedbackTone = 'normal' | 'error';

interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

const STORAGE_KEY = 'webkiosking-innovation-studio-v1';
const modifierOrder = ['Control', 'Alt', 'Shift', 'Meta'] as const;
const modifierSet = new Set<string>(modifierOrder);

const defaultTheme: CollectionTheme = {
  backgroundTop: '#fbfdff',
  backgroundMid: '#edf4fb',
  backgroundBottom: '#d3e2fc',
  cloudOne: '#c73523',
  cloudTwo: '#2ca5bd'
};

const studioOverview =
  'The Innovation Studio is an exhibition space for sharing student work with a broader audience, as either ongoing exhibits or one-time events. Our interactive projection tables can display digital media, including text, video, and audio, and can incorporate physical or interactive creations.';

const studioExhibitNote =
  'In producing ongoing exhibits, we often consult with courses early in their projects to discuss the Innovation Studio\'s context, goals, and audience. Making an exhibit gives students valuable experience communicating disciplinary knowledge to a general audience. Exhibits can incorporate a wide variety of media and accommodate large groups and varying amounts of content.';

const studioEventsNote =
  'The Studio is also a strong space for student showcase events. We have hosted end-of-semester presentations, analog table displays, exhibits using the interactive system, video screenings, and other open-audience formats.';

const fallbackCollectionSeed: CollectionDraft = {
  id: 'innovation-studio',
  title: 'Innovation Studio',
  subtitle: 'Exhibition Space',
  introText: studioOverview,
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
      qrImageUrl: '/qr/innovation-studio-exhibits.svg'
    },
    {
      id: 'entry-exhibiting-guide',
      title: 'Exhibiting Guide',
      author: 'Student Exhibit Support',
      description:
        'Reference material for shaping exhibit content, understanding audience, and planning how text, video, audio, and group work can live in the space.',
      destinationUrl: 'https://example.com/innovation-studio/exhibiting-guide',
      qrImageUrl: '/qr/innovation-studio-guide.svg'
    },
    {
      id: 'entry-showcase-events',
      title: 'Showcase Events',
      author: 'Open Audience Presentations',
      description:
        'End-of-semester events can mix slide talks, analog table displays, interactive exhibits, screenings, and other formats depending on your goals.',
      destinationUrl: 'https://example.com/innovation-studio/showcase-events',
      qrImageUrl: '/qr/innovation-studio-events.svg'
    }
  ]
};

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

function createEntry(index: number, seed?: Partial<CollectionEntry>): CollectionEntry {
  return {
    id: seed?.id ?? createId('entry'),
    title: seed?.title ?? `Gallery Card ${index}`,
    author: seed?.author ?? '',
    description: seed?.description ?? '',
    destinationUrl: seed?.destinationUrl ?? '',
    qrImageUrl: seed?.qrImageUrl ?? ''
  };
}

function normalizeEntry(value: unknown, index: number): CollectionEntry {
  if (!isPlainObject(value)) {
    return createEntry(index + 1);
  }

  return createEntry(index + 1, {
    id: readString(value.id, createId('entry')),
    title: readString(value.title, `Gallery Card ${index + 1}`),
    author: readString(value.author),
    description: readString(value.description),
    destinationUrl: readString(value.destinationUrl),
    qrImageUrl: readString(value.qrImageUrl)
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
      : [createEntry(1, { title: 'Destination 1' })];

  return {
    id: readString(value.id, createId('collection')),
    title,
    subtitle: readString(value.subtitle, 'Exhibition Space'),
    introText: readString(value.introText, studioOverview),
    gallerySlug: slugify(readString(value.gallerySlug) || title),
    theme: normalizeTheme(value.theme),
    idleTimeoutSeconds: clampNumber(value.idleTimeoutSeconds, 45, 1800, 120),
    escapeHotkeys: normalizeHotkeys(value.escapeHotkeys),
    entries
  };
}

function getInitialViewMode(): ViewMode {
  return window.location.hash === '#gallery' ? 'gallery' : 'studio';
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
  const [viewMode, setViewMode] = useState<ViewMode>(() => getInitialViewMode());
  const [collection, setCollection] = useState<CollectionDraft | null>(null);
  const [seedCollection, setSeedCollection] = useState<CollectionDraft | null>(null);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateCollection() {
      try {
        setStatus('loading');
        setErrorMessage('');

        let seed = normalizeCollection(fallbackCollectionSeed);

        try {
          const response = await fetch('/data/collection.json');

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
      setViewMode(getInitialViewMode());
    };

    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

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
    if (viewMode !== 'gallery' || !collection) {
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
  }, [collection, viewMode]);

  const selectedEntry =
    collection?.entries.find((entry) => entry.id === selectedEntryId) ?? collection?.entries[0] ?? null;
  const activeEntry = collection?.entries.find((entry) => entry.id === activeEntryId) ?? null;

  const idleCountdown = useIdleReset({
    enabled: viewMode === 'gallery' && activeEntry !== null && collection !== null,
    timeoutSeconds: collection?.idleTimeoutSeconds ?? 120,
    onTimeout: () => {
      setActiveEntryId(null);
      setViewerKey((currentValue) => currentValue + 1);
    }
  });

  function navigateTo(nextMode: ViewMode) {
    const nextHash = nextMode === 'gallery' ? 'gallery' : 'studio';
    window.location.hash = nextHash;

    startTransition(() => {
      setViewMode(nextMode);

      if (nextMode === 'studio') {
        setActiveEntryId(null);
      }
    });
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

    if (activeEntryId === entryId) {
      setActiveEntryId(null);
      setViewerKey((currentValue) => currentValue + 1);
    }

    setFeedback({ tone: 'normal', message: 'Removed gallery page from this collection.' });
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
          <p className="micro-label">Innovation Studio</p>
          <h1>Preparing the exhibition editor.</h1>
          <p>Loading the current exhibition collection, public destinations, and saved return hotkeys.</p>
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
          <h1>The exhibition editor could not start.</h1>
          <p>{errorMessage}</p>
          <button className="pill-button pill-button-primary" type="button" onClick={() => window.location.reload()}>
            Reload Studio
          </button>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`application-shell ${viewMode === 'gallery' ? 'is-gallery' : 'is-studio'}`}
      style={createThemeStyle(collection.theme)}
    >
      <div className="background-halo halo-one" />
      <div className="background-halo halo-two" />

      {viewMode === 'studio' ? (
        <header className="glass-panel top-chrome">
          <div className="brand-block">
            <p className="micro-label">Innovation Studio</p>
            <h1>Shape the Innovation Studio exhibition.</h1>
            <p>{studioOverview}</p>
          </div>

          <div className="toolbar-actions">
            <button className="pill-button pill-button-primary" type="button" onClick={() => navigateTo('gallery')}>
              Open Exhibition
            </button>
            <button className="pill-button pill-button-soft" type="button" onClick={exportCollection}>
              Export JSON
            </button>
            <button
              className="pill-button pill-button-soft"
              type="button"
              onClick={() => importInputRef.current?.click()}
            >
              Import JSON
            </button>
            <button className="pill-button pill-button-quiet" type="button" onClick={resetToSample}>
              Reset Studio Copy
            </button>

            <div className={`status-pill ${feedback?.tone === 'error' ? 'status-pill-error' : ''}`}>
              {feedback?.message ?? `${collection.entries.length} cards in ${collection.title}`}
            </div>
          </div>
        </header>
      ) : null}

      <main className={viewMode === 'studio' ? 'studio-layout' : 'gallery-layout'}>
        {viewMode === 'studio' ? (
          <>
            <section className="glass-panel collection-panel">
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Exhibition</p>
                  <h2>Space and collection settings</h2>
                </div>
                <span className="glass-badge">{collection.gallerySlug}</span>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span>Collection title</span>
                  <input
                    value={collection.title}
                    onChange={(event) => updateCollectionField('title', event.target.value)}
                    placeholder="Innovation Studio"
                  />
                </label>

                <label className="field">
                  <span>Subtitle</span>
                  <input
                    value={collection.subtitle}
                    onChange={(event) => updateCollectionField('subtitle', event.target.value)}
                    placeholder="Exhibition Space"
                  />
                </label>

                <label className="field">
                  <span>Gallery slug</span>
                  <input
                    value={collection.gallerySlug}
                    onChange={(event) => updateCollectionField('gallerySlug', slugify(event.target.value))}
                    placeholder="innovation-studio"
                  />
                </label>

                <label className="field">
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

                <label className="field field-span-full">
                  <span>Intro text</span>
                  <textarea
                    value={collection.introText}
                    onChange={(event) => updateCollectionField('introText', event.target.value)}
                    placeholder="A short space introduction or exhibition instruction."
                  />
                </label>
              </div>

              <section className="glass-subpanel space-brief">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="micro-label">Space Context</p>
                    <h3>Exhibits and showcase events</h3>
                  </div>
                  <span className="glass-badge">Innovation Studio</span>
                </div>

                <div className="space-copy">
                  <p>{studioExhibitNote}</p>
                  <p>{studioEventsNote}</p>
                </div>

                <a className="contact-link" href="mailto:library_innovationstudio@ncsu.edu">
                  library_innovationstudio@ncsu.edu
                </a>
              </section>

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

              <section className="glass-subpanel">
                <div className="panel-heading compact-heading">
                  <div>
                    <p className="micro-label">Escape Keys</p>
                    <h3>Return hotkeys</h3>
                  </div>
                  <button
                    className={`pill-button ${isRecordingHotkey ? 'pill-button-primary' : 'pill-button-soft'}`}
                    type="button"
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
                  </button>
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
            </section>

            <section className="glass-panel entry-list-panel">
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Cards</p>
                  <h2>Exhibit and event cards</h2>
                </div>
                <button className="pill-button pill-button-primary" type="button" onClick={addEntry}>
                  Add Card
                </button>
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

            <section className="glass-panel entry-editor-panel">
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Selected Card</p>
                  <h2>{selectedEntry?.title || 'Select a card'}</h2>
                </div>
                {selectedEntry ? <span className="glass-badge">{selectedEntry.author || 'Uncredited'}</span> : null}
              </div>

              {selectedEntry ? (
                <div className="field-grid two-column-grid">
                  <label className="field">
                    <span>Card title</span>
                    <input
                      value={selectedEntry.title}
                      onChange={(event) => updateEntryField(selectedEntry.id, 'title', event.target.value)}
                      placeholder="Ongoing Exhibits"
                    />
                  </label>

                  <label className="field">
                    <span>Author name</span>
                    <input
                      value={selectedEntry.author}
                      onChange={(event) => updateEntryField(selectedEntry.id, 'author', event.target.value)}
                      placeholder="Course Collaborations"
                    />
                  </label>

                  <label className="field field-span-full">
                    <span>Destination public URL</span>
                    <input
                      value={selectedEntry.destinationUrl}
                      onChange={(event) =>
                        updateEntryField(selectedEntry.id, 'destinationUrl', event.target.value)
                      }
                      placeholder="https://example.com/project"
                    />
                  </label>

                  <label className="field field-span-full">
                    <span>QR image URL</span>
                    <input
                      value={selectedEntry.qrImageUrl}
                      onChange={(event) => updateEntryField(selectedEntry.id, 'qrImageUrl', event.target.value)}
                      placeholder="/qr/innovation-studio-exhibits.svg"
                    />
                  </label>

                  <label className="field field-span-full">
                    <span>Short description</span>
                    <textarea
                      value={selectedEntry.description}
                      onChange={(event) => updateEntryField(selectedEntry.id, 'description', event.target.value)}
                      placeholder="A short line that reads well in a public gallery card."
                    />
                  </label>
                </div>
              ) : (
                <p className="panel-copy">Select a card from the list to edit its public URL, author line, QR image, and short description.</p>
              )}
            </section>

            <section className="glass-panel preview-panel">
              <div className="panel-heading">
                <div>
                  <p className="micro-label">Preview</p>
                  <h2>Exhibition card preview</h2>
                </div>
                <button
                  className="pill-button pill-button-soft"
                  type="button"
                  onClick={previewSelectedEntry}
                  disabled={!selectedEntry || !selectedEntry.destinationUrl}
                >
                  Preview In Exhibition
                </button>
              </div>

              {selectedEntry ? (
                <div className="preview-grid">
                  <article className="preview-card">
                    <p className="author-label">{selectedEntry.author || 'Author name'}</p>
                    <h3>{selectedEntry.title || 'Untitled page'}</h3>
                    <p>{selectedEntry.description || 'A concise description will appear here.'}</p>
                    <div className="preview-footer">
                      <span className="glass-badge">{collection.subtitle}</span>
                      <span className="glass-badge">
                        {selectedEntry.destinationUrl ? 'Launch ready' : 'URL required'}
                      </span>
                    </div>
                  </article>

                  <article className="qr-panel">
                    <QrPreview src={selectedEntry.qrImageUrl} alt={`${selectedEntry.title} QR code`} />
                    <div className="preview-notes">
                      <p className="micro-label">Runtime behavior</p>
                      <p>
                        In exhibition mode this page opens inside a kiosk shell with staff-configured return controls and idle reset behavior.
                      </p>
                    </div>
                  </article>
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <>
            <section className="gallery-heading">
              <div>
                <p className="micro-label">{collection.subtitle}</p>
                <h1>{collection.title}</h1>
                <p>{collection.introText}</p>
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

      {viewMode === 'gallery' && activeEntry ? (
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
                  Back To Exhibition
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
        <div>
          <h3>{entry.title || 'Untitled page'}</h3>
          <p>{entry.author || 'Author name'}</p>
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

function GalleryCard({ entry, subtitle, onLaunch }: GalleryCardProps) {
  return (
    <button
      className="gallery-card"
      type="button"
      onClick={onLaunch}
      disabled={!entry.destinationUrl.trim()}
    >
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

  useEffect(() => {
    setIsBroken(false);
  }, [src]);

  if (!src || isBroken) {
    return <div className={`qr-placeholder ${compact ? 'compact-qr' : ''}`}>QR image</div>;
  }

  return (
    <div className={`qr-frame ${compact ? 'compact-qr' : ''}`}>
      <img src={src} alt={alt} onError={() => setIsBroken(true)} />
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

export default App;
