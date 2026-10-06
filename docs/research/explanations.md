# Key Moment の深い解説 調査レポート（2026-10-06時点）

目的は、1局につき数か所の Key Moment（悪手・取り逃し・形勢の転換点・より良い Candidate Move と、その Variation がどこで分かれるか）を深く解説する機能の判断材料を集めること。**判断はせず、事実だけを並べる。**

凡例: 【確認済】= 一次情報（公式ドキュメント・論文・ソースコード）か、このリポジトリでの実測で確認 / 【二次情報】= 単一の非公式・二次ソース / 【未確認】= 根拠が弱い、推測、または取得できなかった / 【試算】= 下記の前提から計算した値

前提（依頼文より）: Stockfish 15.1 をサーバーで実行（depth 18、MultiPV 3）。Key Moment 1か所あたり、入力 1.5k〜3k トークン（FEN、手順、エンジンの読み筋、抽出した事実）、出力 300〜600 トークン（日本語）。解析は非同期なので Batch でよい。

---

## 1. LLM の費用

### 1.1 モデルと単価【確認済】
出典: Claude API の skill（claude-api、2026-09-25 キャッシュ）と公式の料金ページ https://platform.claude.com/docs/en/about-claude/pricing （2026-10-06 に取得）

| モデル | モデルID | 入力 $/MTok | 出力 $/MTok | Batch 入力 / 出力 | キャッシュ読み | 5分キャッシュ書き |
|---|---|---|---|---|---|---|
| Claude Haiku 4.5（最安） | `claude-haiku-4-5` | $1 | $5 | $0.50 / $2.50 | $0.10 | $1.25 |
| Claude Sonnet 5.5（中位・現行 Sonnet） | `claude-sonnet-5-5` | $2 | $10 | $1 / $5 | $0.20 | $2.50 |
| （参考）Claude Opus 5.5 | `claude-opus-5-5` | $4 | $20 | $2 / $10 | $0.20 | $5 |

公式ページから分かること【確認済】:
- **Batch API は入力・出力とも 50% 引き**。プロンプトキャッシュの倍率と重ねて適用できる（"These multipliers stack with other pricing modifiers, including the Batch API discount"）。
- **トークナイザーの違い**: Claude 4.7 以降のモデルは新しいトークナイザーを使い、同じテキストで約 30% 多くトークンを数える。Sonnet 5.5 は新トークナイザー（Sonnet 5 と同じ）、Haiku 4.5 は旧トークナイザー。前提のトークン数が旧トークナイザーで数えたものなら、**Sonnet 5.5 では最大 1.3 倍**になりうる（量は内容によって変わる）。
- **キャッシュできる最小の長さ**（skill の shared/prompt-caching.md）: Haiku 4.5 は **4,096 トークン**、Sonnet 5.5 は 512 トークン（skill は「使う前に公式ドキュメントで確認せよ」と注記）。これより短い前置き部分は、指定してもエラーなくキャッシュされない。
- **思考（thinking）の扱い**（skill より）: Sonnet 5.5 は思考が既定でオン（adaptive、effort は既定 `high`）。思考のトークンは**出力として課金される**。`{type: "disabled"}` は 400 エラーになり、思考を止めるには `{type: "between_tools"}` を送る（effort は high 以下が条件）。Haiku 4.5 は、指定しなければ思考なし。→ 依頼の「出力 300〜600 トークン」は、Sonnet 5.5 で思考を止めるか effort を下げた場合にだけ成り立つ。思考を残すと出力トークンは数倍になりうる【未確認: 倍率は実測が必要】。

### 1.2 1局あたり・1,000局あたりの費用【試算】
計算式: Key Moment 数 ×（入力トークン × 入力単価 ＋ 出力トークン × 出力単価）。「下限」= 入力 1.5k・出力 300、「上限」= 入力 3k・出力 600。Sonnet 5.5 は、トークナイザーの補正なし（×1.0）と補正あり（×1.3）の両方を示す。思考トークンは含めない。

