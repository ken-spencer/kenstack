import TextField from "../Text";
import DateField from "../Date";
import EmailField from "../Email";
import UrlField from "../Url";
import TextArea from "../TextArea";
import Password from "../Password";
import Checkbox from "../Checkbox";
import CheckboxList from "../CheckboxList";
import Radio from "../Radio";
import Select from "../Select";
import MultiSelect from "../MultiSelect";
import Slug from "../Slug";
import Tags from "../Tags";
import ImageField from "../Image";

export default function getFIeld(field) {
  if (typeof field === "function" || typeof field === "object") {
    return field;
  }

  switch (field) {
    case "text":
      return TextField;
    case "email":
      return EmailField;
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
