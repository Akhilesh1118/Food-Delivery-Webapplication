import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import mongoose from "mongoose";
import { inMemoryStore } from "../config/inMemoryStore.js";

const isDbConnected = () => mongoose.connection.readyState === 1;
const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_food_del_key";

const createToken = (id, role = "customer") => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// LOGIN USER (Customer, Staff, or Admin based on verified database role)
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please enter email and password" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Check in-memory store (active fallback / demo accounts)
        const memUser = inMemoryStore.findUserByEmail(normalizedEmail);
        if (memUser) {
            const isMatch = await bcrypt.compare(password, memUser.password);
            if (isMatch) {
                const role = memUser.role || "customer";
                const token = createToken(memUser._id, role);
                return res.json({
                    success: true,
                    token,
                    user: {
                        id: memUser._id,
                        name: memUser.name,
                        email: memUser.email,
                        role: role
                    }
                });
            }
        }

        if (isDbConnected()) {
            const user = await userModel.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            const role = user.role || "customer";
            const token = createToken(user._id.toString(), role);
            return res.json({
                success: true,
                token,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: role
                }
            });
        }

        return res.status(401).json({ success: false, message: "Invalid credentials" });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Error during login" });
    }
};

// REGISTER USER (Public registration strictly creates customer accounts only)
const registerUser = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (!validator.isEmail(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password should be at least 6 characters long" });
        }

        // Security rule: Public registration CANNOT create admin or staff accounts
        const assignedRole = "customer";

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (isDbConnected()) {
            const exists = await userModel.findOne({ email: normalizedEmail });
            if (exists) {
                return res.status(400).json({ success: false, message: "User with this email already exists" });
            }
            const newUser = new userModel({
                name,
                email: normalizedEmail,
                password: hashedPassword,
                role: assignedRole
            });
            const user = await newUser.save();
            const token = createToken(user._id.toString(), assignedRole);
            return res.status(201).json({
                success: true,
                token,
                user: {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: assignedRole
                }
            });
        }

        // In-memory fallback
        if (inMemoryStore.findUserByEmail(normalizedEmail)) {
            return res.status(400).json({ success: false, message: "User with this email already exists" });
        }
        const user = inMemoryStore.createUser({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: assignedRole
        });
        const token = createToken(user._id, assignedRole);
        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: assignedRole
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ success: false, message: error.message || "Registration failed" });
    }
};

export { loginUser, registerUser };
