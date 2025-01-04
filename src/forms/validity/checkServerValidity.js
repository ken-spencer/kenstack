import checkValue from "./checkValue";
import formSchema from "../formSchema";

export default function validateServer(fieldTree, data) {
  const schema = new formSchema(fieldTree);
  const fields = schema.getFields();

  const fieldErrors = {};

  let hasErrors = false;
  for (let name in fields) {
    let field = fields[name];
    let err = checkValue(name, field, data);
    if (err) {
      fieldErrors[name] = err;
      hasErrors = true;
    }
  }

  return hasErrors ? fieldErrors : false;
}
