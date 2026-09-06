import React from "react";
import { Droplet } from "lucide-react";

export default function BloodDropIcon({
  size = 18,
  color = "currentColor",
  className = "",
  animated = false,
  variant = "default",
  style = {}
}) {
  return (
    <Droplet
      size={size}
      color={color}
      className={className}
      fill={variant === "filled" ? color : "none"}
      strokeWidth={2.2}
      style={
        animated
          ? {
              ...style,
              animation: "bloodDropPulse 2.2s infinite ease-in-out",
              display: "inline-block"
            }
          : style
      }
      aria-hidden="true"
    />
  );
}
