import mongoose from "@kenstack/db";
const Schema = mongoose.Schema;

import isEqual from "lodash-es/isEqual";
import kebabCase from "lodash-es/kebabCase";
import sentenceCase from "@kenstack/utils/sentenceCase";

const TagSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: true,
    trim: true,
  },
  slug: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  },
});

const TagFieldOptions = {
  type: [TagSchema],
  default: [],
  onAdminDTO: (value) => {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map(({ name }) => sentenceCase(name));
  },
  onBind: (value, { previous }) => {
    if (isEqual(value, previous)) {
      return previous;
    }

    if (!Array.isArray(value)) {
      return [];
    }

    const retval = [];
    for (let val of value) {
      const tag = val.trim().toLowerCase();
      retval.push({
        name: tag,
        slug: kebabCase(tag),
      });
    }

    return retval;
  },
};

export { TagSchema, TagFieldOptions };
