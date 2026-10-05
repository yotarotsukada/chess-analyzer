# チェス・パフォーマンス分析ツール 競合調査（2026-10-05時点）

対象は「1局のエンジンレビュー」ではなく、**プレイヤーの対局履歴全体を分析するツール**。価格は調査時点のWeb上の公開情報によるもので、地域や時期によって変わる。

---

## 1. 競合ツール一覧

### 1.1 Chess.com Insights / Game Review（公式）
- **主な機能**
  - **Insights**（Diamond会員限定）：全対局の勝敗率、精度（accuracy）の推移、手数別の精度、対戦相手レーティング別の成績、終局理由（時間切れ・メイト・投了など）、オープニング上位10件の成績、戦術機会（フォーク・ピン・メイト）の取り逃し、駒別の統計、時間帯・曜日別の成績、キャスリングの傾向、エンドゲーム成績、同レーティング帯との比較。
  - **Game Review**：1局単位のレビュー。手の分類（Brilliant/Blunderなど）、CAPS2精度、Coachによる説明。2026年には音声Coachや有名選手Coach（Judit Polgarなど）、Courseからの逸脱の検出が加わった。Play Coach（対局中にAIが指導）もある。
- **ユーザー名での取り込み**：自サイト内のデータのみ。Lichessには非対応。
- **価格**：無料会員はGame Reviewが1日1局。Platinum以上で無制限。Insightsは最上位のDiamond（約$14/月〜）限定。
- **弱い点**：
  - Lichessの対局と合算できない。
  - 「何が弱いか」は示すが、「なぜ弱いか」の因果分析や、具体的な練習計画への落とし込みが弱い。
  - 時間の使い方の分析（1手ごとの消費時間の分布、時間に追われた時のミス）が浅い。
  - 有料の壁が高い（Insightsは最上位プランのみ）。
  - レビューの説明が全レベル共通で一般的、という評価がある。

### 1.2 Lichess Insights（公式・無料）
- **主な機能**：`lichess.org/insights/{user}`。「指標（Metric）× 軸（Dimension）」を自由に掛け合わせて集計できる。
  - 指標：ACPL、消費時間、相手レーティング、手数、Opportunism（相手の悪手を咎めた率）、Luck、レーティング増減、駒の不均衡など。
  - 軸：バリアント、局面のフェーズ、勝敗、手番色、ECO、動かした駒、消費時間帯、評価値帯など。
- **ユーザー名での取り込み**：Lichessのみ。他のユーザーのInsightsも、公開設定なら見られる。
- **価格**：完全無料。広告なし（寄付で運営）。
- **弱い点**：
  - ACPLなど精度系の指標は、**サーバ解析を依頼した対局だけ**が対象なので、サンプルが偏る。
  - 画面がクエリビルダー型で、初心者には何を見ればいいか分からない。
  - 「あなたの弱点はこれ」という結論や推奨を自動では出さない。
  - Chess.comの対局は扱えない。
  - 時系列トレンドの機能が弱い（フォーラムで要望が出ている）。

### 1.3 Aimchess
- **主な機能**：Chess.com・Lichess・（旧）Chess24から対局を取り込み、6つのスキル軸（Opening/Tactics/Endgame/Advantage capitalization/Resourcefulness/Time management）で採点する。「ルークエンドゲームに入ると65%負ける」「残り60秒以下で精度が12ポイント下がる」のような統計的な弱点を検出し、自分のミスからパズルやドリルを作る。習慣化の仕組みもある。
- **ユーザー名での取り込み**：あり（Chess.com・Lichess）。
- **価格**：フリーミアム。Premiumは$7.99/月、$57.99/年（「$14〜15/月」と書く記事もある）。
- **現状**：2021年にPlay Magnus Groupが買収し、2022年にChess.comの傘下に入った。モバイルアプリの更新は2024年半ばが最後で、**事実上メンテナンスモード**。ログイン不具合やPremiumが反映されないといった報告がある。
- **弱い点**：UIが分かりにくく、推奨が具体的でない。ドリルが実際の対局と切り離されている。開発が止まっている。

