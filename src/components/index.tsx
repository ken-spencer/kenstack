export { default as H1 } from "./headings/H1";
export { default as Main } from "./Main";

import { Grid } from "@mui/material";

export function Container({ spacing = 3, ...props }) {
  return <Grid container spacing={spacing} {...props} />;
}

export function Item(props) {
  return <Grid item {...props} />;
}
