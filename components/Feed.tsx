"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FeedItem from "./FeedItem";
import type { Photo } from "@/types/photo";

// Start fetching the next page once the viewer is this many cards from the end,
// so the next batch is ready before they'd ever hit a blank frame.
const PREFETCH_THRESHOLD = 3;

type Status = "loading" | "ready" | "empty" | "error";

export default function Feed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreFailed, setLoadMoreFailed] = useState(false);

  const isFetchingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const fetchPage = useCallback(async (page: number, isInitial: boolean) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!isInitial) {
      setLoadingMore(true);
      setLoadMoreFailed(false);
    }

    try {
      const res = await fetch(`/api/photos?page=${page}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to load photos.");
      }

      setPhotos((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const fresh = (data.photos as Photo[]).filter((p) => !seen.has(p.id));
        return [...prev, ...fresh];
      });
      setNextPage(data.nextPage);

      if (isInitial) {
        setStatus(data.photos.length === 0 ? "empty" : "ready");
      }
    } catch (err) {
      if (isInitial) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
      } else {
        setLoadMoreFailed(true);
      }
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    // Initial data fetch on mount: fetchPage's only synchronous work before its
    // first `await` is a ref flag flip, all setState calls happen in the resolved
    // promise continuation, not synchronously within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(1, true);
  }, [fetchPage]);

  // Focus the scroll container so arrow keys work immediately, without
  // requiring the user to click into the feed first.
  useEffect(() => {
    if (status === "ready") {
      containerRef.current?.focus();
    }
  }, [status]);

  const toggleLike = useCallback(async (photoId: string) => {
    let nextLiked = false;
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id !== photoId) return p;
        nextLiked = !p.liked;
        return { ...p, liked: nextLiked };
      })
    );

    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId }),
      });
      if (!res.ok) throw new Error("Like request failed");
    } catch {
      // Roll back the optimistic update if the server didn't confirm it.
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, liked: !nextLiked } : p))
      );
    }
  }, []);

  // Re-attach the IntersectionObserver to the (length - N)th card whenever the
  // feed grows, so the prefetch trigger keeps tracking the right element.
  const setSentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (!node) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            fetchPage(nextPage, false);
          }
        },
        { threshold: 0.5 }
      );
      observerRef.current.observe(node);
    },
    [fetchPage, nextPage]
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-black px-6 text-center text-white">
        <p className="text-lg font-medium">Couldn&apos;t load the feed</p>
        <p className="max-w-sm text-sm text-white/60">{errorMessage}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("loading");
            fetchPage(1, true);
          }}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black"
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-2 bg-black text-center text-white">
        <p className="text-lg font-medium">No photos to show</p>
        <p className="max-w-sm text-sm text-white/60">
          The feed came back empty. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="h-dvh w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain outline-none"
    >
      {photos.map((photo, index) => (
        <div
          key={photo.id}
          ref={index === photos.length - PREFETCH_THRESHOLD ? setSentinelRef : undefined}
        >
          <FeedItem photo={photo} onToggleLike={toggleLike} priority={index === 0} />
        </div>
      ))}

      {loadingMore && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {loadMoreFailed && (
        <div className="fixed inset-x-0 bottom-6 flex justify-center px-6">
          <button
            type="button"
            onClick={() => fetchPage(nextPage, false)}
            className="rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-black shadow-lg"
          >
            Couldn&apos;t load more — tap to retry
          </button>
        </div>
      )}
    </div>
  );
}
