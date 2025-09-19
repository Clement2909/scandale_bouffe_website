import React from 'react';
import { useNavigate } from 'react-router-dom';
import './StaffHome.css';

const StaffHome = () => {
  const navigate = useNavigate();

  return (
    <div className="business-portal">
      {/* Header Navigation */}
      <header className="portal-header">
        <div className="header-content">
          <div className="brand-section">
            <img src="/images/scandale_logo.jpg" alt="Scandale Bouffe" className="brand-logo" />
            <div className="brand-info">
              <h1>Scandale Bouffe</h1>
              <span>Business Portal</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="login-btn"
              onClick={() => navigate('/staff/login')}
            >
              Connexion Sécurisée
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="portal-hero">
        <div className="hero-grid">
          <div className="hero-text">
            <h1>Plateforme de Gestion</h1>
            <h2>Restaurant Scandale Bouffe</h2>
            <p>
              Système intégré de gestion des opérations, administration du personnel
              et pilotage de la performance commerciale.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Surveillance</span>
              </div>
              <div className="stat">
                <span className="stat-number">100%</span>
                <span className="stat-label">Sécurisé</span>
              </div>
              <div className="stat">
                <span className="stat-number">Real-time</span>
                <span className="stat-label">Analytics</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <div className="dashboard-preview">
              <div className="preview-header">
                <div className="preview-dots">
                  <span></span><span></span><span></span>
                </div>
                <span className="preview-title">Dashboard Admin</span>
              </div>
              <div className="preview-content">
                <div className="preview-chart"></div>
                <div className="preview-metrics">
                  <div className="metric"></div>
                  <div className="metric"></div>
                  <div className="metric"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Management Modules */}
      <section className="management-modules">
        <div className="container">
          <h2>Modules de Gestion</h2>
          <p className="section-description">
            Suite complète d'outils pour l'administration et le pilotage opérationnel
          </p>

          <div className="modules-grid">
            <div className="module-card">
              <div className="module-icon operations">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L15.09 8.26L22 9L16 14.74L17.18 21.02L12 18.77L6.82 21.02L8 14.74L2 9L8.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Opérations</h3>
              <p>Gestion des commandes, suivi de production, coordination cuisine-service</p>
              <ul>
                <li>Commandes en temps réel</li>
                <li>Gestion des files d'attente</li>
                <li>Optimisation des temps</li>
              </ul>
            </div>

            <div className="module-card">
              <div className="module-icon inventory">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 6H16L15.38 4.76C15.15 4.31 14.68 4 14.17 4H9.83C9.32 4 8.85 4.31 8.62 4.76L8 6H4C3.45 6 3 6.45 3 7C3 7.55 3.45 8 4 8H5V19C5 20.1 5.9 21 7 21H17C18.1 21 19 20.1 19 19V8H20C20.55 8 21 7.55 21 7C21 6.45 20.55 6 20 6Z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Inventaire</h3>
              <p>Contrôle des stocks, approvisionnements, gestion des fournisseurs</p>
              <ul>
                <li>Suivi automatisé des stocks</li>
                <li>Alertes réapprovisionnement</li>
                <li>Traçabilité produits</li>
              </ul>
            </div>

            <div className="module-card">
              <div className="module-icon finance">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V8H19V19Z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Finance</h3>
              <p>Comptabilité, analyses de rentabilité, rapports financiers</p>
              <ul>
                <li>Tableau de bord financier</li>
                <li>Analyses de marge</li>
                <li>Reporting automatique</li>
              </ul>
            </div>

            <div className="module-card">
              <div className="module-icon hr">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 4C16.55 4 17 4.45 17 5V8H15V6H9V8H7V5C7 4.45 7.45 4 8 4H16Z" fill="currentColor"/>
                  <path d="M12 9C13.1 9 14 9.9 14 11C14 12.1 13.1 13 12 13C10.9 13 10 12.1 10 11C10 9.9 10.9 9 12 9Z" fill="currentColor"/>
                </svg>
              </div>
              <h3>Ressources Humaines</h3>
              <p>Gestion du personnel, plannings, évaluations, formation</p>
              <ul>
                <li>Planning intelligent</li>
                <li>Gestion des congés</li>
                <li>Évaluation performance</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Access Control */}
      <section className="access-control">
        <div className="container">
          <h2>Accès Sécurisé & Niveaux d'Autorisation</h2>
          <div className="access-grid">
            <div className="access-level admin">
              <div className="level-badge">ADMIN</div>
              <h3>Administration Complète</h3>
              <p>Accès total aux systèmes, gestion des utilisateurs, configuration</p>
            </div>
            <div className="access-level manager">
              <div className="level-badge">MANAGER</div>
              <h3>Gestion Opérationnelle</h3>
              <p>Supervision équipes, rapports, gestion stocks et planning</p>
            </div>
            <div className="access-level staff">
              <div className="level-badge">STAFF</div>
              <h3>Interface Employé</h3>
              <p>Consultation planning, demandes congés, suivi personnel</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="portal-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h4>Scandale Bouffe Business Portal</h4>
              <p>Plateforme de gestion intégrée pour l'excellence opérationnelle</p>
            </div>
            <div className="footer-security">
              <h4>Sécurité & Conformité</h4>
              <p>Chiffrement SSL • Authentification multi-facteurs • Sauvegarde automatique</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Scandale Bouffe Business Solutions. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StaffHome;