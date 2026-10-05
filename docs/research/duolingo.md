# Duolingo Chess 調査レポート（2026-10-05時点）

凡例: 【確認済】= 公式発表または複数の信頼できる媒体で確認 / 【二次情報】= 単一の非公式・二次ソース / 【未確認】= 根拠が弱い、または推測

---

## 1. ゲームモードと提供状況

### モード
- **レッスン/パズル**: コースのおよそ75%がパズル、残り25%がミニマッチ・フルゲーム。【確認済】
  - https://blog.duolingo.com/chess-course
  - https://tribune.net.ph/2026/02/24/duolingo-chess-goes-live
- **Oscar（AIコーチ）との対局**: ミニマッチとフルゲーム。Oscarは皮肉屋のコーチキャラ。【確認済】
  - https://prtimes.jp/main/html/rd/p/000000070.000069537.html
- **PvP（対人戦）**: Matchesタブの「Play a Person」から、近いレーティングの相手と自動マッチング。iOSは2025年末、Androidは2026年2月に提供開始。【確認済】
  - https://tribune.net.ph/2026/02/24/duolingo-chess-goes-live
  - https://www.gapsis.jp/2026/02/duoling-chess-online-match.html （日本語記事）
  - 持ち時間は「10分切れ負け」の1種類のみ。ドロー提案なし。PvP開始当初は終局後の棋譜の振り返りも保存もできなかった。【二次情報: Chess.comのユーザーブログ】 https://www.chess.com/blog/raync910/duolingo-live-chess-experience-limitations
- **フレンド対戦**: 2026年2月時点では「予定」扱い。公式のコース紹介ページにはフレンド招待の記述があるが、いつから使えるかは**未確認**。
- **Game Review（振り返り）**: 2026-08-11開始（iOS/Android）。終局したすべての対局（Oscar戦・PvPの両方）がマッチ履歴に自動保存され、手順を1手ずつ再生できる。ハイライトは「好手・見逃し・悪手」の3カテゴリで、1局につき3局面程度。centipawn値も精度%も出ず、全手順のムーブリストも表示されない。【公式は確認済、詳細仕様は二次情報】
  - https://blog.duolingo.com/chess-game-review/
  - https://chessdrive.io/blog/duolingo-chess-game-review

### プラットフォーム・言語
- 経緯: 2025年4月にベータ → 2025年6月にiOSで正式リリース → 2025年9月にAndroid版を発表 → 2026年2月にAndroidでPvP開始。【確認済】
- 対応言語: 英語・スペイン語・フランス語・ドイツ語・イタリア語・ポルトガル語。【確認済】
- **日本**: 2025-09-22に日本語話者向けにiOSで提供開始（PR TIMES）。【確認済】 https://prtimes.jp/main/html/rd/p/000000070.000069537.html
  - 日本語UIのAndroid版があるかは**未確認**。Androidの対応言語の公式リストに日本語は含まれていない。
- **Web版**: 公式ブログ（chess-course）とFandom wikiでは「iOS/Android/Web」と書かれている。Web専用のbot（後述のuserscript）があることも、Web版の存在を裏付けている。ただしGame Reviewについては「iOS/Android」としか書かれていない。Web版でPvPやReviewが使えるかは**未確認**。
  - https://www.duolingo.com/chess （JSで描画されるページのため本文は取得できず）
  - https://duolingo.fandom.com/wiki/Chess
- 料金: 無料（広告あり）。Super会員は広告なし。チェス専用の課金はない。【二次情報】

## 2. 棋譜のエクスポート（PGNなど）

