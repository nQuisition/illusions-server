const axios = require("axios");
const config = require("../config");
const { deepCloneJSONObject } = require("./utils");

const bnetURL = "https://eu.api.battle.net/wow/";
const getRequestURL = (endpoint, fields) =>
  `${bnetURL}${endpoint}?${
    fields ? "fields=" + fields + "&" : ""
  }locale=en_GB&apikey=${config.bnetAPIKey}`;

const getGuildEndpoint = (name, realm, fields) =>
  getRequestURL(`guild/${realm}/${name}`, fields);
const getCharacterEndpoint = (name, realm, fields) =>
  getRequestURL(`character/${realm}/${encodeURIComponent(name)}`, fields);

const getDataEndpoint = endpoint => getRequestURL(`data/${endpoint}`);

const translateLastmod = lastmod => lastmod / 1000;
//NB also flattens the "spell" field into the talent
const processTalents = (specs, talents) => {
  const bySpec = {};
  const talentsById = talents
    .reduce(
      (ar, row) => [
        ...ar,
        ...row.reduce(
          (arr, entries) => [
            ...arr,
            ...entries.map(entry => {
              const cloned = deepCloneJSONObject(entry);
              const { spec, spell, ...res } = {
                ...cloned,
                ...cloned.spell
              };
              return res;
            })
          ],
          []
        )
      ],
      []
    )
    .reduce((obj, entry) => ((obj[entry.id] = entry), obj), {});
  specs.forEach(spec => {
    const name = spec.name;
    bySpec[name] = {
      ...deepCloneJSONObject(spec),
      talents: talents.reduce(
        (arr, row) => [
          ...arr,
          ...row.map(entries => {
            let specIndex = entries.findIndex(
              t => t.spec && t.spec.name === name
            );
            if (specIndex < 0) {
              specIndex = entries.findIndex(t => !t.spec);
              if (specIndex < 0) {
                // console.log("This is impossible!");
              }
            }
            return entries[specIndex].spell.id;
          })
        ],
        []
      )
    };
  });
  return {
    specs: bySpec,
    talentsById
  };
};

exports.guild = (name, realm) => ({
  getLastmod: () =>
    axios.get(getGuildEndpoint(name, realm)).then(res => res.data.lastModified),
  getMembers: () =>
    axios.get(getGuildEndpoint(name, realm, "members")).then(res => res.data),
  getNews: () =>
    axios.get(getGuildEndpoint(name, realm, "news")).then(res => res.data)
});

exports.character = (name, realm) => ({
  getLastmod: () =>
    axios
      .get(getCharacterEndpoint(name, realm))
      .then(res => res.data.lastModified),
  getItems: () =>
    axios.get(getCharacterEndpoint(name, realm, "items")).then(res => res.data),
  getProgression: () =>
    axios
      .get(getCharacterEndpoint(name, realm, "progression"))
      .then(res => res.data),
  getContexts: contexts =>
    axios.get(getCharacterEndpoint(name, realm, contexts)).then(res => res.data)
});

exports.data = () => ({
  getClassesAndSpecs: () =>
    axios
      .get(getDataEndpoint("character/classes"))
      .then(res => {
        return Promise.all([
          axios.get(getDataEndpoint("talents")),
          Promise.resolve(res.data.classes)
        ]);
      })
      .then(res => {
        const talentsByClass = res[0].data;
        const classes = res[1];
        classes.forEach(cls => {
          const { specs, talents } = talentsByClass[cls.id];
          const processed = processTalents(specs, talents);
          cls.specs = processed.specs;
          cls.talentsById = processed.talentsById;
        });
        return classes;
      }),
  getRaces: () =>
    axios.get(getDataEndpoint("character/races")).then(res => res.data.races),
  getCharacterAchievements: () =>
    axios
      .get(getDataEndpoint("character/achievements"))
      .then(res => res.data.achievements)
});
