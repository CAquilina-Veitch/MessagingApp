import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  lastSeen: Timestamp;
}

export interface Message {
  id: string;
  senderId: string;
  content: string | null;
  imageUrl: string | null;
  timestamp: Timestamp;
  replyTo: string | null;
  likes: Record<string, boolean>;
}

export interface MessageWithReply extends Message {
  replyToMessage?: Message | null;
}

export interface List {
  id: string;
  name: string;
  ownerId: string;
  visibility: 'public' | 'private';
  type: 'collection' | 'checklist';
  createdAt: Timestamp;
  emoji?: string;
}

export interface ListItem {
  id: string;
  listId: string;
  messageId: string;
  addedAt: Timestamp;
  completed: boolean;
}

export interface ListItemWithMessage extends ListItem {
  message?: Message | null;
}

export type DrawingData = {
  dataUrl: string;
  width: number;
  height: number;
};
