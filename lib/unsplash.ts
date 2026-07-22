const UNSPLASH_API_URL = "https://api.unsplash.com/photos";
const PER_PAGE = 10;

export type NormalizedPhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  alt: string;
  authorName: string;
  authorUrl: string;
};

export class UnsplashError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly rateLimited: boolean
  ) {
    super(message);
    this.name = "UnsplashError";
  }
}

type UnsplashPhoto = {
  id: string;
  width: number;
  height: number;
  alt_description: string | null;
  description: string | null;
  urls: {
    regular: string;
    small: string;
  };
  user: {
    name: string;
    links: { html: string };
  };
};

export async function fetchUnsplashPhotos(page: number): Promise<NormalizedPhoto[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    throw new UnsplashError(
      "UNSPLASH_ACCESS_KEY is not set. Add it to .env.local (see .env.example).",
      500,
      false
    );
  }

  const url = `${UNSPLASH_API_URL}?page=${page}&per_page=${PER_PAGE}&order_by=latest`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const rateLimited = res.status === 403 || res.status === 429;
    throw new UnsplashError(
      rateLimited
        ? "Unsplash rate limit reached. Please try again shortly."
        : `Unsplash API request failed (${res.status}).`,
      res.status,
      rateLimited
    );
  }

  const data: UnsplashPhoto[] = await res.json();

  // Some entries occasionally arrive with missing image URLs or dimensions;
  // skip those rather than letting a broken card reach the feed.
  return data
    .filter((photo) => photo?.urls?.regular && photo.width && photo.height)
    .map((photo) => ({
      id: photo.id,
      url: photo.urls.regular,
      width: photo.width,
      height: photo.height,
      alt: photo.alt_description || photo.description || "Untitled photo",
      authorName: photo.user?.name ?? "Unknown",
      authorUrl: photo.user?.links?.html ?? "https://unsplash.com",
    }));
}
