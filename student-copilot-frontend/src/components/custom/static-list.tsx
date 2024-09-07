"use client";

import React from "react";

export interface StaticListProps {
  className?: string;
  children: React.ReactNode;
}

export const StaticList = React.memo(({ className, children }: StaticListProps) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={`flex flex-col items-center w-full gap-4 lg:grid lg:grid-cols-8 ${className}`}>
      {childrenArray.map((item, index) => (
        <StaticListItem key={index}>{item}</StaticListItem>
      ))}
    </div>
  );
});

StaticList.displayName = "StaticList";

function StaticListItem({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full lg:col-span-4 lg:w-md">{children}</div>;
}

