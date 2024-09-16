import Image from "next/Image";
export default function Thumbnail({ value }) {
  if (value?.path) {
    return (
      <Image
        alt=""
        src={value.path}
        width={value.width}
        height={value.height}
        className="w-auto h-auto max-w-48 max-h-24"
      />
    );
  }
}