| モデル | Key Moment 数 | 通常 / 1局 | Batch / 1局 | 通常 / 1,000局 | **Batch / 1,000局** |
|---|---|---|---|---|---|
| Haiku 4.5 | 3 | $0.009〜0.018 | $0.0045〜0.009 | $9〜18 | **$4.5〜9** |
| Haiku 4.5 | 5 | $0.015〜0.030 | $0.0075〜0.015 | $15〜30 | **$7.5〜15** |
| Sonnet 5.5（×1.0） | 3 | $0.018〜0.036 | $0.009〜0.018 | $18〜36 | **$9〜18** |
| Sonnet 5.5（×1.3） | 3 | $0.023〜0.047 | $0.012〜0.023 | $23〜47 | **$12〜23** |
| Sonnet 5.5（×1.0） | 5 | $0.030〜0.060 | $0.015〜0.030 | $30〜60 | **$15〜30** |
| Sonnet 5.5（×1.3） | 5 | $0.039〜0.078 | $0.020〜0.039 | $39〜78 | **$20〜39** |

単価が「入力 2 倍・出力 2 倍」なので、同じトークン数なら **Sonnet 5.5 は Haiku 4.5 のちょうど 2 倍**、新トークナイザーの分を入れると約 2.6 倍。

参考: 解析費用の月額上限は $10（X1）。仮に LLM 解説にも $10/月を使うとすると、Haiku 4.5・Batch・3か所なら月 1,100〜2,200 局、Sonnet 5.5・Batch・5か所なら月 260〜670 局に相当する【試算】。

### 1.3 キャッシュと Batch の効き方【確認済の仕組み＋試算】
- **Batch（50%引き）**: 結果が返るまでの時間は保証されない（公式は「非同期」とだけ説明。上限は 24 時間とされる【未確認: 今回は取得していない】）。D10 のキュー方式とは組み合わせられるが、「解析完了と同時に解説も見せる」ことはできなくなる可能性がある。
- **プロンプトキャッシュ**: 共通の system プロンプト（用語集・書き方の規則・例）を前に置き、局面ごとのデータを後ろに置くと、共通部分は 2 回目から 0.1 倍の単価になる。
  - Haiku 4.5 は最小が 4,096 トークンなので、共通部分が 1〜2k トークン程度だとキャッシュされない。
  - Sonnet 5.5 は 512 トークンからキャッシュできる。例: 3k の入力のうち 1.5k が共通部分なら、2 回目以降は 1.5k ×（$2 − $0.20）＝ 1か所あたり約 $0.0027 安くなる（書き込みの 1.25 倍の追加費用は別）【試算】。
  - Batch の中でのキャッシュヒットは「ベストエフォート」（skill の shared/cost-optimization.md）。
- **1局の Key Moment をまとめて1リクエストにする**と、手順のリストなど局面に共通する入力を1回分に減らせる（入力トークンの削減。量は設計次第）。

---

## 2. 収益側（AdSense）

### 2.1 日本語サイトの AdSense RPM（1,000 PV あたりの収益）【二次情報・目安】
公式の統計はない。日本語のブロガーによる自己申告が中心。

| 出典 | 値 | 時期 |
|---|---|---|
| https://ym-life.com/adsense-rpm/ | 雑記・トレンドブログで **¥250〜350**。金融・教育などの専門ジャンルでは ¥1,000 を超えることもある | 本文は「2022年現在」、記事は 2025-01 更新 |
| https://saba.j-shimbun.com/article/adsenserpm.html | 一般的に **¥100〜300**、平均 **¥200** が妥当 | 日付なし |
| https://nobutoblog.com/page-rpm/ ほか（検索結果） | ¥300 前後 | — |

- ブログ（記事ページ）の値であり、**ツール系ページ（滞在中に広告を見ない、広告枠が少ない）では下がりうる**【未確認】。
- RPM は季節で変わり、3・6・9・12 月に上がる傾向があるとされる【二次情報】。
- 為替は **¥150/$ と仮定**【未確認: 2026-10 時点のレートは確認していない】。→ 1 PV あたり ¥0.10〜0.35 ＝ **$0.00067〜0.0023**。

