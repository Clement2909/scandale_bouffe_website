import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser, createDocument } from '../../firebase/services';
import './Auth.css';
import './ClientAuth.css';

const ClientRegister = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: ''
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

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      const user = await registerUser(formData.email, formData.password);

      // Create client profile in Firestore
      await createDocument('clients', {
        uid: user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        role: 'client'
      });

      navigate('/client/dashboard');
    } catch (error) {
      setError('Erreur lors de l\'inscription: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="restaurant-auth-container">
      <div className="restaurant-auth-backdrop"></div>
      <div className="restaurant-auth-content">
        <div className="restaurant-auth-card register-card">
          <div className="restaurant-auth-header">
            <img src="/scandale_bouffe_website/images/scandale_logo.jpg" alt="Scandale Bouffe" className="restaurant-auth-logo" />
            <h1>Scandale Bouffe</h1>
            <p>L'Art Culinaire Malgache</p>
            <h2>Rejoindre Notre Communauté</h2>
          </div>

          <form onSubmit={handleSubmit} className="restaurant-auth-form">
            {error && <div className="restaurant-error-message">{error}</div>}

            <div className="restaurant-form-row">
              <div className="restaurant-form-group">
                <label htmlFor="firstName">Prénom</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  placeholder="Votre prénom"
                />
              </div>

              <div className="restaurant-form-group">
                <label htmlFor="lastName">Nom de Famille</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  placeholder="Votre nom"
                />
              </div>
            </div>

            <div className="restaurant-form-group">
              <label htmlFor="email">Adresse Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="votre@email.com"
              />
            </div>

            <div className="restaurant-form-group">
              <label htmlFor="phone">Téléphone</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+261 32 12 345 67"
              />
            </div>

            <div className="restaurant-form-group">
              <label htmlFor="password">Mot de Passe</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            <div className="restaurant-form-group">
              <label htmlFor="confirmPassword">Confirmer le Mot de Passe</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="restaurant-auth-button"
              disabled={loading}
            >
              {loading ? 'Création du compte...' : 'Rejoindre Scandale Bouffe'}
            </button>
          </form>

          <div className="restaurant-auth-footer">
            <p className="restaurant-signup-text">
              Déjà membre de notre communauté ?
            </p>
            <button
              className="restaurant-signup-button"
              onClick={() => navigate('/client/login')}
            >
              Se connecter
            </button>

            <div className="restaurant-back-link">
              <button
                className="restaurant-back-button"
                onClick={() => navigate('/')}
              >
                ← Retour au restaurant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientRegister;