import { useEffect, useRef, useState, memo, useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

// Completely isolated TLDraw component that never re-renders
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
  const appliedShapeIds = useRef(new Set()); // Store applied shape IDs to avoid re-applying
  const updateTimeoutRef = useRef(null);
  const lastDrawingConfigRef = useRef(null);
  const isDrawingRef = useRef(false);
  const activeStrokeRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  
  // Store callbacks in refs to avoid re-renders
  const drawingUpdatedRef = useRef(drawingUpdated);
  const setDrawingsRef = useRef(setDrawings);
  
  // Update refs when props change
  useEffect(() => {
    drawingUpdatedRef.current = drawingUpdated;
    setDrawingsRef.current = setDrawings;
  }, [drawingUpdated, setDrawings]);

  // Stable callback that doesn't change on re-renders
  const handleDrawingUpdated = useCallback((eventPayload) => {
    if (eventPayload.added.length || eventPayload.updated.length || eventPayload.removed.length) {
      console.log("DrawingBoard :: Sending Update Event :: ", eventPayload);
      
      // Send the complete state along with the updates
      if (editorRef.current) {
        const completeState = {
          ...eventPayload,
          completeState: editorRef.current.store.getSnapshot()
        };
        drawingUpdatedRef.current(completeState);
        setDrawingsRef.current(completeState);
      } else {
        drawingUpdatedRef.current(eventPayload);
        setDrawingsRef.current(eventPayload);
      }
    }
  }, []);

  // Handle pointer down to start tracking a new stroke
  const handlePointerDown = useCallback((event) => {
    if (!editorRef.current) return;
    
    // Reset active stroke tracking
    isDrawingRef.current = true;
    activeStrokeRef.current = null;
    console.log("Pointer Down: Starting new stroke");
  }, []);

  // Handle pointer move to continuously update the stroke
  const handlePointerMove = useCallback((event) => {
    if (!editorRef.current || !isDrawingRef.current) return;
    
    const editor = editorRef.current;
    const now = Date.now();
    
    // Throttle updates to avoid overwhelming the network (send at most every 50ms)
    if (now - lastUpdateTimeRef.current < 50) return;
    
    lastUpdateTimeRef.current = now;
    
    // Get the current drawing strokes
    const currentStrokes = editor.store.query.records("shape").filter(
      (shape) => shape.type === "draw" && !shape.isComplete
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
        removed: []
      });
    }
  }, [handleDrawingUpdated]);

  // Listen for changes in the editor
  useEffect(() => {
    if (!isEditorMounted || !editorRef.current) return;
    const editor = editorRef.current;

    console.log("DrawingBoard :: useEffect (Editor Ready) - Listening for Changes");

    const unsubscribe = editor.store.listen((changes) => {
      if (!changes.changes) return;

      const { added = {}, updated = {}, removed = {} } = changes.changes;

      // Filter only NEW strokes (avoid re-processing existing ones)
      const addedShapes = Object.values(added).filter(
        (shape) => shape.type === "draw"
      );

      // If we have new shapes, send them immediately
      if (addedShapes.length > 0) {
        console.log("New shapes detected:", addedShapes);
        handleDrawingUpdated({
          added: addedShapes,
          updated: [],
          removed: []
        });
      }

      // Handle removed shapes
      if (Object.keys(removed).length > 0) {
        console.log("Shapes removed:", Object.keys(removed));
        handleDrawingUpdated({
          added: [],
          updated: [],
          removed: Object.keys(removed)
        });
      }
    });

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
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
  const handlePointerUp = useCallback((event) => {
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
      completeState: completeState
    });
  }, [handleDrawingUpdated]);

  // Stable mount handler
  const handleMount = useCallback((editor) => {
    console.log("DrawingBoard :: Tldraw Mounted!");
    editorRef.current = editor;
    setIsEditorMounted(true);
  }, []);

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