### 2.2 損益分岐となる「解説付き1局あたりの PV 数」【試算】
計算式: 1局あたりの LLM 費用 ÷ 1 PV あたりの収益。Batch 価格。エンジンの追加費用（§5、1局あたり約 $0.001）は含まない。

| モデル・Key Moment 数 | 1局の費用（Batch） | RPM ¥100 | RPM ¥200 | RPM ¥350 |
|---|---|---|---|---|
| Haiku 4.5・3か所 | $0.0045〜0.009 | 7〜14 PV | 3.4〜7 PV | 2〜4 PV |
| Haiku 4.5・5か所 | $0.0075〜0.015 | 11〜23 PV | 6〜11 PV | 3〜6 PV |
| Sonnet 5.5・3か所（×1.0〜1.3） | $0.009〜0.023 | 14〜35 PV | 7〜18 PV | 4〜10 PV |
| Sonnet 5.5・5か所（×1.0〜1.3） | $0.015〜0.039 | 23〜59 PV | 11〜29 PV | 6〜17 PV |

- 通常（Batch なし）の価格なら、必要な PV は上の **2 倍**。
- Sonnet 5.5 で思考を残すと出力が増えるので、必要な PV はさらに増える。
- 現状の設計（D30: Game Review は全て noindex、閲覧は共有 URL のみ）では、1局の PV は「作った本人 ＋ 共有した相手」の閲覧数で決まる。1局あたりの実際の PV は未計測。

---

## 3. 解説を幻覚なしで生成する方法（既存製品と研究）

### 3.1 既存製品
| 製品 | 解説の作り方 | 確度 |
|---|---|---|
| **Lichess**（サーバー解析のコメント） | 完全にテンプレート。`lila` の `modules/tree/src/main/Advice.scala` に、評価の落ち幅から「Inaccuracy / Mistake / Blunder」＋ "`<手>` was best."、詰みの変化から "Checkmate is now unavoidable" / "Lost forced checkmate sequence" / "Not the best checkmate sequence" を作るコードがある。LLM は使っていない。AGPL-3.0。 | 【確認済】 https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala |
| **Lichess の「Show threat」**（解析ボードの x キー） | 手番を相手に渡した（null move）局面をエンジンに読ませ、「相手がもう1手指せたら何をするか」＝脅威を示す。脅威があれば評価が大きく動く。 | 【二次情報】 https://zwischenzug.substack.com/p/how-to-talk-to-engines 、Lichess フォーラム https://lichess.org/forum/lichess-feedback/show-threat-feature-2 |
| **Chess.com Game Review / Coach** | Coach が「各手の脅威と、それを防いだか許したか」を示す（2023-03 の Game Review v2 発表）。Key Move は「対局の流れを大きく変えた手」で、最初の Key Move はたいてい最後の定跡手。**生成方式（テンプレートか LLM か）は公式に説明がない。** 2026 年には音声 Coach、有名選手の声の Coach、Play Coach（対局中の AI 指導）が加わった。 | 機能は【確認済】 https://www.chess.com/news/view/chesscom-launches-game-review-v2 、 https://support.chess.com/en/articles/8584089-how-does-game-review-work 。方式は【未確認】 |
| **DecodeChess** | Stockfish の探索結果をもとに、「脅威・プラン・概念・駒の役割」を自然言語で説明する。公式は「人の抽象的な思考を模す独自の AI アルゴリズム」と説明し、CPU 負荷が高いのでサーバーでしか動かないとしている。2016 年頃からある製品で、LLM 以前の記号的な方式と見られるが、中身は非公開。 | 説明文は【確認済】 https://decodechess.com/about/ 、 https://decodechess.com/faq/ 。方式の中身は【未確認】 |
| **個人製の OSS**（MrArun005/chess-review-、2026-07） | 「FEN ＋ 指した手 ＋ エンジンの読み筋 → 事実抽出（真偽値と数値: 駒得の変化、フォーク、ピン、浮き駒、バックランクの弱さ…）→ JSON のルール DSL（優先度順、上位 1〜2 個が発火）→ テンプレート（FEN のハッシュで言い回しを選ぶ）」。README は「LLM を使わないので幻覚がない」と書く。2段階解析（浅い全体スキャン → 疑問手以上の手とその前後だけを depth 18 で再解析）。ライセンス表記なし（NOASSERTION）なので**コードは流用できない**。 | 【確認済（README）】 https://github.com/MrArun005/chess-review- 。※検索結果でこの方式を Chess.com のものとする要約が出たが、出典はこの個人リポジトリで、Chess.com の方式ではない |

