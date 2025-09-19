import { registerUser, createDocument, queryDocuments, updateDocument } from './services';

// Script pour initialiser l'admin dans Firebase
export const initializeAdmin = async () => {
  try {
    console.log('Initialisation de l\'admin...');

    // Créer le compte admin dans Firebase Auth
    const adminUser = await registerUser('admin@scandalebouffe.com', 'Admin123!@#');

    // Créer le profil admin dans Firestore
    await createDocument('users', {
      uid: adminUser.uid,
      email: 'admin@scandalebouffe.com',
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Scandale Bouffe',
      phone: '+33123456789',
      isActive: true,
      permissions: ['all']
    });

    console.log('Admin initialisé avec succès!');
    console.log('Email: admin@scandalebouffe.com');
    console.log('Mot de passe: Admin123!@#');

    return adminUser;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('L\'admin existe déjà dans Firebase Auth');
    } else {
      console.error('Erreur lors de l\'initialisation de l\'admin:', error);
      throw error;
    }
  }
};

// Fonction pour vérifier si un utilisateur est admin
export const checkAdminRole = async (userEmail) => {
  try {
    const userDoc = await queryDocuments('users', [
      { field: 'email', operator: '==', value: userEmail },
      { field: 'role', operator: '==', value: 'admin' }
    ]);

    return userDoc.length > 0;
  } catch (error) {
    console.error('Erreur lors de la vérification du rôle admin:', error);
    return false;
  }
};

// Fonction pour créer un profil admin complet
export const createAdminProfile = async (userId, email) => {
  try {
    await createDocument('users', {
      uid: userId,
      email: email,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Scandale Bouffe',
      phone: '+33123456789',
      isActive: true,
      permissions: ['all'],
      createdAt: new Date(),
      lastLogin: new Date()
    });

    return true;
  } catch (error) {
    console.error('Erreur lors de la création du profil admin:', error);
    throw error;
  }
};

// Fonction pour créer un nouvel admin avec le nouvel email
export const createNewAdmin = async (newEmail, password) => {
  try {
    console.log('Création du nouvel admin avec email:', newEmail);

    // Créer le compte admin dans Firebase Auth
    const adminUser = await registerUser(newEmail, password);

    // Créer le profil admin dans la collection users
    await createDocument('users', {
      uid: adminUser.uid,
      email: newEmail,
      role: 'admin',
      firstName: 'Admin',
      lastName: 'Scandale Bouffe',
      phone: '+33123456789',
      isActive: true,
      permissions: ['all']
    });

    // Créer aussi dans adminAccount
    await createDocument('adminAccount', {
      email: newEmail,
      role: 'admin',
      lastEmailChange: new Date().toISOString()
    });

    console.log('Nouvel admin créé avec succès!');
    console.log('Email:', newEmail);
    console.log('Mot de passe:', password);

    return adminUser;
  } catch (error) {
    console.error('Erreur lors de la création du nouvel admin:', error);
    throw error;
  }
};

// Script de récupération - exécuter immédiatement
export const fixAdminEmail = async () => {
  try {
    console.log('🔄 Récupération de l\'admin avec email par défaut...');

    // Mettre à jour toutes les collections avec l'email par défaut
    const defaultEmail = 'admin@scandalebouffe.com';

    // Mettre à jour la collection users
    const userAccounts = await queryDocuments('users', [
      { field: 'role', operator: '==', value: 'admin' }
    ]);

    if (userAccounts.length > 0) {
      await updateDocument('users', userAccounts[0].id, {
        email: defaultEmail
      });
      console.log('✅ Collection users mise à jour');
    }

    // Mettre à jour la collection adminAccount
    const adminAccounts = await queryDocuments('adminAccount', [
      { field: 'role', operator: '==', value: 'admin' }
    ]);

    if (adminAccounts.length > 0) {
      await updateDocument('adminAccount', adminAccounts[0].id, {
        email: defaultEmail
      });
      console.log('✅ Collection adminAccount mise à jour');
    }

    console.log('✅ RÉCUPÉRATION TERMINÉE!');
    console.log('Connectez-vous avec:');
    console.log('Email: admin@scandalebouffe.com');
    console.log('Mot de passe: Admin123!@#');

    return true;
  } catch (error) {
    console.error('❌ Erreur lors de la récupération:', error);
    throw error;
  }
};

// EXÉCUTION AUTOMATIQUE - Décommentez la ligne suivante pour lancer
fixAdminEmail();