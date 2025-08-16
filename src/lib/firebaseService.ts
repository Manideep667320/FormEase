import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  DocumentData,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

// Firebase config (replace with your actual values)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAZ96B2F3OrkwDRoYP5q3iMyx4cnHLv4SU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||  "formease-bf6ad.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ||  "formease-bf6ad",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "formease-bf6ad.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "349366421308",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:349366421308:web:825795fe7391a0f02dc039"
};

// Define FormDraft type
export interface FormDraft {
  id?: string;
  userId: string;
  formTypeId: string;
  data: Record<string, any>;
  createdAt?: any;
  lastUpdated?: any;
}

// Define and export FormSectionWithFields type
export interface Field {
  id?: string;
  fieldKey: string; // unique key/name for the field (used by voice/NLP)
  label: string;
  required: boolean;
  value?: string;
}

export interface FormSectionWithFields {
  id?: string;
  title: string;
  fields: Field[];
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Type definitions (existing)...

// Helper function to fetch form sections by formTypeId
export async function fetchFormSections(formTypeId: string) {
  const sectionsCol = collection(db, "formSections");
  const q = query(sectionsCol, where("formTypeId", "==", formTypeId));
  const querySnapshot = await getDocs(q);
  const sections = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  return sections;
}

// Helper function to fetch fields by sectionId
export async function fetchFieldsBySection(sectionId: string) {
  const fieldsCol = collection(db, "formFields");
  const q = query(fieldsCol, where("sectionId", "==", sectionId));
  const querySnapshot = await getDocs(q);
  const fields = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  return fields;
}

// Helper function to fetch form sections with fields by formTypeId
export async function fetchFormSectionsWithFields(formTypeId: string) {
  const sections = await fetchFormSections(formTypeId);
  const sectionsWithFields = await Promise.all(
    sections.map(async (section) => {
      const fields = await fetchFieldsBySection(section.id);
      return {
        ...section,
        fields,
      };
    })
  );
  return sectionsWithFields;
}

// Form Draft methods
export async function createFormDraft(
  draft: Omit<FormDraft, "id" | "createdAt" | "lastUpdated">
): Promise<FormDraft> {
  const now = serverTimestamp();
  const docRef = await addDoc(collection(db, "formDrafts"), {
    ...draft,
    createdAt: now,
    lastUpdated: now,
  });
  return { id: docRef.id, ...draft, createdAt: now, lastUpdated: now };
}

export async function getUserFormDrafts(userId: string): Promise<FormDraft[]> {
  const draftsRef = collection(db, "formDrafts");
  const q = query(draftsRef, where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      userId: data.userId,
      formTypeId: data.formTypeId,
      data: data.data,
      createdAt: data.createdAt,
      lastUpdated: data.lastUpdated,
    };
  });
}

export async function getFormDraft(draftId: string): Promise<FormDraft | undefined> {
  const draftRef = doc(db, "formDrafts", draftId);
  const docSnap = await getDoc(draftRef);
  if (!docSnap.exists()) {
    return undefined;
  }
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId,
    formTypeId: data.formTypeId,
    data: data.data,
    createdAt: data.createdAt,
    lastUpdated: data.lastUpdated,
  };
}

export async function updateFormDraft(
  draftId: string,
  data: Partial<FormDraft>
): Promise<FormDraft | undefined> {
  const draftRef = doc(db, "formDrafts", draftId);
  await updateDoc(draftRef, { ...data, lastUpdated: serverTimestamp() });
  const updatedDraft = await getFormDraft(draftId);
  return updatedDraft;
}