### 3.2 研究（2023〜2026）
| 論文 | 要点 | 確度 |
|---|---|---|
| Kim ほか "Concept-guided Chess Commentary Generation and Evaluation"（CCC、arXiv 2410.20811、NAACL 2025） | Leela Chess Zero の内部表現から20の概念（駒得、ポーン構造、キングの安全、脅威など）のベクトルを線形 SVM で抽出し、手の前後の差で優先度を付けて LLM に渡す。「盤上のすべての攻撃関係」も渡す。人手評価の正確さは **CCC 0.60 / GPT-4o 単体 0.36 / 人間の参考解説 0.62**。GPT-4o 単体の誤りは「不正な手や存在しない駒に言及」0.46、「戦術的な有利の誤解」0.46、「長期的な有利の誤解」0.28。 | 【確認済】 https://arxiv.org/abs/2410.20811 |
| Hebbar ほか "Hallucinations on the Board: Tool-Augmented Evaluation of LLM Chess Commentary"（ACT-Eval、arXiv 2608.04240、2026-08） | 解説を「原子的な主張」に分け、15以上の決定的なツール（盤面の照会、利き・守り、手の実行、Stockfish 14.1 の評価）で真偽を検証する。ツールなしの誤り率: **GPT-5.4 22.0%、Claude Opus 4.7 20.8%、Gemini 3.1 Pro 10.8%、DeepSeek V4 Pro 36.7%、Qwen3-32B 44.1%、Qwen3-8B 55.5%**。GPT-5.4 はツールありで 22.0% → **9.2%**。誤りの種類は「盤面の読み違い（駒の位置・種類）」「不正な手順」「評価の誤り」「戦術の誤り」。オープンモデルは基本的な空間把握で、最上位モデルはツールなしの複数手の読みで間違える。 | 【確認済】 https://arxiv.org/html/2608.04240 |
| Cui, Ling, Ng "Communicating Chess Strategies in Natural Language"（arXiv 2607.11486、2026-07） | Stockfish 16 で部分的な戦略木（相手の上位 k≤3 手まで）を作り、JSON にして FEN と一緒に LLM（o3、gpt-oss-120b）に渡して説明させる。概念だけを渡すとほとんど改善せず、LLM が不正な取りを提案する例もある。人間には人間の書いた説明が、LLM には LLM の説明が役立つというずれがある。 | 【確認済】 https://arxiv.org/html/2607.11486v1 |
| "Grounded Chess Reasoning in Language Models via Master Distillation"（arXiv 2603.20510） | LLM は FEN の文字列をうまく認識できない（トークン化の問題）という先行研究に触れている。 | 【二次情報（検索の要約のみ）】 https://arxiv.org/pdf/2603.20510 |
| dynomight "OK, I can partly explain the LLM chess weirdness now"（2024-11） | 対話型 LLM は手順の把握が弱いが、手順全体を復唱させると改善する。 | 【二次情報】 https://dynomight.substack.com/p/more-chess |

