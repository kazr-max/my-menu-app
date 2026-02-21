import { NextResponse } from 'next/server';
import { put, list } from '@vercel/blob';

// 設定ファイルの固定名
const SETTINGS_FILENAME = 'user_settings.json';

export async function GET(req: Request) {
  try {
    // Blobからファイルリストを取得して設定ファイルを探す
    const { blobs } = await list({ prefix: SETTINGS_FILENAME });
    
    // 一致するファイルを探す
    const settingsBlob = blobs.find(blob => blob.pathname === SETTINGS_FILENAME);

    if (!settingsBlob) {
      // ファイルがない場合はデフォルト（空）を返す
      return NextResponse.json({});
    }

    // ファイルの中身をfetchして返す
    const res = await fetch(settingsBlob.url, { cache: 'no-store' });
    const settings = await res.json();
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Blob Get Error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // JSON文字列としてBlobに保存 (addRandomSuffix: false で上書き更新)
    await put(SETTINGS_FILENAME, JSON.stringify(body), { access: 'public', addRandomSuffix: false, allowOverwrite: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blob Set Error:", error);
    return NextResponse.json({ error: `Failed to save settings: ${(error as Error).message}` }, { status: 500 });
  }
}