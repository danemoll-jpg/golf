// Firebase project init — the one shared backend both players' browsers connect to for
// online play. The apiKey etc. below are NOT secret (Firebase web config is meant to be
// public in client code; actual access control is enforced by Firestore security rules, not
// by hiding this object) — see console.firebase.google.com project settings.
//
// Project: golf-cards-e2488. No Analytics SDK here on purpose (the console's default setup
// snippet includes one) — this app doesn't use it, and skipping it keeps the client bundle
// a bit smaller. Same call Durak's firebase.ts makes for its own project.
import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBn567Myy1zLga0sKtQAnnVAIXMKZn2jEE',
  authDomain: 'golf-cards-e2488.firebaseapp.com',
  projectId: 'golf-cards-e2488',
  storageBucket: 'golf-cards-e2488.firebasestorage.app',
  messagingSenderId: '233356260805',
  appId: '1:233356260805:web:9bbf79e3f300d064ebc7ac',
};

const app = initializeApp(firebaseConfig);
// The engine's GameState has several optional fields (PlayerState.personality,
// PendingDraw, etc.) that come through as `undefined` rather than omitted mid-game —
// Firestore rejects `undefined` field values by default, so this tells it to silently drop
// them instead of throwing on every game-state write.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
