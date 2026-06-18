import React from "react";

interface Props {
  title: React.ReactNode;
  action?: React.ReactNode;
}

export default function PageHeader({ title, action }: Props) {
  return (
    <div className="sticky top-0 z-40 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800 px-4 py-4 pt-safe flex items-center justify-between -mx-4 mb-6">
      {typeof title === "string" ? (
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
      ) : (
        title
      )}
      {action ? (
        <div className="flex justify-end min-w-[3rem] items-center">
          {action}
        </div>
      ) : (
        <div className="min-w-[3rem]" />
      )}
    </div>
  );
}
