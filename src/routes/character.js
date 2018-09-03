const express = require("express");
const router = express.Router();

const characterController = require("../controllers/character");

router.get("/", characterController.getCharacterFull);
router.get("/progression", characterController.getCharacterProgression);

module.exports = router;
