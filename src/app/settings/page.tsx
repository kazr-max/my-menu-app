"use client";

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Save, ArrowLeft } from 'lucide-react';
import { useSession, signIn, signOut } from "next-auth/react";
import Link from 'next/link';

// 食事ステージの選択肢を定数化
const MEAL_STAGES = ['離乳食完了期', '幼児食', '大人と同じ'] as const;
type MealStage = typeof MEAL_STAGES[number];

const SettingsPage = () => {
  const { data: session } = useSession();
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    adults: 2,
    children: [
      { id: Date.now(), name: '', birthday: '', stage: '離乳食完了期' as MealStage }
    ] as { id: number; name: string; birthday: string; stage: MealStage }[],
    dislikes: '',
    modelNumber: 'KN-HW24G',
    cookingMode: 'official',
    calendarColor: '#039be5',
    eventFormat: '【献立】{{menuName}}',
    calendarId: 'primary' // デフォルトは個人のカレンダー
  });

  // 設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: 'no-store' });
        const data = await res.json();
        if (!data.error) {
          setSettings(prev => ({ ...prev, ...data }));
        }
      } catch (e) {
        console.error("読み込み失敗:", e);
      }
    };
    loadSettings();
  }, []);

  // 子供を追加
  const addChild = () => {
    setSettings({
      ...settings,
      children: [...settings.children, { id: Date.now(), name: '', birthday: '', stage: '離乳食完了期' as MealStage }]
    });
  };

  // 子供を削除
  const removeChild = (id: number) => {
    setSettings({
      ...settings,
      children: settings.children.filter(child => child.id !== id)
    });
  };

  // 子供情報の更新ロジックを共通化
  const handleChildChange = (index: number, field: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      children: prev.children.map((child, i) => {
        if (i === index) {
          return { ...child, [field]: value };
        }
        return child;
      })
    }));
  };

  // 保存処理
  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        alert("設定を保存しました（夫婦で共有されます）");
      } else {
        const err = await response.json();
        alert("保存に失敗しました: " + err.error);
      }
    } catch (error) {
      alert("通信エラーが発生しました。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 space-y-8 bg-gray-50 min-h-screen text-gray-800">
      <header className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800">アプリ設定</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
        >
          <Save size={18} />
          {isSaving ? "保存中..." : "保存"}
        </button>
      </header>

      {/* 家族設定セクション */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-600 ml-1">👪 家族と食事</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <div>
            <label className="text-sm text-gray-500">大人の人数</label>
            <input 
              type="number" 
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              value={settings.adults}
              onChange={(e) => setSettings({...settings, adults: parseInt(e.target.value) || 0})}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm text-gray-500">お子様の設定</label>
              <button onClick={addChild} className="text-blue-600 text-xs flex items-center gap-1 hover:underline">
                <PlusCircle size={14} /> 追加
              </button>
            </div>
            
            {settings.children.map((child, index) => (
              <div key={child.id} className="relative border border-gray-100 p-3 rounded-lg bg-white shadow-inner">
                <button 
                  onClick={() => removeChild(child.id)}
                  className="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input 
                    placeholder="名前（任意）" 
                    className="text-sm border-b border-gray-200 p-1 focus:border-blue-500 outline-none bg-transparent"
                    value={child.name} 
                    onChange={(e) => handleChildChange(index, 'name', e.target.value)}
                  />
                  <input 
                    type="date" 
                    className="text-sm border-b border-gray-200 p-1 outline-none focus:border-blue-500 bg-transparent"
                    value={child.birthday} 
                    onChange={(e) => handleChildChange(index, 'birthday', e.target.value)}
                  />
                  <select 
                    className="col-span-2 text-sm bg-gray-50 p-2 rounded mt-1 outline-none border border-gray-100"
                    value={child.stage} 
                    onChange={(e) => handleChildChange(index, 'stage', e.target.value)}
                  >
                    {MEAL_STAGES.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 調理環境セクション */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-600 ml-1">🍳 調理環境</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <div>
            <label className="text-sm text-gray-500">ホットクック型番</label>
            <input 
              type="text" 
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
              value={settings.modelNumber}
              onChange={(e) => setSettings({...settings, modelNumber: e.target.value})}
            />
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setSettings({...settings, cookingMode: 'official'})}
              className={`flex-1 py-2 text-sm rounded-md transition ${settings.cookingMode === 'official' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
            >
              公式優先
            </button>
            <button 
              onClick={() => setSettings({...settings, cookingMode: 'manual'})}
              className={`flex-1 py-2 text-sm rounded-md transition ${settings.cookingMode === 'manual' ? 'bg-white shadow text-blue-600 font-bold' : 'text-gray-500'}`}
            >
              手動優先
            </button>
          </div>
        </div>
      </section>

      {/* カレンダー設定セクション */}
      <section className="space-y-4">
        <h2 className="font-semibold text-gray-600 ml-1">📅 カレンダー連携</h2>
        <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          
          {/* アカウント連携設定 */}
          <div>
            <label className="text-sm text-gray-500 block mb-1">Googleアカウント</label>
            {session ? (
              <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="flex items-center gap-3 overflow-hidden">
                  {session.user?.image ? (
                    <img src={session.user.image} alt="icon" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold">
                      {session.user?.name?.[0] ?? 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-900 truncate">{session.user?.name}</p>
                    <p className="text-xs text-blue-700 truncate">{session.user?.email}</p>
                  </div>
                </div>
                <button 
                  onClick={() => signOut()} 
                  className="text-xs bg-white text-red-500 border border-red-100 px-3 py-1.5 rounded-full hover:bg-red-50 whitespace-nowrap ml-2"
                >
                  解除
                </button>
              </div>
            ) : (
              <button 
                onClick={() => signIn("google")}
                className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors flex justify-center items-center gap-2"
              >
                <span className="text-lg">G</span> Googleでログイン
              </button>
            )}
            <p className="text-[10px] text-gray-400 mt-1 ml-1">
              ※ログインしておくと、献立作成後にワンクリックでカレンダー登録できます。
            </p>
          </div>

          <div>
            <label className="text-sm text-gray-500">共有カレンダーID</label>
            <input 
              type="text" 
              placeholder="primary または 共有カレンダーID"
              className="w-full mt-1 border border-gray-200 rounded-lg p-2 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              value={settings.calendarId || 'primary'}
              onChange={(e) => setSettings({...settings, calendarId: e.target.value})}
            />
            <p className="text-xs text-gray-400 mt-1">
              ※夫婦で共有しているカレンダーのID（例: xxxx@group.calendar.google.com）を入力してください。空欄の場合は自身のカレンダーに登録されます。
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;