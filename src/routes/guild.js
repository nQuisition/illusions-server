const express = require("express");
const router = express.Router();

const guildController = require("../controllers/guild");

router.get("/", guildController.getAchievementLeaders);
router.get("/ach", guildController.getAchievementRank);
router.get("/ilvl", guildController.getIlvlLeaders);

module.exports = router;
