import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  or,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { List, ListItem, ListItemWithMessage, Message } from '../types';

const LISTS_COLLECTION = 'lists';
const LIST_ITEMS_COLLECTION = 'listItems';
const MESSAGES_COLLECTION = 'messages';

export function useLists(userId: string | undefined) {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch lists visible to the user (public + own private)
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const listsRef = collection(db, LISTS_COLLECTION);

    // Get public lists OR private lists owned by user
    const listsQuery = query(
      listsRef,
      or(
        where('visibility', '==', 'public'),
        where('ownerId', '==', userId)
      ),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      listsQuery,
      (snapshot) => {
        const fetchedLists: List[] = [];
        snapshot.forEach((docSnap) => {
          fetchedLists.push({ id: docSnap.id, ...docSnap.data() } as List);
        });
        setLists(fetchedLists);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching lists:', err);
        setError('Failed to load lists');
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  // Create a new list
  const createList = useCallback(
    async (
      name: string,
      visibility: 'public' | 'private',
      type: 'collection' | 'checklist',
      emoji?: string
    ) => {
      if (!userId) return null;

      try {
        const listData = {
          name,
          ownerId: userId,
          visibility,
          type,
          emoji: emoji || '',
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, LISTS_COLLECTION), listData);
        return docRef.id;
      } catch (err) {
        console.error('Error creating list:', err);
        throw new Error('Failed to create list');
      }
    },
    [userId]
  );

  // Update a list
  const updateList = useCallback(
    async (
      listId: string,
      updates: Partial<Pick<List, 'name' | 'visibility' | 'type' | 'emoji'>>
    ) => {
      if (!userId) return;

      try {
        const listRef = doc(db, LISTS_COLLECTION, listId);
        await updateDoc(listRef, updates);
      } catch (err) {
        console.error('Error updating list:', err);
        throw new Error('Failed to update list');
      }
    },
    [userId]
  );

  // Delete a list and all its items
  const deleteList = useCallback(
    async (listId: string) => {
      if (!userId) return;

      try {
        // Delete all items in the list
        const itemsQuery = query(
          collection(db, LIST_ITEMS_COLLECTION),
          where('listId', '==', listId)
        );
        const itemsSnapshot = await getDocs(itemsQuery);
        const deletePromises = itemsSnapshot.docs.map((d) =>
          deleteDoc(doc(db, LIST_ITEMS_COLLECTION, d.id))
        );
        await Promise.all(deletePromises);

        // Delete the list itself
        await deleteDoc(doc(db, LISTS_COLLECTION, listId));
      } catch (err) {
        console.error('Error deleting list:', err);
        throw new Error('Failed to delete list');
      }
    },
    [userId]
  );

  // Add a message to a list
  const addMessageToList = useCallback(
    async (listId: string, messageId: string) => {
      if (!userId) return;

      try {
        // Check if already in list
        const existingQuery = query(
          collection(db, LIST_ITEMS_COLLECTION),
          where('listId', '==', listId),
          where('messageId', '==', messageId)
        );
        const existing = await getDocs(existingQuery);

        if (!existing.empty) {
          return; // Already in list
        }

        const itemData = {
          listId,
          messageId,
          addedAt: serverTimestamp(),
          completed: false,
        };

        await addDoc(collection(db, LIST_ITEMS_COLLECTION), itemData);
      } catch (err) {
        console.error('Error adding message to list:', err);
        throw new Error('Failed to add to list');
      }
    },
    [userId]
  );

  // Remove a message from a list
  const removeFromList = useCallback(
    async (listId: string, messageId: string) => {
      if (!userId) return;

      try {
        const itemsQuery = query(
          collection(db, LIST_ITEMS_COLLECTION),
          where('listId', '==', listId),
          where('messageId', '==', messageId)
        );
        const snapshot = await getDocs(itemsQuery);

        const deletePromises = snapshot.docs.map((d) =>
          deleteDoc(doc(db, LIST_ITEMS_COLLECTION, d.id))
        );
        await Promise.all(deletePromises);
      } catch (err) {
        console.error('Error removing from list:', err);
        throw new Error('Failed to remove from list');
      }
    },
    [userId]
  );

  // Toggle completion status of a list item
  const toggleItemCompleted = useCallback(
    async (itemId: string) => {
      if (!userId) return;

      try {
        const itemRef = doc(db, LIST_ITEMS_COLLECTION, itemId);
        const itemSnap = await getDoc(itemRef);

        if (itemSnap.exists()) {
          const currentCompleted = itemSnap.data().completed || false;
          await updateDoc(itemRef, { completed: !currentCompleted });
        }
      } catch (err) {
        console.error('Error toggling item completion:', err);
        throw new Error('Failed to update item');
      }
    },
    [userId]
  );

  // Get items for a specific list with their messages
  const getListItems = useCallback(
    async (listId: string): Promise<ListItemWithMessage[]> => {
      try {
        const itemsQuery = query(
          collection(db, LIST_ITEMS_COLLECTION),
          where('listId', '==', listId),
          orderBy('addedAt', 'desc')
        );
        const snapshot = await getDocs(itemsQuery);

        const items: ListItem[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as ListItem);
        });

        // Fetch associated messages
        const messageIds = items.map((item) => item.messageId);
        const messagePromises = messageIds.map((id) =>
          getDoc(doc(db, MESSAGES_COLLECTION, id))
        );
        const messageDocs = await Promise.all(messagePromises);

        const messageMap = new Map<string, Message>();
        messageDocs.forEach((docSnap) => {
          if (docSnap.exists()) {
            messageMap.set(docSnap.id, {
              id: docSnap.id,
              ...docSnap.data(),
            } as Message);
          }
        });

        return items.map((item) => ({
          ...item,
          message: messageMap.get(item.messageId) || null,
        }));
      } catch (err) {
        console.error('Error fetching list items:', err);
        throw new Error('Failed to load list items');
      }
    },
    []
  );

  return {
    lists,
    loading,
    error,
    createList,
    updateList,
    deleteList,
    addMessageToList,
    removeFromList,
    toggleItemCompleted,
    getListItems,
  };
}