### 3.3 共通して言えること（上記の出典から）
- LLM に FEN や手順だけを渡すと、**駒の位置・利き・合法手**を読み違える。最上位モデルでも、ツールなしでは主張の 1〜2 割が誤り（ACT-Eval）。
- 誤りを減らした手法はどれも、**盤面の事実を決定的なプログラムで作って渡す**（CCC の概念と攻撃関係、戦略木の JSON、ACT-Eval のツール）か、**LLM を使わずテンプレートで書く**（Lichess、個人製 OSS）。
- 生成後の検証にも同じ道具が使える（ACT-Eval: 主張を分解 → ツールで照合）。

---

## 4. 決定的な「事実抽出」の部品（TypeScript / Node）

### 4.1 ライブラリとライセンス【確認済: GitHub API・npm、2026-10-06】
| 候補 | 言語 | ライセンス | 使えること | 注意 |
|---|---|---|---|---|
| **chess.js 1.4.0**（導入済み） | TypeScript | **BSD-2-Clause** | 合法手の生成、`attackers(square, color)`（その升に利いている駒の一覧。ピンされた駒も含む）、`isAttacked(square, color)`、`setTurn(color)`（手番だけ変える。王手中は例外を投げる）、`inCheck` / `isCheckmate`、`findPiece`、`hash` | ピン・フォーク・串刺しなどの検出は**持っていない**。部品を組み合わせて自作する必要がある |
| chessops 0.15.1 | TypeScript | **GPL-3.0-or-later** | ビットボード、攻撃の計算、ピン（blockers）の計算、SAN/UCI | GPL。フロントにバンドルするとフロントも GPL になる。サーバー専用なら配布にあたらない（§4.4） |
| lichess-puzzler の tagger（`ornicar/lichess-puzzler/tagger/cook.py`） | **Python**（python-chess を使用） | **AGPL-3.0**（python-chess 自体は GPL-3.0） | パズル（強制手順）用のタグ判定。mate、smotheredMate、backRankMate、anastasiaMate、hookMate、arabianMate、dovetailMate、attraction、deflection、overloading、advancedPawn、doubleCheck、quietMove、defensiveMove、sacrifice、xRayAttack、**fork**、**hangingPiece**、trappedPiece、**discoveredAttack**、exposedKing、**skewer**、interference、intermezzo、**pin**、attackingF2F7、clearance、capturingDefender、各種エンドゲーム など | 入力は「解が一本道のパズル」。実戦の局面・読み筋にそのまま使える前提ではない。TS ではないので、使うなら移植か Python の別プロセスになる。コードを移植すれば AGPL がかかる |
| stockfish（npm、WASM） / Stockfish 本体 | C++ | GPL-3.0 | — | すでに別プロセスで使っている（D16） |
| MIT/BSD の JS 戦術検出ライブラリ | — | — | 定番と言えるものは**見つからなかった**（npm・GitHub を検索。見つかったのはスター 0〜2 の個人リポジトリのみ） | 【確認済（検索の範囲で）】 |

### 4.2 chess.js の上に作れる判定（手法の事実）
lichess-puzzler の cook.py の判定は、ほぼ「盤面の利き」と「手の前後の駒得」で書かれている。chess.js の部品で同じ考え方を表せる。

| 事実 | chess.js での作り方 |
|---|---|
| 浮き駒（hanging piece） | 自分の駒について `attackers(sq, 相手)` が空でなく、`attackers(sq, 自分)` が空。または最も安い攻め駒の価値 < その駒の価値 |
| フォーク | 指した駒の移動先から、自分の駒より価値が高い（または守られていない）相手の駒を2つ以上攻めている。移動先の升が安全か（取られても損しないか）も確認 |
| ピン / 串刺し / X 線 | 走り駒（B/R/Q）の直線上に相手の駒が2つ並ぶかを盤面を走査して判定（chess.js に直線の走査はないので自作）。前が安い駒ならピン、前が高い駒なら串刺し |
| ディスカバードアタック | 指した駒の移動で、後ろの走り駒の直線が開いて相手の駒（またはキング）に届くようになったか。手の前後で `attackers` を比べる |
| バックランク | キングが最下段にいて、前の3升を自分のポーンが塞いでいる、など。実際の詰みはエンジンの読み筋で確認する |
| 詰みの脅威 | 下記の null move 探索、またはエンジンのスコアが `mate N` になる |
| 読み筋（PV）に沿った駒得 | PV の手を chess.js で順に指し、各時点の駒の価値の合計（P=1, N=B=3, R=5, Q=9）の差を記録する。取り合いが終わった時点の差が「その変化で得する駒」 |

