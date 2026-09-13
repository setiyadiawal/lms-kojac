import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Eraser, RotateCcw } from 'lucide-react';

type Point = { x: number; y: number };

export function KanjiWritingPractice({ character }: { character: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const cssSizeRef = useRef(0);
  const [message, setMessage] = useState('Ikuti bentuk Kanji tipis sebagai panduan.');

  function canvasContext() {
    return canvasRef.current?.getContext('2d') ?? null;
  }

  function configureContext(context: CanvasRenderingContext2D, size: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const color = getComputedStyle(canvas).getPropertyValue('--maroon').trim() || '#7a1f2b';
    context.strokeStyle = color;
    context.lineWidth = Math.max(4, Math.min(7, size * 0.022));
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  function resizeCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const size = Math.max(1, Math.min(rect.width, rect.height || rect.width));
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    const oldCssSize = cssSizeRef.current;
    let snapshot: HTMLCanvasElement | null = null;

    if (oldWidth > 0 && oldHeight > 0 && oldCssSize > 0) {
      snapshot = document.createElement('canvas');
      snapshot.width = oldWidth;
      snapshot.height = oldHeight;
      snapshot.getContext('2d')?.drawImage(canvas, 0, 0);
    }

    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    cssSizeRef.current = size;

    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    configureContext(context, size);

    if (snapshot) {
      context.drawImage(snapshot, 0, 0, snapshot.width, snapshot.height, 0, 0, size, size);
    }
  }

  function clearDrawing(nextMessage: string) {
    const canvas = canvasRef.current;
    const context = canvasContext();
    if (!canvas || !context) return;
    const size = cssSizeRef.current || canvas.getBoundingClientRect().width;
    context.clearRect(0, 0, size, size);
    setMessage(nextMessage);
  }

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();

    const context = canvasContext();
    if (!context) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    drawingRef.current = true;
    lastPointRef.current = point;
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.lineTo(point.x + 0.01, point.y + 0.01);
    context.stroke();
    setMessage('Sedang berlatih menulis…');
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();

    const context = canvasContext();
    const previous = lastPointRef.current;
    if (!context || !previous) return;

    const point = pointFromEvent(event);
    const midpoint = {
      x: (previous.x + point.x) / 2,
      y: (previous.y + point.y) / 2,
    };

    context.quadraticCurveTo(previous.x, previous.y, midpoint.x, midpoint.y);
    context.stroke();
    lastPointRef.current = point;
  }

  function finishPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    event.preventDefault();

    drawingRef.current = false;
    lastPointRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setMessage('Goresan tersimpan sementara di area latihan ini.');
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    resizeCanvas();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => resizeCanvas()) : null;
    observer?.observe(canvas);
    window.addEventListener('resize', resizeCanvas);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    clearDrawing('Ikuti bentuk Kanji tipis sebagai panduan.');
  }, [character]);

  return (
    <section className="kanji-learning-section kanji-practice-section" aria-labelledby="kanji-practice-title">
      <div className="kanji-learning-heading">
        <div>
          <p className="eyebrow">LATIHAN GORESAN</p>
          <h3 id="kanji-practice-title">Latihan Menulis {character}</h3>
        </div>
        <span>Mouse · Stylus · Touch</span>
      </div>

      <div className="kanji-practice-shell">
        <div className="kanji-practice-board">
          <div className="kanji-practice-guide" aria-hidden="true">{character}</div>
          <span className="kanji-practice-grid-line vertical" aria-hidden="true" />
          <span className="kanji-practice-grid-line horizontal" aria-hidden="true" />
          <canvas
            ref={canvasRef}
            className="kanji-practice-canvas"
            aria-label={`Area latihan menulis Kanji ${character}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
          />
        </div>

        <div className="kanji-practice-actions">
          <button type="button" onClick={() => clearDrawing('Goresan dihapus. Guide Kanji tetap tersedia.')}>
            <Eraser size={16} /> Hapus
          </button>
          <button type="button" onClick={() => clearDrawing('Latihan diulang dari kondisi awal.')}>
            <RotateCcw size={15} /> Ulangi
          </button>
        </div>
      </div>

      <p className="kanji-practice-status" aria-live="polite">{message}</p>
      <p className="kanji-source-note">Phase A hanya free drawing dengan guide dan grid. Belum ada validasi bentuk atau urutan goresan agar sistem tidak memberi penilaian palsu.</p>
    </section>
  );
}
