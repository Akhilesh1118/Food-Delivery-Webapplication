import foodModel from "../models/foodModel.js";
import mongoose from "mongoose";
import { inMemoryStore } from "../config/inMemoryStore.js";

const isDbConnected = () => mongoose.connection.readyState === 1;

// 1. Add food item (Admin)
const addFood = async (req, res) => {
    try {
        const foodData = {
            name: req.body.name,
            description: req.body.description || "",
            price: Number(req.body.price),
            category: req.body.category,
            image: req.body.image,
            isAvailable: req.body.isAvailable !== undefined ? (req.body.isAvailable === true || req.body.isAvailable === 'true') : true
        };

        if (isDbConnected()) {
            const food = new foodModel(foodData);
            await food.save();
            inMemoryStore.addFood({ ...foodData, _id: food._id.toString() });
            return res.json({ success: true, message: "Food Added", data: food });
        } else {
            const newFood = inMemoryStore.addFood(foodData);
            return res.json({ success: true, message: "Food Added", data: newFood });
        }
    } catch (error) {
        console.log("Add food error:", error.message);
        res.status(500).json({ success: false, message: error.message || "Error" });
    }
};

// 2. List all food items (with optional category, search, availableOnly filters)
const listFood = async (req, res) => {
    try {
        const { category, search, availableOnly } = req.query;
        const isAvailFilter = availableOnly === 'true' || availableOnly === true;

        if (isDbConnected()) {
            let filter = {};
            if (category && category !== 'All') {
                filter.category = category;
            }
            if (isAvailFilter) {
                filter.isAvailable = { $ne: false };
            }
            if (search && search.trim()) {
                filter.$or = [
                    { name: { $regex: search.trim(), $options: 'i' } },
                    { category: { $regex: search.trim(), $options: 'i' } },
                    { description: { $regex: search.trim(), $options: 'i' } }
                ];
            }
            const foods = await foodModel.find(filter);
            if (foods && foods.length > 0) {
                return res.json({ success: true, data: foods });
            }
        }
        res.json({ success: true, data: inMemoryStore.getFoods(category, search, isAvailFilter) });
    } catch (error) {
        console.log("Error fetching food list from DB, using fallback:", error.message);
        res.json({ success: true, data: inMemoryStore.getFoods(req.query.category, req.query.search, req.query.availableOnly === 'true') });
    }
};

// 3. Edit food item (Admin)
const editFood = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Food ID is required" });
        }

        const updates = {};
        if (req.body.name !== undefined) updates.name = req.body.name;
        if (req.body.description !== undefined) updates.description = req.body.description;
        if (req.body.price !== undefined) updates.price = Number(req.body.price);
        if (req.body.category !== undefined) updates.category = req.body.category;
        if (req.body.image !== undefined) updates.image = req.body.image;
        if (req.body.isAvailable !== undefined) {
            updates.isAvailable = req.body.isAvailable === true || req.body.isAvailable === 'true';
        }

        if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
            const updated = await foodModel.findByIdAndUpdate(id, updates, { new: true });
            if (updated) {
                inMemoryStore.updateFood(id, updates);
                return res.json({ success: true, message: "Food Updated", data: updated });
            }
        }

        const updated = inMemoryStore.updateFood(id, updates);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Food item not found" });
        }
        res.json({ success: true, message: "Food Updated", data: updated });
    } catch (error) {
        console.log("Edit food error:", error.message);
        res.status(500).json({ success: false, message: error.message || "Error updating food" });
    }
};

// 4. Toggle food availability (Admin)
const toggleAvailability = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Food ID is required" });
        }

        if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
            const current = await foodModel.findById(id);
            if (current) {
                current.isAvailable = !current.isAvailable;
                await current.save();
                inMemoryStore.updateFood(id, { isAvailable: current.isAvailable });
                return res.json({ success: true, message: `Availability set to ${current.isAvailable ? 'Available' : 'Out of Stock'}`, isAvailable: current.isAvailable });
            }
        }

        const updated = inMemoryStore.toggleFoodAvailability(id);
        if (!updated) {
            return res.status(404).json({ success: false, message: "Food item not found" });
        }
        res.json({ success: true, message: `Availability set to ${updated.isAvailable ? 'Available' : 'Out of Stock'}`, isAvailable: updated.isAvailable });
    } catch (error) {
        console.log("Toggle availability error:", error.message);
        res.status(500).json({ success: false, message: "Error updating availability" });
    }
};

// 5. Remove food item (Admin)
const removeFood = async (req, res) => {
    try {
        const id = req.params.id || req.body.id;
        if (!id) {
            return res.status(400).json({ success: false, message: "Food ID is required" });
        }
        if (isDbConnected() && mongoose.Types.ObjectId.isValid(id)) {
            await foodModel.findByIdAndDelete(id);
        }
        inMemoryStore.removeFood(id);
        res.json({ success: true, message: "Food Removed" });
    } catch (error) {
        console.log("Remove food error:", error.message);
        res.status(500).json({ success: false, message: "Error removing food" });
    }
};

export { addFood, listFood, editFood, toggleAvailability, removeFood };