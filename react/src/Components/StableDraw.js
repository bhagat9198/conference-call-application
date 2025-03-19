import React, { useEffect, useRef, memo } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

// Define the component as a regular function first
const StableDrawComponent = ({ width, height, drawingBoardConfig, drawingUpdated }) => {
  const [elements, setElements] = React.useState([]);
  const [appState, setAppState] = React.useState({
    viewBackgroundColor: "#ffffff",
    currentItemFontFamily: 1,
  });

  // Ensure collaborators is always an array
  const [collaborators, setCollaborators] = React.useState([]);

  const excalidrawRef = useRef(null);
  const lastUpdateRef = useRef(null);
  const lastReceivedUpdateRef = useRef(null);
  const isInitialRender = useRef(true);
  const forceUpdateKey = useRef(0);
  const [renderKey, setRenderKey] = React.useState(0);

  // Log when component mounts and unmounts to debug lifecycle
  useEffect(() => {
    console.log("StableDraw :: Component mounted");
    return () => {
      console.log("StableDraw :: Component unmounted");
    };
  }, []);

  // Handle incoming drawing updates
  useEffect(() => {
    if (!drawingBoardConfig || Object.keys(drawingBoardConfig).length === 0) {
      console.log("StableDraw :: Empty drawing config received, skipping update");
      return;
    }

    console.log("StableDraw :: Received drawing config update", drawingBoardConfig);

    // Prevent processing the same update multiple times
    const configString = JSON.stringify(drawingBoardConfig);
    if (lastReceivedUpdateRef.current === configString) {
      console.log("StableDraw :: Skipping duplicate update");
      return;
    }

    lastReceivedUpdateRef.current = configString;

    try {
      if (drawingBoardConfig.completeState) {
        console.log("StableDraw :: Applying complete state", drawingBoardConfig.completeState);

        if (drawingBoardConfig.completeState.elements) {
          const newElements = Array.isArray(drawingBoardConfig.completeState.elements)
            ? drawingBoardConfig.completeState.elements
            : Object.values(drawingBoardConfig.completeState.elements);

          console.log("StableDraw :: Setting elements to", newElements);
          forceUpdateKey.current += 1;
          setRenderKey(forceUpdateKey.current);
          setElements(newElements);

          if (drawingBoardConfig.completeState.appState) {
            setAppState((prevState) => ({
              ...prevState,
              ...drawingBoardConfig.completeState.appState,
            }));
          }

          // Ensure collaborators is an array before updating state
          const newCollaborators = Array.isArray(drawingBoardConfig.completeState.collaborators)
            ? drawingBoardConfig.completeState.collaborators
            : [];

          console.log("StableDraw :: Updating collaborators", newCollaborators);
          setCollaborators(newCollaborators);

          if (excalidrawRef.current) {
            console.log("StableDraw :: Directly updating Excalidraw scene");
            try {
              excalidrawRef.current.updateScene({
                elements: newElements,
                appState: drawingBoardConfig.completeState.appState || appState,
                collaborators: newCollaborators,
              });
            } catch (error) {
              console.error("Error updating Excalidraw scene:", error);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to apply drawing config:", err);
    }
  }, [drawingBoardConfig]);

  const onChange = (newElements, newAppState) => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }

    if (!Array.isArray(newElements)) {
      console.error("StableDraw :: onChange received non-array elements:", newElements);
      return;
    }

    if (JSON.stringify(elements) === JSON.stringify(newElements)) {
      return;
    }

    console.log("StableDraw :: onChange called with elements:", newElements.length);

    setElements(newElements);
    setAppState((prevState) => ({
      ...prevState,
      ...newAppState,
    }));

    if (lastUpdateRef.current) {
      clearTimeout(lastUpdateRef.current);
    }

    lastUpdateRef.current = setTimeout(() => {
      if (drawingUpdated && typeof drawingUpdated === "function") {
        console.log("StableDraw :: Sending drawing update", newElements);
        try {
          drawingUpdated({
            completeState: {
              elements: newElements,
              appState: newAppState,
              collaborators: collaborators, // Always send collaborators
            },
            source: "user",
          });
        } catch (error) {
          console.error("Error in drawingUpdated callback:", error);
        }
      }
    }, 300);
  };

  console.log("StableDraw :: Current collaborators:", collaborators);

  return (
    <div style={{ height: height, width: width }}>
      <Excalidraw
        isCollaborating={true}
        key={`excalidraw-instance-${renderKey}`}
        ref={excalidrawRef}
        initialData={{
          elements: Array.isArray(elements) ? elements : [],
          appState: appState,
        }}
        onChange={onChange}
        theme="light"
        collaborators={collaborators instanceof Map ? Array.from(collaborators.values()) : []} // Ensure Excalidraw gets valid collaborators
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            export: {
              saveFileToDisk: true,
            },
            loadScene: true,
            saveAsImage: true,
            theme: true,
          },
        }}
      />
    </div>
  );
};

// Then wrap it with memo - but make it less strict to ensure updates happen
const StableDraw = memo(StableDrawComponent, (prevProps, nextProps) => {
  if (prevProps.drawingBoardConfig !== nextProps.drawingBoardConfig) {
    console.log("StableDraw memo: Config changed, will re-render");
    return false; // Re-render when config changes
  }

  if (
    prevProps.width === nextProps.width &&
    prevProps.height === nextProps.height &&
    prevProps.drawingUpdated === nextProps.drawingUpdated
  ) {
    console.log("StableDraw memo: Only dimensions and callback unchanged, skipping re-render");
    return true; // Skip re-render if dimensions & callback didn't change
  }

  console.log("StableDraw memo: Default case, will re-render");
  return false; // Default re-render
});

export default StableDraw;
