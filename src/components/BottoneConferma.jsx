"use client";

export default function BottoneConferma({
  action,
  messaggio,
  children,
  className,
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm(messaggio)) e.preventDefault();
      }}
    >
      <button className={className}>{children}</button>
    </form>
  );
}
