import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// 設定を保存するキーのプレフィックス
const SETTINGS_PREFIX = 'user_settings:';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await kv.get(`${SETTINGS_PREFIX}${session.user.email}`);
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("KV Get Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    await kv.set(`${SETTINGS_PREFIX}${session.user.email}`, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("KV Set Error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}