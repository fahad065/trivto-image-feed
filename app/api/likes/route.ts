import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Like } from "@/models/Like";

export async function GET() {
  try {
    await connectToDatabase();
    const likes = await Like.find({}).lean();
    return NextResponse.json({ likedIds: likes.map((l) => l.photoId) });
  } catch {
    return NextResponse.json(
      { message: "Failed to load likes." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const photoId = body?.photoId;

  if (typeof photoId !== "string" || photoId.length === 0) {
    return NextResponse.json({ message: "photoId is required." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const existing = await Like.findOne({ photoId });

    if (existing) {
      await Like.deleteOne({ photoId });
      return NextResponse.json({ liked: false });
    }

    await Like.create({ photoId });
    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json(
      { message: "Failed to update like." },
      { status: 500 }
    );
  }
}
