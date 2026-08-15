// Firebase project init — the one shared backend both players' browsers connect to for
// online play. The apiKey etc. below are NOT secret (Firebase web config is meant to be
// public in client code; actual access control is enforced by Firestore security rules, not
// by hiding this object) — see console.firebase.google.com project settings.
//
// ⚠️ PLACEHOLDER PROJECT — replace with a real Firebase project's config before online play
// (room codes, the global leaderboard) will work. Local "vs. bots" play doesn't touch this
// file at all and works with zero setup. See the README's "Deploying" section for the
// 5-minute Firebase Console steps (same ones Durak and Par Five each did for their own
// projects) — create a project, enable Firestore, add a Web app, paste its config below,
// then publish this repo's firestore.rules.
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.firebasestorage.app',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

const app = initializeApp(firebaseConfig);
// The engine's GameState has several optional fields (PlayerState.personality,
// PendingDraw, etc.) that come through as `undefined` rather than omitted mid-game —
// Firestore rejects `undefined` field values by default, so this tells it to silently drop
// them instead of throwing on every game-state write.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
