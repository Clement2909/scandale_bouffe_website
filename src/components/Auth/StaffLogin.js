import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, queryDocuments } from '../../firebase/services';
import { checkAdminRole } from '../../firebase/initAdmin';
import './Auth.css';
import './StaffAuth.css';

const StaffLogin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Try to login with Firebase Auth
      const user = await loginUser(formData.email, formData.password);

      // Check if user is admin
      const isAdmin = await checkAdminRole(formData.email);

      if (isAdmin) {
        localStorage.setItem('userRole', 'admin');
        localStorage.setItem('userEmail', formData.email);
        localStorage.setItem('userId', user.uid);
        navigate('/admin/dashboard');
        return;
      }

      // Check if user is staff member
      const staffMembers = await queryDocuments('employees', [
        { field: 'email', operator: '==', value: formData.email }
      ]);

      if (staffMembers.length === 0) {
        setError('Accès non autorisé. Contactez l\'administrateur.');
        return;
      }

      const staffMember = staffMembers[0];
      localStorage.setItem('userRole', 'employee');
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('employeeId', staffMember.id);
      localStorage.setItem('userId', user.uid);

      navigate('/employee/dashboard');
    } catch (error) {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="business-auth-container">
      <div className="business-auth-sidebar">
        <div className="business-branding">
          <img src="/scandale_bouffe_website/images/scandale_logo.jpg" alt="Scandale Bouffe" className="business-logo" />
          <div className="business-brand-info">
            <h1>Scandale Bouffe</h1>
            <span>Business Portal</span>
          </div>
        </div>

        <div className="business-features">
          <div className="business-feature">
            <div className="feature-icon">🔐</div>
            <div>
              <h4>Sécurité Renforcée</h4>
              <p>Authentification multi-niveaux et chiffrement SSL</p>
            </div>
          </div>
          <div className="business-feature">
            <div className="feature-icon">📊</div>
            <div>
              <h4>Analytics en Temps Réel</h4>
              <p>Tableaux de bord et métriques instantanées</p>
            </div>
          </div>
          <div className="business-feature">
            <div className="feature-icon">⚡</div>
            <div>
              <h4>Performance Optimisée</h4>
              <p>Interface rapide et responsive pour tous les appareils</p>
            </div>
          </div>
        </div>
      </div>

      <div className="business-auth-main">
        <div className="business-auth-content">
          <div className="business-auth-header">
            <h2>Connexion Sécurisée</h2>
            <p>Accédez à votre espace de gestion professionnel</p>
          </div>

          <form onSubmit={handleSubmit} className="business-auth-form">
            {error && <div className="business-error-message">{error}</div>}

            <div className="business-form-group">
              <label htmlFor="email">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <path d="M22 6L12 13L2 6" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                Email Professionnel
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="nom@scandalebouffe.com"
              />
            </div>

            <div className="business-form-group">
              <label htmlFor="password">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" fill="none"/>
                  <circle cx="12" cy="16" r="1" fill="currentColor"/>
                  <path d="M7 11V7A5 5 0 0 1 17 7V11" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
                Mot de Passe
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••••"
              />
            </div>

            <button
              type="submit"
              className="business-auth-button"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="loading-spinner" width="20" height="20" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                    <path d="M4 12A8 8 0 018 4" stroke="currentColor" strokeWidth="4" fill="none"/>
                  </svg>
                  Authentification...
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15 3H6A3 3 0 003 6V18A3 3 0 006 21H15" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" fill="none"/>
                    <path d="M15 12H21" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                  Accéder au portail
                </>
              )}
            </button>
          </form>

          <div className="business-auth-footer">
            <div className="business-security-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22S2 16 2 9C2 7 4 5 6 5C8 5 10 6 12 8C14 6 16 5 18 5C20 5 22 7 22 9C22 16 12 22 12 22Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              <span>Connexion sécurisée SSL • Données chiffrées</span>
            </div>

            <button
              className="business-back-button"
              onClick={() => navigate('/staff')}
            >
              ← Retour au portail
            </button>

            <div className="business-help-text">
              <small>
                Pour l'inscription du personnel ou l'assistance technique,
                contactez l'administrateur système.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLogin;