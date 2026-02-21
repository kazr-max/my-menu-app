"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signIn } from "next-auth/react";
import Link from 'next/link';
import { Settings } from 'lucide-react';

// 年齢を計算するヘルパー関数
const formatChildrenAge = (children: any[]) => {
  if (!children || children.length === 0) return "未設定";
  if (!Array.isArray(children) || children.length === 0) return "未設定";
  return children.map(c => {
      if (!c.birthday) return "?歳";
      const birthDate = new Date(c.birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
      }
      return `${age}歳`;
  }).join('・');
};

export default function Home() {
  const { data: session } = useSession();
  const [recipes, setRecipes] = useState<string[]>([]);
  const [shoppingList, setShoppingList] = useState<string>(""); 
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  // 設定情報を保持するstate
  const [settings, setSettings] = useState<any>(null);
  const [startDate, setStartDate] = useState("");
  const [duration, setDuration] = useState(3);
  const [freeInput, setFreeInput] = useState("");
  const [debugLog, setDebugLog] = useState("");

  // ★デバッグ用：APIを叩かずにダミーデータを流し込む関数
  const debugGenerate = () => {
    setLoading(true);
    setRecipes([]);
    setShoppingList("");

    // ダミーデータもJSON形式に合わせて更新
    const dummyJson = {
      days: [
        "【1日目】\n【メニュー】鶏肉と大根の煮物\n【レシピ】\n材料：鶏肉, 大根\n手順：煮るだけ",
        "【2日目】\n【メニュー】鮭の蒸し物\n【レシピ】\n材料：鮭, きのこ\n手順：蒸すだけ",
        "【3日目】\n【メニュー】豚肉の炒め物\n【レシピ】\n材料：豚肉, キャベツ\n手順：炒めるだけ"
      ],
      shoppingList: "【肉・魚】\n・鶏肉\n・鮭\n・豚肉\n【野菜】\n・大根\n・きのこ\n・キャベツ"
    };

    // ストリーミング感を出すために少し遅延させて表示
    setTimeout(() => {
      setRecipes(dummyJson.days.slice(0, duration));
      setShoppingList(dummyJson.shoppingList);
      setLoading(false);
    }, 800);
  };

  // 初期表示時に日付を設定（ハイドレーションエラー回避のため）
  useEffect(() => {
    setStartDate(new Date().toISOString().split('T')[0]);
  }, []);

  // ページ読み込み時に設定情報を取得
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (e) {
        console.error("Failed to fetch settings", e);
      }
    };
    fetchSettings();
  }, []);

  const generateMenu = async () => {
    console.log("【Debug】generateMenu called (ボタンが押されました)");
    if (!settings) {
      alert("設定情報が読み込まれていません。");
      return;
    }
    setLoading(true);
    setRecipes([]);
    setShoppingList("");

    // 設定情報をプロンプト用に整形
    const settingsInfo = settings ? `
- ホットクック機種: ${settings.modelNumber || '指定なし'}
- 子供の年齢: ${formatChildrenAge(settings.children)}
- その他詳細: ${JSON.stringify(settings)}` : '未設定';

    try {
      console.log("【Debug】Sending request to /api/chat... (APIリクエスト開始)");
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `あなたはJSONデータ生成APIです。以下の要件に従って献立データを作成してください。

■入力情報
期間: ${duration}日間
家族構成・設定: ${settingsInfo}
要望: ${freeInput}

■調理・構成の要件
1. 【重要】手順には必ず「1歳児用の取り分け手順」を含めてください。（例：味付け前に取り出す、細かく刻む、湯で薄める等）
2. 献立は前週のメニューと被らないよう、バラエティ豊かに構成してください。

■出力形式（JSONのみ）
Markdown記法（\`\`\`json）や挨拶文は一切不要です。以下のJSON構造のみを返してください。
特に、"days"配列は必ず「${duration}個」の文字列要素に分割してください。

【出力例】
{
  "days": [
    "【1日目】\\n【メニュー】カレーライス\\n【レシピ】材料：... 手順：...",
    "【2日目】\\n【メニュー】焼き魚\\n【レシピ】材料：... 手順：...",
    "【3日目】\\n【メニュー】ハンバーグ\\n【レシピ】材料：... 手順：..."
  ],
  "shoppingList": "・じゃがいも\\n・人参\\n・玉ねぎ..."
}

■禁止事項・制約
1. "days"配列は、必ず「${duration}個」の要素を持つ配列にしてください。各要素には、それぞれの日の献立を1つずつ格納してください。（1つの文字列にまとめないこと）
2. 各日の見出しは「【n日目】」という形式に統一すること。具体的な日付（例：1月1日、2024-01-01）は絶対に使用しないこと。
3. 各要素内には必ず「【メニュー】」「【レシピ】」という見出しを含めること。
4. 買い物リストは必ず"shoppingList"キーの値として出力し、"days"配列には含めないこと。`,
          settings: settings
        })
      });

      console.log("【Debug】Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ text: 'APIからの応答がありません。' }));
        throw new Error(errorData.text);
      }

      const data = await response.json();
      console.log("【Debug】Data received:", data);
      
      // JSONとして解析しやすいようにクリーニング（Markdown記号などを除去）
      const fullText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
      setDebugLog(fullText);
      
      // ★ログ出力：AIからの返答をコンソールで確認できるようにする
      console.log("Gemini Output:", fullText);

      try {
        const parsed = JSON.parse(fullText);
        
        let daysData = parsed.days;

        // ★救済措置：もし配列が1つしかなく、日数が複数指定されている場合、中身を無理やり分割してみる
        if (Array.isArray(daysData) && daysData.length === 1 && duration > 1) {
           console.log("【Debug】配列が1つにまとまっているため、分割を試みます");
           const content = daysData[0];
           // 【n日目】、---、あるいは日付形式（YYYY-MM-DD等）での分割を試みる
           const splitData = content.split(/【\d+日目】|---|\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?/).map((d: string) => d.trim()).filter((d: string) => d.length > 0);
           if (splitData.length > 1) {
             daysData = splitData;
           }
        }

        if (Array.isArray(daysData)) {
          // AIが空の要素を返すことがあるため、フィルターで除去する
          const filteredDays = daysData.filter(day => typeof day === 'string' && day.trim().length > 0);
          // 指定日数分だけ取得する（AIが余分な要素や買い物リストを配列に含めてしまった場合の対策）
          setRecipes(filteredDays.slice(0, duration));
        }
        if (parsed.shoppingList) {
          setShoppingList(parsed.shoppingList);
        }
      } catch (e) {
        console.error("JSON Parse Error", e);
        // パース失敗時はアラートで生データを表示（コンソールが見えない場合の対策）
        alert("AIの返答を解析できませんでした。\n生データ:\n" + fullText);
        // フォールバックとしてそのまま表示
        setRecipes([fullText]);
      }
    } catch (error: any) {
      console.error(error);
      alert(`献立の作成に失敗しました: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // カレンダー一括登録
  const registerToCalendar = async () => {
    if (!session) {
      alert("ログイン機能は一時的に無効化されています。");
      return;
    }
    if (recipes.length === 0) return;

    setRegistering(true);
    try {
      // 日付と献立のペアを作成
      const events = recipes.map((recipe, index) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + index);
        const dateStr = date.toISOString().split('T')[0];
        
        // メニュー名を抽出（簡易的）
        // 【メニュー】または【メニュー名】に対応できるように調整
        const titleMatch = recipe.match(/【メニュー(?:名)?】\n?(.+)/);
        const title = titleMatch ? titleMatch[1].trim() : "献立";

        return {
          date: dateStr,
          summary: `【献立】${title}`,
          description: recipe
        };
      });

      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, calendarId: settings?.calendarId })
      });

      if (res.ok) alert("カレンダーに登録しました！");
      else alert("登録に失敗しました。");
    } catch (e) {
      console.error(e);
      alert("エラーが発生しました");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 px-4 font-sans text-gray-800">
      <div className="max-w-md mx-auto space-y-4">
        
        {/* ヘッダー */}
        <div className="bg-[#1a69ff] py-5 px-7 rounded-3xl shadow-lg shadow-blue-100/50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 text-white">
                <span className="text-xl">✨</span>
                <h1 className="text-lg font-bold tracking-tight">献立アシスタント</h1>
              </div>
              <p className="text-blue-100 text-[10px] mt-0.5 ml-9 opacity-80 tracking-widest uppercase">
                {settings ? `${settings.modelNumber} / ${formatChildrenAge(settings.children)}` : '設定を読み込み中...'}
              </p>
            </div>
            <Link href="/settings" className="text-white/70 hover:text-white transition-colors p-1">
              <Settings size={24} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">📅</span>
            <h2 className="font-bold text-gray-700">いつの献立を作る？</h2>
          </div>
          <div className="flex gap-3">
            <input 
              type="date" 
              className="flex-1 border-2 border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <select 
              className="w-24 border-2 border-gray-100 rounded-xl p-3 text-sm font-bold outline-none focus:border-blue-500 bg-white"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((d: number) => <option key={d} value={d}>{d}日間</option>)}
            </select>
          </div>
        </div>

        {/* 要望入力エリア */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">💭</span>
            <h2 className="font-bold text-gray-700">具体的な要望はある？</h2>
          </div>
          <textarea 
            className="w-full border-2 border-gray-100 rounded-xl p-4 text-sm outline-none focus:border-blue-500 min-h-[100px] resize-none"
            placeholder="例：子供が喜ぶカレー、野菜多め、魚料理を入れたい..."
            rows={4}
            value={freeInput}
            onChange={(e) => setFreeInput(e.target.value)}
          />
        </div>

        {/* ボタンエリア：デバッグボタンを追加 */}
        <div className="pt-2 space-y-2">
          <button
            onClick={generateMenu}
            disabled={loading}
            className="w-full py-5 bg-[#ff6000] text-white rounded-full font-bold text-lg shadow-xl shadow-orange-100 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? "作成中..." : "献立案を作成する"}
          </button>
          
          <button
            onClick={debugGenerate}
            className="w-full py-2 bg-gray-200 text-gray-600 rounded-full font-bold text-xs hover:bg-gray-300 transition-all"
          >
            🔧 デバッグモード（API不使用）で動きを確認
          </button>
        </div>

        {/* 献立結果表示 */}
        <div className="space-y-4 mt-2">
          {recipes.length > 0 && (
             <button 
               onClick={registerToCalendar}
               disabled={registering}
               className="w-full py-3 bg-white border-2 border-blue-100 text-blue-600 rounded-xl font-bold text-sm shadow-sm hover:bg-blue-50 transition-colors flex justify-center items-center gap-2"
             >
               {registering ? "登録中..." : session ? "📅 カレンダーに一括登録" : "🔑 Googleログインして登録"}
             </button>
          )}

          {recipes.map((text, index) => {
            const date = new Date(startDate);
            date.setDate(date.getDate() + index);
            const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`;
            
            return (
            <div key={index} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                <h3 className="font-bold text-blue-600 text-sm tracking-wider uppercase">{dateLabel}</h3>
              </div>
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-xs">
                {text}
              </div>
            </div>
            );
          })}
        </div>

        {/* 買い物リスト表示 */}
        {shoppingList && (
          <div className="mt-8 bg-green-50 rounded-3xl p-6 border-2 border-green-100 shadow-md animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 mb-4 text-green-700">
              <span className="text-xl">🛒</span>
              <h2 className="font-bold text-lg tracking-tight">まとめ買い物リスト</h2>
            </div>
            <div className="bg-white/70 rounded-2xl p-5 text-sm text-green-900 leading-relaxed whitespace-pre-wrap shadow-inner border border-green-50">
              {shoppingList}
            </div>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(shoppingList);
                alert("リストをコピーしました！");
              }}
              className="w-full mt-4 bg-green-600 text-white py-3 rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all"
            >
              📋 リストをコピー
            </button>
          </div>
        )}

        {/* デバッグ用：AIからの生の返答を表示 */}
        {debugLog && (
          <details className="mt-4 p-4 bg-gray-100 rounded-xl text-xs text-gray-600">
            <summary className="font-bold cursor-pointer">🤖 AIからの生の返答を見る（デバッグ用）</summary>
            <pre className="mt-2 whitespace-pre-wrap">{debugLog}</pre>
          </details>
        )}
      </div>
    </div>
  );
}