import { useSquareTool } from "./Provider";

export default function Range() {
  const { zoom, setZoom } = useSquareTool();

  return (
    <input
      type="range"
      value={zoom}
      onChange={(evt) => {
        const value = parseInt(evt.target.value);
        if (value >= 0 && value <= 100) {
          setZoom(value);
        }
      }}
    />
  );
}
