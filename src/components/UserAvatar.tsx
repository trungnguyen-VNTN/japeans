import Image from "next/image";

/** Profile picture, or the first letter of the name when there is none. */
export function UserAvatar({ name, image, size = 32 }: { name: string | null; image: string | null; size?: number }) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={size}
        height={size}
        className="rounded-full border border-border"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary"
    >
      {(name ?? "?").trim().charAt(0).toUpperCase()}
    </span>
  );
}
