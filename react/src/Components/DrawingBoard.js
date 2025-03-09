import { memo, useCallback } from "react";
import StableTldraw from "./StableTldraw";

const DrawingBoard = memo(({ width, height, drawingBoardConfig, drawingUpdated }) => {
  console.log("DrawingBoard :: Rendering");

  // ✅ Use an inline function inside useCallback()
  const stableDrawingUpdated = useCallback((event) => {
    drawingUpdated(event);
  }, [drawingUpdated]);

  return (
    <div style={{ width, height, position: "relative" }}>
      <StableTldraw 
        drawingBoardConfig={drawingBoardConfig} 
        drawingUpdated={stableDrawingUpdated} 
      />
    </div>
  );
});

export default DrawingBoard;
