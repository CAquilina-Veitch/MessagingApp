import { useState, useCallback, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useMessages } from '../hooks/useMessages';
import { useLists } from '../hooks/useLists';
import {
  Header,
  MessageList,
  MessageInput,
  QuickDrawCanvas,
  ListPicker,
  ListView,
} from '../components';
import type { MessageWithReply, User, DrawingData } from '../types';

export function ChatPage() {
  const { user } = useAuth();
  const {
    messages,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    sendMessage,
    sendDrawing,
    toggleLike,
  } = useMessages(user?.uid);

  const {
    lists,
    createList,
    addMessageToList,
    removeFromList,
    deleteList,
    toggleItemCompleted,
    getListItems,
  } = useLists(user?.uid);

  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [showDrawCanvas, setShowDrawCanvas] = useState(false);
  const [showListPicker, setShowListPicker] = useState(false);
  const [showListView, setShowListView] = useState(false);
  const [replyingTo, setReplyingTo] = useState<MessageWithReply | null>(null);
  const [selectedMessageForList, setSelectedMessageForList] = useState<MessageWithReply | null>(null);
  const [likeAnimatingId, setLikeAnimatingId] = useState<string | null>(null);
  const [scrollToMessageId, setScrollToMessageId] = useState<string | null>(null);

  // Find and subscribe to the other user's profile
  useEffect(() => {
    if (!user || messages.length === 0) return;

    const otherUserId = messages.find((m) => m.senderId !== user.uid)?.senderId;
    if (!otherUserId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'duoboard_users', otherUserId),
      (docSnap) => {
        if (docSnap.exists()) {
          setOtherUser({ uid: docSnap.id, ...docSnap.data() } as User);
        }
      },
      (err) => console.error('Error fetching other user:', err)
    );

    return unsubscribe;
  }, [user, messages]);

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (content: string) => {
      try {
        await sendMessage(content, replyingTo?.id);
        setReplyingTo(null);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [sendMessage, replyingTo]
  );

  // Handle sending a drawing
  const handleSendDrawing = useCallback(
    async (drawing: DrawingData) => {
      try {
        await sendDrawing(drawing, replyingTo?.id);
        setReplyingTo(null);
      } catch (error) {
        console.error('Failed to send drawing:', error);
      }
    },
    [sendDrawing, replyingTo]
  );

  // Handle double-tap to like
  const handleDoubleTap = useCallback(
    async (messageId: string) => {
      setLikeAnimatingId(messageId);
      await toggleLike(messageId);
      setTimeout(() => setLikeAnimatingId(null), 600);
    },
    [toggleLike]
  );

  // Handle swipe to reply
  const handleSwipeReply = useCallback((message: MessageWithReply) => {
    setReplyingTo(message);
  }, []);

  // Handle swipe left to save to list
  const handleSwipeAddToList = useCallback((message: MessageWithReply) => {
    setSelectedMessageForList(message);
    setShowListPicker(true);
  }, []);

  // Handle selecting a list
  const handleSelectList = useCallback(
    async (listId: string) => {
      if (selectedMessageForList) {
        await addMessageToList(listId, selectedMessageForList.id);
        setShowListPicker(false);
        setSelectedMessageForList(null);
      }
    },
    [selectedMessageForList, addMessageToList]
  );

  // Handle creating a new list
  const handleCreateList = useCallback(
    async (
      name: string,
      visibility: 'public' | 'private',
      type: 'collection' | 'checklist',
      emoji?: string
    ) => {
      return createList(name, visibility, type, emoji);
    },
    [createList]
  );

  // Handle navigating to a message from lists
  const handleNavigateToMessage = useCallback((messageId: string) => {
    setScrollToMessageId(messageId);
    setShowListView(false);
  }, []);

  if (!user) return null;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <Header onListsClick={() => setShowListView(true)} />

      <MessageList
        messages={messages}
        currentUser={user}
        otherUser={otherUser}
        onDoubleTap={handleDoubleTap}
        onSwipeReply={handleSwipeReply}
        onSwipeAddToList={handleSwipeAddToList}
        likeAnimatingMessageId={likeAnimatingId}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        scrollToMessageId={scrollToMessageId}
        onScrollToMessageComplete={() => setScrollToMessageId(null)}
      />

      <MessageInput
        onSend={handleSendMessage}
        onDrawClick={() => setShowDrawCanvas(true)}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
      />

      {/* Quick Draw Overlay */}
      <QuickDrawCanvas
        isOpen={showDrawCanvas}
        onClose={() => setShowDrawCanvas(false)}
        onSend={handleSendDrawing}
      />

      {/* List Picker Overlay */}
      <ListPicker
        isOpen={showListPicker}
        message={selectedMessageForList}
        lists={lists}
        currentUserId={user.uid}
        onClose={() => {
          setShowListPicker(false);
          setSelectedMessageForList(null);
        }}
        onSelectList={handleSelectList}
        onCreateList={handleCreateList}
      />

      {/* List View Overlay */}
      <ListView
        isOpen={showListView}
        lists={lists}
        currentUserId={user.uid}
        onClose={() => setShowListView(false)}
        onGetListItems={getListItems}
        onToggleCompleted={toggleItemCompleted}
        onRemoveFromList={removeFromList}
        onDeleteList={deleteList}
        onNavigateToMessage={handleNavigateToMessage}
      />
    </div>
  );
}
