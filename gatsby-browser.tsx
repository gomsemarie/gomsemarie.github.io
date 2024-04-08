import React from "react";
import { GlobalLayout } from "@_layouts";

export const onRouteUpdate = ({
  location,
  prevLocation,
}: {
  location: Location;
  prevLocation: Location;
}) => {
  // console.log("new pathname", location.pathname);
  // console.log("old pathname", prevLocation ? prevLocation.pathname : null);
};

export const wrapRootElement = ({ element }: { element: React.ReactNode }) => {
  return (
    <>
      <script
        src="https://kit.fontawesome.com/ddb7bb7cca.js"
        crossOrigin="anonymous"
      ></script>
      {element}
    </>
  );
};

// Wraps every page in a component
export const wrapPageElement = ({
  element,
  props,
}: {
  element: React.ReactNode;
  props: any;
}) => {
  return <GlobalLayout {...props}>{element}</GlobalLayout>;
};
