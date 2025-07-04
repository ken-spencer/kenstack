import errorLog from "../log/error";
export default async function validate(doc) {
  const errors = {};
  let hasErrors = false;

  for (const [pathName] of Object.entries(doc.schema.paths)) {
    const value = doc.get(pathName);

    const error = doc.validateSync(pathName);

    if (error && error.errors[pathName]) {
      hasErrors = true;
      errors[pathName] = error.errors[pathName].message;
    }

    if (pathName === "_id") {
      continue;
    }

    const isUnique = await hasUniqueIndex(doc, pathName);
    if (isUnique) {
      const modelName = doc.constructor.modelName;
      const model = doc.model(modelName);

      let duplicate;

      try {
        duplicate = await model.findOne({
          _id: { $ne: doc._id },
          [pathName]: value,
        });
      } catch (e) {
        errorLog(e, "Problem querying for duplicates");
        throw Error(
          "There was an unexpected validation problem. Please try again later"
        );
      }

      if (duplicate) {
        hasErrors = true;
        errors[pathName] = "A record with this value already exists";
      }
    }
  }

  if (hasErrors) {
    return errors;
  }

  return false;
}

// async function hasUniqueIndex(model, path) {
//   const indexes = await model.schema.indexes();

//   for (let i = 0; i < indexes.length; i++) {
//     const [fields, info] = indexes[i];
//     if (fields[path] && info.unique) {
//       return true;
//     }
//   }
// }

async function hasUniqueIndex(model, path) {
  const indexes = await model.collection.indexes();
  return indexes.some((idx) => idx.unique && Object.hasOwn(idx.key, path));
}
