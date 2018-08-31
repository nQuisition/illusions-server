const mongoose = require("mongoose");

const statSchema = mongoose.Schema(
  {
    stat: Number,
    amount: Number
  },
  { _id: false }
);

const relicSchema = mongoose.Schema(
  {
    socket: Number,
    itemId: Number,
    context: Number,
    bonusList: [Number]
  },
  { _id: false }
);

const itemSchema = mongoose.Schema(
  {
    id: Number,
    name: String,
    icon: String,
    quality: Number,
    itemLevel: Number,
    gems: [Number],
    enchant: Number,
    set: [Number],
    azeritePowers: [Number],
    azeritePowerLevel: Number,
    azeriteLevel: Number,
    azeriteExperience: Number,
    azeriteExperienceRemaining: Number,
    stats: [statSchema],
    armor: Number,
    context: String,
    bonusLists: [Number],
    displayInfoId: Number,
    relics: [relicSchema],
    wdps: Number
  },
  { _id: false }
);

const characterSchema = mongoose.Schema({
  lastModified: Date,
  active: Boolean,
  inGuild: { type: Boolean, default: true },
  name: String,
  realm: String,
  battlegroup: String,
  class: { type: Number, ref: "Class" },
  race: { type: Number, ref: "Race" },
  gender: Number,
  level: Number,
  achievementPoints: Number,
  thumbnail: String,
  faction: Number,
  ilvl: Number,
  ilvle: Number,
  rank: Number,
  items: {
    head: { type: itemSchema, default: null },
    neck: { type: itemSchema, default: null },
    shoulder: { type: itemSchema, default: null },
    back: { type: itemSchema, default: null },
    chest: { type: itemSchema, default: null },
    shirt: { type: itemSchema, default: null },
    wrist: { type: itemSchema, default: null },
    hands: { type: itemSchema, default: null },
    waist: { type: itemSchema, default: null },
    legs: { type: itemSchema, default: null },
    feet: { type: itemSchema, default: null },
    finger1: { type: itemSchema, default: null },
    finger2: { type: itemSchema, default: null },
    trinket1: { type: itemSchema, default: null },
    trinket2: { type: itemSchema, default: null },
    mainHand: { type: itemSchema, default: null },
    offHand: { type: itemSchema, default: null }
  }
});

characterSchema.index({ name: 1, realm: 1 }, { unique: true });

const model = mongoose.model("Character", characterSchema);

model.on("index", function(err) {
  if (err) {
    console.error("characterSchema index error: %s", err);
  } else {
    console.info("characterSchema indexing complete");
  }
});

module.exports = model;
