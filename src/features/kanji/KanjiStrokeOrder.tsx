import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { ExternalLink, RotateCcw } from 'lucide-react';

type KanjiStroke = {
  order: number;
  d: string;
  numberX: number;
  numberY: number;
};

type KanjiStrokeData = {
  character: string;
  strokes: KanjiStroke[];
};

type StrokeDelayStyle = CSSProperties & {
  '--kanji-stroke-delay': string;
};

const KANJIVG_RELEASE = 'r20250816';
const KANJIVG_BASE = `https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@${KANJIVG_RELEASE}/kanji`;
const CACHE_PREFIX = `kojac:kanjivg:${KANJIVG_RELEASE}`;
const STROKE_STEP_MS = 720;
const HOLD_MS = 1100;
const memoryCache = new Map<string, KanjiStrokeData>();

function codepointFile(character: string) {
  const codepoint = character.codePointAt(0);
  if (codepoint === undefined) throw new Error('Karakter Kanji tidak valid.');
  return `${codepoint.toString(16).toLowerCase().padStart(5, '0')}.svg`;
}

function strokeOrderFromId(id: string | null) {
  if (!id) return null;
  const match = id.match(/-s(\d+)$/);
  return match ? Number(match[1]) : null;
}

function firstMovePoint(d: string): { x: number; y: number } | null {
  const match = d.match(/^\s*[Mm]\s*([-+]?(?:\d+\.?\d*|\.\d+))\s*[, ]\s*([-+]?(?:\d+\.?\d*|\.\d+))/);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function clampMarker(value: number) {
  return Math.min(104, Math.max(5, value));
}

function parseTransformPoint(transform: string | null): { x: number; y: number } | null {
  if (!transform) return null;

  const matrix = transform.match(/matrix\(\s*[-+\d.eE]+[ ,]+[-+\d.eE]+[ ,]+[-+\d.eE]+[ ,]+[-+\d.eE]+[ ,]+([-+\d.eE]+)[ ,]+([-+\d.eE]+)\s*\)/);
  if (matrix) {
    const x = Number(matrix[1]);
    const y = Number(matrix[2]);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }

  const translate = transform.match(/translate\(\s*([-+\d.eE]+)(?:[ ,]+([-+\d.eE]+))?\s*\)/);
  if (translate) {
    const x = Number(translate[1]);
    const y = Number(translate[2] ?? 0);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  }

  return null;
}

function parseKanjiVG(character: string, svgText: string): KanjiStrokeData {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(svgText, 'image/svg+xml');

  if (documentNode.querySelector('parsererror')) {
    throw new Error(`Data urutan goresan ${character} tidak dapat dibaca.`);
  }

  const explicitNumbers = new Map<number, { x: number; y: number }>();
  for (const node of Array.from(documentNode.querySelectorAll('text'))) {
    const order = Number(node.textContent?.trim());
    if (!Number.isInteger(order) || order <= 0) continue;

    const transformed = parseTransformPoint(node.getAttribute('transform'));
    const xAttr = Number(node.getAttribute('x'));
    const yAttr = Number(node.getAttribute('y'));
    const point = transformed ?? (
      Number.isFinite(xAttr) && Number.isFinite(yAttr)
        ? { x: xAttr, y: yAttr }
        : null
    );

    if (point) explicitNumbers.set(order, point);
  }

  const strokes = Array.from(documentNode.querySelectorAll('path')).flatMap((path) => {
    const order = strokeOrderFromId(path.getAttribute('id'));
    const d = path.getAttribute('d')?.trim() ?? '';
    if (!order || !d) return [];

    const explicit = explicitNumbers.get(order);
    const start = firstMovePoint(d);
    const numberX = clampMarker(explicit?.x ?? ((start?.x ?? 10) - 3));
    const numberY = clampMarker(explicit?.y ?? ((start?.y ?? 10) - 3));

    return [{ order, d, numberX, numberY }];
  }).sort((a, b) => a.order - b.order);

  const uniqueOrders = new Set(strokes.map((stroke) => stroke.order));
  if (!strokes.length || uniqueOrders.size !== strokes.length) {
    throw new Error(`Data urutan goresan ${character} tidak lengkap.`);
  }

  return { character, strokes };
}

async function fetchKanjiStrokeData(character: string, signal: AbortSignal) {
  const cached = memoryCache.get(character);
  if (cached) return cached;

  const filename = codepointFile(character);
  const storageKey = `${CACHE_PREFIX}:${filename}`;

  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = parseKanjiVG(character, stored);
      memoryCache.set(character, parsed);
      return parsed;
    }
  } catch {
    // Cache browser bersifat opsional dan tidak boleh memblokir materi.
  }

  let response: Response;
  try {
    response = await fetch(`${KANJIVG_BASE}/${filename}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Data urutan goresan tidak dapat diambil. Periksa koneksi internet.');
  }

  if (!response.ok) {
    throw new Error(`Data urutan goresan belum tersedia (${response.status}).`);
  }

  const svgText = await response.text();
  const parsed = parseKanjiVG(character, svgText);
  memoryCache.set(character, parsed);

  try {
    localStorage.setItem(storageKey, svgText);
  } catch {
    // Private mode / quota cache tidak memengaruhi fungsi utama.
  }

  return parsed;
}

function delayStyle(index: number): StrokeDelayStyle {
  return { '--kanji-stroke-delay': `${index * (STROKE_STEP_MS / 1000)}s` };
}

export function KanjiStrokeOrder({ character, expectedStrokeCount }: { character: string; expectedStrokeCount: number }) {
  const [data, setData] = useState<KanjiStrokeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setData(null);
    setError(null);

    void fetchKanjiStrokeData(character, controller.signal)
      .then((result) => {
        if (!active || controller.signal.aborted) return;

        if (expectedStrokeCount > 0 && result.strokes.length !== expectedStrokeCount) {
          setError(`Data sumber memiliki ${result.strokes.length} goresan, sementara data KOJAC mencatat ${expectedStrokeCount}. Animasi dinonaktifkan agar tidak menampilkan urutan yang meragukan.`);
          setLoading(false);
          return;
        }

        setData(result);
        setLoading(false);
        setReplayKey((value) => value + 1);
      })
      .catch((reason: unknown) => {
        if (!active || controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : 'Data urutan goresan belum tersedia.');
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [character, expectedStrokeCount]);

  useEffect(() => {
    if (!data) return undefined;
    const cycleMs = data.strokes.length * STROKE_STEP_MS + HOLD_MS;
    const timer = window.setTimeout(() => setReplayKey((value) => value + 1), cycleMs);
    return () => window.clearTimeout(timer);
  }, [data, replayKey]);

  const countLabel = useMemo(() => {
    if (loading) return 'Memuat data goresan…';
    if (data) return `${data.strokes.length} goresan · autoplay`;
    return `${expectedStrokeCount || '—'} goresan`;
  }, [data, expectedStrokeCount, loading]);

  return (
    <section className="kanji-learning-section kanji-stroke-section" aria-labelledby="kanji-stroke-title">
      <div className="kanji-learning-heading">
        <div>
          <p className="eyebrow">URUTAN GORESAN</p>
          <h3 id="kanji-stroke-title">Cara Menulis {character}</h3>
        </div>
        <span>{countLabel}</span>
      </div>

      <div className="kanji-stroke-panel">
        <div className="kanji-stroke-canvas-wrap">
          {loading && <div className="kanji-stroke-loading" aria-label="Memuat urutan goresan">{character}</div>}

          {!loading && data && (
            <svg
              key={`${character}-${replayKey}`}
              className="kanji-stroke-svg"
              viewBox="0 0 109 109"
              role="img"
              aria-label={`Animasi urutan goresan Kanji ${character}`}
            >
              <g className="kanji-stroke-grid" aria-hidden="true">
                <line x1="54.5" y1="4" x2="54.5" y2="105" />
                <line x1="4" y1="54.5" x2="105" y2="54.5" />
              </g>

              <g aria-hidden="true">
                {data.strokes.map((stroke) => (
                  <path key={`ghost-${stroke.order}`} className="kanji-stroke-ghost" d={stroke.d} />
                ))}
              </g>

              <g>
                {data.strokes.map((stroke, index) => (
                  <path
                    key={`stroke-${stroke.order}`}
                    className="kanji-stroke-animated"
                    d={stroke.d}
                    pathLength={1}
                    style={delayStyle(index)}
                  />
                ))}
              </g>

              <g className="kanji-stroke-numbers" aria-hidden="true">
                {data.strokes.map((stroke, index) => (
                  <g key={`number-${stroke.order}`} style={delayStyle(index)}>
                    <circle cx={stroke.numberX} cy={stroke.numberY} r="4.2" />
                    <text x={stroke.numberX} y={stroke.numberY + 1.7} textAnchor="middle">{stroke.order}</text>
                  </g>
                ))}
              </g>
            </svg>
          )}

          {!loading && !data && (
            <div className="kanji-stroke-fallback">
              <strong>{character}</strong>
              <span>Data urutan goresan belum dapat ditampilkan.</span>
              {error && <small>{error}</small>}
            </div>
          )}
        </div>

        <div className="kanji-stroke-actions">
          <button type="button" onClick={() => setReplayKey((value) => value + 1)} disabled={!data || loading}>
            <RotateCcw size={15} /> Ulangi Animasi
          </button>
          <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer">
            KanjiVG <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <p className="kanji-source-note">
        Data stroke menggunakan KanjiVG release {KANJIVG_RELEASE.replace(/^r/, '')} (CC BY-SA 3.0). Jika jumlah goresan sumber tidak cocok dengan metadata KOJAC, animasi sengaja tidak ditampilkan.
      </p>
    </section>
  );
}
