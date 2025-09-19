import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateDocument,
  queryDocuments,
  getUserByEmail
} from '../../firebase/services';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '../../firebase/config';
import './Admin.css';

const AdminProfile = () => {
  const navigate = useNavigate();
  const [currentEmail, setCurrentEmail] = useState('admin@scandalebouffe.com');
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // Removed activeTab - only password change now

  useEffect(() => {
    loadAdminAccount();

    // Écouter les changements d'authentification
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      console.log('Auth state changed:', user ? user.email : 'No user');
    });

    return () => unsubscribe();
  }, []);

  const loadAdminAccount = async () => {
    try {
      setLoading(true);
      const currentEmail = localStorage.getItem('userEmail') || 'admin@scandalebouffe.com';
      const adminUser = await getUserByEmail(currentEmail);

      if (adminUser) {
        setCurrentEmail(adminUser.email);
      }
    } catch (error) {
      setError('Erreur lors du chargement du compte');
    } finally {
      setLoading(false);
    }
  };

  // Removed handleAccountChange - email section removed

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  // Removed handleEmailSubmit - email change section removed

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!currentUser) {
      setError('Utilisateur non authentifié');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    try {
      // Réauthentifier l'utilisateur avec le mot de passe actuel
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );

      await reauthenticateWithCredential(currentUser, credential);

      // Mettre à jour le mot de passe dans Firebase Auth
      await updatePassword(currentUser, passwordData.newPassword);

      // Mettre à jour la date de changement dans la base de données (sans stocker le mot de passe)
      const adminAccounts = await queryDocuments('adminAccount', [
        { field: 'role', operator: '==', value: 'admin' }
      ]);

      const passwordInfo = {
        lastPasswordChange: new Date().toISOString()
      };

      if (adminAccounts.length > 0) {
        await updateDocument('adminAccount', adminAccounts[0].id, {
          ...adminAccounts[0],
          ...passwordInfo
        });
      }

      setSuccess('Mot de passe mis à jour avec succès');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Erreur mise à jour mot de passe:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Mot de passe actuel incorrect');
      } else if (error.code === 'auth/weak-password') {
        setError('Le nouveau mot de passe est trop faible');
      } else if (error.code === 'auth/requires-recent-login') {
        setError('Veuillez vous reconnecter pour modifier votre mot de passe');
      } else {
        setError('Erreur lors de la mise à jour du mot de passe: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-container">
      <header className="admin-header">
        <button
          className="back-button"
          onClick={() => navigate('/admin/dashboard')}
        >
          ← Retour
        </button>
        <h1>Paramètres du Compte</h1>
        <div className="user-info">
          {currentEmail}
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Removed tabs - only password change available */}

      <main className="admin-main">
        <div className="profile-container">
          <div className="password-card">
            <h3>Changer le Mot de Passe</h3>
            <p className="security-note">
              Pour des raisons de sécurité, veuillez entrer votre mot de passe actuel avant de définir un nouveau mot de passe.
            </p>

            <form onSubmit={handlePasswordSubmit} className="form">
              <div className="form-group">
                <label htmlFor="currentPassword">Mot de passe actuel *</label>
                <input
                  type="password"
                  id="currentPassword"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Entrez votre mot de passe actuel"
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">Nouveau mot de passe *</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  required
                  minLength="6"
                  placeholder="Entrez votre nouveau mot de passe"
                />
                <small className="form-help">
                  Le mot de passe doit contenir au moins 6 caractères
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe *</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  required
                  placeholder="Confirmez votre nouveau mot de passe"
                />
              </div>

              <div className="password-requirements">
                <h4>Exigences du mot de passe :</h4>
                <ul>
                  <li className={passwordData.newPassword.length >= 6 ? 'valid' : ''}>
                    Au moins 6 caractères
                  </li>
                  <li className={passwordData.newPassword === passwordData.confirmPassword && passwordData.confirmPassword ? 'valid' : ''}>
                    Les mots de passe correspondent
                  </li>
                </ul>
              </div>

              <div className="form-actions">
                <button type="submit" disabled={loading} className="save-button">
                  {loading ? 'Mise à jour...' : 'Changer le Mot de Passe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminProfile;