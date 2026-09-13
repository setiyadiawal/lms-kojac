import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import '../hiragana/stroke-order-v1.css';

type StrokePart = {
  id: string;
  value: string;
};

type MedianPart = {
  id: string;
  value: [number, number][];
};

type KanaStrokeData = {
  charCode: number;
  strokes: StrokePart[];
  clipPaths: StrokePart[];
  medians: MedianPart[];
};

type LoadedGlyph = {
  char: string;
  data: KanaStrokeData | null;
  error: string | null;
};

type ReadyGlyph = LoadedGlyph & {
  data: KanaStrokeData;
};

const memoryCache = new Map<string, KanaStrokeData>();
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/kana-svg-data@0.0.2/dist/katakana';
const CACHE_VERSION = 'v1-katakana-stable';
const STROKE_STEP_MS = 720;
const FIRST_STROKE_DELAY_MS = 180;
const STROKE_DRAW_MS = 680;
const LOOP_PAUSE_MS = 1000;

// Yōon tetap satu unit belajar. Untuk gambar goresan, huruf kecil memakai bentuk
// penuh sebagai sumber lalu dikecilkan SATU kali oleh viewport SVG. Ini mencegah
// double-scaling yang pernah membuat ゃ / ゅ / ょ terlalu kecil/aneh.
const SMALL_YOON_TO_SOURCE: Readonly<Record<string, string>> = {
  'ャ': 'ヤ',
  'ュ': 'ユ',
  'ョ': 'ヨ',
};

function strokeNumber(id: string): number {
  const match = id.match(/^(\d+)/);
  return match ? Number(match[1]) : 0;
}

function strokeCount(data: KanaStrokeData): number {
  return new Set(
    data.strokes
      .map((stroke) => strokeNumber(stroke.id))
      .filter((value) => value > 0),
  ).size;
}

function isStrokePart(value: unknown): value is StrokePart {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StrokePart>;
  return typeof candidate.id === 'string' && typeof candidate.value === 'string';
}

function isMedianPart(value: unknown): value is MedianPart {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MedianPart>;

  return typeof candidate.id === 'string'
    && Array.isArray(candidate.value)
    && candidate.value.every(
      (point) => Array.isArray(point)
        && point.length >= 2
        && typeof point[0] === 'number'
        && typeof point[1] === 'number'
        && Number.isFinite(point[0])
        && Number.isFinite(point[1]),
    );
}

function isKanaStrokeData(value: unknown): value is KanaStrokeData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<KanaStrokeData>;

  return typeof candidate.charCode === 'number'
    && Array.isArray(candidate.strokes)
    && candidate.strokes.every(isStrokePart)
    && Array.isArray(candidate.clipPaths)
    && candidate.clipPaths.every(isStrokePart)
    && Array.isArray(candidate.medians)
    && candidate.medians.every(isMedianPart);
}

function isReadyGlyph(glyph: LoadedGlyph): glyph is ReadyGlyph {
  return glyph.data !== null;
}

function isYoon(chars: readonly string[]): boolean {
  return chars.length === 2 && Object.prototype.hasOwnProperty.call(SMALL_YOON_TO_SOURCE, chars[1]);
}

function sourceChar(displayChar: string, useFullYoonSource: boolean): string {
  if (!useFullYoonSource) return displayChar;
  return SMALL_YOON_TO_SOURCE[displayChar] ?? displayChar;
}

