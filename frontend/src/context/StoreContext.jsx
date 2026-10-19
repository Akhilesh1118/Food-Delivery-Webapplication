import { createContext, useEffect, useState } from "react";
import { food_list as initialFoodList } from "../assets/assets";
import axios from "axios";

// eslint-disable-next-line react-refresh/only-export-components
export const StoreContext = createContext(null);

const StoreContextProvider = (props) => { 
     const [cartItems, setCartItems] = useState({});
     const url = import.meta.env.VITE_API_URL || "";
     
     const [token, setToken] = useState("");
     const [food_list, setFoodList] = useState(initialFoodList);

     const addToCart = async (itemId) => {
        const itemInfo = food_list.find((p) => p._id.toString() === itemId.toString());
        if (itemInfo && itemInfo.isAvailable === false) {
            return;
        }
        if (!cartItems[itemId]) {
            setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
        } else {
            setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
        }
        if (token) {
            try {
                await axios.post(url + "/api/cart/add", { itemId }, { headers: { token } });
            } catch (err) {
                console.warn("Could not sync cart to server:", err.message);
            }
        }
     };

     const removeFromCart = async (itemId) => {
        setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
        if (token) {
            try {
                await axios.post(url + "/api/cart/remove", { itemId }, { headers: { token } });
            } catch (err) {
                console.warn("Could not sync cart remove to server:", err.message);
            }
        }
     };

     const getTotalCartAmount = () => {
        let totalAmount = 0;
        for (const item in cartItems) {
            if (cartItems[item] > 0) {
                let itemInfo = food_list.find((product) => product._id.toString() === item.toString());
                if (itemInfo) {
                    totalAmount += itemInfo.price * cartItems[item];
                }
            }
        }
        return totalAmount;
     };

     const fetchFoodList = async () => {
        try {
            const response = await axios.get(url + "/api/food/list");
            if (response.data && response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
                setFoodList(response.data.data);
            } else {
                setFoodList(initialFoodList);
            }
        } catch (err) {
            console.warn("Could not fetch food list from backend, using default items:", err.message);
            setFoodList(initialFoodList);
        }
     };

     const loadCartData = async (userToken) => {
        try {
            const response = await axios.post(url + "/api/cart/get", {}, { headers: { token: userToken } });
            if (response.data && response.data.cartData) {
                setCartItems(response.data.cartData);
            }
        } catch (err) {
            console.warn("Could not fetch cart from backend:", err.message);
        }
     };

     useEffect(() => {
        async function loadData() {
            await fetchFoodList();
            const savedToken = localStorage.getItem("token");
            if (savedToken) {
                setToken(savedToken);
                await loadCartData(savedToken);
            }
        }
        loadData();
     }, []);

     const clearCart = () => {
        setCartItems({});
     };

     const contextValue = {
        food_list,
        cartItems,
        setCartItems,
        clearCart,
        addToCart,
        removeFromCart,
        getTotalCartAmount,
        url,
        token,
        setToken
     };

     return (
        <StoreContext.Provider value={contextValue}>
            {props.children}
        </StoreContext.Provider>
     );
};

export default StoreContextProvider;
