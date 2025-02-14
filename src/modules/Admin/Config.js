import dynamic from "next/dynamic";
import pluralize from 'pluralize';
import sentenceCase from "@kenstack/utils/sentenceCase";

import kebabCase from "lodash-es/kebabCase";

export default class AdminClientConfig {
  #data = [];
  constructor(data) {
    this.#data = data.map(([modelName, clientModel, options = {}]) => [
      modelName,
      clientModel,
      {
        path: pluralize(kebabCase(modelName)),
        title: pluralize(sentenceCase(modelName)),
        ...options,
        Icon: dynamic(options.icon),
      }
    ])
    
  }

  getRoutes() {
     return this.#data.map(([modelName, clientModel, options]) => ({
       ...options,
       modelName,
       admin: clientModel,        
     }));
  }
  
  getLinks({ pathPrefix = "/admin" } = []) {
    return this.#data.map(([modelName, ,{Icon, title, path}]) => [
      pathPrefix + "/" + path, title, Icon,
    ]);
  }

  get(name) {
    for (const [modelName, adminImport] of this.#data) {
      if (modelName === name) {
        return adminImport;
      }
    }
  }
}


