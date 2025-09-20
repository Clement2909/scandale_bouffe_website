import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="restaurant-home">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <img src="/scandale_bouffe_website/images/scandale_logo.jpg" alt="Scandale Bouffe" className="hero-logo" />
          <h1 className="hero-title">Scandale Bouffe</h1>
          <p className="hero-subtitle">L'Art Culinaire Malgache</p>
          <p className="hero-description">
            Découvrez les saveurs authentiques de Madagascar dans une ambiance fast-food conviviale
          </p>
          <div className="hero-actions">
            <button className="cta-primary" onClick={() => navigate('/client/login')}>
              Commander en ligne
            </button>
            <button className="cta-secondary" onClick={() => navigate('/client/register')}>
              Rejoindre nos membres
            </button>
          </div>
        </div>
      </section>

      {/* Menu Highlights */}
      <section className="menu-highlights">
        <div className="container">
          <h2>Nos Spécialités</h2>
          <p className="section-subtitle">Nos bestsellers préparés avec passion</p>
          <div className="menu-grid">
            <div className="menu-item">
              <div className="menu-image"></div>
              <h3>Frites Artisanales</h3>
              <p>Nos frites croustillantes, spécialité de la maison et produit phare</p>
            </div>
            <div className="menu-item">
              <div className="menu-image"></div>
              <h3>Cookies Maison</h3>
              <p>Nos délicieux cookies faits maison, l'autre spécialité la plus vendue</p>
            </div>
            <div className="menu-item">
              <div className="menu-image"></div>
              <h3>Burgers & Crêpes</h3>
              <p>Burgers gourmands et crêpes salées ou sucrées pour tous les goûts</p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional Menu Items */}
      <section className="additional-menu">
        <div className="container">
          <h2>Également au Menu</h2>
          <div className="additional-items">
            <div className="additional-item">
              <div className="item-icon">🍕</div>
              <h3>Pizzas</h3>
              <p>Pizzas fraîches préparées selon vos envies</p>
            </div>
            <div className="additional-item">
              <div className="item-icon">🍛</div>
              <h3>Plats Malgaches</h3>
              <p>Découvrez parfois nos spécialités traditionnelles de Madagascar</p>
            </div>
            <div className="additional-item">
              <div className="item-icon">☕</div>
              <h3>Boissons Chaudes</h3>
              <p>Chocolat chaud, café (expresso), pas d'alcool</p>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurant Info */}
      <section className="restaurant-info">
        <div className="container">
          <div className="info-content">
            <div className="info-text">
              <h2>Fast-Food Malgache Authentique</h2>
              <p>
                Scandale Bouffe vous propose une expérience culinaire unique alliant
                la rapidité du fast-food aux saveurs authentiques de Madagascar.
                Notre carte variée satisfait toutes vos envies gourmandes.
              </p>
              <div className="restaurant-features">
                <div className="feature">
                  <div className="feature-icon">🎓</div>
                  <div>
                    <h4>Chef Diplômé INTH</h4>
                    <p>Formation d'excellence à l'Institut National du Tourisme et de l'Hôtellerie</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🌱</div>
                  <div>
                    <h4>Produits Bio</h4>
                    <p>Ingrédients frais et bio issus d'élevages locaux et de plantations durables</p>
                  </div>
                </div>
                <div className="feature">
                  <div className="feature-icon">🥧</div>
                  <div>
                    <h4>Pâtisseries Artisanales</h4>
                    <p>Pain chocolat, pain raisin, quiches et tartes salées/sucrées</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="container">
          <h2>Prêt à Vivre l'Expérience ?</h2>
          <p>Rejoignez notre communauté de gourmets et découvrez nos dernières créations</p>
          <div className="cta-buttons">
            <button className="cta-primary" onClick={() => navigate('/client/register')}>
              Créer mon compte
            </button>
            <button className="cta-outline" onClick={() => navigate('/client/login')}>
              Déjà membre ? Se connecter
            </button>
          </div>
        </div>
      </section>

      <footer className="restaurant-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <h3>Scandale Bouffe</h3>
              <p>L'art culinaire malgache à votre service</p>
            </div>
            <div className="footer-info">
              <h4>Horaires</h4>
              <p>Lundi - Samedi: 07h - 19h</p>
              <p>Fermé le dimanche</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Scandale Bouffe. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;