import { useEffect, useRef, useState, memo, useCallback } from "react";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { useSyncDemo } from '@tldraw/sync'

const StableTldraw = memo(function StableTldraw({ onPointerUp, onMount, onPointerDown }) {
  console.log("StableTldraw :: Initial Render Only");
  const store = useSyncDemo({ roomId: 'myapp-dfghghfghfg' })
  // Store the event handlers in refs to always reference the latest version
  const pointerUpRef = useRef(onPointerUp);
  const pointerDownRef = useRef(onPointerDown);

  // Update refs when props change
  useEffect(() => {
    pointerUpRef.current = onPointerUp;
    pointerDownRef.current = onPointerDown;
  }, [onPointerUp, onPointerDown]);
  

  return (
    <Tldraw
    persistenceKey="example"
      store={store}
      key="truly-stable-tldraw-instance"
      onPointerUp={() => {
        console.log("StableTldraw :: Pointer Up");
        pointerUpRef.current?.();
      }}
      onPointerDown={() => {
        console.log("StableTldraw :: Pointer Down");
        pointerDownRef.current?.();
      }}
      onMount={(editor) => {
        console.log("StableTldraw :: Mounted");
        onMount(editor);
      }}
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
  
  // Store callbacks in refs to avoid re-renders
  const drawingUpdatedRef = useRef(drawingUpdated);
  
  // Update refs when props change
  useEffect(() => {
    drawingUpdatedRef.current = drawingUpdated;
  }, [drawingUpdated]);

  // Handle pointer down to start tracking a new stroke
  const handlePointerDown = useCallback(() => {
    isDrawingRef.current = true;
    console.log("DrawingBoard :: Pointer Down: Starting new stroke");
  }, []);

  // Stable callback that doesn't change on re-renders
  const handleDrawingUpdated = useCallback((eventPayload) => {
    console.log("DrawingBoard :: Sending Update Event :: ", eventPayload);
    if (!drawingUpdatedRef.current) return;
    
    drawingUpdatedRef.current(eventPayload);
    
    if (setDrawings) {
      setDrawings(eventPayload);
    }
  }, [setDrawings]);

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

  // Stable pointer up handler - ONLY send updates when stroke is completed
  const handlePointerUp = useCallback(() => {
    console.log("DrawingBoard :: Pointer Up: Finalizing Stroke");
    if (!editorRef.current || !isDrawingRef.current) {
      return;
    }
  
    isDrawingRef.current = false;
  
    const editor = editorRef.current;
  
    // Delay execution to ensure all updates are captured
    requestAnimationFrame(() => {
      const completeState = editor.store.getSnapshot();
  
      console.log("DrawingBoard :: Sending complete state on stroke completion");
  
      if (drawingUpdatedRef.current) {
        drawingUpdatedRef.current({ completeState });
      }
    });
  }, []);

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
          completeState: completeState
        });
      }
    }, 500);
  }, [handleDrawingUpdated]);

  return (
    <div style={{ width, height, position: 'relative' }}>
      <StableTldraw 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onMount={handleMount}
      />
    </div>
  );
});

export default DrawingBoard;