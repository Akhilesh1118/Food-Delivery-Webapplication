import userModel from "../models/userModel.js";
import mongoose from "mongoose";
import { inMemoryStore } from "../config/inMemoryStore.js";

const isDbConnected = () => mongoose.connection.readyState === 1;

// add items to user cart 
const addToCart = async (req, res) => {
    try {
        const { userId, itemId } = req.body;
        if (isDbConnected()) {
            let userData = await userModel.findById(userId);
            if (userData) {
                let cartData = userData.cartData || {};
                cartData[itemId] = (cartData[itemId] || 0) + 1;
                await userModel.findByIdAndUpdate(userId, { cartData });
                return res.json({ success: true, message: "Added To Cart" });
            }
        }
        inMemoryStore.addToCart(userId, itemId);
        res.json({ success: true, message: "Added To Cart" });
    } catch (error) {
        console.log("Add to cart error:", error);
        res.json({ success: false, message: "Error" });
    }
};

// remove items from user cart 
const removeFromCart = async (req, res) => {
    try {
        const { userId, itemId } = req.body;
        if (isDbConnected()) {
            let userData = await userModel.findById(userId);
            if (userData) {
                let cartData = userData.cartData || {};
                if (cartData[itemId] > 0) {
                    cartData[itemId] -= 1;
                }
                await userModel.findByIdAndUpdate(userId, { cartData });
                return res.json({ success: true, message: "Removed From Cart" });
            }
        }
        inMemoryStore.removeFromCart(userId, itemId);
        res.json({ success: true, message: "Removed From Cart" });
    } catch (error) {
        console.log("Remove from cart error:", error);
        res.json({ success: false, message: "Error" });
    }
};

// fetch user cart data 
const getCart = async (req, res) => {
    try {
        const { userId } = req.body;
        if (isDbConnected()) {
            let userData = await userModel.findById(userId);
            if (userData) {
                return res.json({ success: true, cartData: userData.cartData || {} });
            }
        }
        res.json({ success: true, cartData: inMemoryStore.getCart(userId) });
    } catch (error) {
        console.log("Get cart error:", error);
        res.json({ success: false, message: "Error" });
    }
};

export { addToCart, removeFromCart, getCart };