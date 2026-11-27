import type { ComponentProps } from "react";
import { Icon } from "./components";
import "./query-controls.css";

/** A query field keeps its native input, label, ref and keyboard behavior. */
export function SearchInput(props: ComponentProps<"input">) {
  return (
    <span className="bb-query-search">
      <Icon name="search" />
      <input
        autoComplete="off"
        {...props}
        type={props.type ?? (props.role === "combobox" ? "text" : "search")}
      />
    </span>
  );
}