### 1.4 ChessMonitor（Anish Giriが関与）
- **主な機能**：Chess.comとLichessの対局を横断して集約する。Move Explorer（自分のオープニングツリー）、オープニング別・勝率の統計、相手の統計（国別・対戦数）、FIDEレーティングの推定、公開プロフィール、PGNの一括エクスポート、カスタムPGNデータベース、「Studio」（β版）。
- **ユーザー名での取り込み**：あり（無料は各1アカウント、Plusは各5、Proは各10）。Plusでは任意の公開プレイヤーを閲覧できる（相手の下調べに使える）。
- **価格**：
  - Basic：無料（**広告あり**。Plusの特典に「No ads」がある）。
  - Plus：$7.90/月、年払いなら$5.90/月。
  - Professional：$59.90/月、年払いなら$44.90/月。コーチやクラブ向け。
- **弱い点**：
  - エンジン解析による「質」の分析（ミスの種類、フェーズ別の精度）が薄く、勝敗や頻度の統計が中心。
  - 時間の使い方の分析がない。
  - AIによる言語での解説がない。
  - 便利な機能（任意プレイヤーの閲覧、高度なフィルタ）は有料。

### 1.5 OpeningTree（openingtree.com）
- **主な機能**：Chess.com・Lichessのユーザー名かPGNから、自分（または任意のプレイヤー）のオープニングツリーを作る。手ごとに勝ち・引き分け・負けの率を表示し、時間制・色・期間で絞り込める。GMデータベースとの比較やPGNエクスポートもできる。
- **ユーザー名での取り込み**：あり（任意のプレイヤーも可。相手の下調べの定番）。
- **価格**：完全無料、オープンソース。アカウント登録は不要。
- **弱い点**：オープニング専用。エンジンの評価、ミドルゲーム以降の分析、トレンド表示がない。データはブラウザで毎回取得するので、大量の対局では遅い。

### 1.6 chessinsights.xyz（および類似の個人製ツール）
- **主な機能**：Chess.com APIからユーザーの全対局を取得し、CSV・JSON・PGNでエクスポートする。Chart.jsで可視化する（クライアント側だけで動く）。「Chess.comのInsightsを無料で再現する」のが目的。オープンソース（NotJoeMartinez/chess-insights）。
- **ユーザー名での取り込み**：あり（Chess.comのみ）。
- **価格**：無料。
- **弱い点**：accuracyは「Game Reviewを実行した対局」にしかない。1手ごとの評価や手の分類はAPIで公開されていない。可視化はまだ作りかけ。Lichessには非対応。
- **類似ツール**：Chess Insights（Androidアプリ）、Chessigmaの無料レビュー、各種のChrome拡張など。

### 1.7 Chessable（Chess.com傘下）関連
- **主な機能**：MoveTrainer（間隔反復）による定跡コース。2025年に「Repertoire」（コースから自分用のレパートリーを編集する機能）が追加された。**PuzzleConnect** はChess.com・Lichessの自分の対局からパズルを作る。Chess.comのGame Reviewで「Courseからの逸脱」を表示する連携もある（Chess.com Coursesに移行した場合のみ）。
- **ユーザー名での取り込み**：PuzzleConnectであり（アカウント連携）。
- **価格**：コースは個別に購入。Proサブスクリプションあり。
- **弱い点**：分析ツールではなく学習ツール。「自分のレパートリーと実戦のズレ」を履歴全体で統計的に示す機能は限定的（Chess.comのGame Reviewで1局ずつ見るだけ）。

