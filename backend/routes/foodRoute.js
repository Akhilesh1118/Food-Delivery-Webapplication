import { v2 as cloudinary } from "cloudinary";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { addFood, listFood, editFood, toggleAvailability, removeFood } from "../controllers/foodController.js";
import authMiddleware, { requireAdmin } from "../middleware/auth.js";

const foodRouter = express.Router();

const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET, 
    secure: true
  });
}

// 2. MULTER CONFIG (Memory Storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// 3. CLOUDINARY UPLOAD LOGIC
const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "food-delivery",
        resource_type: "auto",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(file.buffer);
  });

// 4. MIDDLEWARE TO HANDLE UPLOAD
const uploadImageMiddleware = async (req, res, next) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: "Multer Error" });
    }

    if (!req.file) {
      // Optional image upload (e.g. for edits without new picture)
      return next();
    }

    try {
      if (isCloudinaryConfigured) {
        const result = await uploadToCloudinary(req.file);
        req.body.image = result.secure_url; 
      } else {
        const uploadsDir = path.resolve("./backend/uploads");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filename = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);
        req.body.image = filename;
      }
      next();
    } catch (error) {
      console.error("Upload Error, using data uri fallback:", error.message);
      req.body.image = `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`;
      next();
    }
  });
};

// 5. ROUTES
// Public menu reading for Customer Website, Staff POS, and Admin
foodRouter.get("/", listFood);
foodRouter.get("/list", listFood);

// Admin-only menu operations protected by authMiddleware and requireAdmin
foodRouter.post("/", uploadImageMiddleware, authMiddleware, requireAdmin, addFood);
foodRouter.post("/add", uploadImageMiddleware, authMiddleware, requireAdmin, addFood);
foodRouter.put("/:id", uploadImageMiddleware, authMiddleware, requireAdmin, editFood);
foodRouter.post("/edit", uploadImageMiddleware, authMiddleware, requireAdmin, editFood);
foodRouter.patch("/:id/availability", authMiddleware, requireAdmin, toggleAvailability);
foodRouter.post("/availability", authMiddleware, requireAdmin, toggleAvailability);
foodRouter.delete("/:id", authMiddleware, requireAdmin, removeFood);
foodRouter.post("/remove", authMiddleware, requireAdmin, removeFood);

export default foodRouter;