import useForm from "../useForm";

import Item from "../Grid/Item";
import Notice from "../Notice";

export default function NoticeItem() {
  const { error, success } = useForm();

  if (!error && !success) {
    // return null;
  }

  return (
    <Item>
      <Notice />
    </Item>
  );
}
