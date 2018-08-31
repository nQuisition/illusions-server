const mongoose = require("mongoose");

const guildChangeSchema = mongoose.Schema({
  initiated: { type: Date, index: true },
  character: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Character",
    index: true
  },
  changeType: { type: String, index: true },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model("GuildChange", guildChangeSchema);
