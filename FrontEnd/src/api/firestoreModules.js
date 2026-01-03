import { db, auth } from '../FireBase/firebase';
import { collection, getDocs, addDoc, doc, setDoc, deleteDoc } from 'firebase/firestore';

const MODULES_COL = 'modules';

export async function getModulesFirestore() {
  const q = collection(db, MODULES_COL);
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createModuleFirestore(module) {
  const col = collection(db, MODULES_COL);
  const docRef = await addDoc(col, module);
  return { id: docRef.id, ...module };
}

export async function updateModuleFirestore(id, module) {
  const docRef = doc(db, MODULES_COL, id);
  await setDoc(docRef, module, { merge: true });
  return { id, ...module };
}

export async function deleteModuleFirestore(id) {
  await deleteDoc(doc(db, MODULES_COL, id));
}

export async function syncModuleToBackend(id, module) {
  // send to backend import endpoint with Firebase token
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken();

  const res = await fetch('http://127.0.0.1:8000/api/courses/import/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ module }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Sync failed');
  }

  return res.json();
}
