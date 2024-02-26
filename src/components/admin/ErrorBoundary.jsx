"use client"

import fetchJSON from "../../utils/fetchJSON";

import React from "react";
import Alert from "@thaumazo/forms/Alert";

// looks like this functionality can currently onluy be implmented as a class component
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    const path = thaumazoAdmin.pathName("/api/client-error-log")
    fetchJSON(path, {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        
      },
      componentStack: info.componentStack,
    })
    .catch(e => {
      // eslint-disable-next-line no-console
      console.error("\n\nThere was a problem logging a client error", e);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert> 
          An error has occurred within the page. To ensure optimal performance, please verify that you are using a current and supported web browser. This incident has been logged, and our technical team will investigate further. We appreciate your patience and understanding.
       </Alert>
      );
    }

    return this.props.children;
  }
}
