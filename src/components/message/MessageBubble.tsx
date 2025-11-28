import { motion, AnimatePresence } from 'framer-motion';
import { useDoubleTap, useSwipe } from '../../hooks/useGestures';
import type { MessageWithReply } from '../../types';

interface MessageBubbleProps {
  message: MessageWithReply;
  isOwn: boolean;
  senderPhoto?: string;
  senderName?: string;
  onDoubleTap: () => void;
  onSwipeReply: () => void;
  onSwipeAddToList: () => void;
  showLikeAnimation: boolean;
  currentUserId: string;
  onNavigateToMessage?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  isOwn,
  senderPhoto,
  senderName,
  onDoubleTap,
  onSwipeReply,
  onSwipeAddToList,
  showLikeAnimation,
  currentUserId,
  onNavigateToMessage,
}: MessageBubbleProps) {
  const handleDoubleTap = useDoubleTap({ onDoubleTap });
  const { handlers: swipeHandlers, swipeState } = useSwipe({
    onSwipeRight: onSwipeReply,
    onSwipeLeft: onSwipeAddToList,
  });

  const isLiked = message.likes && Object.keys(message.likes).length > 0;
  const likedByMe = message.likes?.[currentUserId];
  const likeCount = message.likes ? Object.keys(message.likes).length : 0;

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <motion.div
      className={`flex items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}
      style={{
        transform: `translateX(${swipeState.offset}px)`,
        transition: swipeState.swiping ? 'none' : 'transform 0.2s ease-out',
      }}
      {...swipeHandlers}
    >
      {/* Reply indicator (swipe right) */}
      <AnimatePresence>
        {swipeState.offset > 40 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute left-0 flex items-center justify-center w-10 h-10 bg-indigo-100 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-indigo-600"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add to list indicator (swipe left) */}
      <AnimatePresence>
        {swipeState.offset < -40 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-0 flex items-center justify-center w-10 h-10 bg-green-100 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Avatar */}
      {!isOwn && (
        <div className="flex-shrink-0 w-8 h-8">
          {senderPhoto ? (
            <img
              src={senderPhoto}
              alt={senderName || 'User'}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {senderName?.[0] || '?'}
            </div>
          )}
        </div>
      )}

      {/* Message Content */}
      <div
        className={`relative max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}
        onClick={handleDoubleTap}
      >
        {/* Reply Preview */}
        {message.replyToMessage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigateToMessage?.(message.replyTo!);
            }}
            className={`block mb-1 p-2 text-xs bg-gray-100 rounded-lg border-l-2 border-indigo-400 max-w-full truncate text-left ${
              isOwn ? 'ml-auto' : ''
            }`}
          >
            <span className="text-gray-500">Replying to: </span>
            <span className="text-gray-700">
              {message.replyToMessage.content || '(drawing)'}
            </span>
          </button>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-4 py-2 ${
            isOwn
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
          }`}
        >
          {/* Image content */}
          {message.imageUrl && (
            <img
              src={message.imageUrl}
              alt="Drawing"
              className="max-w-full rounded-lg mb-1"
              style={{ maxHeight: '200px' }}
            />
          )}

          {/* Text content */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}

          {/* Like heart animation */}
          <AnimatePresence>
            {showLikeAnimation && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1.5, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-12 h-12 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Like indicator */}
          {isLiked && !showLikeAnimation && (
            <div
              className={`absolute -bottom-2 ${
                isOwn ? 'left-2' : 'right-2'
              } flex items-center gap-0.5 bg-white rounded-full px-1.5 py-0.5 shadow-sm border border-gray-100`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-3.5 h-3.5 ${likedByMe ? 'text-red-500' : 'text-gray-400'}`}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {likeCount > 1 && (
                <span className="text-xs text-gray-600">{likeCount}</span>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <p
          className={`mt-1 text-xs text-gray-400 ${isOwn ? 'text-right' : 'text-left'}`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}
