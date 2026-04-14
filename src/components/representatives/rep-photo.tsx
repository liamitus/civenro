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
      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl font-medium">
        {firstName?.[0]}
        {lastName?.[0]}
      </div>
    );
  }

  return (
    <img
      src={`/api/photos/${bioguideId}`}
      alt={`${firstName} ${lastName}`}
      className="w-full h-full object-cover object-top select-none pointer-events-none"
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
