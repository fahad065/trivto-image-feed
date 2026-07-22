import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Like } from "@/models/Like";
import { fetchUnsplashPhotos, UnsplashError } from "@/lib/unsplash";

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");

  try {
    const photos = await fetchUnsplashPhotos(page);

    let likedIds = new Set<string>();
    if (photos.length > 0) {
      await connectToDatabase();
      const likes = await Like.find({
        photoId: { $in: photos.map((p) => p.id) },
      }).lean();
      likedIds = new Set(likes.map((l) => l.photoId));
    }

    return NextResponse.json({
      photos: photos.map((photo) => ({
        ...photo,
        liked: likedIds.has(photo.id),
      })),
      nextPage: page + 1,
    });
  } catch (error) {
    if (error instanceof UnsplashError) {
      return NextResponse.json(
        { message: error.message, rateLimited: error.rateLimited },
        { status: error.rateLimited ? 429 : 502 }
      );
    }
    return NextResponse.json(
      { message: "Failed to load photos." },
      { status: 500 }
    );
  }
}