async function getStrokeData(
  displayChar: string,
  options: { useFullYoonSource?: boolean; signal?: AbortSignal } = {},
): Promise<KanaStrokeData> {
  const { useFullYoonSource = false, signal } = options;
  const source = sourceChar(displayChar, useFullYoonSource);
  const cacheKey = `${source}:${useFullYoonSource ? 'yoon-full-source' : 'native'}`;

  const memory = memoryCache.get(cacheKey);
  if (memory) return memory;

  const codePoint = source.codePointAt(0);
  if (codePoint === undefined) {
    throw new Error(`Karakter ${displayChar} tidak valid.`);
  }

  const storageKey = `kojac:kana-stroke:${CACHE_VERSION}:${cacheKey}:${codePoint}`;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isKanaStrokeData(parsed)) {
        memoryCache.set(cacheKey, parsed);
        return parsed;
      }
      localStorage.removeItem(storageKey);
    }
  } catch {
    // localStorage opsional; error cache tidak boleh memblokir materi.
  }

  let response: Response;
  try {
    response = await fetch(`${CDN_BASE}/${encodeURIComponent(source)}.json`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error(`Tidak dapat mengambil data goresan ${displayChar}. Periksa koneksi internet.`);
  }

  if (!response.ok) {
    throw new Error(`Data goresan ${displayChar} tidak tersedia (${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Data goresan ${displayChar} tidak dapat dibaca.`);
  }

  if (!isKanaStrokeData(payload)) {
    throw new Error(`Format data goresan ${displayChar} tidak valid.`);
  }

  memoryCache.set(cacheKey, payload);
  try {
    localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Abaikan private mode/quota.
  }

  return payload;
}

function firstMedianByStroke(data: KanaStrokeData): Map<number, MedianPart> {
  const result = new Map<number, MedianPart>();

  for (const median of data.medians) {
    const order = strokeNumber(median.id);
    if (order <= 0 || result.has(order) || median.value.length === 0) continue;
    result.set(order, median);
  }

  return result;
}

