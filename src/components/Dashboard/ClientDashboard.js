import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

const ClientDashboard = () => {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail');

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    navigate('/client/login');
  };

  const menuItems = [
    { title: 'Mon Profil', path: '/client/profile', icon: '👤' },
    { title: 'Menu du Jour', path: '/client/menu', icon: '🍽️' },
    { title: 'Mon Panier', path: '/client/cart', icon: '🛒' },
    { title: 'Mes Commandes', path: '/client/orders', icon: '📋' }
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <img src="/scandale_bouffe_website/images/scandale_logo.jpg" alt="Scandale Bouffe" className="header-logo" />
          <h1>Scandale Bouffe - Espace Client</h1>
        </div>
        <div className="header-right">
          <span className="user-info">{userEmail}</span>
          <button onClick={handleLogout} className="logout-button">
            Déconnexion
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-section">
          <h2>Bienvenue chez Scandale Bouffe !</h2>
          <p>Découvrez notre menu du jour et passez vos commandes</p>
        </div>

        <div className="dashboard-grid client-grid">
          {menuItems.map((item, index) => (
            <div
              key={index}
              className="dashboard-card"
              onClick={() => navigate(item.path)}
            >
              <div className="card-icon">{item.icon}</div>
              <h3>{item.title}</h3>
            </div>
          ))}
        </div>

        <div className="featured-section">
          <h3>🍽️ Plat du Jour</h3>
          <p>Découvrez nos spécialités fraîches préparées quotidiennement</p>
          <button
            className="cta-button"
            onClick={() => navigate('/client/menu')}
          >
            Voir le Menu
          </button>
        </div>
      </main>
    </div>
  );
};

export default ClientDashboard;