### 1.8 DecodeChess
- **主な機能**：Stockfishの手を、自然言語で「なぜその手か」として説明する（脅威、プラン、駒の役割）。対象は1局単位の深い解説。
- **ユーザー名での取り込み**：PGNやリンクから取り込む。履歴全体の集計は主な機能ではない。
- **価格**：
  - 無料：1日1局（「2局」とする記事もある）。
  - Unlimited：$8.25/月、$84/年。
  - クレジットパック：$15で60、$25で120。
- **弱い点**：説明は1手ごとで、対局をまたいだ傾向が分からない。機械的な説明という評価がある。想定はおおむね2000以下。履歴分析ツールとは言えない。

### 1.9 Noctie（noctie.ai）
- **主な機能**：10億局以上の人間の対局で学習した、**人間らしいAI**（自分と同じレベルで、消費時間まで人間に近い）と対局して練習する。1手ごとの即時評価、自分のミスから作るパズル（間隔反復）、Sparring Positions、オープニングレパートリー、100以上のレッスン、デイリーパズル、ウィークリーシナリオ。iOS・Android・Webで同期する。
- **ユーザー名での取り込み**：Chess.com・Lichessの対局をインポートできる。
- **価格**：€14/月、年払いなら€8/月。7日間の無料トライアルあり。
- **弱い点**：中心はAIとの対局練習。他サイトの履歴全体を統計的に可視化する機能は弱い。すべて有料。

### 1.10 2024〜2026年の新しいAI・LLM系ツール
| ツール | 概要 | 取り込み | 価格 | 弱い点 |
|---|---|---|---|---|
| **Chessigma** | 登録不要の無料ゲームレビュー（Chess.com・Lichess・PGN）。有料のSupercoachに「DNAレポート」、デイリープラン、ドリル、LLMコーチ「Froggy」がある | ユーザー名 | $14/月（創業者価格）、$97/年、$340買い切り。Froggyは月200メッセージの上限 | 履歴分析とLLMは有料。メッセージ上限がある |
| **Chessvia（Chessy）** | 音声対応・マルチモーダルのLLMコーチ。対話しながら変化を探れる | Chess.com・Lichess | $7〜19/月（Silver・Gold・Platinum）、年$49〜149 | 対話型の1局レビューが中心。履歴全体の統計は限定的 |
| **Improve my Chess**（2026年） | 400〜999のChess.comユーザー向け。レベルに合わせた解説、相手の下調べ、ドリル、「Ask My Games」（自分の対局への質問） | Chess.comのみ | 無料3回、£4.99/月、£39/年 | 新しくコミュニティが小さい。Lichessに非対応。1500以下向け |
| **Sensei Chess** | Chess.com・Lichess連携のAIコーチ。1手ごとの解説とパターン検出 | あり | フリーミアム | 差別化が弱い |
| **Take Take Take**（Magnus系） | 対局後にAIがキーモーメントや戦術パターンを解説 | アプリ内 | フリーミアム | 1局単位 |
| **Chess.com Coach / Play Coach** | 公式のAIコーチ（音声、有名選手のペルソナ） | Chess.comのみ | 会員プランに含まれる | 1局単位。説明が一般的 |
| **OSS系**（LLM-ChessCoach、AI Chess Coachの各Chrome拡張） | Stockfish＋LLMでコメントを生成する | ユーザー名 | 無料か自前のAPIキー | 品質がばらつく。LLMが盤面を誤解する（幻覚）問題 |

**共通の傾向**：新しいLLM系ツールの多くは、**1局を言葉で解説すること**に集中している。履歴全体を統計的・因果的に分析してから言葉にするツールは、有料で上位プランの奥（Chessigma DNA、Aimchess）にしかない。

---

## 2. データソースAPIの確認

### 2.1 Chess.com Published-Data API（`https://api.chess.com/pub/...`）
- **認証**：不要。読み取り専用で、匿名ユーザーに公開されている情報だけを返す。
- **レート制限**：
  - 直列のリクエスト（前の応答を待ってから次を送る）は「無制限」。
  - 並列にすると `429 Too Many Requests` が返ることがある。
  - 不審なアクセスはブロックされる。**連絡先を書いた識別可能なUser-Agentの送信が推奨**されている。
