import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updatePassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";

// ✅ Create User (email + username)
export const doCreateUserWithEmailAndPassword = async (email, password, username) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  const user = result.user;

  // store username + email
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    username,
  });

  return result;
};

// ✅ Login using Email
export const doSignInWithEmailAndPassword = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// ✅ Login with username OR email
export const doSignInWithUsernameOrEmail = async (usernameOrEmail, password) => {
  let loginEmail = usernameOrEmail;

  // if the string does not contain '@', treat it as username
  if (!usernameOrEmail.includes("@")) {
    // search Firestore for username
    const q = query(collection(db, "users"), where("username", "==", usernameOrEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("No account found for that username");
    }

    const userData = querySnapshot.docs[0].data();
    loginEmail = userData.email;
  }

  // login normally with email
  return signInWithEmailAndPassword(auth, loginEmail, password);
};

// ✅ Google Sign-In
export const doSignInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // store info in Firestore if not already saved
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email: user.email,
    username: user.displayName?.replace(/\s+/g, "").toLowerCase() ?? null,
  }, { merge: true });
};

export const doSignOut = () => auth.signOut();
export const doPasswordReset = (email) => sendPasswordResetEmail(auth, email);
export const doPasswordChange = (password) =>
  updatePassword(auth.currentUser, password);
export const doSendEmailVerification = () =>
  sendEmailVerification(auth.currentUser, {
    url: `${window.location.origin}/home`,
  });
