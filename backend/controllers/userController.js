import userModel from "../models/userModel.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import validator from "validator";
import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { inMemoryStore } from "../config/inMemoryStore.js";
import { ensureDBConnected } from "../config/db.js";

const isDbConnected = () => mongoose.connection.readyState === 1;
const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret_food_del_key";

const createToken = (id, role = "customer") => {
    return jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
};

// The bootstrap administrator is configured on the server. Additional admins
// are created by authenticated administrators through the managed accounts API.
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Please enter email and password" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (adminEmail && adminPassword && normalizedEmail === adminEmail && password === adminPassword) {
        const adminName = process.env.ADMIN_NAME?.trim() || "Administrator";
        return res.json({
            success: true,
            token: createToken("env_admin", "admin"),
            user: { id: "env_admin", name: adminName, email: adminEmail, role: "admin" }
        });
    }

    const databaseReady = await ensureDBConnected();
    if (databaseReady) {
        try {
            const admin = await userModel.findOne({ email: normalizedEmail, role: "admin" });
            if (admin && await bcrypt.compare(password, admin.password)) {
                return res.json({
                    success: true,
                    token: createToken(admin._id.toString(), "admin"),
                    user: { id: admin._id.toString(), name: admin.name, email: admin.email, role: "admin" }
                });
            }
        } catch (error) {
            console.error("Admin database login error:", error);
            return res.status(503).json({ success: false, message: "Administrator sign in is temporarily unavailable." });
        }
    }
    if (!databaseReady && process.env.MONGODB_URI) {
        return res.status(503).json({ success: false, message: "Database unavailable. Please retry administrator sign in shortly." });
    }
    return res.status(401).json({ success: false, message: "Invalid administrator credentials" });
};

const listManagedAccounts = async (req, res) => {
    if (!await ensureDBConnected()) {
        return res.status(503).json({ success: false, message: "MongoDB is unavailable. Check the server MONGODB_URI and database network access, then retry." });
    }
    try {
        const accounts = await userModel.find({ role: { $in: ["admin", "staff"] } })
            .select("name email role staffId createdAt")
            .sort({ role: 1, name: 1 })
            .lean();
        return res.json({ success: true, accounts });
    } catch (error) {
        console.error("List managed accounts error:", error);
        return res.status(503).json({ success: false, message: "Could not load team accounts right now." });
    }
};

const createManagedAccount = async (req, res) => {
    if (!await ensureDBConnected()) {
        return res.status(503).json({ success: false, message: "MongoDB is unavailable. Check the server MONGODB_URI and database network access, then retry." });
    }
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const role = req.body.role;

    if (!name || name.length > 100 || !validator.isEmail(email) || password.length < 8 || password.length > 128 || !["admin", "staff"].includes(role)) {
        return res.status(400).json({ success: false, message: "Enter a name, valid email, password of at least 8 characters, and choose Admin or Staff." });
    }

    try {
        const duplicate = await userModel.findOne({ email }).select("_id");
        if (duplicate) {
            return res.status(409).json({ success: false, message: "An account already uses this email." });
        }
        const account = await userModel.create({
            name,
            email,
            password: await bcrypt.hash(password, await bcrypt.genSalt(10)),
            role,
            ...(role === "staff" ? { staffId: `STF-${randomBytes(4).toString("hex").toUpperCase()}` } : {})
        });
        return res.status(201).json({
            success: true,
            account: { id: account._id.toString(), name: account.name, email: account.email, role: account.role, staffId: account.staffId || null, createdAt: account.createdAt }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "An account already uses this email or staff ID." });
        }
        console.error("Create managed account error:", error);
        return res.status(500).json({ success: false, message: "Could not create account." });
    }
};

// LOGIN USER (Customer or Staff only; administrator access uses /admin/login)
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
            if (memUser.role === "admin") {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
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
                        role: role,
                        staffId: memUser.staffId || null
                    }
                });
            }
        }

        if (await ensureDBConnected()) {
            const user = await userModel.findOne({ email: normalizedEmail });
            if (!user) {
                return res.status(401).json({ success: false, message: "Invalid credentials" });
            }
            if (user.role === "admin") {
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
                    role: role,
                    staffId: user.staffId || null
                }
            });
        }

        if (process.env.MONGODB_URI) {
            return res.status(503).json({ success: false, message: "Database unavailable. Please retry staff sign in shortly." });
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

export { loginUser, loginAdmin, registerUser, listManagedAccounts, createManagedAccount };
