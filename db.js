const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/number_one_loto_2"
);
    console.log("✅ MongoDB connecté");
  } catch (err) {
    console.error("❌ MongoDB error:", err);
  }
}

module.exports = connectDB;