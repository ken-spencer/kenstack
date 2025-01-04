import Notice from "./Notice";
import { useStore } from "zustand";

export default function NoticeList({ store }) {
  const messages = useStore(store, (state) => state.messages);
  const removeMessage = useStore(store, (state) => state.removeMessage);

  return (
    <>
      {messages.map((message) => (
        <Notice
          key={message.key}
          message={message}
          removeMessage={removeMessage}
          collapse
          scroll
        />
      ))}
    </>
  );
}
