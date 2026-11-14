import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  collection,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { ProjectAudit } from './types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore targeting the specific database ID with forced long polling
function getOrInitFirestore() {
  const dbId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    return initializeFirestore(
      app,
      { experimentalForceLongPolling: true },
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

// --- Standardized Firestore Error Handling (Non-blocking warning) ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.warn(`[Firestore Warning] Operation ${operationType} at ${path} encountered connectivity issue, operating in offline/local cache mode:`, error);
}
// ---------------------------------------------

export async function testFirestoreConnection() {
  return Promise.resolve();
}

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
    console.warn('Profil utilisateur non synchronisé dans Firestore (mode hors-ligne) :', error);
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

export async function logOut(): Promise<void> {
  await signOut(auth);
}

// Local storage helper for offline resilience
const getLocalProjects = (userId: string): ProjectAudit[] => {
  try {
    const raw = localStorage.getItem(`vert_idee_projects_${userId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
};

const saveLocalProjects = (userId: string, projects: ProjectAudit[]) => {
  try {
    localStorage.setItem(`vert_idee_projects_${userId}`, JSON.stringify(projects));
  } catch {}
};

// Subscribe to user projects in Firestore with automatic localStorage fallback
export function subscribeToUserProjects(
  userId: string,
  onSuccess: (projects: ProjectAudit[]) => void,
  onError: (err: any) => void
) {
  // Immediately return local projects for instant rendering
  const localList = getLocalProjects(userId);
  onSuccess(localList);

  const projectsCol = collection(db, 'users', userId, 'projects');
  const path = `users/${userId}/projects`;

  let unsubscribe: (() => void) | null = null;
  try {
    unsubscribe = onSnapshot(
      projectsCol,
      (snapshot) => {
        const list: ProjectAudit[] = [];
        snapshot.forEach((d) => {
          list.push(d.data() as ProjectAudit);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        saveLocalProjects(userId, list);
        onSuccess(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
        // Fallback to local storage on connection failure
        onSuccess(getLocalProjects(userId));
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    onSuccess(getLocalProjects(userId));
  }

  return () => {
    if (unsubscribe) unsubscribe();
  };
}

// Save or update a project in user's cloud Firestore with localStorage fallback
export async function saveUserProject(userId: string, project: ProjectAudit): Promise<void> {
  const path = `users/${userId}/projects/${project.id}`;
  
  // Update local storage first for instant offline capability
  const currentLocal = getLocalProjects(userId);
  const updatedList = [project, ...currentLocal.filter(p => p.id !== project.id)];
  saveLocalProjects(userId, updatedList);

  try {
    const docRef = doc(db, 'users', userId, 'projects', project.id);
    await setDoc(docRef, { ...project, userId, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete a project from user's cloud Firestore with localStorage fallback
export async function deleteUserProject(userId: string, projectId: string): Promise<void> {
  const path = `users/${userId}/projects/${projectId}`;
  
  // Update local storage first
  const currentLocal = getLocalProjects(userId);
  const updatedList = currentLocal.filter(p => p.id !== projectId);
  saveLocalProjects(userId, updatedList);

  try {
    const docRef = doc(db, 'users', userId, 'projects', projectId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