### 4.3 エンジンでの「脅威」と「反駁手順」
- **null move（手番を渡す）**: FEN の手番を入れ替え、アンパッサンの升を消して `position fen ...` で探索する。Stockfish の UCI に null move の命令はないので、FEN で表すしかない。王手がかかっている局面では使えない（chess.js の `setTurn` も例外を投げる）。浅めの探索（例 depth 12〜16、MultiPV 1）で、「相手が今すぐ指せたら何をするか」と評価の跳ね上がりが分かる。Lichess の Show threat と同じ考え方【二次情報（Lichess 側の実装は未確認）】。
- **反駁手順（なぜ悪手か）**: 指した後の局面の PV ＝ 相手の最善の応手の手順。D28 で「Played Move の Variation は次局面の PV を流用」しているので、すでにデータとしてある。より長い・より深い読み筋が要るのは Key Moment だけ。
- **Variation の分かれ目**: Played Move の PV と Candidate Move の PV を、同じ開始局面から手順ごとに比べると、最初に違う手と、その後の駒得・評価の差が出せる。

### 4.4 GPL / AGPL の影響
- **FSF の GPL FAQ**: 「パイプ、ソケット、コマンドライン引数」で通信する2つのプログラムは、通常は別々のプログラムと扱われる（"mere aggregation"）。Stockfish を子プロセスとして UCI で使う今の構成（D16）はこれに当たる、というのが一般的な理解【未確認: gnu.org への接続が今回失敗し、原文を取得できなかった】。
- **GPL**: 義務（ソースの提供）は「配布」したときに生じる。サーバーで動かすだけなら配布にあたらない。ただし、**ブラウザに送る JS（フロントのバンドル）は配布**なので、GPL のライブラリ（chessops、chessground など）をフロントに含めるとフロントも GPL になる。D35 で chessground を避けたのと同じ理由。
- **AGPL-3.0**（lichess-puzzler、lila）: GPL と違い、改変したプログラムをネットワーク越しに利用者に使わせると、その利用者にソースを提供する義務が生じる。サーバーだけで使っても、組み込んだプログラム（このリポジトリのサーバー側）は AGPL で提供する必要がある。リポジトリは公開済み（D23）だが、プロジェクト全体または一部のライセンスを AGPL にする必要が出る。
- **アルゴリズムの考え方**（「フォーク = 1つの駒が2つ以上の価値ある駒を攻める」など）は著作権の対象ではなく、コードを写さずに自分で書けば元のライセンスはかからない、というのが一般的な理解【未確認: 法的な助言ではない】。
- このリポジトリには現在 LICENSE ファイルがなく、package.json にも `license` の項目がない【確認済（2026-10-06）】。

---

## 5. エンジンの追加コスト（Key Moment だけ深く読み直す）

### 5.1 実測【確認済（このリポジトリの Docker イメージで実測、2026-10-06）】
条件: `chess-analyzer-worker` イメージ（Debian bookworm の Stockfish 15.1、aarch64）、`docker run --cpus=1`、Threads=1、Hash=128MB、中盤〜終盤の6局面、局面ごとにエンジンを起動し直す（ハッシュは毎回空）。ホストは開発用の Mac。1局面目は1手詰め（Qxf7#）の局面なので、平均から除いた値も示す。

