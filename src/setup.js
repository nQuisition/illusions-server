const Race = require("./db/models/raceSchema");
const Class = require("./db/models/classSchema");
const Talent = require("./db/models/talentSchema");

const bnetUtils = require("./utils/bnetUtils");
const logger = require("./utils/logger");

const setupBnetStaticData = () => {
  const dataUtils = bnetUtils.data();
  logger.info("Setting up Bnet static data");
  return dataUtils
    .getRaces()
    .then(races => {
      logger.info("Inserting races");
      const toSave = races.map(
        race =>
          new Race({
            _id: race.id,
            name: race.name,
            mask: race.mask,
            side: race.side,
            image: "unavailable"
          })
      );
      return Race.insertMany(toSave);
    })
    .catch(err => {
      logger.error(`Error while saving races static data! ${err.message}`);
    })
    .then(() => {
      return dataUtils.getClassesAndSpecs();
    })
    .then(classes => {
      logger.info("Inserting classes and talents");
      const classesToSave = classes.map(cls => {
        const processedSpecs = Object.values(cls.specs);
        const { id, specs, ...clsToSave } = cls;
        clsToSave._id = cls.id;
        clsToSave.specs = processedSpecs;
        return new Class(clsToSave);
      });
      const talentsToSave = classes.reduce(
        (arr, cls) => [
          ...arr,
          ...Object.values(cls.talentsById).map(tal => {
            const { id, ...talToSave } = tal;
            talToSave._id = tal.id;
            talToSave.class = cls.id;
            return new Talent(talToSave);
          })
        ],
        []
      );
      return Promise.all([
        Class.insertMany(classesToSave),
        Talent.insertMany(talentsToSave)
      ]);
    })
    .catch(err => {
      logger.error(
        `Error while saving classes and talents static data! ${err.message}`
      );
    })
    .then(() => {
      logger.info("Static data setup complete!");
    });
};

const fullSetup = () => {
  return setupBnetStaticData();
};

module.exports = fullSetup;
