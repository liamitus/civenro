"use client";

import { useState } from "react";

interface RepPhotoProps {
  bioguideId: string;
  firstName: string;
  lastName: string;
}

export function RepPhoto({ bioguideId, firstName, lastName }: RepPhotoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="text-muted-foreground flex h-full w-full items-center justify-center text-2xl font-medium">
        {firstName?.[0]}
        {lastName?.[0]}
      </div>
    );
  }

  return (
    <img
      src={`/api/photos/${bioguideId}`}
      alt={`${firstName} ${lastName}`}
      className="pointer-events-none h-full w-full object-cover object-top select-none"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
