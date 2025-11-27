import { useRef, useCallback, useState } from 'react';

interface DoubleTapOptions {
  onDoubleTap: () => void;
  delay?: number;
}

export function useDoubleTap({ onDoubleTap, delay = 300 }: DoubleTapOptions) {
  const lastTapRef = useRef<number>(0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTapRef.current;

    if (timeDiff > 0 && timeDiff < delay) {
      onDoubleTap();
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;
    }
  }, [onDoubleTap, delay]);

  return handleTap;
}

interface SwipeOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  threshold?: number;
}

interface SwipeState {
  swiping: boolean;
  offset: number;
}

export function useSwipe({ onSwipeRight, onSwipeLeft, threshold = 80 }: SwipeOptions) {
  const startXRef = useRef<number>(0);
  const [swipeState, setSwipeState] = useState<SwipeState>({ swiping: false, offset: 0 });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setSwipeState({ swiping: true, offset: 0 });
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.swiping) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;

    // Only allow right swipe (for reply)
    if (diff > 0 && onSwipeRight) {
      setSwipeState({ swiping: true, offset: Math.min(diff, threshold * 1.5) });
    } else if (diff < 0 && onSwipeLeft) {
      setSwipeState({ swiping: true, offset: Math.max(diff, -threshold * 1.5) });
    }
  }, [swipeState.swiping, threshold, onSwipeRight, onSwipeLeft]);

  const handleTouchEnd = useCallback(() => {
    const offset = swipeState.offset;

    if (offset > threshold && onSwipeRight) {
      onSwipeRight();
    } else if (offset < -threshold && onSwipeLeft) {
      onSwipeLeft();
    }

    setSwipeState({ swiping: false, offset: 0 });
  }, [swipeState.offset, threshold, onSwipeRight, onSwipeLeft]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    swipeState,
  };
}

interface LongPressOptions {
  onLongPress: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, delay = 500 }: LongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pressing, setPressing] = useState(false);

  const start = useCallback(() => {
    setPressing(true);
    timerRef.current = setTimeout(() => {
      onLongPress();
      setPressing(false);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPressing(false);
  }, []);

  return {
    handlers: {
      onTouchStart: start,
      onTouchEnd: clear,
      onTouchMove: clear,
      onMouseDown: start,
      onMouseUp: clear,
      onMouseLeave: clear,
    },
    pressing,
  };
}
