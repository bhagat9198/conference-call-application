import { memo, useCallback, useEffect, useState } from "react";
import StableDraw from "./StableDraw";

// Helper function to ensure collaborators is always an array
const ensureCollaboratorsIsArray = (data) => {
  if (data && data.collaborators && !Array.isArray(data.collaborators)) {
    console.log("DrawingBoard :: Converting collaborators to array:", data.collaborators);
    data.collaborators = [];
  } else if (data && !data.collaborators) {
    data.collaborators = [];
  }
  return data;
};

const DrawingBoard = memo(({ width, height, drawingBoardConfig, drawingUpdated }) => {
  console.log("DrawingBoard :: props :: drawingBoardConfig :: ", drawingBoardConfig);

  // Use state instead of useMemo to ensure reference changes
  // Initialize with an empty object instead of null to prevent issues
  const [config, setConfig] = useState(drawingBoardConfig || {});
  console.log("DrawingBoard :: config :: ", config);

  // Update config when drawingBoardConfig changes
  useEffect(() => {
    console.log("DrawingBoard :: drawingBoardConfig changed:", drawingBoardConfig);
    // Only update if we have a non-null config
    if (drawingBoardConfig) {
      // Ensure collaborators is an array before setting the config
      const safeConfig = ensureCollaboratorsIsArray({ ...drawingBoardConfig });
      setConfig(safeConfig);
    }
  }, [drawingBoardConfig]);

  // Memoize the callback to ensure stability
  const stableDrawingUpdated = useCallback((event) => {
    console.log("DrawingBoard :: stableDrawingUpdated called:", event);
    // Ensure collaborators is an array in the event before passing it up
    const safeEvent = ensureCollaboratorsIsArray({ ...event });
    drawingUpdated(safeEvent);
  }, [drawingUpdated]);

  return (
    <div style={{ width, height, position: "relative" }}>
      <StableDraw
        drawingBoardConfig={config}
        drawingUpdated={stableDrawingUpdated}
        width={width}
        height={height}
      />
    </div>
  );
});

export default DrawingBoard;