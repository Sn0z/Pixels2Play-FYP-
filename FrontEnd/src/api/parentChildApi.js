import { db, auth } from "../FireBase/firebase"; 
import { 
    doc, 
    getDoc, 
    updateDoc, 
    setDoc,
    query, 
    collection, 
    where, 
    getDocs, 
    arrayUnion 
} from "firebase/firestore";

// --- Helper for Unauthenticated Error ---
class UnauthenticatedError extends Error {
  constructor(message = "User is not authenticated as a parent.") {
    super(message);
    this.name = "UnauthenticatedError";
  }
}

// --- Helper to get current user's UID (Parent) AND ensure doc exists ---
const getParentUidAndEnsureDoc = async () => {
    const user = auth.currentUser;
    if (!user) {
        throw new UnauthenticatedError();
    }
    const parentUid = user.uid;
    const parentDocRef = doc(db, "users", parentUid);

    const docSnap = await getDoc(parentDocRef);

    if (!docSnap.exists()) {
        // Attempt to create the document if it's missing (e.g., after Google sign-in)
        await setDoc(parentDocRef, {
            uid: parentUid,
            email: user.email,
            children: [], // Initialize children array
        }, { merge: true });
        console.log(`[Firestore] Created minimal document for Parent: ${parentUid}`);
    }

    return parentUid;
};

// --- API Function for Immediate Linking ---
export const linkChildAccountAPI = async (childEmail) => {
  // ✅ This will throw UnauthenticatedError OR ensure the parent's document exists.
  const parentUid = await getParentUidAndEnsureDoc(); 

  // 1. Check if the child account exists
  const q = query(collection(db, "users"), where("email", "==", childEmail));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return { childExists: false, childUid: null };
  }
  
  const childDoc = querySnapshot.docs[0];
  const childUid = childDoc.id;

  // 2. Link the accounts (Commit Logic)
  
  // 2a. Update the Child's document: Add parentId
  // 🛑 THIS REQUIRES THE RULE FIX BELOW (Parent writing to Child's document)
  await updateDoc(doc(db, "users", childUid), {
    parentId: parentUid,
  });

  // 2b. Update the Parent's document: Add child's UID to 'children' array
  // ✅ THIS REQUIRES THE RULE FIX BELOW (Parent writing to their OWN document)
  await updateDoc(doc(db, "users", parentUid), {
    children: arrayUnion(childUid), 
  });

  return {
    childExists: true,
    childUid: childUid,
  };
};

// NOTE: You must use the linkChildAccountAPI function in your component.