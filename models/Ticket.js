const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  id: { type: String },
  ticketId: { type: String },
  serial: { type: String },

  clientRequestId: {
  type: String,
  unique: true,
  sparse: true,
  index: true
},

  vendeur: { type: String },
  vendeurNom: { type: String },

  status: {
    type: String,
    default: "ANATAN"
  },

  premio: {
    type: Number,
    default: 0
  },

  total: Number,
  jeux: Array,
  tirages: [String],

  createdAt: Date,
  dateLabel: String,
  timeLabel: String,

  updatedAt: Date

}, {
  timestamps: true,
  id: false
});

module.exports = mongoose.model("Ticket", TicketSchema);