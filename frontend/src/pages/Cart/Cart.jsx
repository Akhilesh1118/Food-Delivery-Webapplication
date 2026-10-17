import React, { useContext } from "react";
import "./Cart.css";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
const Cart = () => {
  const { cartItems, food_list, removeFromCart,getTotalCartAmount, url } = useContext(StoreContext);
  const getImageUrl = (image) => {
    if (!image) return "";
    return image.startsWith("http") || image.startsWith("data:") || image.startsWith("/src/") || image.startsWith("/assets/")
      ? image
      : `${url}/images/${image}`;
  };
  const navigate = useNavigate();
  return (
    <div className="cart">
      <div className="cart-items">
        <div className="cart-items-title">
          <p>Items</p>
          <p>Title</p>
          <p>Price</p>
          <p>Quantity</p>
          <p>Total</p>
          <p>Remove</p>
        </div>
        <br />
        <hr />
        {food_list
          .filter((item) => cartItems[item._id] > 0)
          .map((item) => (
            <div key={item._id || item.name}>
              <div className="cart-items-title cart-items-item">
                <img src={getImageUrl(item.image)} alt="" loading="lazy" decoding="async" />
                <p>{item.name}</p>
                <p>₹{item.price}</p>
                <p>{cartItems[item._id]}</p>
                <p>₹{item.price * cartItems[item._id]}</p>
                <button onClick={() => removeFromCart(item._id)}>Remove</button>
              </div>
              <hr />
            </div>
          ))}
      </div>
      <div className="cart-bottom">
        <div className="cart-total">
          <h2>Cart Totals</h2>
          <div>
            <div className="cart-total-details">
                 <p>Subtotal</p>
                 <p>₹ {getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
                  <p>Delivery Charges</p>
                  <p>₹ {getTotalCartAmount()===0?0:50}</p>
            </div>
            <hr />
            <div className="cart-total-details">
                  <b>Total</b>
                  <b>₹ {getTotalCartAmount()===0?0: getTotalCartAmount()+50}</b>
            </div>
          </div>
          <button onClick={()=>navigate('/order')}>PROCEED TO CHECKOUT </button>
        </div>
        <div className="cart-promocode">
          <div>
            <p>If you have a promo code, Enter it here </p>
            <div className="cart-promocode-input">
               <input type="text" placeholder="promo code" />
                <button>APPLY</button>
            </div>
          </div>
        </div>
      </div>  
    </div>
  );
};

export default Cart;
