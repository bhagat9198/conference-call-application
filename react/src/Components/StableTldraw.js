import { useEffect, useRef, useCallback, memo } from "react";
import { Tldraw, useEditor } from "tldraw";
import "tldraw/tldraw.css";

const StableTldraw = memo(function StableTldraw({ drawingBoardConfig, drawingUpdated }) {
  const editorRef = useRef(null);
  const configRef = useRef(drawingBoardConfig); // Store previous config
  const drawingInProgressRef = useRef({});
  // Use useEffect to log only on initial render
  // useEffect(() => {
  //   console.log("StableTldraw :: Initial Render Only :: ", drawingBoardConfig);
  // }, []);
  
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
        } else {
          // Extract the changes - handle both direct properties and nested changes
          const added = drawingBoardConfig.added || 
                       (drawingBoardConfig.changes && drawingBoardConfig.changes.added) || {};
          const updated = drawingBoardConfig.updated || 
                         (drawingBoardConfig.changes && drawingBoardConfig.changes.updated) || {};
          const removed = drawingBoardConfig.removed || 
                         (drawingBoardConfig.changes && drawingBoardConfig.changes.removed) || {};
          
          // Filter out pointer updates as they don't affect the drawing
          const filteredUpdated = {...updated};
          if (filteredUpdated['pointer:pointer']) {
            delete filteredUpdated['pointer:pointer'];
          }
          
          // Only apply changes if there's something meaningful to apply
          if (Object.keys(added).length > 0 || 
              Object.keys(filteredUpdated).length > 0 || 
              Object.keys(removed).length > 0) {
            
            console.log("StableTldraw :: Applying changes:", { 
              added, 
              updated: filteredUpdated, 
              removed 
            });
            
            // Try a different approach to apply changes
            try {
              // Apply each added shape individually
              Object.entries(added).forEach(([id, shape]) => {
                console.log(`Adding shape: ${id}`);
                editorRef.current.createShapes([shape]);
              });
              
              // Apply each updated shape individually
              Object.entries(filteredUpdated).forEach(([id, shape]) => {
                console.log(`Updating shape: ${id}`);
                if (editorRef.current.getShape(id)) {
                  editorRef.current.updateShapes([shape]);
                }
              });
              
              // Remove each shape individually
              Object.keys(removed).forEach((id) => {
                console.log(`Removing shape: ${id}`);
                if (editorRef.current.getShape(id)) {
                  editorRef.current.deleteShapes([id]);
                }
              });
            } catch (innerErr) {
              console.error("Failed with direct shape manipulation, trying mergeRemoteChanges:", innerErr);
              // Fallback to mergeRemoteChanges if the direct approach fails
              editorRef.current.store.mergeRemoteChanges({
                added,
                updated: filteredUpdated,
                removed
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to apply drawing config:", err, drawingBoardConfig);
      }
    }
  }, [drawingBoardConfig]);

  // Memoize the change handler to prevent re-renders
  const handleChange = useCallback((event) => {
    // console.log("StableTldraw :: Event received:", event);
    
    // Track drawing state using pointer events and shape updates
    if (event.source === 'user') {
      // Check if this is a drawing-related event by examining all changes
      const hasDrawingUpdates = 
        // Check in updated shapes
        (event.changes?.updated && 
          Object.entries(event.changes.updated).some(([id, shape]) => 
            id !== 'pointer:pointer' && (shape?.type === 'draw' || id.startsWith('shape:'))
          )) ||
        // Also check in added shapes
        (event.changes?.added && 
          Object.entries(event.changes.added).some(([id, shape]) => 
            shape?.type === 'draw' || id.startsWith('shape:')
          ));
      
      console.log("StableTldraw :: hasDrawingUpdates:", hasDrawingUpdates);
      
      // If we have drawing updates, capture the current state
      if (hasDrawingUpdates) {
        try {
          // Get all shapes from the editor using the correct method
          const allShapes = editorRef.current.store.allRecords().filter(record => 
            record.typeName === 'shape'
          );
          console.log("StableTldraw :: All shapes:", allShapes);
          
          // Find draw shapes
          const drawShapes = {};
          allShapes.forEach(shape => {
            if (shape.type === 'draw') {
              // Check if the shape is complete or being tracked as in-progress
              // if (shape.props?.isComplete === true || drawingInProgressRef.current[shape.id]) {
                drawShapes[shape.id] = shape;
                console.log("StableTldraw :: Draw shape found:", shape.id, shape);
              // }
            }
          });
          
          // Find completed shapes that weren't previously sent
          const completedShapes = {};
          Object.entries(drawShapes).forEach(([id, shape]) => {
            if (shape.props?.isComplete === true && drawingInProgressRef.current[id]) {
              completedShapes[id] = shape;
              // Remove from in-progress tracking
              delete drawingInProgressRef.current[id];
            } else if (!shape.props?.isComplete) {
              // Track in-progress shape
              drawingInProgressRef.current[id] = shape;
            }
          });
          
          // If we have completed shapes, send them now
          if (Object.keys(completedShapes).length > 0) {
            console.log("StableTldraw :: Sending completed shapes", completedShapes);
            drawingUpdated({
              changes: {
                added: completedShapes, // Send as added instead of updated for clarity
                updated: {},
                removed: {}
              },
              source: "user",
              isCompleteStroke: true
            });
            
            // Don't send the original event
            return;
          }
        } catch (err) {
          console.error("Error processing drawing updates:", err);
        }
      }
      
      // Handle shape deletions
      if (event.changes?.removed && Object.keys(event.changes.removed).length > 0) {
        console.log("StableTldraw :: Sending removal event");
        drawingUpdated(event);
        return;
      }
    }
    
    // Don't send pointer events or intermediate drawing updates
    if (event.changes?.updated && 
        (Object.keys(event.changes.updated).length === 1 && 
         event.changes.updated['pointer:pointer'] ||
         Object.entries(event.changes.updated).some(([id, shape]) => 
           id !== 'pointer:pointer' && shape?.type === 'draw' && !shape.props?.isComplete
         ))) {
      return;
    }
    
    // For other events, send as normal
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