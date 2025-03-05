import { useEffect, useRef, useState, memo, useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

// Completely isolated TLDraw component that never re-renders
const StableTldraw = memo(function StableTldraw({ onPointerUp, onMount, onPointerMove, onPointerDown }) {
  console.log("StableTldraw :: Initial Render Only");
  return (
    <Tldraw
      key="truly-stable-tldraw-instance"
      onPointerUp={onPointerUp}
      onPointerMove={onPointerMove}
      onPointerDown={onPointerDown}
      onMount={onMount}
    />
  );
}, () => true); // Always return true to prevent re-renders

// Use memo to prevent unnecessary re-renders
const DrawingBoard = memo(function DrawingBoard({ width, height, drawingBoardConfig, drawingUpdated, drawings, setDrawings }) {
  console.log("DrawingBoard :: Rendering");
  
  const editorRef = useRef(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  const lastDrawingConfigRef = useRef(null);
  const isDrawingRef = useRef(false);
  const activeStrokeRef = useRef(null);
  
  // Store callbacks in refs to avoid re-renders
  const drawingUpdatedRef = useRef(drawingUpdated);
  
  // Update refs when props change
  useEffect(() => {
    drawingUpdatedRef.current = drawingUpdated;
  }, [drawingUpdated]);

  // Handle pointer down to start tracking a new stroke
  const handlePointerDown = useCallback(() => {
    isDrawingRef.current = true;
    console.log("Pointer Down: Starting new stroke");
  }, []);

  // Stable callback that doesn't change on re-renders
  const handleDrawingUpdated = useCallback((eventPayload) => {
    if (!drawingUpdatedRef.current) return;
    
    console.log("DrawingBoard :: Sending Update Event :: ", eventPayload);
    drawingUpdatedRef.current(eventPayload);
    
    if (setDrawings) {
      setDrawings(eventPayload);
    }
  }, [setDrawings]);

  // Listen for editor changes
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current) return;
    const editor = editorRef.current;

    console.log("DrawingBoard :: useEffect (Editor Ready) - Listening for Changes");

    const unsubscribe = editor.store.listen((changes) => {
      if (!changes.changes) return;

      const { added = {}, updated = {}, removed = {} } = changes.changes;

      // Filter only strokes
      const addedShapes = Object.values(added).filter(
        (shape) => shape.type === "draw"
      );
      
      const updatedShapes = Object.values(updated).filter(
        (shape) => shape.type === "draw"
      );

      // If we have changes, send them
      if (addedShapes.length > 0 || updatedShapes.length > 0 || Object.keys(removed).length > 0) {
        console.log("Changes detected:", { added: addedShapes, updated: updatedShapes, removed: Object.keys(removed) });
        
        // Send complete state for better sync
        const completeState = editor.store.getSnapshot();
        handleDrawingUpdated({
          added: addedShapes,
          updated: updatedShapes,
          removed: Object.keys(removed),
          completeState: completeState,
          source: 'user-action'
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isEditorMounted, handleDrawingUpdated]);

  // Apply received updates with deep equality check
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current || !drawingBoardConfig) return;
    
    // Skip if the config is the same as the last one processed
    if (lastDrawingConfigRef.current === drawingBoardConfig) {
      return;
    }
    
    lastDrawingConfigRef.current = drawingBoardConfig;
    const editor = editorRef.current;

    console.log("DrawingBoard :: Applying Updates ::", drawingBoardConfig);

    try {
      // If we received a complete state, replace the entire state
      if (drawingBoardConfig.completeState) {
        console.log("DrawingBoard :: Applying complete state");
        editor.store.loadSnapshot(drawingBoardConfig.completeState);
        return;
      }

      // Otherwise apply individual updates
      if (Array.isArray(drawingBoardConfig.added) && drawingBoardConfig.added.length > 0) {
        const validShapes = drawingBoardConfig.added.filter((shape) => shape && shape.type);
        editor.store.put(validShapes);
      }

      if (Array.isArray(drawingBoardConfig.updated) && drawingBoardConfig.updated.length > 0) {
        const validShapes = drawingBoardConfig.updated.filter((shape) => shape && shape.type);
        editor.store.put(validShapes);
      }

      if (Array.isArray(drawingBoardConfig.removed) && drawingBoardConfig.removed.length > 0) {
        editor.store.remove(drawingBoardConfig.removed);
      }
    } catch (error) {
      console.error("Error applying drawing updates:", error);
    }
  }, [drawingBoardConfig, isEditorMounted]);

  // Stable pointer up handler
  const handlePointerUp = useCallback(() => {
    if (!editorRef.current) {
      console.warn("DrawingBoard :: handlePointerUp: Editor is not ready!");
      return;
    }

    console.log("Pointer Up: Finalizing Stroke");
    isDrawingRef.current = false;
    activeStrokeRef.current = null;

    const editor = editorRef.current;
    const shapes = editor.store.query.records("shape").filter(
      (shape) => shape.type === "draw"
    );

    if (shapes.length === 0) {
      console.warn("DrawingBoard :: No strokes found during Pointer Up!");
      return;
    }

    const finalizedShapes = shapes.map((shape) => ({
      ...shape,
      isComplete: true,
    }));

    console.log("DrawingBoard :: Finalized Shapes ::", finalizedShapes);

    // Send complete state on pointer up for better sync
    const completeState = editor.store.getSnapshot();
    handleDrawingUpdated({ 
      added: [],
      updated: finalizedShapes, 
      removed: [],
      completeState: completeState,
      source: 'user-action'
    });
  }, [handleDrawingUpdated]);

  // Handle pointer move to detect active drawing
  const handlePointerMove = useCallback(() => {
    if (!editorRef.current || !isDrawingRef.current) return;
    
    const editor = editorRef.current;
    const currentStrokes = editor.store.query.records("shape").filter(
      (shape) => shape.type === "draw"
    );
    
    if (currentStrokes.length === 0) return;
    
    // Find the active stroke (the one being drawn)
    const activeStroke = currentStrokes[currentStrokes.length - 1];
    
    // If this is a new stroke or the stroke has changed, send an update
    if (!activeStrokeRef.current || activeStroke.id !== activeStrokeRef.current.id || 
        JSON.stringify(activeStroke.props.points) !== JSON.stringify(activeStrokeRef.current.props.points)) {
      
      console.log("Pointer Move: Updating stroke", activeStroke);
      activeStrokeRef.current = activeStroke;
      
      // Send the update with the current state of the active stroke
      handleDrawingUpdated({
        added: [],
        updated: [activeStroke],
        removed: [],
        source: 'user-action'
      });
    }
  }, [handleDrawingUpdated]);

  // Stable mount handler
  const handleMount = useCallback((editor) => {
    console.log("DrawingBoard :: Tldraw Mounted!");
    editorRef.current = editor;
    setIsEditorMounted(true);
    
    // Initial sync of complete state after a short delay
    setTimeout(() => {
      if (editorRef.current) {
        const completeState = editor.store.getSnapshot();
        handleDrawingUpdated({
          added: [],
          updated: [],
          removed: [],
          completeState: completeState,
          source: 'initial-sync'
        });
      }
    }, 500);
  }, [handleDrawingUpdated]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <StableTldraw 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onMount={handleMount}
      />
    </div>
  );
});

export default DrawingBoard;