const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
  }
}

module.exports = connectDB;