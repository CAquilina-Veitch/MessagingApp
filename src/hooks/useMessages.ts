import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  serverTimestamp,
  type Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import type { Message, MessageWithReply, DrawingData } from '../types';

const MESSAGES_PER_PAGE = 50;
const MESSAGES_COLLECTION = 'duoboard_messages';

export function useMessages(userId: string | undefined) {
  const [messages, setMessages] = useState<MessageWithReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const initialLoadRef = useRef<Timestamp | null>(null);

  // Fetch reply-to messages for a batch of messages
  const fetchReplyMessages = useCallback(async (msgs: Message[]): Promise<MessageWithReply[]> => {
    const replyIds = msgs
      .filter((m) => m.replyTo)
      .map((m) => m.replyTo as string);

    if (replyIds.length === 0) {
      return msgs.map((m) => ({ ...m, replyToMessage: null }));
    }

    const uniqueReplyIds = [...new Set(replyIds)];
    const replyDocs = await Promise.all(
      uniqueReplyIds.map((id) => getDoc(doc(db, MESSAGES_COLLECTION, id)))
    );

    const replyMap = new Map<string, Message>();
    replyDocs.forEach((docSnap) => {
      if (docSnap.exists()) {
        replyMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() } as Message);
      }
    });

    return msgs.map((m) => ({
      ...m,
      replyToMessage: m.replyTo ? replyMap.get(m.replyTo) || null : null,
    }));
  }, []);

  // Initial load with real-time updates for new messages
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Get initial messages
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const initialQuery = query(
      messagesRef,
      orderBy('timestamp', 'desc'),
      limit(MESSAGES_PER_PAGE)
    );

    const unsubscribe = onSnapshot(
      initialQuery,
      async (snapshot) => {
        try {
          const newMessages: Message[] = [];
          let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

          snapshot.forEach((docSnap) => {
            newMessages.push({ id: docSnap.id, ...docSnap.data() } as Message);
            lastDoc = docSnap;
          });

          // Store the timestamp of the initial load for listening to new messages
          if (newMessages.length > 0 && !initialLoadRef.current) {
            initialLoadRef.current = newMessages[0].timestamp;
          }

          lastDocRef.current = lastDoc;
          setHasMore(newMessages.length === MESSAGES_PER_PAGE);

          const messagesWithReplies = await fetchReplyMessages(newMessages);
          setMessages(messagesWithReplies.reverse()); // Reverse to show oldest first
          setLoading(false);
        } catch (err) {
          console.error('Error fetching messages:', err);
          setError('Failed to load messages');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Snapshot error:', err);
        setError('Failed to connect to messages');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId, fetchReplyMessages]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!userId || loadingMore || !hasMore || !lastDocRef.current) return;

    setLoadingMore(true);
    try {
      const messagesRef = collection(db, MESSAGES_COLLECTION);
      const olderQuery = query(
        messagesRef,
        orderBy('timestamp', 'desc'),
        startAfter(lastDocRef.current),
        limit(MESSAGES_PER_PAGE)
      );

      const snapshot = await getDocs(olderQuery);
      const olderMessages: Message[] = [];
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = null;

      snapshot.forEach((docSnap) => {
        olderMessages.push({ id: docSnap.id, ...docSnap.data() } as Message);
        lastDoc = docSnap;
      });

      if (lastDoc) {
        lastDocRef.current = lastDoc;
      }

      setHasMore(olderMessages.length === MESSAGES_PER_PAGE);

      if (olderMessages.length > 0) {
        const olderWithReplies = await fetchReplyMessages(olderMessages);
        setMessages((prev) => [...olderWithReplies.reverse(), ...prev]);
      }
    } catch (err) {
      console.error('Error loading more messages:', err);
      setError('Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  }, [userId, loadingMore, hasMore, fetchReplyMessages]);

  // Send a text message
  const sendMessage = useCallback(
    async (content: string, replyTo?: string) => {
      if (!userId || !content.trim()) return;

      try {
        const messageData = {
          senderId: userId,
          content: content.trim(),
          imageUrl: null,
          timestamp: serverTimestamp(),
          replyTo: replyTo || null,
          likes: {},
        };

        await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
      } catch (err) {
        console.error('Error sending message:', err);
        throw new Error('Failed to send message');
      }
    },
    [userId]
  );

  // Send a drawing
  const sendDrawing = useCallback(
    async (drawing: DrawingData, replyTo?: string) => {
      if (!userId) return;

      try {
        // Convert data URL to blob
        const response = await fetch(drawing.dataUrl);
        const blob = await response.blob();

        // Upload to Firebase Storage
        const fileName = `duoboard_drawings/${userId}_${Date.now()}.png`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, blob);
        const imageUrl = await getDownloadURL(storageRef);

        // Create message with image
        const messageData = {
          senderId: userId,
          content: null,
          imageUrl,
          timestamp: serverTimestamp(),
          replyTo: replyTo || null,
          likes: {},
        };

        await addDoc(collection(db, MESSAGES_COLLECTION), messageData);
      } catch (err) {
        console.error('Error sending drawing:', err);
        throw new Error('Failed to send drawing');
      }
    },
    [userId]
  );

  // Toggle like on a message
  const toggleLike = useCallback(
    async (messageId: string) => {
      if (!userId) return;

      try {
        const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
        const messageDoc = await getDoc(messageRef);

        if (!messageDoc.exists()) return;

        const currentLikes = messageDoc.data().likes || {};
        const newLikes = { ...currentLikes };

        if (newLikes[userId]) {
          delete newLikes[userId];
        } else {
          newLikes[userId] = true;
        }

        await updateDoc(messageRef, { likes: newLikes });

        // Update local state
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, likes: newLikes } : m))
        );
      } catch (err) {
        console.error('Error toggling like:', err);
      }
    },
    [userId]
  );

  // Get a specific message by ID
  const getMessageById = useCallback((messageId: string): MessageWithReply | undefined => {
    return messages.find((m) => m.id === messageId);
  }, [messages]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    sendMessage,
    sendDrawing,
    toggleLike,
    getMessageById,
  };
}
