import { useRef, useEffect, useLayoutEffect, useCallback, useState } from 'react';
import { VariableSizeList as List } from 'react-window';
import { MessageBubble } from './MessageBubble';
import type { MessageWithReply, User } from '../../types';

interface MessageListProps {
  messages: MessageWithReply[];
  currentUser: User;
  otherUser?: User | null;
  onDoubleTap: (messageId: string) => void;
  onSwipeReply: (message: MessageWithReply) => void;
  onSwipeAddToList: (message: MessageWithReply) => void;
  likeAnimatingMessageId: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  scrollToMessageId?: string | null;
  onScrollToMessageComplete?: () => void;
}

// Rough estimate of item heights
const ESTIMATED_ITEM_HEIGHT = 80;

export function MessageList({
  messages,
  currentUser,
  otherUser,
  onDoubleTap,
  onSwipeReply,
  onSwipeAddToList,
  likeAnimatingMessageId,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  scrollToMessageId,
  onScrollToMessageComplete,
}: MessageListProps) {
  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemHeights = useRef<Record<number, number>>({});
  const [listHeight, setListHeight] = useState(0);

  // Calculate container height using ResizeObserver for reliable updates
  // Use useLayoutEffect for synchronous measurement before paint
  useLayoutEffect(() => {
    if (!containerRef.current) return;

    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        if (height > 0) {
          setListHeight(height);
        }
      }
    };

    // Initial synchronous measurement
    updateHeight();

    // Use ResizeObserver for ongoing size detection
    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });

    resizeObserver.observe(containerRef.current);

    // Also update on window resize as fallback
    window.addEventListener('resize', updateHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, []);

  // Fallback: if listHeight is still 0 after mount but we have messages,
  // try measuring again. This handles edge cases where initial measurement fails.
  useEffect(() => {
    if (listHeight === 0 && messages.length > 0 && containerRef.current) {
      const height = containerRef.current.clientHeight;
      if (height > 0) {
        setListHeight(height);
      } else {
        // If container still has no height, use a fallback based on window
        // This ensures the list renders even in edge cases
        const fallbackHeight = window.innerHeight - 150; // Account for header/input
        if (fallbackHeight > 0) {
          setListHeight(fallbackHeight);
        }
      }
    }
  }, [listHeight, messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current && messages.length > 0 && !scrollToMessageId) {
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length, scrollToMessageId]);

  // Scroll to specific message
  useEffect(() => {
    if (scrollToMessageId && listRef.current) {
      const index = messages.findIndex((m) => m.id === scrollToMessageId);
      if (index !== -1) {
        listRef.current.scrollToItem(index, 'center');
        onScrollToMessageComplete?.();
      }
    }
  }, [scrollToMessageId, messages, onScrollToMessageComplete]);

  const getItemSize = useCallback(
    (index: number) => {
      return itemHeights.current[index] || ESTIMATED_ITEM_HEIGHT;
    },
    []
  );

  const setItemHeight = useCallback((index: number, height: number) => {
    if (itemHeights.current[index] !== height) {
      itemHeights.current[index] = height;
      listRef.current?.resetAfterIndex(index);
    }
  }, []);

  // Handle scroll for pagination
  const handleScroll = useCallback(
    ({ scrollOffset }: { scrollOffset: number }) => {
      if (scrollOffset < 100 && hasMore && !loadingMore) {
        onLoadMore();
      }
    },
    [hasMore, loadingMore, onLoadMore]
  );

  const getSenderInfo = useCallback(
    (senderId: string) => {
      if (senderId === currentUser.uid) {
        // Prefer custom photo, fallback to Google photo
        return { photo: currentUser.customPhotoURL || currentUser.photoURL, name: currentUser.displayName };
      }
      // Prefer custom photo, fallback to Google photo
      return { photo: otherUser?.customPhotoURL || otherUser?.photoURL, name: otherUser?.displayName };
    },
    [currentUser, otherUser]
  );

  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const message = messages[index];
      const isOwn = message.senderId === currentUser.uid;
      const senderInfo = getSenderInfo(message.senderId);

      return (
        <div style={style} className="px-3">
          <MessageItemWrapper
            index={index}
            onHeightChange={setItemHeight}
            hasImage={!!message.imageUrl}
          >
            <MessageBubble
              message={message}
              isOwn={isOwn}
              senderPhoto={senderInfo.photo}
              senderName={senderInfo.name}
              onDoubleTap={() => onDoubleTap(message.id)}
              onSwipeReply={() => onSwipeReply(message)}
              onSwipeAddToList={() => onSwipeAddToList(message)}
              showLikeAnimation={likeAnimatingMessageId === message.id}
              currentUserId={currentUser.uid}
              onNavigateToMessage={(id) => {
                const idx = messages.findIndex((m) => m.id === id);
                if (idx !== -1) {
                  listRef.current?.scrollToItem(idx, 'center');
                }
              }}
              onImageLoad={() => setItemHeight(index, 0)}
            />
          </MessageItemWrapper>
        </div>
      );
    },
    [
      messages,
      currentUser,
      getSenderInfo,
      onDoubleTap,
      onSwipeReply,
      onSwipeAddToList,
      likeAnimatingMessageId,
      setItemHeight,
    ]
  );

  // Always render the container to ensure height measurement works
  // Content is conditionally rendered inside
  return (
    <div ref={containerRef} className="flex-1 overflow-hidden">
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-8 h-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No messages yet</h3>
          <p className="text-sm text-gray-500">Send a message or drawing to get started!</p>
        </div>
      ) : (
        <>
          {loadingMore && (
            <div className="absolute top-0 left-0 right-0 z-10 flex justify-center py-2 bg-gradient-to-b from-gray-50 to-transparent">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
            </div>
          )}

          {listHeight > 0 ? (
            <List
              ref={listRef}
              height={listHeight}
              width="100%"
              itemCount={messages.length}
              itemSize={getItemSize}
              onScroll={handleScroll}
              estimatedItemSize={ESTIMATED_ITEM_HEIGHT}
              className="scrollbar-hide"
            >
              {Row}
            </List>
          ) : (
            // Fallback loading state while height is being measured
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Helper component to measure item heights
interface MessageItemWrapperProps {
  index: number;
  onHeightChange: (index: number, height: number) => void;
  children: React.ReactNode;
  hasImage?: boolean;
}

function MessageItemWrapper({ index, onHeightChange, children, hasImage }: MessageItemWrapperProps) {
  const ref = useRef<HTMLDivElement>(null);
  const lastHeightRef = useRef<number>(0);

  useEffect(() => {
    if (!ref.current) return;

    const measureHeight = () => {
      if (ref.current) {
        const height = ref.current.getBoundingClientRect().height + 12; // Add some padding
        // Only update if height changed significantly (avoid infinite loops)
        if (Math.abs(height - lastHeightRef.current) > 1) {
          lastHeightRef.current = height;
          onHeightChange(index, height);
        }
      }
    };

    // Initial measurement
    measureHeight();

    // Use ResizeObserver for images that load and change height
    if (hasImage) {
      const resizeObserver = new ResizeObserver(() => {
        measureHeight();
      });
      resizeObserver.observe(ref.current);
      return () => resizeObserver.disconnect();
    }
  }, [index, onHeightChange, hasImage]);

  return <div ref={ref}>{children}</div>;
}
