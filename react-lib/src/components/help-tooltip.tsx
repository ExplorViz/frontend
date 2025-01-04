import React from "react"; // Unused, but suppresses Typescript warning

import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { Placement } from "react-bootstrap/types";
import { InfoIcon } from "@primer/octicons-react";

// TODO import .scss

export default function HelpTooltip(args: {
  title: String;
  placement?: Placement;
}) {
  return (
    <div className="inline tooltip-component">
      <OverlayTrigger
        placement={args.placement ?? "left"}
        trigger={["hover", "focus"]}
        overlay={<Tooltip>{args.title}</Tooltip>}
      >
        <InfoIcon verticalAlign="middle" size="small" fill="#777" />
      </OverlayTrigger>
    </div>
  );
}
