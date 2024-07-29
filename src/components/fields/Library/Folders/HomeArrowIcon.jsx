"use strict";
"use client";

import React from "react";
import createSvgIcon from "@mui/icons-material/utils/createSvgIcon";

import { Fragment } from "react";

/*
const DriveFileHome = createSvgIcon(
  <Fragment>
    <path
      d="M20 6h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z"
      fill="#90A4AE"
    />

    <path
      d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
      fill="black"
      transform="scale(0.66) translate(6, 8)"
    />
  
  
  </Fragment>,
  'DriveFileHome'
);

export default DriveFileHome;
*/

const HomeIcon = createSvgIcon(
  <>
    <path
      // d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"
      // d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"
      d="M12 3L2 12h3v8h6v-6h0v6h6v-8h3L12 3z"
    />

    <path
      d="M14 18v-3h-4v-4h4V8l5 5z"
      transform="translate(-3, 1)"
      fill="black"
    />
  </>,
  "Home",
);

export default HomeIcon;
