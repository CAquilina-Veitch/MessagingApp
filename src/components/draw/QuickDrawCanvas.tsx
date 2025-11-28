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

  // Canvas dimensions - bigger now
  const CANVAS_WIDTH = 400;
  const CANVAS_HEIGHT = 300;

  // Get current color as HSL string
  const getCurrentColor = useCallback(() => {
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }, [hue, saturation, lightness]);

  // Initialize canvas
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      setHasContent(false);
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

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

  const startDrawing = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      const point = getCanvasPoint(e);
      lastPointRef.current = point;
      setIsDrawing(true);

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = getCurrentColor();
        ctx.lineWidth = penSize;
        ctx.beginPath();
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        setHasContent(true);
      }
    },
    [getCanvasPoint, getCurrentColor, penSize]
  );

  const draw = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!isDrawing || !lastPointRef.current) return;
      e.preventDefault();

      const point = getCanvasPoint(e);
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
    [isDrawing, getCanvasPoint]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
    lastPointRef.current = null;
  }, []);

  const handleClear = useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    setHasContent(false);
  }, []);

  const handleSend = useCallback(() => {
    if (!canvasRef.current || !hasContent) return;

    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSend({
      dataUrl,
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
    });

    handleClear();
    onClose();
  }, [hasContent, onSend, onClose, handleClear]);

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
              <div className="flex-1 relative bg-gray-50 rounded-xl overflow-hidden border-2 border-dashed border-gray-200">
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className="w-full touch-none cursor-crosshair"
                  style={{ aspectRatio: `${CANVAS_WIDTH}/${CANVAS_HEIGHT}` }}
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
                    <p className="text-gray-400 text-sm">Draw something!</p>
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
              <button
                onClick={handleClear}
                disabled={!hasContent}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
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
