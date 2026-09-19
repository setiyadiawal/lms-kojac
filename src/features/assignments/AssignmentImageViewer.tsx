import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Pencil,
  X,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { AssignmentPhoto } from './assignmentPhotos';

type Point = {
  x: number;
  y: number;
};

type Stroke = {
  color: string;
  width: number;
  points: Point[];
};

type AssignmentImageViewerProps = {
  photos: AssignmentPhoto[];
  initialIndex: number;
  studentName: string;
  onClose: () => void;
};

const BRUSH_COLORS = ['#dc2626', '#2563eb', '#111827'];
const BRUSH_SIZES = [3, 6, 10];

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

export function AssignmentImageViewer({
  photos,
  initialIndex,
  studentName,
  onClose,
}: AssignmentImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialIndex, photos.length));
  const [drawEnabled, setDrawEnabled] = useState(false);
  const [brushColor, setBrushColor] = useState(BRUSH_COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [strokesByPath, setStrokesByPath] = useState<Record<string, Stroke[]>>({});

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const swipeStartXRef = useRef<number | null>(null);

  const currentPhoto = photos[currentIndex] ?? null;
  const currentStrokes = useMemo(
    () => currentPhoto ? (strokesByPath[currentPhoto.path] ?? []) : [],
    [currentPhoto, strokesByPath],
  );

  const goPrevious = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((current) => clampIndex(current - 1, photos.length));
  }, [photos.length]);

  const goNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((current) => clampIndex(current + 1, photos.length));
  }, [photos.length]);

  const drawStroke = useCallback((
    context: CanvasRenderingContext2D,
    stroke: Stroke,
    width: number,
    height: number,
  ) => {
    if (stroke.points.length === 0) return;

    context.save();
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();

    stroke.points.forEach((point, index) => {
      const x = point.x * width;
      const y = point.y * height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });

    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      context.lineTo(point.x * width + 0.1, point.y * height + 0.1);
    }

    context.stroke();
    context.restore();
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);

    currentStrokes.forEach((stroke) => drawStroke(context, stroke, rect.width, rect.height));
  }, [currentStrokes, drawStroke]);

  useEffect(() => {
    redrawCanvas();
  }, [currentIndex, redrawCanvas]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new ResizeObserver(() => redrawCanvas());
    observer.observe(stage);
    return () => observer.disconnect();
  }, [redrawCanvas]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goPrevious();
      if (event.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [goNext, goPrevious, onClose]);

  const pointFromEvent = (event: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled || !currentPhoto) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    activeStrokeRef.current = {
      color: brushColor,
      width: brushSize,
      points: [pointFromEvent(event)],
    };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawEnabled || !drawingRef.current || !activeStrokeRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const nextPoint = pointFromEvent(event);
    activeStrokeRef.current.points.push(nextPoint);

    const context = canvas.getContext('2d');
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const points = activeStrokeRef.current.points;
    if (points.length < 2) return;

    const previous = points[points.length - 2];

    context.save();
    context.strokeStyle = activeStrokeRef.current.color;
    context.lineWidth = activeStrokeRef.current.width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(previous.x * rect.width, previous.y * rect.height);
    context.lineTo(nextPoint.x * rect.width, nextPoint.y * rect.height);
    context.stroke();
    context.restore();
  };

  const finishStroke = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || !activeStrokeRef.current || !currentPhoto) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const completed = activeStrokeRef.current;
    drawingRef.current = false;
    activeStrokeRef.current = null;

    setStrokesByPath((current) => ({
      ...current,
      [currentPhoto.path]: [...(current[currentPhoto.path] ?? []), completed],
    }));
  };

  const clearCurrent = () => {
    if (!currentPhoto) return;
    setStrokesByPath((current) => ({
      ...current,
      [currentPhoto.path]: [],
    }));
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawEnabled) return;
    swipeStartXRef.current = event.clientX;
  };

  const handleStagePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawEnabled || swipeStartXRef.current === null) return;

    const distance = event.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;

    if (Math.abs(distance) < 55) return;
    if (distance > 0) goPrevious();
    else goNext();
  };

  if (!currentPhoto) return null;

  return (
    <div
      className="assignment-image-viewer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Galeri jawaban ${studentName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="assignment-image-viewer">
        <header className="assignment-image-viewer-header">
          <div>
            <strong>{studentName}</strong>
            <span>Foto {currentIndex + 1} dari {photos.length}</span>
          </div>

          <button
            type="button"
            className="assignment-image-viewer-close"
            aria-label="Tutup galeri"
            onClick={onClose}
          >
            <X size={20}/>
          </button>
        </header>

        <div className="assignment-image-viewer-toolbar">
          <button
            type="button"
            className={drawEnabled ? 'is-active' : ''}
            onClick={() => setDrawEnabled((current) => !current)}
          >
            <Pencil size={15}/>
            {drawEnabled ? 'Mode Coret Aktif' : 'Coret Foto'}
          </button>

          <div className="assignment-image-viewer-colors" aria-label="Warna coretan">
            {BRUSH_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={brushColor === color ? 'is-active' : ''}
                style={{ '--brush-color': color } as CSSProperties}
                aria-label={`Pilih warna ${color}`}
                onClick={() => {
                  setBrushColor(color);
                  setDrawEnabled(true);
                }}
              />
            ))}
          </div>

          <div className="assignment-image-viewer-sizes" aria-label="Ukuran kuas">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={brushSize === size ? 'is-active' : ''}
                onClick={() => {
                  setBrushSize(size);
                  setDrawEnabled(true);
                }}
              >
                {size}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={currentStrokes.length === 0}
            onClick={clearCurrent}
          >
            <Eraser size={15}/> Hapus Coretan
          </button>

          <span className="assignment-image-viewer-note">
            Coretan tersimpan selama jendela ini masih terbuka.
          </span>
        </div>

        <div
          ref={stageRef}
          className={`assignment-image-viewer-stage ${drawEnabled ? 'is-drawing' : ''}`}
          onPointerDown={handleStagePointerDown}
          onPointerUp={handleStagePointerUp}
        >
          <img
            src={currentPhoto.signedUrl}
            alt={`Foto jawaban ${currentIndex + 1} dari ${studentName}`}
            draggable={false}
            onLoad={redrawCanvas}
          />

          <canvas
            ref={canvasRef}
            className="assignment-image-viewer-canvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />

          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="assignment-image-viewer-nav is-prev"
                aria-label="Foto sebelumnya"
                onClick={goPrevious}
              >
                <ChevronLeft size={28}/>
              </button>

              <button
                type="button"
                className="assignment-image-viewer-nav is-next"
                aria-label="Foto berikutnya"
                onClick={goNext}
              >
                <ChevronRight size={28}/>
              </button>
            </>
          )}
        </div>

        {photos.length > 1 && (
          <div className="assignment-image-viewer-thumbnails" aria-label="Thumbnail galeri">
            {photos.map((photo, index) => (
              <button
                key={photo.path}
                type="button"
                className={currentIndex === index ? 'is-active' : ''}
                aria-label={`Buka foto ${index + 1}`}
                onClick={() => setCurrentIndex(index)}
              >
                <img src={photo.signedUrl} alt=""/>
                <span>{index + 1}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
