# my-menu-app 詳細設計書

## 1. プロジェクト概要
**my-menu-app** は、Google Generative AI (Gemini) を活用してユーザーの家族構成や好みに合わせた献立を提案し、Google Calendar と連携してスケジュール管理を支援する Web アプリケーションです。

## 2. 技術スタック (Tech Stack)

| カテゴリ | 技術・ライブラリ | バージョン | 用途 |
| :--- | :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | 16.1.3 | アプリケーション基盤 |
| **Language** | TypeScript | 5.x | 開発言語 |
| **UI Library** | React | 19.2.3 | UI構築 |
| **Styling** | Tailwind CSS | 4.x | スタイリング |
| **Auth** | NextAuth.js | 4.24.13 | 認証 (Google OAuth) |
| **AI** | Google Generative AI SDK | 0.24.1 | Gemini API 連携 |
| **Database** | @vercel/kv | 3.0.0 | ユーザー設定の保存 (Redis) |
| **External API** | googleapis | 170.1.0 | Google Calendar 操作 |
| **Icons** | lucide-react | 0.562.0 | アイコン表示 |

## 3. ディレクトリ構成

```text
src/
├── app/
│   ├── api/
│   │   ├── calendar/       # カレンダー登録API
│   │   │   └── route.ts
│   │   ├── chat/           # AIチャットAPI
│   │   │   └── route.ts
│   │   └── settings/       # 設定保存・取得API
│   │       └── route.ts
│   ├── settings/           # 設定画面ページ
│   │   └── page.tsx
│   ├── providers.tsx       # SessionProvider等の設定
│   ├── layout.tsx          # ルートレイアウト
│   └── page.tsx            # (トップページ)
└── lib/
    └── auth.ts             # NextAuth設定オプション
```

## 4. 機能仕様詳細

### 4.1 認証機能 (Authentication)
*   **概要**: Google アカウントを使用したログイン機能。
*   **実装ファイル**: `src/lib/auth.ts`
*   **プロバイダー**: Google Provider
*   **権限スコープ**:
    *   `openid`, `email`, `profile`: 基本プロフィール情報
    *   `https://www.googleapis.com/auth/calendar.events`: カレンダーへのイベント追加権限
*   **セッション管理**: JWT ストラテジーを使用。`accessToken` をセッションコールバックでクライアント側に渡す実装となっている。

### 4.2 設定管理機能 (Settings)
*   **概要**: ユーザーごとの家族構成や調理環境設定を管理する。
*   **実装ファイル**: `src/app/settings/page.tsx`, `src/app/api/settings/route.ts`
*   **データストア**: Vercel KV (Redis)
*   **キー形式**: `user_settings:<email>`
*   **主な設定項目**:
    *   家族構成（大人の人数、子供の情報）
    *   嫌いな食材
    *   ホットクック型番・調理モード
    *   連携するカレンダーID

### 4.3 AI チャット・献立提案機能 (Chat)
*   **概要**: ユーザーの入力と設定情報を元に、AI が献立を提案する。
*   **実装ファイル**: `src/app/api/chat/route.ts`
*   **使用モデル**: `gemini-1.5-pro`
*   **生成設定**:
    *   `responseMimeType: "application/json"`: JSON形式での出力を強制。
    *   `temperature: 0.5`: 創造性を適度に抑制し、安定した回答を生成。

### 4.4 カレンダー連携機能 (Calendar)
*   **概要**: 生成された献立を Google カレンダーに登録する。
*   **実装ファイル**: `src/app/api/calendar/route.ts`
*   **処理フロー**:
    1.  NextAuth のセッションから `accessToken` を取得。
    2.  `googleapis` ライブラリを使用して OAuth2 クライアントを初期化。
    3.  指定された `calendarId` (デフォルトは `primary`) にイベントを挿入。
    4.  イベントは「終日イベント」として登録される。

## 5. データモデル定義

### ユーザー設定 (UserSettings)
`src/app/settings/page.tsx` および API で扱われるデータ構造。

```typescript
interface UserSettings {
  adults: number;
  children: Child[];
  dislikes: string;       // 嫌いなもの（カンマ区切り等）
  modelNumber: string;    // ホットクック型番 (例: KN-HW24G)
  cookingMode: 'official' | 'manual'; // 調理モード
  calendarColor: string;  // カレンダー表示色
  eventFormat: string;    // イベント名のフォーマット
  calendarId: string;     // 連携先カレンダーID (default: 'primary')
}

interface Child {
  id: number;             // 識別用タイムスタンプ
  name: string;
  birthday: string;       // YYYY-MM-DD
  stage: '離乳食完了期' | '幼児食' | '大人と同じ';
}
```

## 6. API エンドポイント仕様

### `POST /api/chat`
AI による応答生成を行う。
*   **Request Body**:
    ```json
    {
      "message": "ユーザーの入力メッセージ",
      "settings": { ...UserSettingsオブジェクト... }
    }
    ```
*   **Response**:
    ```json
    { "text": "AIからの応答テキスト（JSON文字列）" }
    ```

### `POST /api/calendar`
カレンダーへイベントを一括登録する。
*   **Request Body**:
    ```json
    {
      "events": [
        {
          "summary": "イベントタイトル",
          "description": "詳細説明",
          "date": "2024-01-01"
        }
      ],
      "calendarId": "primary"
    }
    ```
*   **Response**:
    ```json
    { "success": true, "count": 登録件数 }
    ```

### `GET /api/settings`
ログインユーザーの設定を取得する。
*   **Headers**: Cookie (Session)
*   **Response**: `UserSettings` オブジェクト

### `POST /api/settings`
ログインユーザーの設定を保存する。
*   **Headers**: Cookie (Session)
*   **Request Body**: `UserSettings` オブジェクト
*   **Response**: `{ "success": true }`

## 7. 環境変数 (.env)

アプリケーションの動作に必要な環境変数。

```env
# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET= # openssl rand -base64 32 等で生成

# Google Gemini API
GEMINI_API_KEY=

# Vercel KV (Redis)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=
```


