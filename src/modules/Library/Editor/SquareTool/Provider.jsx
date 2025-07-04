import React, {
  createContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";

const Context = createContext({});

function useLocalState(value) {
  const [state, setState] = useState(value);

  useEffect(() => {
    setState(value);
  }, [value]);

  return [state, setState];
}

export default function SquareToolProvider({ file, children }) {
  const square = file.square;
  const [zoom, setZoom] = useLocalState(square.zoom);
  const [cropX, setCropX] = useLocalState(square.cropX);
  const [cropY, setCropY] = useLocalState(square.cropY);

  const reset = useCallback(() => {
    setZoom(square.zoom);
    setCropX(square.cropX);
    setCropY(square.cropY);
  }, [square, setZoom, setCropX, setCropY]);

  const changed =
    zoom !== square.zoom || cropX !== square.cropX || cropY !== square.cropY;

  const context = useMemo(
    () => ({
      file,
      zoom,
      setZoom,
      cropX,
      setCropX,
      cropY,
      setCropY,
      reset,
      changed,
    }),
    [file, zoom, setZoom, cropX, setCropX, cropY, setCropY, reset, changed]
  );

  return <Context.Provider value={context}>{children}</Context.Provider>;
}

function useSquareTool() {
  const context = React.useContext(Context);

  const keys = Object.keys(context);
  if (!keys.length) {
    throw Error(
      "Unable to fetch SquareTool  context. Please ensure that the Provider is present"
    );
  }

  return context;
}

export { Context, useSquareTool };
