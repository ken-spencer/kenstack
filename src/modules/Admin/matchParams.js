function isId(param) {
  if (param === "new" || param.match(/^[a-fA-F0-9]{24}$/)) {
    return true;
  }
}

export default async function matchParams(params, adminConfig) {
  let { modelName, adminImport } = adminConfig.getIndex();

  if (!params) {
    const { default: admin } = await adminImport;
    return {
      id: null,
      slug: null,
      modelName,
      admin,
    };
  }

  const [param1 = null, param2 = null, param3 = null] = params;
  let config;
  if (isId(param1)) {
    const { default: admin } = await adminImport;
    return {
      id: param1,
      slug: param2,
      modelName,
      admin,
    };
  } else if (params.length === 1 || isId(param2)) {
    config = adminConfig.getFromPath(param1);
    let slug = param3;
    if (!config) {
      if (params.length > 1) {
        return false;
      } else {
        slug = param1;
      }
    } else {
      ({ modelName, adminImport } = config);
    }
    const { default: admin } = await adminImport;

    return {
      id: param2,
      slug,
      modelName,
      admin,
    };
  } else if ((config = adminConfig.getFromPath(param1))) {
    ({ modelName, adminImport } = config);
    const { default: admin } = await adminImport;

    return {
      id: null,
      slug: param2,
      modelName,
      admin,
    };
  }
}
