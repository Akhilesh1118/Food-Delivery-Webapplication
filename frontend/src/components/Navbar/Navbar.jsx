import React, { useContext, useState, useEffect } from 'react';
import './Navbar.css';
import { assets } from '../../assets/assets';
import { Link, useNavigate } from 'react-router-dom';
import { StoreContext } from '../../context/StoreContext';

const Navbar = () => {
  const [menu, setMenu] = useState("home");
  const { getTotalCartAmount, token, setToken, food_list, addToCart, url } = useContext(StoreContext);
  const navigate = useNavigate();

  // Search Modal State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const categories = [
    "All", "Salad", "Rolls", "Deserts", "Sandwich", "Cake", "Pure Veg", "Pasta", "Noodles"
  ];

  useEffect(() => {
    const savedUserStr = localStorage.getItem("user");
    if (savedUserStr) {
      try {
        setUserInfo(JSON.parse(savedUserStr));
      } catch {
        // fallback
      }
    }
  }, [token]);

  // Handle ESC key to close modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowSearchModal(false);
        setShowProfileModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    navigate("/");
  };

  const getImageUrl = (image) => {
    if (!image) return "";
    return image.startsWith("http") || image.startsWith("data:") || image.startsWith("/src/") || image.startsWith("/assets/")
      ? image
      : `${url}/images/${image}`;
  };

  // Filter food list for Search Modal
  const filteredSearchList = food_list.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery = !q || item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q));
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      <div className='navbar'>
        <Link to='/'>
          <img src={assets.logo} alt="Tomato Logo" className='logo' />
        </Link>

        <ul className='navbar-menu'>
          <Link to='/' onClick={() => setMenu("home")} className={menu === "home" ? "active" : ""}>Home</Link>
          <a href='#explore-menu' onClick={() => setMenu("menu")} className={menu === "menu" ? "active" : ""}>Menu</a>
          <a href='#app-download' onClick={() => setMenu("mobile-app")} className={menu === "mobile-app" ? "active" : ""}>Mobile App</a>
          <a href='#footer' onClick={() => setMenu("contact-us")} className={menu === "contact-us" ? "active" : ""}>Contact Us</a>
        </ul>

        <div className='navbar-right'>
          {/* Functional Search Icon */}
          <div className="navbar-search-btn-wrap" onClick={() => setShowSearchModal(true)} title="Search menu dishes">
            <img src={assets.search_icon} alt="Search" className="navbar-icon-search" />
          </div>

          {/* Cart Icon with badge */}
          <div className='navbar-search-icon'>
            <Link to='/cart'>
              <img src={assets.basket_icon} alt="Basket" />
            </Link>
            <div className={getTotalCartAmount() === 0 ? "" : "dot"}></div>
          </div>

          {/* Authentication & Profile Menu */}
          {!token ? (
            <div className="navbar-auth-buttons">
              <button className="navbar-login-btn" onClick={() => navigate('/login')}>
                Sign In
              </button>
              <Link to="/signup" className="navbar-signup-link">
                Create Account
              </Link>
            </div>
          ) : (
            <div className='navbar-profile'>
              <img src={assets.profile_icon} alt="Profile" className="nav-profile-avatar" />
              <ul className="nav-profile-dropdown">
                <li className="nav-profile-header-item">
                  <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                    Customer Account
                  </span>
                  <strong style={{ fontSize: '13px', color: '#1e293b', display: 'block', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {userInfo?.name || 'Customer'}
                  </strong>
                </li>
                <hr />
                <li onClick={() => navigate('/myorders')}>
                  <img src={assets.bag_icon} alt="Orders" />
                  <p>My Orders</p>
                </li>
                <li onClick={() => setShowProfileModal(true)}>
                  <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>👤</span>
                  <p>My Profile</p>
                </li>
                <hr />
                <li onClick={logout}>
                  <img src={assets.logout_icon} alt="Logout" />
                  <p>Logout</p>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* SEARCH MODAL OVERLAY */}
      {showSearchModal && (
        <div className="nav-search-modal-backdrop" onClick={() => setShowSearchModal(false)}>
          <div className="nav-search-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="nav-search-modal-header">
              <div className="nav-search-input-box">
                <img src={assets.search_icon} alt="" style={{ width: '18px', opacity: 0.6 }} />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search dishes by name, ingredients, or taste..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery("")} className="nav-search-clear-btn">
                    ✕
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setShowSearchModal(false)} className="nav-search-close-btn">
                ✕ Close
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="nav-search-categories">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`nav-search-cat-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Live Search Results List */}
            <div className="nav-search-results">
              {filteredSearchList.length === 0 ? (
                <div className="nav-search-empty">
                  <span>🍽️</span>
                  <p>No dishes found matching "{searchQuery}" in {selectedCategory}.</p>
                  <small>Try searching for "Pasta", "Rolls", "Salad", or clear filters.</small>
                </div>
              ) : (
                <div className="nav-search-items-grid">
                  {filteredSearchList.map((item) => (
                    <div key={item._id} className="nav-search-item-card">
                      <img src={getImageUrl(item.image)} alt={item.name} />
                      <div className="nav-search-item-details">
                        <span className="nav-search-item-cat">{item.category}</span>
                        <strong className="nav-search-item-name">{item.name}</strong>
                        <span className="nav-search-item-price">₹{item.price}</span>
                      </div>
                      <button
                        type="button"
                        className="nav-search-add-btn"
                        onClick={() => {
                          addToCart(item._id);
                          setShowSearchModal(false);
                          navigate('/cart');
                        }}
                      >
                        + Add to Cart
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MY PROFILE MODAL */}
      {showProfileModal && (
        <div className="nav-search-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="nav-profile-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="nav-profile-modal-header">
              <h3>Customer Profile</h3>
              <button type="button" onClick={() => setShowProfileModal(false)} className="nav-search-close-btn">
                ✕
              </button>
            </div>
            <div className="nav-profile-modal-body">
              <div className="profile-avatar-circle">
                <img src={assets.profile_icon} alt="Avatar" />
              </div>
              <h4>{userInfo?.name || 'Customer Account'}</h4>
              <p className="profile-role-badge">Verified Customer</p>

              <div className="profile-info-grid">
                <div className="profile-info-row">
                  <span>Email:</span>
                  <strong>{userInfo?.email || 'Registered Customer'}</strong>
                </div>
                <div className="profile-info-row">
                  <span>Customer ID:</span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>{userInfo?.id || 'Active'}</span>
                </div>
                <div className="profile-info-row">
                  <span>Dining Access:</span>
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>Dine-in, Takeaway & Delivery</span>
                </div>
              </div>

              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="profile-modal-action-btn"
                  onClick={() => {
                    setShowProfileModal(false);
                    navigate('/myorders');
                  }}
                >
                  View My Orders
                </button>
                <button
                  type="button"
                  className="profile-modal-logout-btn"
                  onClick={() => {
                    setShowProfileModal(false);
                    logout();
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
