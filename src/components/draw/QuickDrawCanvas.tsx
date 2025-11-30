import { useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { DrawingData } from '../../types';

interface QuickDrawCanvasProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (drawing: DrawingData) => void;
}

interface Point {
  x: number;
  y: number;
}

export function QuickDrawCanvas({ isOpen, onClose, onSend }: QuickDrawCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const lastPointRef = useRef<Point | null>(null);

  // Color and pen state
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(20);
  const [penSize, setPenSize] = useState(4);

  // Undo history
  const [history, setHistory] = useState<ImageData[]>([]);
  const isStrokeStartRef = useRef(false);

  // Long press detection for fill
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressPosRef = useRef<Point | null>(null);
  const fillTargetColorRef = useRef<{ r: number; g: number; b: number } | null>(null);
  const LONG_PRESS_DURATION = 400; // ms

  // Canvas dimensions - bigger now
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 300;

  // Device pixel ratio for sharp rendering
  const dprRef = useRef(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);

  // Get current color as HSL string
  const getCurrentColor = useCallback(() => {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [hue, saturation, lightness]);

  // Initialize canvas with DPR scaling
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const dpr = dprRef.current;

      // Set the canvas internal size scaled by DPR
      canvas.width = CANVAS_WIDTH * dpr;
      canvas.height = CANVAS_HEIGHT * dpr;

      if (ctx) {
        // Scale the context to account for DPR
        ctx.scale(dpr, dpr);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setHasContent(false);
      setHistory([]);
    }
  }, [isOpen]);

  // Update stroke style when color or size changes
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = getCurrentColor();
      ctx.lineWidth = penSize;
    }
  }, [hue, saturation, lightness, penSize, getCurrentColor]);

  const getCanvasPoint = useCallback((e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    // Since we scale the context by DPR, we use logical dimensions for scaling
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;

    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  // Save current canvas state to history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = dprRef.current;
    const imageData = ctx.getImageData(0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);
    setHistory(prev => [...prev, imageData]);
  }, []);

  // Undo last action
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = dprRef.current;
    const newHistory = [...history];
    const previousState = newHistory.pop();

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);

      // Check if canvas is empty (all white)
      const checkData = ctx.getImageData(0, 0, CANVAS_WIDTH * dpr, CANVAS_HEIGHT * dpr);
      let isEmpty = true;
      for (let i = 0; i < checkData.data.length; i += 4) {
        if (checkData.data[i] !== 255 || checkData.data[i + 1] !== 255 || checkData.data[i + 2] !== 255) {
          isEmpty = false;
          break;
        }
      }
      setHasContent(!isEmpty);
    }
  }, [history]);

  // Flood fill algorithm
  const floodFill = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !fillTargetColorRef.current) return;

    const dpr = dprRef.current;
    const width = CANVAS_WIDTH * dpr;
    const height = CANVAS_HEIGHT * dpr;

    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Use the stored target color (sampled before dot was drawn)
    const startR = fillTargetColorRef.current.r;
    const startG = fillTargetColorRef.current.g;
    const startB = fillTargetColorRef.current.b;

    // Parse current color to RGB
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 1;
    tempCanvas.height = 1;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;
    tempCtx.fillStyle = getCurrentColor();
    tempCtx.fillRect(0, 0, 1, 1);
    const fillColorData = tempCtx.getImageData(0, 0, 1, 1).data;
    const fillR = fillColorData[0];
    const fillG = fillColorData[1];
    const fillB = fillColorData[2];

    // Don't fill if target is same as fill color
    if (startR === fillR && startG === fillG && startB === fillB) return;

    const colorMatch = (idx: number) => {
      return (
        Math.abs(data[idx] - startR) < 10 &&
        Math.abs(data[idx + 1] - startG) < 10 &&
        Math.abs(data[idx + 2] - startB) < 10
      );
    };

    const setColor = (idx: number) => {
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      data[idx + 3] = 255;
    };

    // Get start position from stored long press position
    if (!longPressPosRef.current) return;
    const sx = Math.floor(longPressPosRef.current.x * dpr);
    const sy = Math.floor(longPressPosRef.current.y * dpr);

    // BFS flood fill
    const stack: [number, number][] = [[sx, sy]];
    const visited = new Set<string>();

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      if (visited.has(key)) continue;

      const idx = (y * width + x) * 4;
      if (!colorMatch(idx)) continue;

      visited.add(key);
      setColor(idx);

      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    ctx.putImageData(imageData, 0, 0);
    setHasContent(true);
  }, [getCurrentColor]);

  // Cancel long press timer
  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressPosRef.current = null;
    fillTargetColorRef.current = null;
  }, []);

  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const point = getCanvasPoint(e);
      lastPointRef.current = point;
      isStrokeStartRef.current = true;

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      const dpr = dprRef.current;

      // Sample the color at touch point BEFORE drawing (for flood fill)
      const px = Math.floor(point.x * dpr);
      const py = Math.floor(point.y * dpr);
      const pixelData = ctx.getImageData(px, py, 1, 1).data;
      fillTargetColorRef.current = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };

      // Save state before drawing (only once per stroke)
      saveToHistory();

      // Set up long press detection for fill
      longPressPosRef.current = point;
      longPressTimerRef.current = setTimeout(() => {
        if (longPressPosRef.current) {
          // Long press detected - do fill
          floodFill();
          cancelLongPress();
          setIsDrawing(false);
        }
      }, LONG_PRESS_DURATION);

      setIsDrawing(true);

      ctx.strokeStyle = getCurrentColor();
      ctx.lineWidth = penSize;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      setHasContent(true);
    },
    [getCanvasPoint, getCurrentColor, penSize, saveToHistory, floodFill, cancelLongPress]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || !lastPointRef.current) return;
      e.preventDefault();

      const point = getCanvasPoint(e);

      // Cancel long press if user moves significantly
      if (longPressPosRef.current) {
        const dx = point.x - longPressPosRef.current.x;
        const dy = point.y - longPressPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          cancelLongPress();
        }
      }

      const ctx = canvasRef.current?.getContext('2d');

      if (ctx) {
        ctx.beginPath();
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }

      lastPointRef.current = point;
      setHasContent(true);
    },
    [isDrawing, getCanvasPoint, cancelLongPress]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
    cancelLongPress();
  }, [cancelLongPress]);

  const handleClear = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      // Save state before clear for undo
      if (hasContent) {
        saveToHistory();
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    setHasContent(false);
  }, [hasContent, saveToHistory]);

  const handleSend = useCallback(() => {
    if (!canvasRef.current || !hasContent) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSend({
      dataUrl,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    // Clear canvas directly without saving to history (we're closing anyway)
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    setHasContent(false);
    onClose();
  }, [hasContent, onSend, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Draw</h2>
              <div className="flex items-center gap-2">
                {/* Color preview */}
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: getCurrentColor() }}
                />
                <button
                  onClick={onClose}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Canvas with sliders */}
            <div className="p-3 flex gap-3">
              {/* Left sliders - HSL */}
              <div className="flex flex-col gap-2 justify-center">
                {/* Hue slider */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">H</span>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => setHue(Number(e.target.value))}
                    className="h-24 w-6 appearance-none bg-transparent cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      background: 'linear-gradient(to top, hsl(0,100%,50%), hsl(60,100%,50%), hsl(120,100%,50%), hsl(180,100%,50%), hsl(240,100%,50%), hsl(300,100%,50%), hsl(360,100%,50%))',
                      borderRadius: '4px',
                    }}
                  />
                </div>
                {/* Saturation slider */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">S</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="h-24 w-6 appearance-none bg-transparent cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      background: `linear-gradient(to top, hsl(${hue},0%,${lightness}%), hsl(${hue},100%,${lightness}%))`,
                      borderRadius: '4px',
                    }}
                  />
                </div>
                {/* Lightness slider */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-500">L</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={lightness}
                    onChange={(e) => setLightness(Number(e.target.value))}
                    className="h-24 w-6 appearance-none bg-transparent cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      background: `linear-gradient(to top, hsl(${hue},${saturation}%,0%), hsl(${hue},${saturation}%,50%), hsl(${hue},${saturation}%,100%))`,
                      borderRadius: '4px',
                    }}
                  />
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 flex items-center justify-center relative bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200">
                <canvas
                  ref={canvasRef}
                  className="touch-none cursor-crosshair"
                  style={{
                    width: `${CANVAS_WIDTH}px`,
                    height: `${CANVAS_HEIGHT}px`,
                    maxWidth: '100%',
                    maxHeight: '100%',
                  }}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
                {!hasContent && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-400 text-sm">Draw or hold to fill!</p>
                  </div>
                )}
              </div>

              {/* Right slider - Pen size */}
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="text-xs text-gray-500">Size</span>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={penSize}
                  onChange={(e) => setPenSize(Number(e.target.value))}
                  className="h-48 w-6 appearance-none bg-gray-200 rounded cursor-pointer"
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                />
                {/* Pen size preview */}
                <div
                  className="rounded-full bg-gray-800"
                  style={{
                    width: `${Math.max(penSize, 4)}px`,
                    height: `${Math.max(penSize, 4)}px`,
                    backgroundColor: getCurrentColor(),
                  }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClear}
                  disabled={!hasContent}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  <span>Undo</span>
                </button>
              </div>
              <button
                onClick={handleSend}
                disabled={!hasContent}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Send</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
