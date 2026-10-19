import React, { useContext } from "react";
import "./FoodItem.css";
import { assets } from "../../assets/assets";
import { StoreContext } from "../../context/StoreContext";

const FoodItem = ({ id, name, price, description, image, isAvailable = true }) => {
  const { cartItems, addToCart, removeFromCart, url } = useContext(StoreContext);

  const imageUrl = image
    ? (image.startsWith("http") || image.startsWith("data:") || image.startsWith("/src/") || image.startsWith("/assets/")
      ? image
      : `${url}/images/${image}`)
    : "";

  return (
    <div className={`food-item ${!isAvailable ? "food-item-unavailable" : ""}`} style={{ opacity: isAvailable ? 1 : 0.65 }}>
      <div className="food-item-img-container" style={{ position: "relative" }}>
        <img className="food-item-image" src={imageUrl} alt={name} loading="lazy" decoding="async" />
        
        {!isAvailable ? (
          <span
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "rgba(220, 38, 38, 0.9)",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: "700",
              padding: "3px 8px",
              borderRadius: "4px",
              textTransform: "uppercase"
            }}
          >
            Out of Stock
          </span>
        ) : !cartItems[id] ? (
          <img className="add" onClick={() => addToCart(id)} src={assets.add_icon_white} alt="Add to cart" />
        ) : (
          <div className="food-item-counter">
            <img onClick={() => removeFromCart(id)} src={assets.remove_icon_red} alt="Remove" />
            <p>{cartItems[id]}</p>
            <img onClick={() => addToCart(id)} src={assets.add_icon_green} alt="Add" />
          </div>
        )}
      </div>

      <div className="food-item-info">
        <div className="food-item-name-rating">
          <p>{name}</p>
          <img src={assets.rating_starts} alt="Rating" />
        </div>
        <p className="food-item-desc">{description}</p>
        <p className="food-item-price">₹{price}</p>
      </div>
    </div>
  );
};

export default FoodItem;
