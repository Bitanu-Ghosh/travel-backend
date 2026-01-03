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

// Middlewares
app.use(cors());
app.use(express.json());

// 🔗 Connect MongoDB
connectDB();

// 🤖 Groq setup
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

/* =========================
   HEALTH CHECK (IMPORTANT)
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

    const text = completion.choices[0].message.content;

    res.json({ itinerary: text });
  } catch (error) {
    console.error("Groq error:", error);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* =========================
   SAVE TRIP (PROTECTED)
========================= */
app.post("/api/saveTrip", protect, async (req, res) => {
  try {
    const { destination, days, interest, plan } = req.body;

    const trip = await Trip.create({
      user: req.userId,
      destination,
      days,
      interest,
      plan
    });

    res.json({ message: "Trip saved successfully", trip });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not save trip" });
  }
});

/* =========================
   GET USER TRIPS (PROTECTED)
========================= */
app.get("/api/myTrips", protect, async (req, res) => {
  try {
    const trips = await Trip.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(trips);
  } catch (error) {
    res.status(500).json({ error: "Could not fetch trips" });
  }
});

/* =========================
   DELETE TRIP (PROTECTED)
========================= */
app.delete("/api/trip/:id", protect, async (req, res) => {
  try {
    const deletedTrip = await Trip.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });

    if (!deletedTrip) {
      return res.status(404).json({ error: "Trip not found" });
    }

    res.json({ message: "Trip deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Could not delete trip" });
  }
});

/* =========================
   SERVER START
========================= */
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
