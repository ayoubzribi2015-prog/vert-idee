import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocFromServer,
  collection,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ProjectAudit } from './types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the specific database ID with auto-detect long polling
// to prevent 10s streaming timeouts in iframe/proxy environments
function getOrInitFirestore() {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    return initializeFirestore(
      app,
      { experimentalAutoDetectLongPolling: true },
      dbId !== '(default)' ? dbId : undefined
    );
  } catch {
    return dbId !== '(default)' ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db = getOrInitFirestore();

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// --- Standardized Firestore Error Handling ---
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
// ---------------------------------------------

// Test connection on boot as requested by skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Mode hors-ligne Firestore actif. Veuillez vérifier la connexion Firebase.');
    }
  }
}

// Sign in with Google (Gmail)
async function upsertUserProfile(user: FirebaseUser): Promise<void> {
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
        photoURL: user.photoURL || '',
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    // A profile write failure must never block a successful Google authentication
    console.warn('Profil utilisateur non synchronisé dans Firestore :', error);
  }
}

const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/operation-not-supported-in-this-environment',
  'auth/web-storage-unsupported',
]);

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await upsertUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    if (REDIRECT_FALLBACK_CODES.has(error?.code) && !isInIframe()) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw error;
  }
}

export async function completeRedirectSignIn(): Promise<FirebaseUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await upsertUserProfile(result.user);
      return result.user;
    }
  } catch (error) {
    console.warn('Résultat de redirection Google indisponible :', error);
  }
  return null;
}

export function getGoogleAuthErrorMessage(error: any): string | null {
  const code: string = error?.code || '';
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return null;
    case 'auth/popup-blocked':
      return 'La fenêtre de connexion Google a été bloquée par le navigateur. Autorisez les fenêtres contextuelles pour ce site puis réessayez.';
    case 'auth/unauthorized-domain':
      return `Le domaine « ${window.location.hostname} » n'est pas autorisé pour la connexion Google. Ajoutez-le dans Firebase Console > Authentication > Settings > Authorized domains.`;
    case 'auth/operation-not-allowed':
      return 'La connexion Google n\'est pas activée. Activez le fournisseur « Google » dans Firebase Console > Authentication > Sign-in method.';
    case 'auth/network-request-failed':
      return 'Erreur réseau pendant la connexion Google. Vérifiez votre connexion Internet puis réessayez.';
    case 'auth/web-storage-unsupported':
    case 'auth/operation-not-supported-in-this-environment':
      return 'Votre navigateur bloque les cookies tiers nécessaires à la connexion. Ouvrez l\'application dans un nouvel onglet puis réessayez.';
    default:
      return `Erreur lors de la connexion Google${code ? ` (${code})` : ''}.`;
  }
}

// Sign out
export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Subscribe to user projects in Firestore
export function subscribeToUserProjects(
  userId: string,
  onSuccess: (projects: ProjectAudit[]) => void,
  onError: (err: any) => void
) {
  const projectsCol = collection(db, 'users', userId, 'projects');
  const path = `users/${userId}/projects`;
  return onSnapshot(
    projectsCol,
    (snapshot) => {
      const list: ProjectAudit[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as ProjectAudit);
      });
      // Sort by creation date descending
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSuccess(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError(error);
    }
  );
}

// Save or update a project in user's cloud Firestore
export async function saveUserProject(userId: string, project: ProjectAudit): Promise<void> {
  const path = `users/${userId}/projects/${project.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', project.id);
    await setDoc(docRef, { ...project, userId, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete a project from user's cloud Firestore
export async function deleteUserProject(userId: string, projectId: string): Promise<void> {
  const path = `users/${userId}/projects/${projectId}`;
  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
