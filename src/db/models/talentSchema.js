const mongoose = require("mongoose");

const talentSchema = mongoose.Schema({
  _id: Number,
  class: { type: Number, ref: "Class" },
  tier: Number,
  column: Number,
  name: String,
  icon: String,
  description: String,
  range: String,
  powerCost: String,
  castTime: String,
  cooldown: String
});

module.exports = mongoose.model("Talent", talentSchema);
