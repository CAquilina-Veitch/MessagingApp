# DuoBoard

A private, mobile-first messaging web app for exactly 2 whitelisted users. A persistent message board between two people with rich interactions and organizational features.

## Features

- **Real-time Messaging**: Instant message sync via Firebase
- **Double-tap to Like**: Show appreciation with heart animations
- **Swipe to Reply**: Easy reply functionality with quoted messages
- **Quick Draw**: Frictionless drawing canvas for sending sketches
- **Lists/Boards**: Organize messages into collections or checklists
  - Public lists (shared) or Private lists (hidden from other user)
  - Long-press any message to save to a list
- **Pagination**: Efficient loading of message history
- **Mobile-first**: Optimized for touch interactions

## Tech Stack

- **Frontend**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Animation**: Framer Motion
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Routing**: React Router with HashRouter (GitHub Pages compatible)
- **Deployment**: GitHub Pages

## Setup

### 1. Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Google Authentication
3. Create a Firestore database
4. Enable Storage
5. Copy your Firebase config values

### 2. Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your Firebase configuration and whitelist emails:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_WHITELIST_EMAIL_1=user1@example.com
VITE_WHITELIST_EMAIL_2=user2@example.com
```

### 3. Firestore Security Rules

Deploy the security rules from `firestore.rules` to your Firebase project.

### 4. Install & Run

```bash
npm install
npm run dev
```

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run deploy   # Deploy to GitHub Pages
```

## Deployment

The app is configured for GitHub Pages deployment:

```bash
npm run deploy
```

This will build the app and push to the `gh-pages` branch.

## Data Structure

### Firestore Collections

**messages**
- `senderId`: string
- `content`: string | null
- `imageUrl`: string | null
- `timestamp`: Timestamp
- `replyTo`: messageId | null
- `likes`: { [userId]: boolean }

**lists**
- `name`: string
- `ownerId`: string
- `visibility`: 'public' | 'private'
- `type`: 'collection' | 'checklist'
- `emoji`: string
- `createdAt`: Timestamp

**listItems**
- `listId`: string
- `messageId`: string
- `addedAt`: Timestamp
- `completed`: boolean

**users**
- `email`: string
- `displayName`: string
- `photoURL`: string
- `lastSeen`: Timestamp

## Usage

### Interactions

- **Like a message**: Double-tap on any message
- **Reply to a message**: Swipe right on a message
- **Save to list**: Long-press on a message
- **Quick draw**: Tap the pencil icon in the input area

### Lists

- Create collections to save messages for later
- Create checklists to track items with done/undone states
- Private lists are only visible to the creator
- Tap any saved message to jump to it in the conversation
