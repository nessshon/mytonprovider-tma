import { createContext, useContext } from "react";

export interface DialogSlot {
  id: number;
  close: () => void;
}

export interface LayerHost {
  container: HTMLElement | null;
  routeDepth: number;
  dialogs: DialogSlot[];
  open: (close: () => void) => number;
  drop: (id: number) => void;
}

export const LayerContext = createContext<LayerHost | null>(null);

export function useLayerHost(): LayerHost | null {
  return useContext(LayerContext);
}
