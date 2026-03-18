import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const POST = async (req: NextRequest) => {
  try {
    const secret = req.headers.get("x-revalidate-secret");
    if (secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { path } = await req.json();

    if (path) {
      revalidatePath(path);
    } else {
      // 글 관련 주요 경로 일괄 revalidate
      revalidatePath("/");
      revalidatePath("/commits");
      revalidatePath("/articles");
      revalidatePath("/casual");
      revalidatePath("/signal");
      revalidatePath("/series");
    }

    return NextResponse.json({ success: true, revalidated: path || "all" });
  } catch {
    return NextResponse.json({ success: false, error: "Revalidation failed" }, { status: 500 });
  }
};
