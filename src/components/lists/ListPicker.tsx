import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { List, MessageWithReply } from '../../types';

interface ListPickerProps {
  isOpen: boolean;
  message: MessageWithReply | null;
  lists: List[];
  currentUserId: string;
  onClose: () => void;
  onSelectList: (listId: string) => void;
  onCreateList: (
    name: string,
    visibility: 'public' | 'private',
    type: 'collection' | 'checklist',
    emoji?: string
  ) => Promise<string | null>;
}

export function ListPicker({
  isOpen,
  message,
  lists,
  currentUserId,
  onClose,
  onSelectList,
  onCreateList,
}: ListPickerProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListVisibility, setNewListVisibility] = useState<'public' | 'private'>('public');
  const [newListType, setNewListType] = useState<'collection' | 'checklist'>('collection');
  const [newListEmoji, setNewListEmoji] = useState('📋');
  const [creating, setCreating] = useState(false);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    setCreating(true);
    try {
      const listId = await onCreateList(
        newListName.trim(),
        newListVisibility,
        newListType,
        newListEmoji
      );
      if (listId) {
        onSelectList(listId);
      }
      resetForm();
    } catch (error) {
      console.error('Failed to create list:', error);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setShowCreateForm(false);
    setNewListName('');
    setNewListVisibility('public');
    setNewListType('collection');
    setNewListEmoji('📋');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && message && (
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
            className="bg-white rounded-t-2xl shadow-xl w-full max-w-lg max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {showCreateForm ? 'Create New List' : 'Save to List'}
              </h2>
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

            {/* Message preview */}
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-600 truncate">
                {message.content || (message.imageUrl ? '(drawing)' : '')}
              </p>
            </div>

            {showCreateForm ? (
              /* Create form */
              <div className="p-4 space-y-4">
                {/* Emoji input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newListEmoji}
                      onChange={(e) => {
                        // Only keep the last character/emoji entered
                        const value = e.target.value;
                        if (value.length === 0) {
                          setNewListEmoji('');
                        } else {
                          // Get the last emoji (handling multi-codepoint emojis)
                          const emojis = [...value];
                          setNewListEmoji(emojis[emojis.length - 1]);
                        }
                      }}
                      placeholder="📋"
                      className="w-14 h-14 text-2xl text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-500">Type or paste any emoji</span>
                  </div>
                </div>

                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    autoFocus
                  />
                </div>

                {/* Type selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewListType('collection')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        newListType === 'collection'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Collection
                    </button>
                    <button
                      onClick={() => setNewListType('checklist')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        newListType === 'checklist'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Checklist
                    </button>
                  </div>
                </div>

                {/* Visibility selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewListVisibility('public')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                        newListVisibility === 'public'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Shared
                    </button>
                    <button
                      onClick={() => setNewListVisibility('private')}
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors flex items-center justify-center gap-1 ${
                        newListVisibility === 'private'
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Private
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={resetForm}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateList}
                    disabled={!newListName.trim() || creating}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create & Add'}
                  </button>
                </div>
              </div>
            ) : (
              /* List selection */
              <div className="overflow-y-auto max-h-[50vh]">
                {lists.map((list) => {
                  const isPrivate = list.visibility === 'private';
                  const isOwn = list.ownerId === currentUserId;

                  return (
                    <button
                      key={list.id}
                      onClick={() => onSelectList(list.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className="text-xl">{list.emoji || '📋'}</span>
                      <span className="flex-1 text-sm font-medium text-gray-900">{list.name}</span>
                      {isPrivate && isOwn && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-gray-400"
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
                      {list.type === 'checklist' && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4 text-gray-400"
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
                      )}
                    </button>
                  );
                })}

                {/* Create new list button */}
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-t border-gray-200"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-indigo-600">Create New List</span>
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
