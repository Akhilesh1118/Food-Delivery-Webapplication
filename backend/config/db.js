import mongoose from "mongoose";

export const connectDB = async () => {
  mongoose.set("bufferCommands", false);

  if (!process.env.MONGODB_URI) {
    console.warn("[AI Studio] MONGODB_URI not provided. Running in-memory database fallback.");
    return false;
  }

  mongoose.connection.on("connected", () => console.log("Database Connected"));
  mongoose.connection.on("error", (err) => console.warn("MongoDB connection error:", err.message));

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });
    
    // Seed default admin and staff in MongoDB if missing
    try {
      const userModel = (await import("../models/userModel.js")).default;
      const orderModel = (await import("../models/orderModel.js")).default;
      const bcrypt = (await import("bcryptjs")).default;
      const { inMemoryStore } = await import("./inMemoryStore.js");

      const salt = await bcrypt.genSalt(10);
      const adminExists = await userModel.findOne({ email: "admin@restaurant.com" });
      if (!adminExists) {
        await userModel.create({
          name: "Restaurant Manager",
          email: "admin@restaurant.com",
          password: await bcrypt.hash("admin123", salt),
          role: "admin"
        });
        console.log("[MongoDB] Default admin user initialized in MongoDB");
      }

      const staffExists = await userModel.findOne({ email: "staff@restaurant.com" });
      if (!staffExists) {
        await userModel.create({
          name: "Cashier Alex",
          email: "staff@restaurant.com",
          password: await bcrypt.hash("staff123", salt),
          role: "staff"
        });
        console.log("[MongoDB] Default staff user initialized in MongoDB");
      }

      // Sync order sequence with highest existing order number
      const orders = await orderModel.find({}, { orderNumber: 1 }).lean();
      let maxSeq = inMemoryStore.orderSeq;
      orders.forEach(o => {
        if (o.orderNumber && o.orderNumber.startsWith("TOM-")) {
          const num = parseInt(o.orderNumber.replace("TOM-", ""), 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      });
      inMemoryStore.orderSeq = maxSeq;
      console.log(`[MongoDB] Initialized order sequence to TOM-${inMemoryStore.orderSeq}`);
    } catch (seedErr) {
      console.warn("[MongoDB] Setup hook warning:", seedErr.message);
    }

    return true;
  } catch (error) {
    console.warn("[AI Studio] Database connection failed, continuing with in-memory fallback:", error.message);
    return false;
  }
};
