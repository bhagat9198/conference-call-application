import { memo, useCallback, useMemo } from "react";
import StableTldraw from "./StableTldraw";

const DrawingBoard = memo(({ width, height, drawingBoardConfig, drawingUpdated }) => {
  console.log("DrawingBoard :: Rendering");

  // Memoize the callback to ensure stability
  const stableDrawingUpdated = useCallback((event) => {
    drawingUpdated(event);
  }, [drawingUpdated]);

  // Memoize the config to prevent unnecessary prop changes
  const stableConfig = useMemo(() => drawingBoardConfig, [drawingBoardConfig]);
  console.log("DrawingBoard :: stableConfig :: ", stableConfig);
  
  return (
    <div style={{ width, height, position: "relative" }}>
      <StableTldraw 
        drawingBoardConfig={stableConfig} 
        drawingUpdated={stableDrawingUpdated} 
      />
    </div>
  );
});

export default DrawingBoard;
