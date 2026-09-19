const { initializeApp, getApps } = require('firebase/app');
const {
  getAuth,
  initializeAuth,
  inMemoryPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
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
const secondaryAuth = initializeAuth(secondaryApp, {
  persistence: inMemoryPersistence,
});

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

const decodeProfileMetadata = (user) => {
  if (user.photoURL && user.photoURL.includes('?m=')) {
    try {
      const raw = decodeURIComponent(user.photoURL.split('?m=')[1]);
      const obj = JSON.parse(raw);
      return {
        uid: obj.uid,
        name: obj.n,
        role: obj.r,
        collegeId: obj.col,
        username: obj.u,
        studentId: obj.id,
        registrationId: obj.id,
        phone: obj.p,
        department: obj.d,
        year: obj.y,
        division: obj.div,
        rollNumber: obj.roll,
        designation: obj.des,
        assignedFoodCourtId: obj.fc,
        passwordHash: obj.pw,
      };
    } catch {}
  }

  if (user.displayName) {
    try {
      const obj = JSON.parse(user.displayName);
      return {
        uid: obj.uid,
        name: obj.n || obj.name,
        role: obj.r || obj.role,
        collegeId: obj.col || obj.collegeId,
        username: obj.u || obj.username,
        studentId: obj.id || obj.studentId || obj.registrationId,
        registrationId: obj.id || obj.registrationId || obj.studentId,
        phone: obj.p || obj.phone,
        department: obj.d || obj.department,
        year: obj.y || obj.year,
        division: obj.div || obj.division,
        rollNumber: obj.roll || obj.rollNumber,
        designation: obj.des || obj.designation,
        assignedFoodCourtId: obj.fc || obj.assignedFoodCourtId,
        passwordHash: obj.pw || obj.passwordHash,
      };
    } catch {
      return { name: user.displayName };
    }
  }

  return {};
};

const parseProfileFromUser = (user, fallbackEmailOrId) => {
  const meta = decodeProfileMetadata(user);
  const email = user.email || fallbackEmailOrId || '';
  const isAlias = email.endsWith('@campusconnect.edu') || email.endsWith('@canteen.campus');
  const derivedUsername = isAlias ? email.split('@')[0] : undefined;

  return {
    uid: meta.uid || user.uid,
    name: meta.name || user.displayName || 'Campus User',
    role: meta.role || 'student',
    collegeId: meta.collegeId || 'col_jspm_tathawade',
    email: meta.email || email,
    username: meta.username || derivedUsername,
    studentId: meta.studentId || meta.registrationId,
    registrationId: meta.registrationId || meta.studentId,
    phone: meta.phone,
    designation: meta.designation,
    assignedFoodCourtId: meta.assignedFoodCourtId,
  };
};

const registerCloudIdentity = async (emailOrAlias, password, profile) => {
  const email = toCanonicalAlias(emailOrAlias);
  const { displayName, photoURL } = encodeProfileMetadata(profile);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    await updateProfile(cred.user, { displayName, photoURL });
    await signOut(secondaryAuth);
    return cred.user;
  } catch (authErr) {
    if (authErr && authErr.code === 'auth/email-already-in-use') {
      const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
      await updateProfile(cred.user, { displayName, photoURL });
      await signOut(secondaryAuth);
      return cred.user;
    }
    throw authErr;
  }
};

