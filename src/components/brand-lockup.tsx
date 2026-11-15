import Image from "next/image";
import Link from "next/link";

type BrandLockupProps = {
  href?: string;
  className?: string;
};

export default function BrandLockup({ href, className = "" }: BrandLockupProps) {
  const classes = `brand-lockup ${className}`.trim();
  const content = (
    <>
      <span className="brand-mark-frame" aria-hidden="true">
        <Image src="/brand/veyra-emblem.png" alt="" width={34} height={34} />
      </span>
      <span className="brand-word">Veyra</span>
    </>
  );

  if (href) {
    return <Link className={classes} href={href} aria-label="Veyra home">{content}</Link>;
  }

  return <span className={classes}>{content}</span>;
}
