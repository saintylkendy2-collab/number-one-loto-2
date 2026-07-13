const mongoose = require("mongoose");

const AppConfigSchema = new mongoose.Schema({
  key: { type: String, default: "main", unique: true },

  ventasGlobalEnabled: {
  type: Boolean,
  default: true
},

  ticketLogo: { type: String, default: "" },
  ticketMessage: { type: String, default: "" },

 mariageGratis: {
  enabled: { type: Boolean, default: false },
  max: { type: Number, default: 5 },
  stepAmount: { type: Number, default: 50 },
  payout: { type: Number, default: 1000 }
}
}, { timestamps: true });

module.exports = mongoose.model("AppConfig", AppConfigSchema);