| 設定 | 平均（1手詰めを除く） | depth 18・MultiPV 3 との比 |
|---|---|---|
| depth 18・MultiPV 3（現行） | **2.5 秒** | 1.0 |
| depth 20・MultiPV 3 | 4.3 秒 | 1.7 倍 |
| depth 22・MultiPV 3 | **8.3 秒** | 3.3 倍 |
| depth 24・MultiPV 3 | **13.7 秒** | 5.5 倍 |
| depth 18・MultiPV 1 | 1.1 秒 | 0.4 倍 |
| depth 22・MultiPV 1 | 3.2 秒 | 1.3 倍 |
| depth 24・MultiPV 1 | 4.4 秒 | 1.75 倍 |

- 局面によるばらつきが大きい（depth 24・MultiPV 3 で 5.8〜19.1 秒）。サンプルは6局面だけ。
- 実際の解析では前の局面のハッシュが残るので、上の値より速くなりうる。
- Fly の performance-1x（AMD EPYC と見られる【未確認】）と Mac の1コアでは絶対値が違う。**比率の目安として使う**。
- 副次的な発見: 不正な FEN（手番でない側のキングに王手がかかっている局面）を渡すと、Stockfish 15.1 は `bestmove` を返さず止まった。D36 の FEN 検証（chess.js）はこれを防ぐ。

### 5.2 1局あたりの追加時間と費用【試算】
- 現行の全手解析: 80 ply（40手）× 2.5 秒 ≈ **200 秒**（D48 の初期値「1局面2秒」とほぼ同じ）。
- Key Moment 5か所を depth 24・MultiPV 3 で読み直す: 5 × 13.7 ≈ **70 秒**（全手解析の約 35%増）。depth 22 なら 5 × 8.3 ≈ 42 秒（約 20%増）。3か所なら、それぞれ 41 秒・25 秒。
- 脅威を調べる null move 探索（depth 18・MultiPV 1 で 1 回約 1 秒）を Key Moment ごとに 1〜2 回足しても、1局あたり数秒〜10 秒程度。
- 費用: Fly の performance-1x は **$33.00/月**（基準リージョン、料金ページの一覧より【確認済】 https://docs.fly.io/about/pricing ）≒ $0.046/時。東京（nrt）は約 1.31 倍とされる【未確認: 要約ツール経由の値】≒ $0.06/時。→ 70 秒の追加は **1局あたり約 $0.0012**、1,000 局で約 $1.2。LLM の費用（§1.2）より 1 桁小さい。
- 待ち時間: D48 の「あと約◯分」の見積もりに、Key Moment の読み直しの時間を足す必要がある。

---

## 付録: 出典一覧
- Claude 料金: https://platform.claude.com/docs/en/about-claude/pricing
- Chess.com Game Review v2（2023-03-17）: https://www.chess.com/news/view/chesscom-launches-game-review-v2
- Chess.com ヘルプ: https://support.chess.com/en/articles/8584089-how-does-game-review-work
- DecodeChess: https://decodechess.com/about/ 、 https://decodechess.com/faq/
- Lichess Advice.scala: https://github.com/lichess-org/lila/blob/master/modules/tree/src/main/Advice.scala
- lichess-puzzler（AGPL-3.0、Python）: https://github.com/ornicar/lichess-puzzler/tree/master/tagger
- chess.js（BSD-2-Clause）: https://github.com/jhlywa/chess.js
- chessops（GPL-3.0-or-later）: https://github.com/niklasf/chessops
- 個人製 OSS（事実抽出＋テンプレート）: https://github.com/MrArun005/chess-review-
- CCC（NAACL 2025）: https://arxiv.org/abs/2410.20811
- ACT-Eval（2026-08）: https://arxiv.org/html/2608.04240
- 戦略の自然言語化（2026-07）: https://arxiv.org/html/2607.11486v1
- Master Distillation: https://arxiv.org/pdf/2603.20510
- dynomight（2024-11）: https://dynomight.substack.com/p/more-chess
- Show threat の解説: https://zwischenzug.substack.com/p/how-to-talk-to-engines
- AdSense RPM: https://ym-life.com/adsense-rpm/ 、 https://saba.j-shimbun.com/article/adsenserpm.html 、 https://nobutoblog.com/page-rpm/
- Fly.io 料金: https://docs.fly.io/about/pricing
