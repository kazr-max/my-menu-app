import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, settings } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ text: "APIキーが設定されていません。" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({ 
      // より高性能なモデルに変更
      model: "gemini-1.5-pro",
      generationConfig: {
        // JSONモードを有効化し、出力を強制的にJSON形式にする
        responseMimeType: "application/json",
        // 創造性を少し抑えて指示に従いやすくする
        temperature: 0.5, 
      },
    });

    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ text: `エラーが発生しました: ${error.message}` }, { status: 500 });
  }
}