- **キャッシュ**：データの更新は12〜24時間ごと。`ETag`・`Last-Modified` が返るので、`If-None-Match` を送れば304を受け取れる。
- **主なエンドポイント**：
  - `/pub/player/{user}/games/archives`：月別アーカイブの一覧
  - `/pub/player/{user}/games/{YYYY}/{MM}`：その月の対局（JSON）
  - `.../pgn`：その月のPGNをまとめて取得
  - その他、プロフィール、レーティング統計（`/stats`）など
- **取得できるデータ**（2026-10-05に実際に取得して確認）：
  - `pgn`：ECO、ECOUrl、TimeControl、Termination、Elo、UTC日時を含む。**1手ごとの `[%clk h:mm:ss.s]` 付き**（Live対局）なので、消費時間を再構成できる。
  - `accuracies {white, black}`：**誰かがGame Reviewを実行した対局にだけ含まれる**。トップ選手はほぼ全局にあるが、一般ユーザーは欠けることが多い。
  - `time_class`、`time_control`、`rated`、`fen`、`initial_setup`、`tcn`、`white`/`black`（rating、result、username、uuid）、`eco`（URL）。
  - **1手ごとの評価値、手の分類（Brilliant/Blunder）、CAPSの内訳は含まれない**。つまり、自前でStockfishを回す必要がある。
- **利用規約上の注意**（広告付きの公開サイトに関係する点）：
  - User Agreementでは、サービスを商用に利用・再販すること、データマイニング、ボットを禁じる条文が以前からある。**2026年3月の改定で「明示的な許可なく自動化ツール・ボット・AIシステムでChess.comのコンテンツにアクセス・スクレイピング・データマイニング・複製すること」の禁止が明文化された**。
  - 公式のPublished-Data APIは第三者が使うことを前提に提供されており、ChessMonitorやAimchessのような商用サービスも実際に使っている。ただし、**商用の広告付きサイトで使うことを明示的に許可した文言はない**。商用利用やIPの疑問は legal@chess.com に問い合わせるよう案内されている。
  - ブランドの尊重を求めている：盤の配色、駒のデザイン、効果音、**手の分類のグリフ（Brilliant「!!」アイコンなど）**の流用は不可。Daily Puzzleなどを使う場合はクレジットリンクが必要。
  - **推奨**：APIだけを使う（HTMLのスクレイピングはしない）。直列でアクセスし、ETagでキャッシュする。連絡先付きのUser-Agentを送る。「Chess.com非公式」と明記し、Chess.comのグリフやデザインを流用しない。可能なら法務に事前に確認する。

### 2.2 Lichess API（`https://lichess.org/api`）
- **認証**：対局のエクスポートは、ドキュメント上は匿名でも可能。OAuth2（PKCE）や個人アクセストークンを使うとエクスポートが速くなる。
  - ※ 2026-10-05にこの環境から匿名で `GET /api/games/user/{user}` を叩いたところ404が返り、`/games/export/{user}` は `/login` にリダイレクトされた。その後のリトライは同時接続制限（"Please only run 1 request(s) at a time"）に当たった。**IPやUser-Agentによる制限か、仕様の変更の可能性がある。実装前にトークン付きでも検証すること。**
- **レート制限**：
  - **一度に1リクエストだけ**送ること。429が返ったら最低1分待つ。
  - ユーザーの対局エクスポートのストリーム速度：匿名なら20局/秒、OAuthなら30局/秒、本人の対局なら60局/秒。
  - 50万局を超えるユーザーもいるので、ストリーミング（ndjson）で処理し、`since`・`max` で差分だけ取得する。
