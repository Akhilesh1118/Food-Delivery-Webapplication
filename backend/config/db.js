import mongoose from "mongoose";

let connectionAttempt = null;
let lastConnectionFailureAt = 0;
const connectionFailureCooldownMs = 15000;

export const ensureDBConnected = async () => {
  if (mongoose.connection.readyState === 1) return true;
  if (!process.env.MONGODB_URI) return false;
  if (Date.now() - lastConnectionFailureAt < connectionFailureCooldownMs) return false;

  if (!connectionAttempt) {
    connectionAttempt = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 7000,
      connectTimeoutMS: 7000,
    }).then(() => {
      lastConnectionFailureAt = 0;
      return true;
    }).catch((error) => {
      lastConnectionFailureAt = Date.now();
      console.warn("[MongoDB] Connection attempt failed:", error.message);
      return false;
    }).finally(() => {
      connectionAttempt = null;
    });
  }
  return connectionAttempt;
};

export const connectDB = async () => {
  mongoose.set("bufferCommands", false);

  if (!process.env.MONGODB_URI) {
    console.warn("[AI Studio] MONGODB_URI not provided. Running in-memory database fallback.");
    return false;
  }

  mongoose.connection.on("connected", () => console.log("Database Connected"));
  mongoose.connection.on("error", (err) => console.warn("MongoDB connection error:", err.message));

  try {
    if (!await ensureDBConnected()) return false;
    
    // Seed the existing demo staff account and synchronize order numbering.
    try {
      const userModel = (await import("../models/userModel.js")).default;
      const orderModel = (await import("../models/orderModel.js")).default;
      const bcrypt = (await import("bcryptjs")).default;
      const { inMemoryStore } = await import("./inMemoryStore.js");

      const staffExists = await userModel.findOne({ email: "staff@restaurant.com" });
      if (!staffExists) {
        await userModel.create({
          name: "Cashier Alex",
          email: "staff@restaurant.com",
          password: await bcrypt.hash("staff123", await bcrypt.genSalt(10)),
          role: "staff",
          staffId: "STF-DEMO-0001"
        });
        console.log("[MongoDB] Default staff user initialized in MongoDB");
      } else if (!staffExists.staffId) {
        staffExists.staffId = "STF-DEMO-0001";
        await staffExists.save();
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
