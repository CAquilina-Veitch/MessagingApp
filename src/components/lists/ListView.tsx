import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { List, ListItemWithMessage } from '../../types';

interface ListViewProps {
  isOpen: boolean;
  lists: List[];
  currentUserId: string;
  onClose: () => void;
  onGetListItems: (listId: string) => Promise<ListItemWithMessage[]>;
  onToggleCompleted: (itemId: string) => Promise<void>;
  onRemoveFromList: (listId: string, messageId: string) => Promise<void>;
  onDeleteList: (listId: string) => Promise<void>;
  onNavigateToMessage: (messageId: string) => void;
}

export function ListView({
  isOpen,
  lists,
  currentUserId,
  onClose,
  onGetListItems,
  onToggleCompleted,
  onRemoveFromList,
  onDeleteList,
  onNavigateToMessage,
}: ListViewProps) {
  const [selectedList, setSelectedList] = useState<List | null>(null);
  const [items, setItems] = useState<ListItemWithMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Fetch items when a list is selected
  useEffect(() => {
    if (selectedList) {
      setLoading(true);
      onGetListItems(selectedList.id)
        .then(setItems)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedList, onGetListItems]);

  const handleToggleCompleted = useCallback(
    async (itemId: string) => {
      await onToggleCompleted(itemId);
      // Refresh items
      if (selectedList) {
        const updatedItems = await onGetListItems(selectedList.id);
        setItems(updatedItems);
      }
    },
    [selectedList, onToggleCompleted, onGetListItems]
  );

  const handleRemove = useCallback(
    async (messageId: string) => {
      if (!selectedList) return;
      await onRemoveFromList(selectedList.id, messageId);
      // Refresh items
      const updatedItems = await onGetListItems(selectedList.id);
      setItems(updatedItems);
    },
    [selectedList, onRemoveFromList, onGetListItems]
  );

  const handleDeleteList = useCallback(
    async (listId: string) => {
      await onDeleteList(listId);
      setSelectedList(null);
      setConfirmDelete(null);
    },
    [onDeleteList]
  );

  const handleNavigate = useCallback(
    (messageId: string) => {
      onNavigateToMessage(messageId);
      onClose();
    },
    [onNavigateToMessage, onClose]
  );

  const handleClose = useCallback(() => {
    setSelectedList(null);
    setItems([]);
    setConfirmDelete(null);
    onClose();
  }, [onClose]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="bg-white rounded-t-2xl shadow-xl w-full max-w-lg h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center gap-2">
                {selectedList && (
                  <button
                    onClick={() => {
                      setSelectedList(null);
                      setItems([]);
                    }}
                    className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </button>
                )}
                <h2 className="text-lg font-semibold text-gray-900">
                  {selectedList ? (
                    <span className="flex items-center gap-2">
                      <span>{selectedList.emoji || '📋'}</span>
                      <span>{selectedList.name}</span>
                    </span>
                  ) : (
                    'Lists'
                  )}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
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

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {selectedList ? (
                /* List items view */
                loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="w-12 h-12 mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-6 h-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1">No items yet</h3>
                    <p className="text-xs text-gray-500">Long-press messages to add them here</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                        {selectedList.type === 'checklist' && (
                          <button
                            onClick={() => handleToggleCompleted(item.id)}
                            className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 transition-colors ${
                              item.completed
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'border-gray-300 hover:border-indigo-400'
                            }`}
                          >
                            {item.completed && (
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="w-full h-full text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => item.message && handleNavigate(item.messageId)}
                          className={`flex-1 text-left min-w-0 ${
                            item.completed ? 'opacity-50' : ''
                          }`}
                        >
                          <p
                            className={`text-sm text-gray-900 ${
                              item.completed ? 'line-through' : ''
                            }`}
                          >
                            {item.message?.content || (item.message?.imageUrl ? '(drawing)' : 'Deleted message')}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Added {formatDate(item.addedAt)}
                          </p>
                        </button>

                        <button
                          onClick={() => handleRemove(item.messageId)}
                          className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )
              ) : /* Lists view */
              lists.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No lists yet</h3>
                  <p className="text-xs text-gray-500">Long-press a message to create your first list</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {lists.map((list) => {
                    const isOwn = list.ownerId === currentUserId;
                    const isPrivate = list.visibility === 'private';

                    return (
                      <div key={list.id} className="flex items-center gap-3 px-4 py-3">
                        <button
                          onClick={() => setSelectedList(list)}
                          className="flex-1 flex items-center gap-3 text-left min-w-0"
                        >
                          <span className="text-xl">{list.emoji || '📋'}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {list.name}
                              </p>
                              {isPrivate && isOwn && (
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              {list.type === 'checklist' ? 'Checklist' : 'Collection'}
                            </p>
                          </div>
                        </button>

                        {isOwn && (
                          <>
                            {confirmDelete === list.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleDeleteList(list.id)}
                                  className="px-2 py-1 text-xs text-white bg-red-500 hover:bg-red-600 rounded"
                                >
                                  Delete
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(list.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