async function runMultiDeviceTest() {
  console.log('====================================================');
  console.log('STARTING MULTI-DEVICE AUTHENTICATION TEST SUITE');
  console.log('====================================================\n');

  const createdUsers = [];

  try {
    // -------------------------------------------------------------
    // SCENARIO 1: Device A (College Admin) creates Canteen Owner
    // -------------------------------------------------------------
    console.log('1. [Device A]: College Admin registers Canteen Owner "canteen_pos_77"...');
    const canteenProfile = {
      uid: 'canteen_owner_77',
      name: 'Ramesh Food Court',
      role: 'food_court_staff',
      collegeId: 'col_jspm_tathawade',
      username: 'canteen_pos_77',
      phone: '9822011223',
      assignedFoodCourtId: 'fc_jspm_main',
      status: 'active',
    };
    const canteenPass = 'counterPass123!';
    const u1 = await registerCloudIdentity('canteen_pos_77', canteenPass, canteenProfile);
    createdUsers.push(u1);
    console.log('   -> Canteen Owner successfully provisioned to cloud registry with ID alias.');

    // -------------------------------------------------------------
    // SCENARIO 2: Device B (Canteen POS device) logs in with ID
    // -------------------------------------------------------------
    console.log('\n2. [Device B]: Canteen Counter logs in using Username "canteen_pos_77"...');
    const canteenAlias = toCanonicalAlias('canteen_pos_77');
    const canteenLogin = await signInWithEmailAndPassword(primaryAuth, canteenAlias, canteenPass);
    const resolvedCanteenProfile = parseProfileFromUser(canteenLogin.user, 'canteen_pos_77');
    console.log('   -> Login SUCCESS on Device B!');
    console.log('   -> Role:', resolvedCanteenProfile.role);
    console.log('   -> Name:', resolvedCanteenProfile.name);
    console.log('   -> Assigned Food Court:', resolvedCanteenProfile.assignedFoodCourtId);
    if (resolvedCanteenProfile.role !== 'food_court_staff') {
      throw new Error('Role mismatch for canteen owner');
    }
    await signOut(primaryAuth);

    // -------------------------------------------------------------
    // SCENARIO 3: Device A: Student registers with Registration ID & Email
    // -------------------------------------------------------------
    console.log('\n3. [Device A]: Student registers with Registration ID "2024CS888" and Email...');
    const studentProfile = {
      uid: 'student_888',
      name: 'Pooja Sharma',
      role: 'student',
      collegeId: 'col_jspm_tathawade',
      email: `pooja.sharma_${Date.now()}@jspm.edu`,
      registrationId: '2024CS888',
      studentId: '2024CS888',
      rollNumber: '3142',
      department: 'Computer Science',
      year: '3rd Year',
      status: 'active',
    };
    const studentPass = 'poojaPass123!';

    // Primary email account
    const studentUser = await registerCloudIdentity(studentProfile.email, studentPass, studentProfile);
    createdUsers.push(studentUser);
    // Registration ID alias account
    const studentAliasUser = await registerCloudIdentity('2024CS888', studentPass, studentProfile);
    createdUsers.push(studentAliasUser);
    console.log('   -> Student primary email and Registration ID alias provisioned to cloud.');

    // -------------------------------------------------------------
    // SCENARIO 4: Device B (Student Phone): logs in using Registration ID
    // -------------------------------------------------------------
    console.log('\n4. [Device B]: Student logs in using Registration ID "2024CS888"...');
    const regIdAlias = toCanonicalAlias('2024CS888');
    const studentLogin1 = await signInWithEmailAndPassword(primaryAuth, regIdAlias, studentPass);
    const resolvedStudentProfile1 = parseProfileFromUser(studentLogin1.user, '2024CS888');
    console.log('   -> Login with Registration ID SUCCESS on Device B!');
    console.log('   -> Student Name:', resolvedStudentProfile1.name);
    console.log('   -> Registration ID:', resolvedStudentProfile1.registrationId);
    console.log('   -> Role:', resolvedStudentProfile1.role);
    if (resolvedStudentProfile1.registrationId !== '2024CS888') {
      throw new Error('Registration ID mismatch on student login');
    }
    await signOut(primaryAuth);

    // -------------------------------------------------------------
    // SCENARIO 5: Device C (Library PC): student logs in using Email
    // -------------------------------------------------------------
    console.log('\n5. [Device C]: Student logs in using Email address...');
    const studentLogin2 = await signInWithEmailAndPassword(primaryAuth, studentProfile.email, studentPass);
    const resolvedStudentProfile2 = parseProfileFromUser(studentLogin2.user, studentProfile.email);
    console.log('   -> Login with Email SUCCESS on Device C!');
    console.log('   -> Student Name:', resolvedStudentProfile2.name);
    await signOut(primaryAuth);

    // -------------------------------------------------------------
    // SCENARIO 6: Invalid Password Check
    // -------------------------------------------------------------
    console.log('\n6. Testing wrong password rejection...');
    try {
      await signInWithEmailAndPassword(primaryAuth, regIdAlias, 'wrongPassword!');
      throw new Error('Should have thrown wrong password error');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        console.log('   -> Correctly rejected wrong password with:', err.code);
      } else {
        throw err;
      }
    }

    console.log('\n====================================================');
    console.log('ALL MULTI-DEVICE AUTHENTICATION TESTS PASSED 100%!');
    console.log('====================================================\n');
  } finally {
    console.log('Cleaning up temporary test accounts...');
    for (const u of createdUsers) {
      try {
        // Sign in to delete
        await deleteUser(u);
      } catch (e) {
        // Ignore cleanup failure for test
      }
    }
    console.log('Cleanup complete.');
  }
}

runMultiDeviceTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