export function KatakanaStrokeOrder({ text }: { text: string }) {
  const trimmedText = text.trim();
  const chars = useMemo(() => Array.from(trimmedText), [trimmedText]);
  const yoon = useMemo(() => isYoon(chars), [chars]);
  const componentId = useId().replace(/:/g, '');
  const cardRef = useRef<HTMLDivElement>(null);

  const [glyphs, setGlyphs] = useState<LoadedGlyph[]>([]);
  const [loading, setLoading] = useState(chars.length > 0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || typeof document === 'undefined' || typeof window === 'undefined') {
      return undefined;
    }

    let isInViewport = true;
    const syncActiveState = () => setIsActive(isInViewport && !document.hidden);

    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          isInViewport = entry?.isIntersecting ?? true;
          syncActiveState();
        }, { threshold: 0.05 })
      : null;

    observer?.observe(card);
    document.addEventListener('visibilitychange', syncActiveState);
    syncActiveState();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', syncActiveState);
    };
  }, []);

  useEffect(() => {
    if (chars.length === 0) {
      setGlyphs([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setGlyphs([]);

    void Promise.all(
      chars.map(async (char, index): Promise<LoadedGlyph> => {
        try {
          const data = await getStrokeData(char, {
            useFullYoonSource: yoon && index === 1,
            signal: controller.signal,
          });
          return { char, data, error: null };
        } catch (error) {
          if (controller.signal.aborted) {
            return { char, data: null, error: null };
          }
          return {
            char,
            data: null,
            error: error instanceof Error ? error.message : 'Data goresan gagal dimuat.',
          };
        }
      }),
    ).then((result) => {
      if (!active || controller.signal.aborted) return;
      setGlyphs(result);
      setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
  }, [chars, yoon]);

  const readyGlyphs = useMemo(() => glyphs.filter(isReadyGlyph), [glyphs]);
  const totalStrokes = useMemo(
    () => readyGlyphs.reduce((sum, glyph) => sum + strokeCount(glyph.data), 0),
    [readyGlyphs],
  );
  const glyphsMatchCurrentKana = glyphs.length === chars.length
    && glyphs.every((glyph, index) => glyph.char === chars[index]);
  const hasAllData = !loading
    && chars.length > 0
    && glyphsMatchCurrentKana
    && readyGlyphs.length === chars.length;

  useLayoutEffect(() => {
    if (!isActive || !hasAllData || totalStrokes <= 0) return undefined;

    const card = cardRef.current;
    if (!card || typeof window === 'undefined') return undefined;

    const paths = Array.from(card.querySelectorAll<SVGPathElement>('.stroke-animated-line'));

    if (paths.length === 0) return undefined;

    const strokeOrders = paths.map((path) => Math.max(Number(path.dataset.strokeOrder ?? 1), 1));
    const lastStrokeOrder = Math.max(...strokeOrders);

    let timeoutId: number | undefined;
    let cancelled = false;
    let runningAnimations: Animation[] = [];

    const pathLengths = paths.map((path) => {
      const length = Math.max(path.getTotalLength(), 1);
      path.style.strokeDasharray = `${length}`;
      path.style.strokeDashoffset = `${length}`;
      return length;
    });

    const stopAnimations = () => {
      runningAnimations.forEach((animation) => animation.cancel());
      runningAnimations = [];
    };

    const resetPaths = () => {
      stopAnimations();
      paths.forEach((path, index) => {
        path.style.strokeDasharray = `${pathLengths[index]}`;
        path.style.strokeDashoffset = `${pathLengths[index]}`;
      });
    };

    const runCycle = () => {
      if (cancelled) return;
      resetPaths();

      runningAnimations = paths.map((path, index) => {
        const length = pathLengths[index];
        const strokeOrder = strokeOrders[index];
        return path.animate(
          [
            { strokeDashoffset: `${length}` },
            { strokeDashoffset: '0' },
          ],
          {
            duration: STROKE_DRAW_MS,
            delay: FIRST_STROKE_DELAY_MS + (strokeOrder - 1) * STROKE_STEP_MS,
            easing: 'linear',
            fill: 'forwards',
          },
        );
      });

      const lastStrokeStartMs = FIRST_STROKE_DELAY_MS + Math.max(lastStrokeOrder - 1, 0) * STROKE_STEP_MS;
      const cycleMs = lastStrokeStartMs + STROKE_DRAW_MS + LOOP_PAUSE_MS;
      timeoutId = window.setTimeout(runCycle, cycleMs);
    };

    runCycle();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      resetPaths();
    };
  }, [hasAllData, isActive, totalStrokes, trimmedText]);

  if (chars.length === 0) return null;

  return (
    <div ref={cardRef} className="stroke-order-card stroke-order-v1">
      <div className="stroke-order-heading">
        <span>Urutan goresan</span>
        <strong>
          {loading ? 'Memuat…' : hasAllData ? `${totalStrokes} goresan` : 'Data tidak lengkap'}
        </strong>
      </div>

      <div className="stroke-glyph-list">
        {loading && <div className="stroke-skeleton">書</div>}

        {!loading && glyphsMatchCurrentKana && yoon && hasAllData && (
          <div className="stroke-glyph-wrap">
            <YoonStrokeSvg
              glyphs={readyGlyphs}
              instance={`${componentId}-yoon`}
              text={trimmedText}
            />
          </div>
        )}

        {!loading && glyphsMatchCurrentKana && !yoon && glyphs.map((glyph, index) => (
          <div className="stroke-glyph-wrap" key={`${glyph.char}-${index}`}>
            {glyph.data ? (
              <>
                <KanaStrokeSvg
                  data={glyph.data}
                  instance={`${componentId}-${index}`}
                />
              </>
            ) : (
              <StrokeError glyph={glyph} />
            )}
          </div>
        ))}

        {!loading && glyphsMatchCurrentKana && yoon && !hasAllData && (
          <div className="stroke-error-group">
            {glyphs.filter((glyph) => !glyph.data).map((glyph, index) => (
              <StrokeError glyph={glyph} key={`${glyph.char}-${index}`} />
            ))}
          </div>
        )}
      </div>

      {yoon && hasAllData && (
        <p className="stroke-combination-note">
          <strong>{trimmedText}</strong> dipelajari sebagai <strong>satu kesatuan</strong>. Nomor goresan
          berlanjut dari huruf pertama ke huruf kecil berikutnya.
        </p>
      )}

    </div>
  );
}

function StrokeError({ glyph }: { glyph: LoadedGlyph }) {
  return (
    <div className="stroke-error">
      <strong>{glyph.char}</strong>
      <span>{glyph.error ?? 'Data goresan tidak tersedia.'}</span>
    </div>
  );
}

type GlyphContentProps = {
  data: KanaStrokeData;
  prefix: string;
  numberOffset?: number;
  showGuide?: boolean;
};

function GlyphContent({
  data,
  prefix,
  numberOffset = 0,
  showGuide = true,
}: GlyphContentProps) {
  const orders = Array.from(
    new Set(
      data.strokes
        .map((stroke) => strokeNumber(stroke.id))
        .filter((value) => value > 0),
    ),
  ).sort((a, b) => a - b);
  const medians = firstMedianByStroke(data);

  return (
    <>
      <defs>
        {data.strokes.map(({ id, value }) => (
          <clipPath key={id} id={`${prefix}-clip-${id}`} clipPathUnits="userSpaceOnUse">
            <path d={value} />
          </clipPath>
        ))}
      </defs>

      {showGuide && (
        <g className="stroke-guide-grid" aria-hidden="true">
          <line x1="512" y1="80" x2="512" y2="944" />
          <line x1="80" y1="512" x2="944" y2="512" />
        </g>
      )}

      {data.strokes.map(({ id, value }) => (
        <path key={`ghost-${id}`} d={value} className="stroke-ghost-shape" />
      ))}

      {data.clipPaths.map(({ id, value }) => {
        const order = strokeNumber(id);
        const globalOrder = numberOffset + Math.max(order, 1);

        return (
          <path
            key={`draw-${id}`}
            d={value}
            clipPath={`url(#${prefix}-clip-${id})`}
            className="stroke-animated-line"
            data-stroke-order={globalOrder}
          />
        );
      })}

      {orders.map((order) => {
        const median = medians.get(order);
        if (!median?.value[0]) return null;

        const [x, y] = median.value[0];
        return (
          <g
            key={`number-${order}`}
            className="stroke-number-marker"
            transform={`translate(${x} ${y})`}
          >
            <circle r="42" />
            <text y="15" textAnchor="middle">
              {numberOffset + order}
            </text>
          </g>
        );
      })}
    </>
  );
}

function KanaStrokeSvg({ data, instance }: { data: KanaStrokeData; instance: string }) {
  const safeInstance = instance.replace(/[^a-zA-Z0-9_-]/g, '');

  return (
    <svg
      className="kana-stroke-svg"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={`${strokeCount(data)} langkah urutan goresan`}
      preserveAspectRatio="xMidYMid meet"
    >
      <GlyphContent data={data} prefix={`kojac-${safeInstance}`} />
    </svg>
  );
}

function YoonStrokeSvg({
  glyphs,
  instance,
  text,
}: {
  glyphs: ReadyGlyph[];
  instance: string;
  text: string;
}) {
  const mainGlyph = glyphs[0];
  const smallGlyph = glyphs[1];
  if (!mainGlyph || !smallGlyph) return null;

  const safeInstance = instance.replace(/[^a-zA-Z0-9_-]/g, '');
  const mainCount = strokeCount(mainGlyph.data);
  const totalCount = mainCount + strokeCount(smallGlyph.data);

  return (
    <svg
      className="kana-stroke-svg"
      viewBox="0 0 1024 1024"
      role="img"
      aria-label={`${totalCount} langkah urutan goresan untuk ${text}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <g className="stroke-guide-grid" aria-hidden="true">
        <line x1="512" y1="80" x2="512" y2="944" />
        <line x1="80" y1="512" x2="944" y2="512" />
      </g>

      {/* Dua viewport di dalam SATU kotak. Bentuk SVG tiap kana tidak ditransform
          manual, jadi clipping dan proporsi aslinya tetap stabil. */}
      <svg
        x="18"
        y="118"
        width="670"
        height="670"
        viewBox="0 0 1024 1024"
        preserveAspectRatio="xMidYMid meet"
        overflow="hidden"
        aria-hidden="true"
      >
        <GlyphContent
          data={mainGlyph.data}
          prefix={`kojac-${safeInstance}-main`}
          numberOffset={0}
          showGuide={false}
        />
      </svg>

      <svg
        x="522"
        y="430"
        width="458"
        height="458"
        viewBox="0 0 1024 1024"
        preserveAspectRatio="xMidYMid meet"
        overflow="hidden"
        aria-hidden="true"
      >
        <GlyphContent
          data={smallGlyph.data}
          prefix={`kojac-${safeInstance}-small`}
          numberOffset={mainCount}
          showGuide={false}
        />
      </svg>
    </svg>
  );
}
