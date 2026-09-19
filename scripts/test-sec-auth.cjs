const { initializeApp, getApps, getApp } = require('firebase/app');
const {
  initializeAuth,
  getAuth,
  inMemoryPersistence,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} = require('firebase/auth');

const firebaseConfig = {
  apiKey: 'AIzaSyAAtQuMwlhNmF0kDJVlA1ovaRyRJj7c29w',
  authDomain: 'campus-connect-41b23.firebaseapp.com',
  projectId: 'campus-connect-41b23',
  storageBucket: 'campus-connect-41b23.firebasestorage.app',
  messagingSenderId: '561127901173',
  appId: '1:561127901173:web:3b1b74f8242f2b2683c2bc',
};

const secondaryApp =
  getApps().find((a) => a.name === 'SecondaryAuth') ||
  initializeApp(firebaseConfig, 'SecondaryAuth');

const secondaryAuth = initializeAuth(secondaryApp, {
  persistence: inMemoryPersistence,
});

async function testSecondaryAuthCreation() {
  const testId = 'testcanteen_' + Date.now();
  const testEmail = testId + '@campusconnect.edu';
  const testPass = 'canteenPass123!';
  console.log('Attempting to create user with secondaryAuth:', testEmail);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, testEmail, testPass);
    console.log('User created successfully on secondaryAuth! UID:', cred.user.uid);
    await signOut(secondaryAuth);
  } catch (err) {
    console.error('Failed to create on secondaryAuth:', err.code, err.message);
  }
}

testSecondaryAuthCreation()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
