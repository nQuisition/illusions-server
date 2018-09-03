const mongoose = require("mongoose");
const config = require("./config");
const combinedActions = require("./combinedActions");
const logger = require("./utils/logger");

const express = require("express");
const morgan = require("morgan");
const bodyParser = require("body-parser");

const guildRoutes = require("./routes/guild");
const characterRoutes = require("./routes/character");

const app = express();

const port = process.env.PORT;
if (!port) {
  logger.error("No port environmental variable specified! Exiting.. ");
  process.exit(-1);
}

app.use(morgan("combined", { stream: logger.stream }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://127.0.0.1");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// TODO had to put retryWrites to false to make index creation work...
// Will not need index creating by mongoose in production though
mongoose.connect(
  `mongodb+srv://${config.dbUser}:${config.dbPassword}@${
    config.dbAddress
  }?retryWrites=false`
);
//mongoose.set("debug", true);

app.use("/guild", guildRoutes);
app.use("/character", characterRoutes);

app.use((req, res, next) => {
  const error = new Error("Not found");
  error.status = 404;
  next(error);
});

app.use((error, req, res, next) => {
  res.status(error.status || 500);
  res.json({
    error: {
      message: error.message
    }
  });
});

app.listen(port);
logger.info(`Server started on port ${port}`);

const interval = 5; // in minutes
const scheduleFullyProcessGuild = () => {
  combinedActions.fullyProcessGuild(guildName, guildRealm).then(() => {
    setTimeout(scheduleFullyProcessGuild, interval * 60 * 1000);
  });
};

scheduleFullyProcessGuild();
