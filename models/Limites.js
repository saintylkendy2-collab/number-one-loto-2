const mongoose = require("mongoose");

const limiteSchema = new mongoose.Schema({
  borlette: { type:Number, default:0 },
  mariage: { type:Number, default:0 },
  loto3: { type:Number, default:0 },
  loto4: { type:Number, default:0 },
  loto5: { type:Number, default:0 },

    limitesPorLoteria: {
    type: Array,
    default: []
  },

  limiteNumeros: {
    type:Array,
    default:[]
  },

  bloqueoNumeros: {
    type:Array,
    default:[]
  }

}, {
  timestamps:true
});

module.exports = mongoose.model("Limites", limiteSchema);