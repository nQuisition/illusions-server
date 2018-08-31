//not needed?
function deepCloneJSONObject(obj) {
  if (typeof obj !== "object") {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(o => deepCloneJSONObject(o));
  }
  const keys = Object.keys(obj);
  return keys.reduce((o, k) => ((o[k] = deepCloneJSONObject(obj[k])), o), {});
}

const promisedWait = duration => {
  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
};

const partitionPromisesWithDelay = (promiseConstructors, size, delay) => {
  let chain = Promise.resolve();
  const result = [];
  const failed = [];
  const numPartitions = Math.ceil(promiseConstructors.length / size);
  for (let i = 0; i < numPartitions; i++) {
    const arr = [];
    for (
      let j = 0;
      j < Math.min(size, promiseConstructors.length - i * size);
      j++
    ) {
      arr.push(promiseConstructors[i * size + j]);
    }
    chain = chain.then(() => {
      console.log(`Executing promise group ${i + 1}/${numPartitions}`);
      return Promise.all(arr.map(constructor => constructor()))
        .then(res => {
          result.push(...res);
          return promisedWait(delay);
        })
        .catch(err => {
          console.log("Error!", err.message);
          failed.push(...arr);
        });
    });
  }
  chain = chain.then(() => ({ result, failed }));
  return chain;
};

const partitionPromisesWithRetry = (promiseConstructors, size, delay) => {
  return partitionPromisesWithDelay(promiseConstructors, size, delay).then(
    resAndFailed => {
      const { result, failed } = resAndFailed;
      let promise = Promise.resolve();
      if (failed && failed.length > 0) {
        failed.forEach(promiseConstructor => {
          promise = promise
            .then(() => {
              console.log("Retrying promise");
              return promiseConstructor();
            })
            .then(res => result.push(res))
            .catch(err => {
              console.log("Error retrying promise!", err.message);
              return Promise.resolve();
            });
        });
      }
      return promise.then(() => result);
    }
  );
};

module.exports = {
  deepCloneJSONObject: obj => JSON.parse(JSON.stringify(obj)),
  partitionPromisesWithDelay,
  partitionPromisesWithRetry
};
