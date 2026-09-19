import {
  ChevronLeft,
  ChevronRight,
  Pencil,
  RotateCcw,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
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

type PanDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

const BRUSH_COLORS = ['#dc2626', '#2563eb', '#111827'];
const BRUSH_SIZES = [3, 6, 10];

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function clampZoom(value: number) {
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
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
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<Stroke | null>(null);
  const swipeStartXRef = useRef<number | null>(null);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const panDragRef = useRef<PanDrag | null>(null);

  const currentPhoto = photos[currentIndex] ?? null;
  const currentStrokes = useMemo(
    () => currentPhoto ? (strokesByPath[currentPhoto.path] ?? []) : [],
    [currentPhoto, strokesByPath],
  );

  const updatePan = useCallback((next: Point) => {
    panRef.current = next;
    setPan(next);
  }, []);

  const clampPan = useCallback((next: Point, zoomLevel = zoom): Point => {
    const stage = stageRef.current;
    if (!stage || zoomLevel <= MIN_ZOOM) return { x: 0, y: 0 };

    const rect = stage.getBoundingClientRect();
    const maxX = Math.max(0, (rect.width * (zoomLevel - 1)) / 2);
    const maxY = Math.max(0, (rect.height * (zoomLevel - 1)) / 2);

    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }, [zoom]);

  const resetPan = useCallback(() => {
    updatePan({ x: 0, y: 0 });
    panDragRef.current = null;
    setIsPanning(false);
  }, [updatePan]);

  const setPhotoIndex = useCallback((nextIndex: number) => {
    setCurrentIndex(clampIndex(nextIndex, photos.length));
    setZoom(MIN_ZOOM);
    setDrawEnabled(false);
    resetPan();
  }, [photos.length, resetPan]);

  const goPrevious = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((current) => clampIndex(current - 1, photos.length));
    setZoom(MIN_ZOOM);
    setDrawEnabled(false);
    resetPan();
  }, [photos.length, resetPan]);

  const goNext = useCallback(() => {
    if (photos.length <= 1) return;
    setCurrentIndex((current) => clampIndex(current + 1, photos.length));
    setZoom(MIN_ZOOM);
    setDrawEnabled(false);
    resetPan();
  }, [photos.length, resetPan]);

  const zoomIn = () => setZoom((current) => clampZoom(current + ZOOM_STEP));
  const zoomOut = () => setZoom((current) => clampZoom(current - ZOOM_STEP));
  const resetZoom = () => {
    setZoom(MIN_ZOOM);
    resetPan();
  };

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
  }, [currentIndex, zoom, redrawCanvas]);

  useEffect(() => {
    if (zoom <= MIN_ZOOM) {
      resetPan();
      return;
    }

    updatePan(clampPan(panRef.current, zoom));
  }, [zoom, clampPan, resetPan, updatePan]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    const observer = new ResizeObserver(() => {
      redrawCanvas();
      if (zoom > MIN_ZOOM) {
        updatePan(clampPan(panRef.current, zoom));
      }
    });

    observer.observe(stage);
    return () => observer.disconnect();
  }, [clampPan, redrawCanvas, updatePan, zoom]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && zoom === MIN_ZOOM) goPrevious();
      if (event.key === 'ArrowRight' && zoom === MIN_ZOOM) goNext();

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (!currentPhoto) return;
        setStrokesByPath((current) => {
          const existing = current[currentPhoto.path] ?? [];
          if (existing.length === 0) return current;

          return {
            ...current,
            [currentPhoto.path]: existing.slice(0, -1),
          };
        });
      }

      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomIn();
      }

      if (event.key === '-') {
        event.preventDefault();
        zoomOut();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPhoto, goNext, goPrevious, onClose, zoom]);

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

  const undoCurrent = () => {
    if (!currentPhoto) return;

    setStrokesByPath((current) => {
      const existing = current[currentPhoto.path] ?? [];
      if (existing.length === 0) return current;

      return {
        ...current,
        [currentPhoto.path]: existing.slice(0, -1),
      };
    });
  };

  const handleStagePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (drawEnabled) return;

    if (zoom > MIN_ZOOM) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;

      event.currentTarget.setPointerCapture(event.pointerId);
      panDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: panRef.current.x,
        originY: panRef.current.y,
      };
      setIsPanning(true);
      return;
    }

    swipeStartXRef.current = event.clientX;
  };

  const handleStagePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (drawEnabled || zoom <= MIN_ZOOM || !drag || drag.pointerId !== event.pointerId) return;

    event.preventDefault();

    const next = clampPan({
      x: drag.originX + (event.clientX - drag.startX),
      y: drag.originY + (event.clientY - drag.startY),
    });

    updatePan(next);
  };

  const finishStagePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (zoom > MIN_ZOOM) {
      const drag = panDragRef.current;
      if (drag?.pointerId === event.pointerId) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        panDragRef.current = null;
        setIsPanning(false);
      }
      return;
    }

    if (drawEnabled || swipeStartXRef.current === null) return;

    const distance = event.clientX - swipeStartXRef.current;
    swipeStartXRef.current = null;

    if (Math.abs(distance) < 55) return;
    if (distance > 0) goPrevious();
    else goNext();
  };

  const cancelStagePointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panDragRef.current = null;
    swipeStartXRef.current = null;
    setIsPanning(false);
  };

  if (!currentPhoto) return null;

  const zoomPercent = Math.round(zoom * 100);

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
            title="Undo coretan terakhir (Ctrl/Cmd + Z)"
            onClick={undoCurrent}
          >
            <Undo2 size={15}/> Undo
          </button>

          <div className="assignment-image-viewer-zoom" aria-label="Kontrol zoom">
            <button
              type="button"
              aria-label="Zoom out"
              disabled={zoom <= MIN_ZOOM}
              onClick={zoomOut}
            >
              <ZoomOut size={15}/>
            </button>

            <button
              type="button"
              className="assignment-image-viewer-zoom-value"
              title="Reset zoom ke 100%"
              disabled={zoom === MIN_ZOOM}
              onClick={resetZoom}
            >
              {zoomPercent}%
            </button>

            <button
              type="button"
              aria-label="Zoom in"
              disabled={zoom >= MAX_ZOOM}
              onClick={zoomIn}
            >
              <ZoomIn size={15}/>
            </button>

            <button
              type="button"
              aria-label="Reset zoom ke 100%"
              disabled={zoom === MIN_ZOOM}
              onClick={resetZoom}
            >
              <RotateCcw size={14}/>
            </button>
          </div>

          <span className="assignment-image-viewer-note">
            Undo: Ctrl/Cmd+Z · Zoom: + / − · Zoom &gt;100%: klik tahan lalu geser.
          </span>
        </div>

        <div
          ref={stageRef}
          className={`assignment-image-viewer-stage ${drawEnabled ? 'is-drawing' : ''} ${zoom > MIN_ZOOM ? 'is-zoomed' : ''} ${isPanning ? 'is-panning' : ''}`}
          onPointerDown={handleStagePointerDown}
          onPointerMove={handleStagePointerMove}
          onPointerUp={finishStagePointer}
          onPointerCancel={cancelStagePointer}
        >
          <div
            className="assignment-image-viewer-pan-layer"
            style={{
              '--assignment-pan-x': `${pan.x}px`,
              '--assignment-pan-y': `${pan.y}px`,
            } as CSSProperties}
          >
            <div
              className="assignment-image-viewer-zoom-layer"
              style={{ '--assignment-zoom': zoom } as CSSProperties}
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
            </div>
          </div>

          {photos.length > 1 && !drawEnabled && zoom === MIN_ZOOM && (
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
                onClick={() => setPhotoIndex(index)}
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