- **公式のPGNエクスポートや共有ボタンは見つからなかった。** Game Reviewの公式ブログも、エクスポートや共有には一切触れていない。【「存在しない」とは断定できないが、確認できたソース上では存在しない】
- **公式API**: なし。Duolingoには公開APIがない（言語学習データ用の非公式APIはコミュニティにあるが、チェスの対局データ用のエンドポイントは見つからなかった）。【未確認】
- **GDPRデータダウンロード**: 設定 → プライバシー（https://www.duolingo.com/settings/privacy）から個人データのコピーを申請できる（最長30日）。中身は学習履歴・利用ログ・購入履歴など。**チェスの棋譜が含まれるかは不明（未確認）**。フォーマットもJSONかCSVか明記されていない。実際に申請して確かめるしかない。
  - https://www.duolingo.com/privacy
- **コミュニティのツール**:
  - `itsgoharrehman/duolingo-chess-bot`: Web版向けのuserscript。DOM上のSVG/CSSの駒座標をFENに変換し、MutationObserverで盤面を追い、Stockfishで指す**チートbot**。APIは使っていない。→ Web版なら、DOMから盤面（FEN）を取れることを示している。ただしチート用途なのでToS違反。参考にするにとどめるべき。https://github.com/itsgoharrehman/duolingo-chess-bot
  - 「Duolingo Chess Assistant」（iOS上でStockfishを動かすもの）という記述が検索結果にあったが、詳細は未確認。
  - **棋譜をPGNとしてエクスポートする専用ツールは見つからなかった。**

## 3. エクスポートがない場合の現実的な取り込み方法

1. **スクリーンショット → FEN（盤面認識）**
   - オープンソースのツール:
     - fenshot（ブラウザ上で動くCNN、約1.3MBのONNX）https://github.com/scoriiu/fenshot
     - fenify（本の図面向け。マス単位の精度99.8%）https://github.com/notnil/fenify
     - fenify-3D（実物の盤の写真向け）https://github.com/notnil/fenify-3D
     - chessimg2pos（PyTorch）https://github.com/mdicio/chessimg2pos
     - chessfen（MLなしの純粋なCV）https://github.com/sunfmin/chessfen
     - ChessBoardScanner（chess.com/lichessの駒セット対応）https://github.com/bagaturchess/ChessBoardScanner
   - 商用: chessvision.ai（アプリ・ブラウザ拡張）
   - 注意: Duolingoは独自の駒デザインを使っている。chess.com/lichess向けに学習したモデルでは精度が落ちる可能性があり、Duolingoのスクショで少し追加学習（fine-tune）すれば精度は上げやすい。【推測】
   - 制約: 1枚のスクショから得られるのは「1局面」だけ。手番・キャスリング権・アンパッサンの情報はFENに入らないので、ユーザーに入力してもらう必要がある。局面1つを解析する用途（「この局面で何を指すべきだったか」）には十分。
2. **Game Reviewの再生画面を画面録画 → 棋譜を復元**
   - 1手ずつ再生できるので、各手のスクショか録画フレームを盤面認識にかけ、連続する局面の差分から合法手を逆算する。python-chessで「前の局面からの合法手のうち、次の局面に一致する手」を探せば、PGNを完全に復元できる。精度が高く、現実的な方法。【推測／技術的には妥当】
   - 弱点: ユーザーの手間が大きい（数十枚のスクショか動画のアップロードが必要）。
3. **手入力**: 盤面UIで手を入力してもらう方式。短い対局（初心者の10分切れ負け）なら現実的。Review画面を見ながら指し直してもらうUXなら、操作は簡単。
4. **Web版のDOMから読み取るブラウザ拡張**: 技術的には可能（前述のbotが実証済み）。ただし後述のToS上のリスクが大きい。拡張がユーザー本人の画面を読むだけでも、Duolingoの「自動手段によるService Contentの取得禁止」に触れるおそれがある。

## 4. 利用規約（ToS）上の問題

Duolingoの利用規約（https://www.duolingo.com/terms 、JSで描画されるため検索スニペット経由で確認）:
- 規約で明示的に許された場合を除き、Service Contentの改変・複製・配布・転載・ダウンロード・**スクレイピング**・販売などを禁止。
- **データマイニング・ロボット・スクレイピング**など、データを収集・抽出する手段の使用を禁止。
- アプリのリバースエンジニアリング・逆コンパイルを禁止。

