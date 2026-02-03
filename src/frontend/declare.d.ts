declare module 'react-plotly.js' {
  import { Component } from 'react';
  import { PlotParams } from 'plotly.js';

  export interface PlotProps extends Partial<PlotParams> {
    data: Partial<PlotParams['data']>;
    layout?: Partial<PlotParams['layout']>;
    config?: Partial<PlotParams['config']>;
    frames?: Partial<PlotParams['frames']>;
    onInitialized?: (figure: Readonly<PlotParams>, graphDiv: Readonly<HTMLElement>) => void;
    onUpdate?: (figure: Readonly<PlotParams>, graphDiv: Readonly<HTMLElement>) => void;
    onPurge?: (figure: Readonly<PlotParams>, graphDiv: Readonly<HTMLElement>) => void;
    onError?: (err: Readonly<Error>) => void;
    style?: React.CSSProperties;
    className?: string;
    useResizeHandler?: boolean;
    divId?: string;
    revision?: number;
  }

  export default class Plot extends Component<PlotProps> {}
}