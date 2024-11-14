import { useRef, useEffect, useState } from "react";

import { useSquareTool } from "./Provider";

export default function SquareTool() {
  const { file, zoom, cropX, setCropX, cropY, setCropY } = useSquareTool();
  const imageRef = useRef();
  const last = useRef();
  const [isDragging, setIsDragging] = useState(false);

  const [data, setData] = useState({});

  // const [loaded, setLoaded] = useState(false);

  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    /*
    if (last.current?.zoom === zoom) {
      return;
    }
    */

    const img = imageRef.current;

    const rect = img.getBoundingClientRect();
    // const left = last.current ? (rect.width - last.current.width) / 2 : 0;
    // const top = last.current ? (rect.height - last.current.height) / 2 : 0;

    const size = img.parentNode.offsetWidth;
    // if (cropY) {
    const maxY = (rect.height - size) / 2;
    const y = (maxY / rect.height) * 100 * cropY;
    setTranslateY(y);
    // }

    // if (cropX) {
    const maxX = (rect.width - size) / 2;
    const x = (maxX / rect.width) * 100 * cropX;
    setTranslateX(x);
    // }

    last.current = {
      ...last.current,
      zoom: zoom,
      width: rect.width,
      height: rect.height,
    };
  }, [zoom, cropX, setCropX, cropY, setCropY]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const img = imageRef.current;
    const mouseMove = (evt) => {
      const rect = img.getBoundingClientRect();

      const size = img.parentNode.offsetWidth;

      const maxY = (rect.height - size) / 2;
      const maxX = (rect.width - size) / 2;

      const lastY = maxY * (data.cropY ?? 0);
      const tmpY = zero((evt.clientY - data.y - lastY) * -1);
      const rise = zero(Math.abs(tmpY) <= maxY ? tmpY : Math.sign(tmpY) * maxY);

      const lastX = maxX * (data.cropX ?? 0);
      const tmpX = zero((evt.clientX - data.x - lastX) * -1);
      const run = zero(Math.abs(tmpX) <= maxX ? tmpX : Math.sign(tmpX) * maxX);

      const perY = maxY >= 0 ? rise / maxY : 0;
      const perX = maxX > 0 ? run / maxX : 0;

      setCropX(perX);
      setCropY(perY);
      // setTranslateY((maxY / rect.height * 100 ) * perY);
      // setTranslateX((maxX / rect.width * 100 ) * perX);
    };

    const mouseUp = (evt) => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);

    return () => {
      document.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
    };
  }, [isDragging, data, setCropX, setCropY]);

  return (
    <div className="image">
      <img
        ref={imageRef}
        alt=""
        src={file.path}
        draggable={false}
        style={{
          transform: `translate(-${50 + translateX}%, -${50 + translateY}%)`,
          width: zoom + 100 + "%",
          // opacity: loaded ? 1 : 0,
        }}
        onMouseDown={(evt) => {
          setIsDragging(true);
          setData({
            ...data,
            x: evt.clientX,
            y: evt.clientY,
            cropX: cropX,
            cropY: cropY,
          });
        }}
      />
    </div>
  );
}

// avoid negative zero;
function zero(value) {
  return value === 0 ? 0 : value;
}
