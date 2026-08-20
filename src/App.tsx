import {
  ArrowUpRight,
  BookOpen,
  Clock3,
  Delete,
  Download,
  Eye,
  Keyboard,
  KeyRound,
  Link2,
  Palette,
  PencilLine,
  Plus,
  RefreshCcw,
  Settings2,
  Trash2,
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
  type KeyboardEvent as ReactKeyboardEvent,
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

interface KioskConfig {
  curatorPin?: unknown;
  kioskMode?: unknown;
  followRemote?: unknown;
}

const STORAGE_KEY = 'webkiosking-innovation-studio-v1';
const GALLERY_UNLOCK_HOLD_MS = 1800;
const GALLERY_UNLOCK_WINDOW_MS = 10 * 60 * 1000;
const CURATOR_PIN_STORAGE_KEY = 'webkiosking-curator-pin-v1';
const KIOSK_CONFIG_PATH = 'kiosk-config.json';
const DEFAULT_COLLECTION_FILE = 'data/collection.json';
const KIOSK_MODE_STORAGE_KEY = 'webkiosking-kiosk-mode-v1';
const COLLECTION_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const CURATOR_PIN_PATTERN = /^\d{4,8}$/;
const CURATOR_PIN_ENV_DEFAULT = import.meta.env.VITE_CURATOR_PIN ?? '';
const PIN_ALERT_EMAIL = 'cpkeena2@ncsu.edu';
const PIN_ALERT_ENDPOINT = import.meta.env.VITE_PIN_ALERT_ENDPOINT ?? '';
const modifierOrder = ['Control', 'Alt', 'Shift', 'Meta'] as const;
const modifierSet = new Set<string>(modifierOrder);
const publicBasePath = import.meta.env.BASE_URL;

const defaultTheme: CollectionTheme = {
  backgroundTop: '#fbfdff',
  backgroundMid: '#edf4fb',
  backgroundBottom: '#d3e2fc',
  cloudOne: '#c73523',
  cloudTwo: '#2ca5bd',
  hazeIntensity: 100,
  launchButtonColor: '#c73523',
  galleryTitleScale: 100,
  galleryIntroScale: 100,
  cardTitleScale: 100,
  cardBodyScale: 100
};

const studioHeroLabel = 'Innovation Studio Kiosks';

const studioHeroTitle = 'Innovation Studio Web Kiosk Gallery';

const studioHeroOverview =
  'Curate the gallery of public web destinations, QR codes, and return behavior that runs on the Chromebase machines in the Innovation Studio.';

const studioWorkflowNote =
  'Use this studio to build kiosk cards around a public URL, a QR destination, and short curator-facing copy so staff can verify what each machine will launch.';

const studioDeliveryNote =
  'Each collection stores card content, idle reset timing, return hotkeys, backdrop settings, and gallery appearance controls together so the same gallery can be restored or exported to another workstation.';

const defaultGalleryIntro =
  'The Innovation Studio is an exhibition space for sharing student work with a broader audience, as either ongoing exhibits or one-time events. Our interactive projection tables can display digital media, including text, video, and audio, and can incorporate physical or interactive creations.';

const defaultLaunchButtonLabel = 'Launch page';

const defaultNewEntryDescription =
  'Libraries News:\nShowing news stories tagged with "Innovation Studio"';

const defaultNewEntryLongDescription =
  'This kiosk card links to a public web destination for visitors to explore. Use this longer description on the project page to give more context about the work, its creators, and what visitors can expect to see.';

const fallbackCollectionSeed: CollectionDraft = {
  id: 'ncstate-landmarks',
  title: 'Building the Wolfpack',
  subtitle: 'An NC State Campus Architecture Exhibit',
  introText:
    "From the first brick building raised by state prisoners to an award-winning research library longer than a football field, NC State's campus tells the university's story in stone, steel, and glass. Explore ten landmark buildings, tap a card to open its full history from the NC State Facilities archive, and trace how a small land-grant college grew into a modern research university.",
  gallerySlug: 'ncstate-landmarks',
  launchButtonLabel: 'Launch page',
  theme: {
    backgroundTop: '#fffafa',
    backgroundMid: '#fdecec',
    backgroundBottom: '#f6d4d4',
    cloudOne: '#cc0000',
    cloudTwo: '#6b7683',
    hazeIntensity: 85,
    launchButtonColor: '#cc0000',
    galleryTitleScale: 100,
    galleryIntroScale: 100,
    cardTitleScale: 100,
    cardBodyScale: 100
  },
  idleTimeoutSeconds: 120,
  escapeHotkeys: ['Escape', 'Control+Shift+H'],
  entries: [
    {
      id: 'entry-memorial-belltower',
      title: 'Memorial Belltower',
      author: 'North Campus Landmark · Dedicated 1949',
      description:
        "NC State's iconic stone landmark, dedicated in 1949 to honor alumni lost in World War I—and lit Wolfpack red to mark moments of celebration.",
      longDescription:
        "Architect William Henry Deacy was first appointed to design the tower in 1920, but the stonework was not completed until 1937 because of setbacks during the Great Depression and again during World War II. The Memorial Belltower was officially dedicated in 1949 to honor NC State alumni killed in World War I, and the tradition of lighting the tower red for auspicious occasions began in 1999. A recent completion and restoration project finally installed the belfry's 55 bells, which for decades existed only as a speaker system. Building 002 · North Precinct · 2101 Hillsborough Street.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/mbt/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-belltower.svg',
      previewImageUrl: 'thumbnails/ncsu-belltower.jpg'
    },
    {
      id: 'entry-holladay-hall',
      title: 'Holladay Hall',
      author: 'North Campus · The First Building',
      description:
        'The first building on campus—once home to virtually the entire college—now a Raleigh historic landmark of Romanesque revival design.',
      longDescription:
        "Holladay Hall was the first building on campus and, for years, contained virtually the entire college. Prisoners of the state penitentiary built what was then called “Main Building” with bricks donated by the prison. Its basement held laboratories, a kitchen, a dining hall, and a rare gymnasium; offices, classrooms, and a donated library filled the first floor; and 72 students lived on the upper floors, paying $130 a year in tuition that could be reduced for those who swept floors and waited tables. In 1915 the Romanesque revival building was named for Alexander Quarles Holladay, NC State's first president (1889–1899). Building 003 · North Precinct · 20 Watauga Club Drive.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/hol/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-holladay.svg',
      previewImageUrl: 'thumbnails/ncsu-holladay.jpg'
    },
    {
      id: 'entry-gregg-museum',
      title: 'Gregg Museum of Art & Design',
      author: 'North Campus · Opened 2017',
      description:
        "The former Chancellor's Residence, reborn in 2017 as NC State's art and design museum with a LEED Gold gallery addition.",
      longDescription:
        "First purchased in 1912 for $15,000, this property became the Chancellor's Residence once construction was completed in 1928. In 2011 the Chancellor moved into a new residence, and the former residence opened as the Gregg Museum of Art & Design in 2017. The renovation added 16,589 gross square feet for museum galleries, administrative offices, meeting spaces, and collections storage, and in March 2018 the newly constructed addition was certified LEED Gold for its leadership in energy and environmental design. Building 001 · North Precinct · 1903 Hillsborough Street.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/grm/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-gregg.svg',
      previewImageUrl: 'thumbnails/ncsu-gregg.jpg'
    },
    {
      id: 'entry-1911-building',
      title: '1911 Building',
      author: 'North Campus · Named for the Class of 1911',
      description:
        'A Victorian landmark with a broad Doric verandah—once the largest dormitory in the South—named for the class that ended campus hazing.',
      longDescription:
        "The Victorian 1911 Building, distinguished by a broad Doric verandah whose cream-colored columns are made of brick, spans 45,008 square feet and was originally the largest dormitory in the South. It honors the Class of 1911, whose members vowed never to haze incoming freshmen and kept that promise—an unusual pledge that impressed faculty so deeply the new dormitory was named in the class's honor, marking a “landmark in the history of the college.” Building 036 · North Precinct · 10 Current Drive.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/nin/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-1911.svg',
      previewImageUrl: 'thumbnails/ncsu-1911.jpg'
    },
    {
      id: 'entry-reynolds-coliseum',
      title: 'Reynolds Coliseum',
      author: 'Central Campus · Home of the Wolfpack',
      description:
        "Home of Wolfpack basketball and two NCAA champions, this 14,000-seat arena grew from one alumnus's decade-long campaign.",
      longDescription:
        "After 5,000 people were rained out of a 1940 Farmers' Week meeting held in an outdoor stadium, alumnus David Clark championed the idea of a coliseum, promoting it for a decade before Reynolds Coliseum was finally built. It has been home to the fabled Wolfpack basketball teams—including two NCAA champions—and has hosted tournaments, presidential addresses, concerts, and a public lecture by architect Frank Lloyd Wright attended by 5,000 people. Named for tobacco magnate and philanthropist William Neal Reynolds, the arena's floor measures 108 by 312 feet with seating for 14,000. Building 100 · Central Precinct · 2411 Dunn Avenue.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/col/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-reynolds.svg',
      previewImageUrl: 'thumbnails/ncsu-reynolds.jpg'
    },
    {
      id: 'entry-talley-student-union',
      title: 'Talley Student Union',
      author: 'Central Campus · Rebuilt 2012',
      description:
        'The heart of campus life, built in 1972 and transformed in a 2012 expansion with a 1,200-guest ballroom, dining, and a two-level bookstore.',
      longDescription:
        "Originally called Talley Student Center, the building opened in 1972 on a parking lot beside Reynolds Coliseum as a successor to the Erdahl-Cloyd Student Union. A major 2012 renovation and addition earned LEED Silver certification—plus LEED certification for ongoing operations and maintenance—and produced today's Talley Student Union, featuring a grand ballroom for up to 1,200 guests, a wide variety of dining, lounge, and meeting venues, recreational areas, student organization and government offices, a two-level NC State Bookstore, a great lawn, and advanced technology. Building 102 · Central Precinct · 2610 Cates Avenue.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/tsu/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-talley.svg',
      previewImageUrl: 'thumbnails/ncsu-talley.jpg'
    },
    {
      id: 'entry-hunt-library',
      title: 'James B. Hunt Jr. Library',
      author: 'Centennial Campus · Designed by Snøhetta',
      description:
        'The award-winning intellectual and social nexus of Centennial Campus—longer than a football field and designed by global firm Snøhetta.',
      longDescription:
        "The James B. Hunt Jr. Library serves as the intellectual and social nexus for the growing population on NC State's Centennial Campus, a community of academic, corporate, and government partners. Its 253,028 gross square feet house collections that support multidisciplinary research and teaching, along with the Institute for Emerging Issues, established with the help of former North Carolina governor James B. Hunt Jr. Anchoring the Centennial Campus Academic Oval, the building stretches roughly 460 feet long and 180 feet wide—longer and wider than a football field—and was designed to LEED Silver by acclaimed global firm Snøhetta with North Carolina executive architects Pearce Brinkley Cease + Lee. Building 783A · Centennial Precinct · 1070 Partners Way.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/jhl/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-hunt.svg',
      previewImageUrl: 'thumbnails/ncsu-hunt.jpg'
    },
    {
      id: 'entry-erdahl-cloyd',
      title: 'D.H. Hill Jr. Library — Erdahl-Cloyd Wing',
      author: 'North Campus · “The Atrium”',
      description:
        "Known as the Atrium, this former student union is now the library's main entrance, food court, and home of the Erdahl-Cloyd Theater.",
      longDescription:
        "Often called the Atrium, the Erdahl-Cloyd West Wing of the D.H. Hill Jr. Library gives students an alternative to cafeteria dining, with a food court, a campus convenience store, and the Erdahl-Cloyd Theater. Formerly the student union, it is named for two Student Affairs administrators—Gerald Orlando Theodore Erdahl, who built a nationally admired student union program, and Edward Lamar Cloyd, a 1915 alumnus and Dean of Students for 36 years. The new Atrium food court reopened after renovation in January 2011, and in 2019 the wing became the primary entrance to the library. Building 047A · North Precinct · 2 Broughton Drive.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/ec/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-erdahl-cloyd.svg',
      previewImageUrl: 'thumbnails/ncsu-erdahl-cloyd.jpg'
    },
    {
      id: 'entry-burlington-laboratory',
      title: 'Burlington Laboratory',
      author: 'North Campus · Nuclear Pioneer',
      description:
        "Home to the world's first nuclear reactor built solely for peacetime education—installed in 1955 and still training reactor operators today.",
      longDescription:
        "National attention came to NC State in 1955 when the world's first nuclear reactor devoted solely to the peacetime application of nuclear fission in an educational program was installed here. Burlington Nuclear Laboratories was named for Burlington Industries, a textile company that helped privately fund the reactor building, and a one-million-watt PULSTAR reactor was later added. Enlarged with state funding in 1973 and renamed Burlington Engineering Laboratories, the building supports research and the training of nuclear reactor operators, methods of power generation, and the medical and industrial uses of radiation. Building 042 · North Precinct · 2500 Katharine Stinson Drive.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/bu/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-burlington.svg',
      previewImageUrl: 'thumbnails/ncsu-burlington.jpg'
    },
    {
      id: 'entry-fitts-woolard-hall',
      title: 'Fitts-Woolard Hall',
      author: 'Centennial Campus · Opened 2020',
      description:
        "The College of Engineering's newest home on Centennial Campus—a glass-walled teaching tool that puts engineering on display.",
      longDescription:
        "When it opened in 2020, the College of Engineering's newest facility marked a crucial step in the College's move to Centennial Campus. Fitts-Woolard Hall is home to the Department of Civil, Construction, and Environmental Engineering; the Edward P. Fitts Department of Industrial and Systems Engineering; and the dean's administrative offices. Funded through a unique public-private sponsorship backed by Edward P. Fitts, Jr., Edgar S. Woolard, Jr., and more than 300 alumni, the building is itself a teaching tool—its transparent labs and exposed structure put sustainability and engineering components on display throughout the envelope, structure, and control systems. Building 782E · Centennial Precinct · 915 Partners Way.",
      destinationUrl: 'https://facilities.ofa.ncsu.edu/building/fwh/',
      showQrCode: true,
      qrImageUrl: 'qr/ncsu-fitts-woolard.svg',
      previewImageUrl: 'thumbnails/ncsu-fitts-woolard.jpg'
    }
  ]
};

const emptyCollectionSeed: CollectionDraft = {
  id: 'blank-gallery',
  title: 'Untitled Gallery',
  subtitle: '',
  introText: '',
  gallerySlug: 'untitled-gallery',
  launchButtonLabel: 'Launch page',
  theme: defaultTheme,
  idleTimeoutSeconds: 120,
  escapeHotkeys: ['Escape', 'Control+Shift+H'],
  entries: []
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

async function fetchCollectionSeed(file: string): Promise<CollectionDraft | null> {
  try {
    const response = await fetch(resolvePublicPath(file), { cache: 'no-store' });

    if (!response.ok) {
      return null;
    }

    // Some static hosts answer a missing file with a 200 HTML fallback page. Guard against
    // parsing that as a collection so a bad slug cleanly falls through to the default file.
    const contentType = response.headers.get('content-type') ?? '';
    const body = await response.text();

    if (contentType.includes('html') || body.trimStart().startsWith('<')) {
      return null;
    }

    return normalizeCollection(JSON.parse(body));
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
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
    cloudTwo: normalizeHexColor(value.cloudTwo, defaultTheme.cloudTwo),
    hazeIntensity: clampNumber(value.hazeIntensity, 0, 100, defaultTheme.hazeIntensity),
    launchButtonColor: normalizeHexColor(value.launchButtonColor, defaultTheme.launchButtonColor),
    galleryTitleScale: clampNumber(value.galleryTitleScale, 85, 140, defaultTheme.galleryTitleScale),
    galleryIntroScale: clampNumber(value.galleryIntroScale, 85, 140, defaultTheme.galleryIntroScale),
    cardTitleScale: clampNumber(value.cardTitleScale, 85, 140, defaultTheme.cardTitleScale),
    cardBodyScale: clampNumber(value.cardBodyScale, 85, 140, defaultTheme.cardBodyScale)
  };
}

function hexToRgba(hexColor: string, alpha: number) {
  const cleanHex = hexColor.replace('#', '');
  const red = Number.parseInt(cleanHex.slice(0, 2), 16);
  const green = Number.parseInt(cleanHex.slice(2, 4), 16);
  const blue = Number.parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getReadableTextColor(hexColor: string) {
  const cleanHex = hexColor.replace('#', '');
  const red = Number.parseInt(cleanHex.slice(0, 2), 16);
  const green = Number.parseInt(cleanHex.slice(2, 4), 16);
  const blue = Number.parseInt(cleanHex.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.64 ? '#092933' : '#ffffff';
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
    longDescription: seed?.longDescription ?? '',
    destinationUrl: seed?.destinationUrl ?? '',
    showQrCode: seed?.showQrCode ?? false,
    qrImageUrl: seed?.qrImageUrl ?? '',
    previewImageUrl: seed?.previewImageUrl ?? ''
  };
}

function createEntry(index: number, seed?: Partial<CollectionEntry>): CollectionEntry {
  return createBlankEntry(index, {
    title: `Exhibit #${index}`,
    author: 'Jane Doe',
    description: defaultNewEntryDescription,
    longDescription: defaultNewEntryLongDescription,
    destinationUrl: 'https://go.ncsu.edu/innovation-studio-news',
    showQrCode: false,
    qrImageUrl: '',
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
    longDescription: readString(value.longDescription),
    destinationUrl: readString(value.destinationUrl),
    showQrCode: readBoolean(value.showQrCode),
    qrImageUrl: readString(value.qrImageUrl),
    previewImageUrl: readString(value.previewImageUrl)
  });
}

function shouldRenderQrCode(entry: Pick<CollectionEntry, 'showQrCode' | 'qrImageUrl'>) {
  return readBoolean(entry.showQrCode) && readString(entry.qrImageUrl).trim().length > 0;
}

function normalizeCollection(value: unknown): CollectionDraft {
  if (!isPlainObject(value)) {
    throw new Error('Collection data must be a single JSON object.');
  }

  const title = readString(value.title, 'New Collection');
  const entriesSource = Array.isArray(value.entries) ? value.entries : [];
  const entries = entriesSource.map((entry, index) => normalizeEntry(entry, index));

  return {
    id: readString(value.id, createId('collection')),
    title,
    subtitle: readString(value.subtitle, 'Exhibition Space'),
    introText: readString(value.introText, defaultGalleryIntro),
    launchButtonLabel: readString(value.launchButtonLabel, defaultLaunchButtonLabel),
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

function readOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['1', 'true', 'yes', 'on', 'kiosk'].includes(normalized)) {
      return true;
    }

    if (['0', 'false', 'no', 'off', 'curator', 'editor'].includes(normalized)) {
      return false;
    }
  }

  return null;
}

function getRequestedCollectionSlug(search: string): string | null {
  try {
    const raw = new URLSearchParams(search).get('collection');

    if (!raw) {
      return null;
    }

    // slugify strips path separators, dots, and other unsafe characters, so the
    // resulting `data/<slug>.json` request can never traverse outside the data folder.
    const slug = slugify(raw);
    return COLLECTION_SLUG_PATTERN.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

function getRequestedKioskMode(search: string): boolean | null {
  try {
    const params = new URLSearchParams(search);
    const role = params.get('role');

    if (role !== null) {
      const roleValue = readOptionalBoolean(role);

      if (roleValue !== null) {
        return roleValue;
      }
    }

    if (params.has('kiosk')) {
      const kioskValue = params.get('kiosk') ?? '';

      if (kioskValue.trim() === '') {
        return true;
      }

      return readOptionalBoolean(kioskValue);
    }

    return null;
  } catch {
    return null;
  }
}

function readStoredKioskMode(): boolean | null {
  try {
    const value = window.localStorage.getItem(KIOSK_MODE_STORAGE_KEY);

    if (value === null) {
      return null;
    }

    return value === 'true';
  } catch {
    return null;
  }
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
  const hazeMultiplier = theme.hazeIntensity / 100;

  return {
    '--theme-background-top': theme.backgroundTop,
    '--theme-background-mid': theme.backgroundMid,
    '--theme-background-bottom': theme.backgroundBottom,
    '--theme-cloud-one-soft': hexToRgba(theme.cloudOne, 0.18 * hazeMultiplier),
    '--theme-cloud-two-soft': hexToRgba(theme.cloudTwo, 0.22 * hazeMultiplier),
    '--theme-halo-one': hexToRgba(theme.cloudOne, 0.24 * hazeMultiplier),
    '--theme-halo-two': hexToRgba(theme.cloudTwo, 0.28 * hazeMultiplier),
    '--theme-launch-button-color': theme.launchButtonColor,
    '--theme-launch-button-text': getReadableTextColor(theme.launchButtonColor),
    '--theme-launch-button-shadow': hexToRgba(theme.launchButtonColor, 0.24),
    '--theme-gallery-title-scale': String(theme.galleryTitleScale / 100),
    '--theme-gallery-intro-scale': String(theme.galleryIntroScale / 100),
    '--theme-card-title-scale': String(theme.cardTitleScale / 100),
    '--theme-card-body-scale': String(theme.cardBodyScale / 100)
  } as CSSProperties;
}

function App() {
  const [status, setStatus] = useState<LoadState>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [collection, setCollection] = useState<CollectionDraft | null>(null);
  const [seedCollection, setSeedCollection] = useState<CollectionDraft | null>(null);
  const [followRemote, setFollowRemote] = useState(false);
  const [collectionStorageKey, setCollectionStorageKey] = useState(STORAGE_KEY);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [viewerKey, setViewerKey] = useState(0);
  const [galleryUnlockExpiresAt, setGalleryUnlockExpiresAt] = useState<number | null>(null);
  const [unlockSecondsRemaining, setUnlockSecondsRemaining] = useState<number | null>(null);
  const [isRecordingHotkey, setIsRecordingHotkey] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [isCardEditorOpen, setIsCardEditorOpen] = useState(false);
  const [isUnlockGestureActive, setIsUnlockGestureActive] = useState(false);
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(0);
  const [curatorPin, setCuratorPin] = useState<string | null>(null);
  const [isPinSetupOpen, setIsPinSetupOpen] = useState(false);
  const [pinSetupValue, setPinSetupValue] = useState('');
  const [pinSetupConfirm, setPinSetupConfirm] = useState('');
  const [pinSetupError, setPinSetupError] = useState<string | null>(null);
  const [pinSetupStep, setPinSetupStep] = useState<'create' | 'confirm'>('create');
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

        const search = window.location.search;
        const requestedSlug = getRequestedCollectionSlug(search);
        const requestedKioskMode = getRequestedKioskMode(search);
        const collectionFile = requestedSlug ? `data/${requestedSlug}.json` : DEFAULT_COLLECTION_FILE;
        const storageKey = requestedSlug ? `${STORAGE_KEY}:${requestedSlug}` : STORAGE_KEY;

        // Load kiosk-config.json once; it seeds the curator PIN and can set a fleet-wide kiosk mode.
        let kioskConfig: KioskConfig | null = null;

        try {
          const configResponse = await fetch(resolvePublicPath(KIOSK_CONFIG_PATH), { cache: 'no-store' });

          if (configResponse.ok) {
            kioskConfig = (await configResponse.json()) as KioskConfig;
          }
        } catch {
          // No kiosk-config.json (or it was invalid); non-fatal.
        }

        // Resolve kiosk "follow remote" mode. Precedence: URL param (persisted) > device flag > config default.
        const storedKioskMode = readStoredKioskMode();
        let followRemoteMode: boolean;

        if (requestedKioskMode !== null) {
          followRemoteMode = requestedKioskMode;

          try {
            window.localStorage.setItem(KIOSK_MODE_STORAGE_KEY, requestedKioskMode ? 'true' : 'false');
          } catch {
            // Ignore storage failures; the mode still applies for this session.
          }
        } else if (storedKioskMode !== null) {
          followRemoteMode = storedKioskMode;
        } else {
          followRemoteMode = readOptionalBoolean(kioskConfig?.kioskMode ?? kioskConfig?.followRemote) ?? false;
        }

        // Fetch the published collection (cache-busted so kiosks always see the latest revision).
        let seed = await fetchCollectionSeed(collectionFile);
        let missingNamedCollection = false;

        if (!seed && requestedSlug) {
          // A named collection that is missing or served as a non-JSON fallback page: use the default.
          missingNamedCollection = true;
          seed = await fetchCollectionSeed(DEFAULT_COLLECTION_FILE);
        }

        let usedEmbeddedFallback = false;

        if (!seed) {
          seed = normalizeCollection(fallbackCollectionSeed);
          usedEmbeddedFallback = true;
        }

        // In follow-remote (kiosk) mode the published JSON is the source of truth, so local edits never shadow it.
        let initialCollection = seed;

        if (!followRemoteMode) {
          const storedValue = window.localStorage.getItem(storageKey);

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
        }

        let resolvedPin = window.localStorage.getItem(CURATOR_PIN_STORAGE_KEY) ?? '';

        if (!resolvedPin && kioskConfig) {
          const configPin = typeof kioskConfig.curatorPin === 'string' ? kioskConfig.curatorPin.trim() : '';

          if (CURATOR_PIN_PATTERN.test(configPin)) {
            resolvedPin = configPin;
          }
        }

        if (!resolvedPin && CURATOR_PIN_PATTERN.test(CURATOR_PIN_ENV_DEFAULT)) {
          resolvedPin = CURATOR_PIN_ENV_DEFAULT;
        }

        if (resolvedPin) {
          try {
            window.localStorage.setItem(CURATOR_PIN_STORAGE_KEY, resolvedPin);
          } catch {
            // Ignore storage failures; the resolved PIN still applies for this session.
          }
        }

        if (cancelled) {
          return;
        }

        if (missingNamedCollection && requestedSlug) {
          setFeedback({
            tone: 'error',
            message: `Collection "${requestedSlug}" was not found. Loaded the default collection instead.`
          });
        } else if (usedEmbeddedFallback) {
          setFeedback({
            tone: 'normal',
            message: 'Loaded embedded sample collection because the runtime JSON could not be fetched.'
          });
        } else if (followRemoteMode) {
          setFeedback({
            tone: 'normal',
            message: 'Kiosk mode is on: this device always loads the published collection and does not save local edits.'
          });
        }

        setFollowRemote(followRemoteMode);
        setCollectionStorageKey(storageKey);
        setCuratorPin(resolvedPin || null);
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

    if (followRemote) {
      return;
    }

    window.localStorage.setItem(collectionStorageKey, JSON.stringify(collection, null, 2));
  }, [collection, status, followRemote, collectionStorageKey]);

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
    unlockHoldTimerRef.current = window.setTimeout(promptForCuratorPin, GALLERY_UNLOCK_HOLD_MS);
  }

  function relockStudioAccess() {
    cancelUnlockGesture();
    setGalleryUnlockExpiresAt(null);
  }

  function promptForCuratorPin() {
    cancelUnlockGesture();

    if (!curatorPin) {
      openCuratorPinSetup();
      return;
    }

    setPinValue('');
    setPinError(null);
    setIsPinPromptOpen(true);
  }

  function closeCuratorPinPrompt() {
    setIsPinPromptOpen(false);
    setPinValue('');
    setPinError(null);
  }

  function openCuratorPinSetup() {
    setPinSetupValue('');
    setPinSetupConfirm('');
    setPinSetupError(null);
    setPinSetupStep('create');
    setIsPinSetupOpen(true);
  }

  function closeCuratorPinSetup() {
    setIsPinSetupOpen(false);
    setPinSetupValue('');
    setPinSetupConfirm('');
    setPinSetupError(null);
    setPinSetupStep('create');
  }

  function backToCreatePinStep() {
    setPinSetupConfirm('');
    setPinSetupError(null);
    setPinSetupStep('create');
  }

  function advanceCuratorPinSetup() {
    if (pinSetupStep === 'create') {
      if (!CURATOR_PIN_PATTERN.test(pinSetupValue)) {
        setPinSetupError('Choose a PIN of 4 to 8 digits.');
        return;
      }

      setPinSetupConfirm('');
      setPinSetupError(null);
      setPinSetupStep('confirm');
      return;
    }

    if (pinSetupConfirm !== pinSetupValue) {
      setPinSetupError('The two PINs do not match.');
      setPinSetupConfirm('');
      return;
    }

    try {
      window.localStorage.setItem(CURATOR_PIN_STORAGE_KEY, pinSetupValue);
    } catch {
      // Ignore storage failures; the PIN still applies for this session.
    }

    const wasUnlocked = isStudioUnlocked;
    setCuratorPin(pinSetupValue);
    setPinAttempts(0);
    closeCuratorPinSetup();

    if (wasUnlocked) {
      setFeedback({ tone: 'normal', message: 'Curator PIN updated for this machine.' });
    } else {
      unlockStudioAccess();
    }
  }

  async function reportFailedPinAttempt(attemptNumber: number) {
    const payload = {
      type: 'curator-pin-failure',
      recipient: PIN_ALERT_EMAIL,
      attemptNumber,
      kiosk: collection?.title ?? 'Unknown kiosk',
      gallerySlug: collection?.gallerySlug ?? '',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      page: typeof window !== 'undefined' ? window.location.href : ''
    };

    if (!PIN_ALERT_ENDPOINT) {
      console.warn(
        `[curator-pin] Failed attempt #${attemptNumber}. Set VITE_PIN_ALERT_ENDPOINT to email ${PIN_ALERT_EMAIL}.`,
        payload
      );
      return;
    }

    try {
      await fetch(PIN_ALERT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (error) {
      console.warn('[curator-pin] Could not deliver the PIN alert.', error);
    }
  }

  function attemptCuratorUnlock() {
    if (curatorPin !== null && pinValue === curatorPin) {
      setIsPinPromptOpen(false);
      setPinValue('');
      setPinError(null);
      setPinAttempts(0);
      unlockStudioAccess();
      return;
    }

    const nextAttempts = pinAttempts + 1;
    setPinAttempts(nextAttempts);
    setPinValue('');
    setPinError('Incorrect PIN. This failed attempt has been logged and reported to the curator.');
    void reportFailedPinAttempt(nextAttempts);
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

  function updateThemeField<K extends keyof CollectionTheme>(field: K, value: CollectionTheme[K]) {
    setCollection((currentCollection) => {
      if (!currentCollection) {
        return currentCollection;
      }

      return {
        ...currentCollection,
        theme: {
          ...currentCollection.theme,
          [field]: value
        }
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

  function redeployDefaultGallery() {
    const nextCollection = normalizeCollection(seedCollection ?? fallbackCollectionSeed);
    setCollection(nextCollection);
    setSelectedEntryId(nextCollection.entries[0]?.id ?? null);
    setActiveEntryId(null);
    setIsCardEditorOpen(false);
    setIsCollectionModalOpen(false);
    setIsRecordingHotkey(false);
    setViewerKey((currentValue) => currentValue + 1);
    setFeedback({ tone: 'normal', message: 'Redeployed the default gallery.' });
  }

  function discardGallery() {
    const shouldDiscard = window.confirm(
      'Discard the current gallery? This clears every card. You can bring back the built-in default with Redeploy Default, but custom changes you have not exported will be lost.'
    );

    if (!shouldDiscard) {
      return;
    }

    const nextCollection = normalizeCollection(emptyCollectionSeed);
    setCollection(nextCollection);
    setSelectedEntryId(null);
    setActiveEntryId(null);
    setIsCardEditorOpen(false);
    setIsCollectionModalOpen(false);
    setIsRecordingHotkey(false);
    setViewerKey((currentValue) => currentValue + 1);
    setFeedback({ tone: 'normal', message: 'Discarded the gallery. Redeploy Default restores the stashed exhibit.' });
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
              <ActionButton icon={RefreshCcw} tone="quiet" onClick={redeployDefaultGallery}>
                Redeploy Default
              </ActionButton>
              <ActionButton icon={Trash2} tone="quiet" onClick={discardGallery}>
                Discard Gallery
              </ActionButton>
              <ActionButton icon={KeyRound} tone="quiet" onClick={openCuratorPinSetup}>
                Change PIN
              </ActionButton>

              <div className={`status-pill ${feedback?.tone === 'error' ? 'status-pill-error' : ''}`}>
                {feedback?.message ?? `${collection.entries.length} cards ready for ${collection.title}`}
              </div>
            </div>
          </div>

          <div className="studio-hero-aside">
            <CollectionProfileCard
              collection={collection}
              onUpdateThemeField={updateThemeField}
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
                    onEdit={() => {
                      setSelectedEntryId(entry.id);
                      setIsCardEditorOpen(true);
                    }}
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
              {collection.entries.length > 0 ? (
                collection.entries.map((entry) => (
                  <GalleryCard
                    key={entry.id}
                    entry={entry}
                    subtitle={collection.subtitle}
                    launchLabel={collection.launchButtonLabel}
                    onLaunch={() => openViewer(entry.id)}
                  />
                ))
              ) : (
                <p className="gallery-empty-note">
                  This gallery has been discarded. Unlock the editor to redeploy the default exhibit or build a new one.
                </p>
              )}
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
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>

              <aside className="viewer-sidepanel">
                {shouldRenderQrCode(activeEntry) ? <QrPreview src={activeEntry.qrImageUrl} alt={`${activeEntry.title} QR code`} /> : null}
                <section className="viewer-copy">
                  <p className="micro-label">Author</p>
                  <h4>{activeEntry.author || 'Author name'}</h4>
                  <p>
                    {activeEntry.longDescription ||
                      activeEntry.description ||
                      'Add a longer project description in the editor.'}
                  </p>
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

      {isPinPromptOpen ? (
        <StudioModal
          kicker="Curator Access"
          title="Enter curator PIN"
          description="The gallery editor is protected. Enter the curator PIN to unlock editing on this kiosk."
          closeOnOverlay={false}
          onClose={closeCuratorPinPrompt}
        >
          <div className="pin-pad-shell">
            <PinPad
              value={pinValue}
              onChange={(next) => {
                setPinValue(next);
                if (pinError) {
                  setPinError(null);
                }
              }}
              onEnter={attemptCuratorUnlock}
              maxLength={8}
              ariaLabel="Curator PIN entry"
            />

            {pinError ? (
              <p className="pin-error" role="alert">
                {pinError}
              </p>
            ) : null}

            <div className="pin-actions">
              <button type="button" className="pill-button pill-button-soft" onClick={closeCuratorPinPrompt}>
                Cancel
              </button>
              <button
                type="button"
                className="pill-button"
                onClick={attemptCuratorUnlock}
                disabled={pinValue.length < 4}
              >
                Unlock Editor
              </button>
            </div>
          </div>
        </StudioModal>
      ) : null}

      {isPinSetupOpen ? (
        <StudioModal
          kicker="Curator Access"
          title={curatorPin ? 'Change curator PIN' : 'Set curator PIN'}
          description={
            curatorPin
              ? 'Update the curator PIN stored on this kiosk machine.'
              : 'This machine has no curator PIN yet. Set one to protect the gallery editor.'
          }
          closeOnOverlay={false}
          onClose={closeCuratorPinSetup}
        >
          <div className="pin-pad-shell">
            <p className="pin-step-label">
              {pinSetupStep === 'create' ? 'Enter a new PIN (4–8 digits)' : 'Re-enter the PIN to confirm'}
            </p>

            <PinPad
              value={pinSetupStep === 'create' ? pinSetupValue : pinSetupConfirm}
              onChange={(next) => {
                if (pinSetupStep === 'create') {
                  setPinSetupValue(next);
                } else {
                  setPinSetupConfirm(next);
                }

                if (pinSetupError) {
                  setPinSetupError(null);
                }
              }}
              onEnter={advanceCuratorPinSetup}
              maxLength={8}
              ariaLabel={pinSetupStep === 'create' ? 'New curator PIN' : 'Confirm curator PIN'}
            />

            {pinSetupError ? (
              <p className="pin-error" role="alert">
                {pinSetupError}
              </p>
            ) : null}

            <div className="pin-actions">
              <button
                type="button"
                className="pill-button pill-button-soft"
                onClick={pinSetupStep === 'create' ? closeCuratorPinSetup : backToCreatePinStep}
              >
                {pinSetupStep === 'create' ? 'Cancel' : 'Back'}
              </button>
              <button
                type="button"
                className="pill-button"
                onClick={advanceCuratorPinSetup}
                disabled={(pinSetupStep === 'create' ? pinSetupValue : pinSetupConfirm).length < 4}
              >
                {pinSetupStep === 'create' ? 'Next' : curatorPin ? 'Save PIN' : 'Set PIN & Unlock'}
              </button>
            </div>
          </div>
        </StudioModal>
      ) : null}

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
                  <span>Launch button label</span>
                  <input
                    value={collection.launchButtonLabel}
                    onChange={(event) => updateCollectionField('launchButtonLabel', event.target.value)}
                    placeholder="Launch page"
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
                These colors drive the background wash and the two cloud-like haze layers behind the exhibition. Lower the
                haze intensity to soften those layers, or set it to zero to remove them completely.
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

              <div className="theme-grid">
                <RangeField
                  label="Haze intensity"
                  value={collection.theme.hazeIntensity}
                  min={0}
                  max={100}
                  onChange={(nextValue) =>
                    updateCollectionField('theme', {
                      ...collection.theme,
                      hazeIntensity: nextValue
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
                <span className="field-toggle-row">
                  <span className="field-toggle-copy">
                    <span>Show QR code on this exhibit</span>
                    <small>Disabled by default. Turn this on only for cards that should display a QR image.</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={readBoolean(selectedEntry.showQrCode)}
                    onChange={(event) => updateEntryField(selectedEntry.id, 'showQrCode', event.target.checked)}
                  />
                </span>
              </label>

              <label className="field field-span-full">
                <span>QR image URL</span>
                <input
                  value={readString(selectedEntry.qrImageUrl)}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'qrImageUrl', event.target.value)}
                  placeholder="QR image URL"
                  disabled={!readBoolean(selectedEntry.showQrCode)}
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
                <span>Short description (card)</span>
                <textarea
                  value={selectedEntry.description}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'description', event.target.value)}
                  placeholder="Short description shown on the gallery card"
                />
              </label>

              <label className="field field-span-full">
                <span>Long description (project page)</span>
                <textarea
                  className="long-description-input"
                  value={readString(selectedEntry.longDescription)}
                  onChange={(event) => updateEntryField(selectedEntry.id, 'longDescription', event.target.value)}
                  placeholder="Longer description shown on the project page when the card is launched"
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
  onEdit: () => void;
  onRemove: () => void;
}

function EntryListItem({ entry, index, isActive, onSelect, onEdit, onRemove }: EntryListItemProps) {
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
              <span className="entry-meta-pill">
                {readBoolean(entry.showQrCode) ? (readString(entry.qrImageUrl).trim() ? 'QR on' : 'QR needs image') : 'QR off'}
              </span>
              <span className="entry-meta-pill">{readString(entry.previewImageUrl).trim() ? 'Preview image' : 'No image'}</span>
            </div>
            <span className="entry-action-cue">{isActive ? 'Selected for editing' : 'Click to edit'}</span>
          </div>
        </div>
      </button>

      <div className="entry-item-actions">
        <button className="entry-edit" type="button" onClick={onEdit} aria-label={`Edit ${entry.title}`}>
          <PencilLine size={15} strokeWidth={2} />
          <span>Edit</span>
        </button>
        <button className="entry-remove" type="button" onClick={onRemove} aria-label={`Remove ${entry.title}`}>
          Remove
        </button>
      </div>
    </article>
  );
}

interface GalleryCardProps {
  entry: CollectionEntry;
  subtitle: string;
  launchLabel: string;
  onLaunch: () => void;
}

interface GalleryCardContentProps {
  entry: CollectionEntry;
  subtitle: string;
  launchLabel: string;
}

function GalleryCardContent({ entry, subtitle, launchLabel }: GalleryCardContentProps) {
  return (
    <>
      <GalleryCardPreviewImage src={readString(entry.previewImageUrl)} alt={`${entry.title} preview image`} />

      <div className="gallery-card-copy">
        <p className="author-label">{entry.author || subtitle}</p>
        <h3>{entry.title || 'Untitled page'}</h3>
        <p>{entry.description || 'Add a short description in the editor to populate this card.'}</p>
      </div>

      <div className="gallery-card-footer">
        <span className="gallery-launch-button">{launchLabel.trim() || 'Launch page'}</span>
        {shouldRenderQrCode(entry) ? (
          <div className="gallery-card-qr">
            <QrPreview src={entry.qrImageUrl} alt={`${entry.title} QR code`} compact />
          </div>
        ) : null}
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

function GalleryCard({ entry, subtitle, launchLabel, onLaunch }: GalleryCardProps) {
  return (
    <button
      className="gallery-card"
      type="button"
      onClick={onLaunch}
      disabled={!entry.destinationUrl.trim()}
    >
      <GalleryCardContent entry={entry} subtitle={subtitle} launchLabel={launchLabel} />
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

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function RangeField({ label, value, min, max, onChange }: RangeFieldProps) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <div className="range-input-row">
        <input
          className="range-slider"
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={label}
        />
        <span className="range-value">{value}%</span>
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
  onUpdateThemeField: <K extends keyof CollectionTheme>(field: K, value: CollectionTheme[K]) => void;
  onOpenDetails: () => void;
  onOpenBackdrop: () => void;
  onOpenKiosk: () => void;
}

function CollectionProfileCard({
  collection,
  onUpdateThemeField,
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

      <section className="profile-appearance-panel">
        <div className="panel-heading compact-heading">
          <div>
            <p className="micro-label">Gallery Appearance</p>
            <h3>Live style controls</h3>
          </div>
          <span className="glass-badge">Collection-wide</span>
        </div>

        <div className="profile-appearance-grid">
          <ColorField
            label="Launch button color"
            value={collection.theme.launchButtonColor}
            onChange={(nextValue) => onUpdateThemeField('launchButtonColor', nextValue)}
          />
          <RangeField
            label="Gallery title size"
            value={collection.theme.galleryTitleScale}
            min={85}
            max={140}
            onChange={(nextValue) => onUpdateThemeField('galleryTitleScale', nextValue)}
          />
          <RangeField
            label="Intro text size"
            value={collection.theme.galleryIntroScale}
            min={85}
            max={140}
            onChange={(nextValue) => onUpdateThemeField('galleryIntroScale', nextValue)}
          />
          <RangeField
            label="Card title size"
            value={collection.theme.cardTitleScale}
            min={85}
            max={140}
            onChange={(nextValue) => onUpdateThemeField('cardTitleScale', nextValue)}
          />
          <RangeField
            label="Card body size"
            value={collection.theme.cardBodyScale}
            min={85}
            max={140}
            onChange={(nextValue) => onUpdateThemeField('cardBodyScale', nextValue)}
          />
        </div>
      </section>

      <div className="profile-metric-grid">
        <MetricTile icon={Link2} label="Cards" value={String(collection.entries.length)} />
        <MetricTile icon={Clock3} label="Idle reset" value={`${collection.idleTimeoutSeconds}s`} />
        <MetricTile icon={Keyboard} label="Return keys" value={String(collection.escapeHotkeys.length)} />
        <MetricTile icon={Palette} label="Launch color" value={collection.theme.launchButtonColor.toUpperCase()} />
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

interface PinPadProps {
  value: string;
  onChange: (next: string) => void;
  onEnter?: () => void;
  maxLength?: number;
  ariaLabel?: string;
}

function PinPad({ value, onChange, onEnter, maxLength = 8, ariaLabel = 'PIN entry' }: PinPadProps) {
  const padRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    padRef.current?.focus();
  }, []);

  function refocus() {
    padRef.current?.focus();
  }

  function pressDigit(digit: string) {
    if (value.length >= maxLength) {
      return;
    }

    onChange(value + digit);
    refocus();
  }

  function backspace() {
    onChange(value.slice(0, -1));
    refocus();
  }

  function clearAll() {
    onChange('');
    refocus();
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key >= '0' && event.key <= '9') {
      event.preventDefault();
      pressDigit(event.key);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      backspace();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      onEnter?.();
    } else if (event.key === 'Delete') {
      event.preventDefault();
      clearAll();
    }
  }

  const slotCount = Math.max(value.length, 4);

  return (
    <div
      className="pin-pad"
      ref={padRef}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      <div className="pin-pad-display" aria-hidden="true">
        {Array.from({ length: slotCount }).map((_, index) => (
          <span key={index} className={`pin-dot ${index < value.length ? 'is-filled' : ''}`} />
        ))}
      </div>

      <div className="pin-pad-grid">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            className="pin-key pin-key-digit"
            tabIndex={-1}
            onClick={() => pressDigit(digit)}
          >
            <span>{digit}</span>
          </button>
        ))}

        <button type="button" className="pin-key pin-key-action" tabIndex={-1} onClick={clearAll} aria-label="Clear PIN">
          <span>C</span>
        </button>

        <button type="button" className="pin-key pin-key-digit" tabIndex={-1} onClick={() => pressDigit('0')}>
          <span>0</span>
        </button>

        <button
          type="button"
          className="pin-key pin-key-action"
          tabIndex={-1}
          onClick={backspace}
          aria-label="Delete last digit"
        >
          <Delete size={24} strokeWidth={2} />
        </button>
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
