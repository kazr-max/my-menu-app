import { google } from 'googleapis';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session: any = await getServerSession(authOptions);
  
  if (!session || !session.accessToken) {
    return NextResponse.json({ error: "Googleログインが必要です" }, { status: 401 });
  }

  try {
    const { events, calendarId } = await req.json();
    const targetCalendarId = calendarId || 'primary';

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: session.accessToken });
    const calendar = google.calendar({ version: 'v3', auth });

    const results = [];

    for (const event of events) {
      // 終日イベントとして登録
      const res = await calendar.events.insert({
        calendarId: targetCalendarId,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: { date: event.date }, // YYYY-MM-DD
          end: { date: event.date },
        },
      });
      results.push(res.data);
    }

    return NextResponse.json({ success: true, count: results.length });

  } catch (error: any) {
    console.error("Calendar API Error:", error);
    return NextResponse.json({ 
      error: "カレンダー登録に失敗しました", 
      details: error.message 
    }, { status: 500 });
  }
}