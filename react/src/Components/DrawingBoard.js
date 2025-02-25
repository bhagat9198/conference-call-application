import React from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';

const DrawingBoard = ({ width, height }) => {
  const [elements, setElements] = React.useState([]);

  const onChange = (elements) => {
    setElements(elements);
  };

  return (
    <div style={{ height: height, width: width }}>
      <Excalidraw
        initialData={{
          elements: [],
          appState: {
            viewBackgroundColor: '#ffffff',
            currentItemFontFamily: 1,
          },
        }}
        onChange={onChange}
        theme="light"
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

export default DrawingBoard;