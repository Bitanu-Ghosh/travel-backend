import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  destination: String,
  days: Number,
  interest: String,
  plan: [String],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Trip", tripSchema);