整理（法的助言ではない）:
- **NG／高リスク**: Duolingoのサーバーや非公開APIへのスクレイピング、アプリの解析、Duolingoのレッスンやパズルの内容（Service Content）を広告付きサイトで再掲載すること。
- **比較的低リスク**: ユーザー本人が自分の対局の棋譜（手順そのもの）を自分でアップロードし、解析すること。手順という事実情報は、著作物としての保護が弱いと一般に考えられている。ただしスクショそのもの（Duolingoのグラフィック・キャラ）を公開ページに再掲載するのは避け、FEN/PGNに変換した後のデータだけを扱うのが無難。
- **商標**: 「Duolingo」「Oscar」の名前やロゴを、提携しているかのように見える形で使わない。「Duolingo Chessの対局を解析」のような説明的な使い方にとどめ、「非公式・提携なし」と明記する。
- ブラウザ拡張でDOMを読む方式は、規約の「自動手段による抽出」に当たると解釈されうる。botと同じ技術系統なので、アカウントBANのリスクもユーザーにある。

## 5. ユーザー規模・プレイヤー層

- 2025年Q2末に**DAU 100万超**（Duolingo史上最速で伸びた科目）【確認済: 2025年Q2の株主レター／報道】
  - https://investors.duolingo.com/static-files/0b55110c-2eb9-466d-8549-5459e0851290
  - https://www.edtechinnovationhub.com/news/duolingo-rides-ai-momentum-with-fastest-course-launch-and-40-dau-growth-in-q2
- 2026年には**DAU約700万**という報道がある【二次情報: Class Centralなど。一次資料（株主レター）での数値は未確認】。2026年Q2の決算説明会でvon Ahn CEOは「MathやMusicはチェスよりずっと小さい」と発言（Motley Foolの書き起こし）。「2番目に大きいチェスプラットフォーム」という発言は**未確認**。
  - https://www.classcentral.com/report/duolingo-2026-strategy/
  - https://www.fool.com/earnings/call-transcripts/2026/08/12/duolingo-duol-q2-2026-earnings-call-transcript/
  - 参考: Duolingo全体のDAUは5,870万（2026年Q2）。
- **プレイヤー層**: 公式には完全な初心者が対象で、コースのゴールは「約1500 Elo（強めの中級）」。【確認済】https://blog.duolingo.com/chess-course
  - Duolingo内のレーティングは、lichessより**インフレしている**という観察がある。【二次情報】
  - レビューサイトでは「初心者〜カジュアル層で頭打ち」「自分の対局の深い解析がない」が主な弱点とされる【二次情報】https://oldschoolchess.com/compare/duolingo-chess-review
  - → 「Duolingoで覚えて、負けた理由を知りたくなった初心者」が多いと見られ、ここに解析ツールのニーズがある。Game Reviewは3局面のハイライトだけで、評価値もムーブリストもないので、補完する余地は大きい。

---

## 主要ソース一覧
- https://blog.duolingo.com/chess-course
- https://blog.duolingo.com/chess-game-review/
- https://prtimes.jp/main/html/rd/p/000000070.000069537.html
- https://tribune.net.ph/2026/02/24/duolingo-chess-goes-live
- https://www.gapsis.jp/2026/02/duoling-chess-online-match.html
- https://www.chess.com/blog/raync910/duolingo-live-chess-experience-limitations
- https://chessdrive.io/blog/duolingo-chess-game-review
- https://www.duolingo.com/terms
- https://www.duolingo.com/privacy
- https://github.com/itsgoharrehman/duolingo-chess-bot
- https://github.com/scoriiu/fenshot ・ https://github.com/notnil/fenify ・ https://github.com/mdicio/chessimg2pos
- https://investors.duolingo.com/static-files/0b55110c-2eb9-466d-8549-5459e0851290
- https://www.fool.com/earnings/call-transcripts/2026/08/12/duolingo-duol-q2-2026-earnings-call-transcript/
