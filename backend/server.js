import 'dotenv/config'
import express from "express"
import cors from "cors"
import { connectDB } from "./config/db.js"
import foodRouter from "./routes/foodRoute.js"
import userRouter from "./routes/userRoute.js"
import cartRouter from "./routes/cartRoute.js"
import orderRouter from "./routes/orderRoute.js"
import dns from 'dns'

// Safely configure DNS if supported
try {
    dns.setServers(["1.1.1.1", "8.8.8.8"]);
} catch (e) {
    // Ignore restricted DNS environment errors
}

// app config 
const app = express()
const port = process.env.PORT || 4000

// middleware
app.use(express.json())
app.use(cors())
app.use("/images", express.static("uploads"))

// API ENDpoints 
app.use("/api/food", foodRouter)
app.use("/api/user", userRouter)
app.use("/api/cart", cartRouter)
app.use("/api/order", orderRouter)

app.get("/", (req, res) => {
    res.send("API IS WORKING")
})

connectDB()
    .then(() => {
        app.listen(port, "0.0.0.0", () => {
            console.log(`Backend Server Started on http://0.0.0.0:${port}`)
        })
    })
    .catch((error) => {
        console.log("Database connection failed, running on in-memory store:", error.message)
        app.listen(port, "0.0.0.0", () => {
            console.log(`Backend Server Started on http://0.0.0.0:${port}`)
        })
    })
