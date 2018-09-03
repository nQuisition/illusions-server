const logger = require("../utils/logger");

exports.defaultErrorHandler = (err, res) => {
  if (
    (err && err.status === 404) ||
    (err.response && err.response.status === 404)
  ) {
    logger.warn(err.message);
    return res.status(404).send(err.message);
  }
  logger.error(err.message);
  return res.status(500).send(err.message);
};
