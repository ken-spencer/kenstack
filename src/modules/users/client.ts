"use client";

import { adminClient } from "@kenstack/admin";
import ListItem from "./components/ListItem";
import EditForm from "./components/Form";
// import { schema } from './shared/schema';
import { fields } from "./fields";

export const userClientOptions = { fields, ListItem, EditForm } as const;

export default adminClient(userClientOptions);
