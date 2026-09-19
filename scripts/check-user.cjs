const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: 'AIzaSyAAtQuMwlhNmF0kDJVlA1ovaRyRJj7c29w',
  authDomain: 'campus-connect-41b23.firebaseapp.com',
  projectId: 'campus-connect-41b23',
  storageBucket: 'campus-connect-41b23.firebasestorage.app',
  messagingSenderId: '561127901173',
  appId: '1:561127901173:web:3b1b74f8242f2b2683c2bc',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function checkUser() {
  try {
    const cred = await signInWithEmailAndPassword(auth, 'testcanteen_1789816843456@campusconnect.edu', 'canteenPass123!');
    console.log('USER EXISTS IN FIREBASE AUTH! UID:', cred.user.uid);
  } catch (err) {
    console.log('Error checking user:', err.code, err.message);
  }
}

checkUser().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
