import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocFromServer,
  deleteDoc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface ConversionRecord {
  id?: string;
  userId: string;
  fileName: string;
  content: string;
  status: 'draft' | 'completed';
  createdAt: any;
  updatedAt: any;
}

export interface UserPreferences {
  maxRecentProjects: number;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  updatedAt: any;
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export async function saveConversion(fileName: string, content: string, status: 'draft' | 'completed' = 'completed'): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be signed in to save history");

  const path = 'conversions';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId: user.uid,
      fileName: fileName.trim() || 'Untitled',
      content,
      status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
    return "";
  }
}

export async function updateConversion(id: string, updates: Partial<Pick<ConversionRecord, 'content' | 'fileName' | 'status'>>) {
  const path = `conversions/${id}`;
  try {
    const docRef = doc(db, 'conversions', id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteConversion(id: string) {
  const path = `conversions/${id}`;
  try {
    const docRef = doc(db, 'conversions', id);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function getHistory(limitCount?: number): Promise<ConversionRecord[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = 'conversions';
  try {
    let q = query(
      collection(db, path),
      where("userId", "==", user.uid)
    );
    
    const querySnapshot = await getDocs(q);
    let results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ConversionRecord[];

    // Sort in-memory to avoid composite index requirement
    results.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : (a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0);
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : (b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0);
      return timeB - timeA;
    });

    if (limitCount) {
      return results.slice(0, limitCount);
    }
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function getUserPreferences(): Promise<UserPreferences> {
  const user = auth.currentUser;
  if (!user) return { maxRecentProjects: 5 };

  try {
    const docSnap = await getDoc(doc(db, 'userPreferences', user.uid));
    if (docSnap.exists()) {
      return docSnap.data() as UserPreferences;
    }
  } catch (error: any) {
    // If it's just 'offline', we return defaults silently to avoid alarming the user during initial connection
    if (error?.message?.includes('offline')) {
      console.log("Firestore is offline, using default preferences.");
    } else {
      console.error("Error fetching preferences:", error);
    }
  }
  return { maxRecentProjects: 5 };
}

export async function updateUserPreferences(updates: Partial<UserPreferences>) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await setDoc(doc(db, 'userPreferences', user.uid), updates, { merge: true });
  } catch (error) {
    console.error("Error updating preferences:", error);
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const docSnap = await getDoc(doc(db, 'userProfiles', userId));
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }
  return null;
}

export async function updateUserProfile(updates: Partial<UserProfile>) {
  const user = auth.currentUser;
  if (!user) return;

  const path = `userProfiles/${user.uid}`;
  try {
    const docRef = doc(db, 'userProfiles', user.uid);
    await setDoc(docRef, {
      ...updates,
      userId: user.uid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
