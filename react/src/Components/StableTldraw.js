import { useEffect, useRef, useCallback, memo } from "react";
import { Tldraw, useEditor } from "tldraw";
import "tldraw/tldraw.css";

const StableTldraw = memo(function StableTldraw({ drawingBoardConfig, drawingUpdated }) {
  const editorRef = useRef(null);
  const configRef = useRef(drawingBoardConfig); // Store previous config
  
  // Use useEffect to log only on initial render
  useEffect(() => {
    console.log("StableTldraw :: Initial Render Only :: ", drawingBoardConfig);
  }, []);
  
  // Handle config updates with useEffect
  useEffect(() => {
    if (editorRef.current && drawingBoardConfig) {
      console.log("StableTldraw :: Applying new config", drawingBoardConfig);
      
      // Apply the new config to the editor
      try {
        // Handle different types of updates
        if (drawingBoardConfig.completeState) {
          // Handle complete state update
          console.log("StableTldraw :: Applying complete state update");
          editorRef.current.store.loadSnapshot(drawingBoardConfig.completeState);
        } else if (drawingBoardConfig.changes) {
          // Handle changes format
          console.log("StableTldraw :: Applying changes format update");
          const changes = {
            added: drawingBoardConfig.changes.added || {},
            updated: drawingBoardConfig.changes.updated || {},
            removed: drawingBoardConfig.changes.removed || {}
          };
          editorRef.current.store.mergeRemoteChanges(changes);
        } else {
          // Handle legacy format
          console.log("StableTldraw :: Applying legacy format update");
          editorRef.current.store.mergeRemoteChanges(drawingBoardConfig);
        }
      } catch (err) {
        console.error("Failed to apply drawing config:", err);
      }
    }
  }, [drawingBoardConfig]);

  // Memoize the change handler to prevent re-renders
  const handleChange = useCallback((event) => {
    console.log("StableTldraw :: Local change detected", event);
    drawingUpdated(event);
  }, [drawingUpdated]);

  return (
    <Tldraw
      key="truly-stable-tldraw-instance"
      onMount={(editor) => {
        console.log("StableTldraw :: Mounted");
        editorRef.current = editor;
        
        editor.on("change", handleChange);
        
        // If we have initial config, apply it after mounting
        if (drawingBoardConfig) {
          setTimeout(() => {
            try {
              if (drawingBoardConfig.completeState) {
                editor.store.loadSnapshot(drawingBoardConfig.completeState);
              } else if (drawingBoardConfig.changes) {
                const changes = {
                  added: drawingBoardConfig.changes.added || {},
                  updated: drawingBoardConfig.changes.updated || {},
                  removed: drawingBoardConfig.changes.removed || {}
                };
                editor.store.mergeRemoteChanges(changes);
              } else {
                editor.store.mergeRemoteChanges(drawingBoardConfig);
              }
            } catch (err) {
              console.error("Failed to apply initial drawing config:", err);
            }
          }, 100);
        }
      }}
    />
  );
}, (prevProps, nextProps) => {
  // More strict comparison for memoization
  return (
    prevProps.drawingBoardConfig === nextProps.drawingBoardConfig &&
    prevProps.drawingUpdated === nextProps.drawingUpdated
  );
});

export default StableTldraw;