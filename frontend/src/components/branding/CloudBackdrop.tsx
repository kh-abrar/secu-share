// src/components/branding/CloudBackdrop.tsx
type Props = { className?: string };

export function CloudBackdrop({ className = "" }: Props) {
  const cloud = "absolute opacity-25 blur-[1px] fill-neutral-300 dark:fill-neutral-700";
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <g className={cloud}>
        <path d="M15 25h25a10 10 0 0 0 0-20 14 14 0 0 0-27 4A9 9 0 0 0 15 25Z" />
      </g>
      <g className={cloud} transform="translate(60,8) scale(0.9)">
        <path d="M15 25h25a10 10 0 0 0 0-20 14 14 0 0 0-27 4A9 9 0 0 0 15 25Z" />
      </g>
      <g className={cloud} transform="translate(10,70) scale(1.2)">
        <path d="M15 25h25a10 10 0 0 0 0-20 14 14 0 0 0-27 4A9 9 0 0 0 15 25Z" />
      </g>
      <g className={cloud} transform="translate(70,65) scale(1)">
        <path d="M15 25h25a10 10 0 0 0 0-20 14 14 0 0 0-27 4A9 9 0 0 0 15 25Z" />
      </g>
    </svg>
  );
}
