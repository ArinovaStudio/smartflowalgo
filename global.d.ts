import type * as React from "react";

interface TvTickerTapeProps extends React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> {
  symbols?: string;
  "hide-chart"?: boolean;
  "item-size"?: "compact" | "regular" | string;
  "hover-type"?: string;
  "show-hover"?: boolean;
  width?: string;
  transparent?: boolean;
  theme?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "tv-ticker-tape": TvTickerTapeProps;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "tv-ticker-tape": TvTickerTapeProps;
    }
  }
}

export {};