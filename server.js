import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

import { connectDB } from "./db.js";
import Trip from "./models/Trip.js";
import authRoutes from "./routes/auth.js";
import { protect } from "./middleware/auth.js";

dotenv.config();

const app = express();

/* =========================
   FIXED CORS (CRITICAL)
========================= */
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://travel-frontend-4xsb.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false
  })
);

app.use(express.json());

// 🔗 Connect MongoDB
connectDB();

// 🤖 Groq setup
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* =========================
   HEALTH CHECK
========================= */
app.get("/", (req, res) => {
  res.send("Backend running");
});

/* =========================
   AUTH ROUTES
========================= */
app.use("/api/auth", authRoutes);

/* =========================
   AI ITINERARY (PUBLIC)
========================= */
app.post("/api/itinerary", async (req, res) => {
  try {
    const { destination, days, interest } = req.body;

    const prompt = `
Create a ${days}-day travel itinerary for ${destination}
focused on ${interest} activities.
Plain text only. Day-wise bullet points.
`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    res.json({ itinerary: completion.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* =========================
   SAVE TRIP (PROTECTED)
========================= */
app.post("/api/saveTrip", protect, async (req, res) => {
  const { destination, days, interest, plan } = req.body;

  const trip = await Trip.create({
    user: req.userId,
    destination,
    days,
    interest,
    plan
  });

  res.json({ message: "Trip saved successfully", trip });
});

/* =========================
   GET USER TRIPS (PROTECTED)
========================= */
app.get("/api/myTrips", protect, async (req, res) => {
  const trips = await Trip.find({ user: req.userId }).sort({ createdAt: -1 });
  res.json(trips);
});

/* =========================
   DELETE TRIP (PROTECTED)
========================= */
app.delete("/api/trip/:id", protect, async (req, res) => {
  const deletedTrip = await Trip.findOneAndDelete({
    _id: req.params.id,
    user: req.userId
  });

  if (!deletedTrip) {
    return res.status(404).json({ error: "Trip not found" });
  }

  res.json({ message: "Trip deleted successfully" });
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
