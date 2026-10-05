# Chess Analyzer

プレイヤーが指した Game を取り込み、指し手ごとに「他の手を指していたら局面がどうなったか」を示す Game Review ツール。

## Language

### 対局と取り込み

**Game**:
1局分の対局記録（指し手の列と、対局者・結果などのメタ情報）。
_Avoid_: 棋譜データ, match, record

**Game Source**:
Game が指された場所。Duolingo、Lichess、Chess.com、対面（OTB）など。取り込み方とは無関係。
_Avoid_: provider, platform, integration, 取り込み元

**Termination**:
Game の終わり方。投了、時間切れ、合意、その他のいずれか。盤上で判定できる終局（詰みなど）とは別に、入力や PGN から得る。
_Avoid_: end reason, 終局理由

**Import Method**:
Game をこのツールに取り込んだ手段。手入力、PGN、API 取得、画面取り込みなど。
_Avoid_: source, upload

### 振り返り

**Game Review**:
1つの Game について、指し手ごとに Candidate Move とその Variation を並べて見せる振り返り。
_Avoid_: 実績分析, insights, 解析

**Candidate Move**:
ある局面で有力とされる手の1つ。1局面につき上位数手を示す。
_Avoid_: best move（最善手は Candidate Move のうち最上位のもの）, 候補

**Played Move**:
Game の中で実際に指された手。Candidate Move と比べられる。
_Avoid_: actual move, 実戦手

**Variation**:
ある Candidate Move から続く想定手順と、その結果の局面。
_Avoid_: line, 変化手順, PV

**Analysis**:
1つの Game に対するエンジン解析の1回分。使ったエンジンとその設定を伴う。1つの Game は最新の Analysis を1つ持つ。
_Avoid_: 解析結果, review（Game Review は Visitor に見せる振り返り全体を指す）

**Position Evaluation**:
Analysis の中の、1局面についての Candidate Move とその評価。
_Avoid_: eval, ply data

**Book Move**:
定跡の手順と一致し、かつ勝率をほとんど落とさなかった Played Move。Move Classification の対象外で、オープニング名を伴う。
_Avoid_: 定跡手, opening move

**Opening**:
定跡データベースから引いた、その時点の局面のオープニング名。
_Avoid_: 戦型, ECO（ECO は Opening に付く分類コード）

**Eval Level**:
Player から見た評価の5段階。優勢、やや優勢、互角、やや劣勢、劣勢。言葉と色で示す。
_Avoid_: eval（Position Evaluation と紛らわしい）, 形勢判断

**Move Classification**:
指された手の、勝率の落ち幅に基づく評価区分。Inaccuracy（疑問手）、Mistake（悪手）、Blunder（大悪手）の3段階。
_Avoid_: grade, 評価ラベル

**Inaccuracy**:
勝率を小さく落とした手。表示名は「疑問手」。
_Avoid_: 惜しい手, ミス

**Mistake**:
勝率を大きく落とした手。表示名は「悪手」。
_Avoid_: error, ミス

**Blunder**:
勝率を決定的に落とした手。表示名は「大悪手」。
_Avoid_: 大ミス, ポカ

### 人

**Player**:
Game Review の対象となる側（白または黒）を指した人。Game ごとの属性で、Game をまたいで同一人物かどうかは追跡しない。
_Avoid_: user, account, me

**Player Color**:
その Game で Player が持っていた側（白または黒）。表示名は「あなたの色」。
_Avoid_: side, 手番（手番は「次に指す側」の意味で使う）, 先手/後手

**Opponent Type**:
Opponent の種別。Oscar（Duolingo の AI）、人、不明のいずれか。
_Avoid_: bot flag, CPU

**Opponent**:
Game で Player の相手側を指した人または AI（Duolingo の Oscar を含む）。
_Avoid_: enemy, bot, CPU

**Visitor**:
サイトを閲覧している人。ログインは無く、Player 本人とは限らない。
_Avoid_: user, member

### 所有と共有

**Share URL**:
Game Review を閲覧するための、推測されにくい URL。知っていれば誰でも見られる。
_Avoid_: permalink, 公開 URL

**Edit Token**:
Game を作った Visitor だけが持つ秘密の値。Game の削除と Player Color の修正に使う。
_Avoid_: password, key

**Manage Link**:
Edit Token を URL のフラグメントに含んだリンク。別のブラウザで管理の権限を取り戻すのに使う。
_Avoid_: admin URL, 編集リンク

**My Games**:
Visitor のブラウザにだけ保存される、自分が取り込んだ Game と Edit Token の一覧。
_Avoid_: history, マイページ
