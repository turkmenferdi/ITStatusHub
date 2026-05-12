"use client";

import { Icon, type IconName } from "@/components/Icon";

export function ConfirmSubmitButton({
  message,
  title,
  icon,
  className
}: {
  message: string;
  title: string;
  icon: IconName;
  className: string;
}) {
  return (
    <button
      type="submit"
      title={title}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      <Icon name={icon} className="text-[16px]" />
    </button>
  );
}
