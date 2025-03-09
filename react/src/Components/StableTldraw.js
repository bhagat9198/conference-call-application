import { useEffect, useRef, useCallback, memo } from "react";
import { Tldraw, useEditor } from "tldraw";
import "tldraw/tldraw.css";

const StableTldraw = memo(function StableTldraw({ drawingBoardConfig, drawingUpdated }) {

  console.log("StableTldraw :: Initial Render Only :: ", drawingBoardConfig);

  const editorRef = useRef(null);
  const configRef = useRef(drawingBoardConfig); // Store previous config

  // if(editorRef.current && !drawingBoardConfig) {
  //   console.log("StableTldraw :: updating config");
  //   editorRef.current.store.mergeRemoteChanges(drawingBoardConfig);
  // }

  return (
    <Tldraw
      key="truly-stable-tldraw-instance"
      onMount={(editor) => {
        console.log("StableTldraw :: Mounted");
        editorRef.current = editor;

        editor.on("change", (event) => {
          console.log("StableTldraw :: Local change detected", event);
          drawingUpdated(event);
        });
      }}
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.drawingBoardConfig === nextProps.drawingBoardConfig &&
         prevProps.drawingUpdated === nextProps.drawingUpdated;
});

export default StableTldraw;
