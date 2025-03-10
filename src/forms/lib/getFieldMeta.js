import TextField from "../Text/meta";
import DateField from "../Date/meta";
import UrlField from "../Url/meta";
import TextArea from "../TextArea/meta";
import Password from "../Password/meta";
import Checkbox from "../Checkbox/meta";
import CheckboxList from "../CheckboxList/meta";
import Radio from "../Radio/meta";
import Select from "../Select/meta";
import MultiSelect from "../MultiSelect/meta";
import Slug from "../Slug/meta";
import Tags from "../Tags/meta";
import ImageField from "../Image/meta";

export default function getFIeldMeta(field) {
  if (typeof field === "function" || typeof field === "object") {
    return field;
  }

  switch (field) {
    case "text":
      return TextField;
    case "date":
      return DateField;
    case "url":
      return UrlField;
    case "textarea":
      return TextArea;
    case "password":
      return Password;
    case "checkbox":
      return Checkbox;
    case "checkbox-list":
      return CheckboxList;
    case "radio":
      return Radio;
    case "select":
      return Select;
    case "multi-select":
      return MultiSelect;
    case "slug":
      return Slug;
    case "tags":
      return Tags;
    case "image":
      return ImageField;
    default:
      return null;
  }
}
