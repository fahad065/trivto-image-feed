"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/types/photo";

export default function FeedItem({
  photo,
  onToggleLike,
  priority,
}: {
  photo: Photo;
  onToggleLike: (photoId: string) => void;
  priority: boolean;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <section className="relative h-dvh w-full shrink-0 snap-start snap-always bg-black">
      <div
        className={`absolute inset-0 animate-pulse bg-zinc-800 transition-opacity duration-300 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      />
      <Image
        src={photo.url}
        alt={photo.alt}
        fill
        sizes="100vw"
        priority={priority}
        className={`object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
      />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-4 pb-8 text-white">
        <a
          href={photo.authorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[75%] truncate text-sm font-medium drop-shadow"
        >
          Photo by {photo.authorName} on Unsplash
        </a>

        <button
          type="button"
          aria-label={photo.liked ? "Unlike photo" : "Like photo"}
          aria-pressed={photo.liked}
          onClick={() => onToggleLike(photo.id)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black/30 backdrop-blur-sm transition-transform active:scale-90"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-7 w-7 transition-colors ${
              photo.liked ? "fill-red-500 stroke-red-500" : "fill-none stroke-white"
            }`}
            strokeWidth={2}
          >
            <path d="M12 21s-6.716-4.35-9.428-8.06C.36 10.42 1.03 6.5 4.5 5.14c2.1-.83 4.24-.02 5.5 1.66 1.26-1.68 3.4-2.49 5.5-1.66 3.47 1.36 4.14 5.28 1.93 7.8C18.716 16.65 12 21 12 21z" />
          </svg>
        </button>
      </div>
    </section>
  );
}
