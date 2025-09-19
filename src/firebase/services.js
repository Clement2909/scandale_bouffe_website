import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { db, auth } from './config';

// Authentication Services
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};

// Generic CRUD Operations
export const createDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    throw error;
  }
};

export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      return null;
    }
  } catch (error) {
    throw error;
  }
};

export const getAllDocuments = async (collectionName) => {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (error) {
    throw error;
  }
};

export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    throw error;
  }
};

export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    throw error;
  }
};

// Query with conditions
export const queryDocuments = async (collectionName, conditions = [], orderByField = null) => {
  try {
    let q = collection(db, collectionName);

    if (conditions.length > 0) {
      const queryConstraints = conditions.map(condition =>
        where(condition.field, condition.operator, condition.value)
      );

      if (orderByField) {
        q = query(q, ...queryConstraints, orderBy(orderByField));
      } else {
        q = query(q, ...queryConstraints);
      }
    } else if (orderByField) {
      q = query(q, orderBy(orderByField));
    }

    const querySnapshot = await getDocs(q);
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    return documents;
  } catch (error) {
    throw error;
  }
};

// Real-time listener
export const subscribeToCollection = (collectionName, callback, conditions = []) => {
  let q = collection(db, collectionName);

  if (conditions.length > 0) {
    const queryConstraints = conditions.map(condition =>
      where(condition.field, condition.operator, condition.value)
    );
    q = query(q, ...queryConstraints);
  }

  return onSnapshot(q, (querySnapshot) => {
    const documents = [];
    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...doc.data() });
    });
    callback(documents);
  });
};

// User Role Management
export const getUserRole = async (userId) => {
  try {
    const userDoc = await getDocument('users', userId);
    return userDoc ? userDoc.role : null;
  } catch (error) {
    console.error('Erreur lors de la récupération du rôle:', error);
    return null;
  }
};

export const updateUserRole = async (userId, role) => {
  try {
    await updateDocument('users', userId, { role });
  } catch (error) {
    throw error;
  }
};

export const getUserByEmail = async (email) => {
  try {
    const users = await queryDocuments('users', [
      { field: 'email', operator: '==', value: email }
    ]);
    return users.length > 0 ? users[0] : null;
  } catch (error) {
    console.error('Erreur lors de la recherche utilisateur:', error);
    return null;
  }
};