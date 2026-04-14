export { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';

export type {
  PanelProps,
  GroupProps as PanelGroupProps,
  SeparatorProps as PanelResizeHandleProps,
} from 'react-resizable-panels';

export type Layout = {
  [panelId: string]: number;
};
