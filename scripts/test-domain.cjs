const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, deleteUser } = require('firebase/auth');

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

async function testDomains() {
  const test1 = `test_${Date.now()}@canteen.campus`;
  console.log('Testing domain @canteen.campus:', test1);
  try {
    const cred = await createUserWithEmailAndPassword(auth, test1, 'password123!');
    console.log('SUCCESS with @canteen.campus!');
    await deleteUser(cred.user);
  } catch (err) {
    console.error('FAILED with @canteen.campus:', err.code, err.message);
  }

  const test2 = `test_${Date.now()}@campusconnect.edu`;
  console.log('Testing domain @campusconnect.edu:', test2);
  try {
    const cred = await createUserWithEmailAndPassword(auth, test2, 'password123!');
    console.log('SUCCESS with @campusconnect.edu!');
    await deleteUser(cred.user);
  } catch (err) {
    console.error('FAILED with @campusconnect.edu:', err.code, err.message);
  }
}

testDomains().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
