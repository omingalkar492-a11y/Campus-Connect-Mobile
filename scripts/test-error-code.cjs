const { initializeApp, getApps } = require('firebase/app');
const { getAuth, initializeAuth, inMemoryPersistence, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } = require('firebase/auth');

const firebaseConfig = {
  apiKey: 'AIzaSyAAtQuMwlhNmF0kDJVlA1ovaRyRJj7c29w',
  authDomain: 'campus-connect-41b23.firebaseapp.com',
  projectId: 'campus-connect-41b23',
  storageBucket: 'campus-connect-41b23.firebasestorage.app',
  messagingSenderId: '561127901173',
  appId: '1:561127901173:web:3b1b74f8242f2b2683c2bc',
};

const app = initializeApp(firebaseConfig);
const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuth');
const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });

async function testNonExistentCandidate() {
  console.log('Testing what Firebase returns for non-existent email:');
  try {
    await signInWithEmailAndPassword(secondaryAuth, 'definitely_does_not_exist_987654@campusconnect.edu', 'somePass123');
  } catch (err) {
    console.log('Error code for non-existent user:', err.code, err.message);
  }
}

testNonExistentCandidate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
