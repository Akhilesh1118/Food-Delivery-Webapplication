import React, { useState } from 'react';
import ExploreMenu from '../../components/ExploreMenu/ExploreMenu';
import FoodDisplay from '../../components/FoodDisplay/FoodDisplay';
import { assets } from '../../assets/assets';

const MenuPage = () => {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  return (
    <div style={{ marginTop: '20px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        padding: '16px 20px',
        background: '#fff7ed',
        borderRadius: '12px',
        border: '1px solid #ffedd5'
      }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: 0 }}>
            Restaurant Menu
          </h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>
            Choose from an extensive selection of freshly prepared dishes
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '25px',
          padding: '8px 16px',
          minWidth: '260px'
        }}>
          <img src={assets.search_icon} alt="Search" style={{ width: '16px', height: '16px', opacity: 0.6 }} />
          <input
            type="text"
            placeholder="Search dishes or ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              width: '100%',
              background: 'transparent'
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#94a3b8',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <ExploreMenu category={category} setCategory={setCategory} />
      <FoodDisplay category={category} search={search} />
    </div>
  );
};

export default MenuPage;