- **取得できるデータ**（`/api/games/user/{username}` のパラメータ）：
  - `clocks=true`：1手ごとの残り時間（センチ秒）。
  - `evals=true`：**サーバ解析済みの対局だけ**、1手ごとの評価値、best、judgment（Inaccuracy/Mistake/Blunder）。
  - `accuracy=true`：プレイヤーごとの精度%（JSONのみ）。プレイヤーごとの集計（acpl、inaccuracy/mistake/blunderの数）も付く。
  - `opening=true`：オープニング名とECO。
  - `division=true`：ミドルゲームとエンドゲームに入った手数（JSONのみ）。
  - `literate=true`：テキストの注釈。
  - フィルタ：`perfType`、`rated`、`color`、`vs`、`analysed`、`since`/`until`、`sort`。
  - その他：Cloud Eval API。全対局・パズル・評価済み局面の月次ダンプ（database.lichess.org、CC0）も使える。
  - 注意：**解析済みの対局は少数派**なので、全対局の精度を出したいなら自前で解析が必要。
- **利用規約**：
  - 「個人利用・**商用利用**（自分のアプリ・プロジェクト・研究・製品）のどちらでもサービスを使ってよい」と明記されている。
  - レートなどの上限はLichessの裁量で決まる。
  - 本体はAGPL。
  - Lichess自身は広告なしを約束しているが、**第三者サイトの広告を禁じる条文は確認できなかった**（「第三者サイトの広告なしは保証できない」という記述があるだけ）。一部の検索要約に「Lichessのコンテンツを表示するページで広告禁止」とあったが、ToSの本文では確認できていない。ただし、Lichessのロゴや名称で公式だと誤認させるのは避けるべき。

---

## 3. 機能比較の要約

| | 両サイト横断 | エンジン解析の質 | 時間管理の分析 | トレンド | AIの言語解説 | 相手の下調べ | 無料度 |
|---|---|---|---|---|---|---|---|
| Chess.com Insights | × | ○（Review済み） | △ | ○ | △ | × | ×（Diamond） |
| Lichess Insights | × | △（解析済みのみ） | ○ | △ | × | △ | ◎ |
| Aimchess | ○ | ○ | ○ | ○ | × | × | △ |
| ChessMonitor | ○ | × | × | ○ | × | ○（有料） | △（広告） |
| OpeningTree | ○ | × | × | × | × | ○ | ◎ |
| chessinsights.xyz | ×（Chess.comのみ） | × | × | △ | × | ○ | ◎ |
| DecodeChess | × | ◎（1局） | × | × | ○ | × | △ |
| Noctie | △（インポート） | ○ | × | △ | △ | × | × |
| Chessigma・Chessviaなど | ○ | ○ | △ | △ | ◎（有料） | △ | △ |

---

## 4. 新しいツールが取れる空白・手薄な機能（10項目）

1. **両サイトを横断して全局を自前で解析する、無料の「Insights」**
   - Chess.comのaccuracyはReview済みの局にしかなく、Lichessのevalsも解析済みの局だけ。
   - 全局をStockfishで解析し（ブラウザのWASMかサーバで）、両サイトを統合した精度・ミス統計を無料で出せば、Diamondが必要なInsightsの代わりになる。
2. **時間管理の深い分析**
   - `%clk` やclocksから「1手ごとの消費時間の分布」「時間に追われた時（残り10%以下など）のBlunder率」「序盤に時間を使いすぎているか」「考え込んだ手と即指しの手の質の違い」を出す。
   - 公式もChessMonitorも浅い領域。
3. **レーティング帯の基準との比較（あなたの弱点は同じレート帯と比べてどうか）**
   - Lichessの公開DB（CC0）から、レート帯別の基準値（フェーズ別の精度、時間切れ率など）を作って比べる。
4. **弱点の因果分析と優先順位（どこを直せば何点上がるか）**
   - 「この負けパターンをなくせば推定+40 Elo」のように、改善余地を期待値で並べる。
   - 統計を並べるだけの既存ツールとの差別化になる。
