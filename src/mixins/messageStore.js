import { nanoid } from "nanoid";

const messageStore = (set) => ({
  messages: [],
  addMessage: (message) => {
    const newMessage = { ...message, key: nanoid() };
    set((state) => {
      return { messages: [...state.messages, newMessage] };
    });
  },
  removeMessage: (message) =>
    set((state) => {
      const messages = state.messages.filter((m) => m !== message);
      // If no message was actually removed, return the original state
      return state.messages.length === messages.length ? state : { messages };
    }),
  setMessages: (messages) =>
    set({ messages: messages.map((m) => ({ key: nanoid(), ...m })) }),
});

export default messageStore;
