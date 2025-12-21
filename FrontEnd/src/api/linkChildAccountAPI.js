import { db, auth } from "../FireBase/firebase"; 
import { 
    doc, 
    updateDoc, 
    query, 
    collection, 
    where, 
    getDocs, 
    arrayUnion // Note: arrayUnion will now add an object instead of just a string
} from "firebase/firestore";

// --- API Function for Immediate Linking ---
export const linkChildAccountAPI = async (childEmail) => {
    // Requires Parent to be logged in
    const parentUid = token(); 

    // 1. Check if the child account exists and get details
    const q = query(collection(db, "users"), where("email", "==", childEmail));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return { childExists: false, childUid: null };
    }
    
    const childDoc = querySnapshot.docs[0];
    const childUid = childDoc.id;
    const childData = childDoc.data();

    // Data object to store on the Parent's profile
    const childProfile = {
        uid: childUid,
        email: childData.email,
        username: childData.username || 'N/A', // Use username if available
    };

    // 2. Link the accounts (Commit Logic)
    
    // 2a. Update the Child's document: Add parentId (Requires Rule 2 fix)
    await updateDoc(doc(db, "users", childUid), {
        parentId: parentUid,
    });

    // 2b. Update the Parent's document: Add the detailed child profile (Requires Rule 1 fix)
    await updateDoc(doc(db, "users", parentUid), {
        // Use arrayUnion to safely add the new child object to the 'children' array
        children: arrayUnion(childProfile), 
    });

    console.log(`[LINKED] Parent ${parentUid} immediately linked to Child ${childUid}.`);
    
    return {
        childExists: true,
        childUid: childUid,
    };
};