5. **実戦のオープニングと「本来のレパートリー」のズレ**
   - ユーザーのレパートリー（PGNかChessableの書き出し）を登録し、全局を集計する。
   - 何手目でズレたか、ズレた後の勝率、相手の頻出の外し方を示す。
   - Chess.comでは1局ずつしか見られない。
6. **「結論ファースト」の要約とLLMナラティブ（統計を根拠にする）**
   - 統計とエンジンの結果を構造化してからLLMで文章にすれば、盤面の幻覚を抑えられる。
   - 週次・月次の「あなたのチェスレポート」を作る。無料で、共有もできる。
7. **ティルト・セッション分析**
   - 連敗後の成績、同じセッション内の何局目かによる精度の低下、深夜・曜日の影響、連続対局の上限の推奨。
   - Chess.comに時間帯の統計はあるが、行動の観点からの提案はない。
8. **相手の下調べを無料で深く（両サイト対応）**
   - 相手のレパートリーの穴、時間に追われた時の傾向、苦手なエンドゲーム。
   - ChessMonitorでは有料、OpeningTreeはオープニングだけ。
9. **局面タイプ別の弱点**
   - 駒の不均衡、構造（IQP、反対側キャスリング）、エンドゲームの種類（ルーク、ビショップ対ナイトなど）、優勢を勝ちにつなげる率と劣勢から粘る率。
   - Aimchessの開発が止まった今、手薄な領域。
10. **自分のミスからドリルを作り、効果を測る（閉ループ）**
    - 自分の実戦のミス局面をパズル化し、その後の実戦で同じパターンのミスが減ったかを追う。
    - 練習と実戦の結果を結びつけて示すツールはない。
11. **日本語などのローカライズと、登録不要で即座に結果が出ること**
    - 既存ツールはほぼ英語。登録なしでユーザー名を入れるだけで数秒で概要が出て、詳細はバックグラウンドで解析するUXにすれば、SEOでも広告モデルでも有利。
12. **共有できるビジュアル（SNS向けのカードや年間まとめ）**
    - 「Chess Wrapped」型の年間・月間まとめ画像。広告付きサイトの集客の柱にできる。

---

## 5. 主な出典
- Chess.com Published-Data API：https://www.chess.com/news/view/published-data-api
- Chess.com Insightsの説明：https://support.chess.com/en/articles/8708925-what-is-insights-on-chess-com
- Chess.comの会員プラン：https://support.chess.com/en/articles/8562418-what-does-each-level-of-premium-membership-get-me
- Chess.comの規約改定（2026年3月）：https://www.chess.com/legal/updates 、User Agreement：https://www.chess.com/legal/user-agreement
- Lichess API仕様：https://lichess.org/api 、https://github.com/lichess-org/api
- Lichess ToS：https://lichess.org/terms-of-service
- Lichess Insights：https://lichess.org/@/lichess/blog/chess-insights/VmZbaigA
- Aimchessの現状：https://chessdock.com/learn/what-happened-to-aimchess 、https://chessdir.app/apps/aimchess
- ChessMonitorの価格：https://www.chessmonitor.com/pricing 、https://thechessadvisor.com/website-review/review-of-chessmonitorcom/
- OpeningTree：https://alternativeto.net/software/openingtree/about
- chessinsights.xyz：https://notjoemartinez.com/blog/chessinsights_xyz_chess_com_api/
- Chessable：https://www.chess.com/news/view/announcing-game-review-course-check 、https://www.chess.com/news/view/announcing-chessable-repertoire
- DecodeChess：https://www.chessvia.ai/blog/vs-decodechess
- Noctie：https://noctie.ai/ 、https://www.chessvia.ai/blog/noctie-alternative
- AIコーチの比較：https://www.improvemychess.co/learn/best-ai-chess-coaches-2026 、https://www.chessvia.ai/blog/chessigma-alternative 、https://checkmatex.app/blog/best-ai-chess-coach-2026-tools-compared
- Chess.comのPlay Coach：https://www.chess.com/news/view/announcing-play-coach
