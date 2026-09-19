const { initializeApp, getApps } = require('firebase/app');
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

const primaryApp = initializeApp(firebaseConfig);
const primaryAuth = getAuth(primaryApp);

const secondaryApp = initializeApp(firebaseConfig, 'SecondaryAuth');
const secondaryAuth = initializeAuth(secondaryApp, { persistence: inMemoryPersistence });

const toCanonicalAlias = (identifier) => {
  const clean = identifier.toLowerCase().trim();
  if (clean.includes('@')) return clean;
  return `${clean.replace(/[^a-z0-9._-]/g, '')}@campusconnect.edu`;
};

const encodeProfileMetadata = (profile) => {
  const compact = {
    uid: profile.uid,
    n: profile.name,
    r: profile.role,
    col: profile.collegeId,
    u: profile.username,
    id: profile.studentId || profile.registrationId,
    p: profile.phone,
    d: profile.department,
    y: profile.year,
    div: profile.division,
    roll: profile.rollNumber,
    des: profile.designation,
    fc: profile.assignedFoodCourtId,
    pw: profile.passwordHash,
  };

  const json = JSON.stringify(compact);
  const truncatedDisplayName = json.length <= 250 ? json : profile.name.slice(0, 250);
  const photoURL = 'https://campus.internal/profile?m=' + encodeURIComponent(json);

  return { displayName: truncatedDisplayName, photoURL };
};

const registerCloudIdentity = async (emailOrAlias, password, profile) => {
  try {
    const email = toCanonicalAlias(emailOrAlias);
    const { displayName, photoURL } = encodeProfileMetadata(profile);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      await updateProfile(cred.user, { displayName, photoURL });
      await signOut(secondaryAuth);
      console.log('registerCloudIdentity SUCCESS for', email);
    } catch (authErr) {
      console.log('registerCloudIdentity error for', email, ':', authErr.code, authErr.message);
      if (authErr?.code === 'auth/email-already-in-use') {
        try {
          const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
          await updateProfile(cred.user, { displayName, photoURL });
          await signOut(secondaryAuth);
          console.log('Updated existing cloud identity for', email);
        } catch (inner) {
          console.log('Inner error updating existing user:', inner.code, inner.message);
        }
      }
    }
  } catch (e) {
    console.error('Fatal registerCloudIdentity error:', e);
  }
};

async function simulateAdminCreationAndOtherDeviceLogin() {
  const username = 'canteen_test_' + Math.floor(Math.random() * 10000);
  const password = 'mypassword123';
  const name = 'Om Food Court';
  const phone = '9876543210';
  const collegeId = 'col_jspm_tathawade';

  console.log('STEP 1: College Admin creates canteen owner with username:', username);
  const email = `${username.replace(/[^a-z0-9]/g, '')}@canteen.campus`;
  const newOwner = {
    uid: `canteen_owner_${Date.now()}`,
    role: 'food_court_staff',
    collegeId,
    name,
    username,
    email,
    phone,
    passwordHash: password,
    designation: 'Food Court Owner & Licensee',
    assignedFoodCourtId: 'fc_jspm_main',
    status: 'active',
  };

  // This is what DataService.addCanteenOwner currently does:
  await registerCloudIdentity(username, password, newOwner);
  await registerCloudIdentity(email, password, newOwner);

  console.log('\nSTEP 2: User on Device B tries to log in with username:', username);
  // Current candidates in DataService.authenticateCredentials:
  const cleanId = username.toLowerCase().trim();
  const cleanPass = password.trim();

  const candidates = [];
  if (cleanId.includes('@')) {
    candidates.push(cleanId);
  } else {
    const sanitized = cleanId.replace(/[^a-z0-9._-]/g, '');
    candidates.push(`${sanitized}@campusconnect.edu`);
    candidates.push(`${sanitized}@canteen.campus`);
  }
  console.log('Candidates on Device B:', candidates);

  let loggedIn = false;
  for (const cand of candidates) {
    console.log('Attempting sign in on Device B with candidate:', cand);
    try {
      const cred = await signInWithEmailAndPassword(primaryAuth, cand, cleanPass);
      console.log('Device B SUCCESSFUL login for candidate:', cand, 'UID:', cred.user.uid);
      loggedIn = true;
      break;
    } catch (err) {
      console.log('Device B candidate failed:', cand, 'Code:', err.code, 'Message:', err.message);
    }
  }

  if (!loggedIn) {
    console.error('LOGIN FAILED ON DEVICE B!');
  } else {
    console.log('LOGIN PASSED ON DEVICE B!');
  }
}

simulateAdminCreationAndOtherDeviceLogin().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
