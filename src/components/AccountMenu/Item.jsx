import Link from "next/link";

export default function Item({ Icon, text, className, ...props }) {
  return (
    <Link
      {...props}
      className={`
        flex
        items-center
        px-4 py-2 
        text-sm text-gray-700 
        hover:bg-gray-100
        hover:bg-gray-300
        transition
        ${className}
      `}
      role="menuitem"
    >
      <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
      <span className="flex-grow">{text}</span>
    </Link>
  );
}
