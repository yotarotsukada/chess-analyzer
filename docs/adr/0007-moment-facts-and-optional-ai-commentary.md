---
status: accepted
---

# Key Moment は Moment Facts として保存し、AI Commentary は任意の後段にする

Key Moment の中身は、アルゴリズムで確かめた事実（Moment Facts）として、構造化した JSON で保存する。カードの文章は、表示するときに i18n のテンプレートで組み立てる。LLM が書く AI Commentary は、Moment Facts を入力にする任意の後段とし、別の場所に保存する。

この形にしたのは、AI Commentary が入らなくても機能として完結させるためだ（D65）。採算と品質が見極められるまで、AI の実装は遅らせる（D64）。テンプレートで作る文章なら、英語に対応するときも Moment Facts を作り直さずに済む（D21）。LLM に盤面を読ませると、最上位のモデルでも主張の1〜2割が誤る。確かめた事実やツールを与えると正確さは上がるが、誤りはなくならない（docs/research/explanations.md）。Moment Facts は、AI Commentary の入力にも、出力の検証にも使える。

## Consequences

- カードの文章は、Moment Facts にある事実だけを言葉にし、解釈を足さない。事実どうしが食い違うとき（駒損だが形勢は良い、など）は、その事実を言葉にしない。AI Commentary を差し込むときも、この原則を引き継ぐ。
- 処理は「解析（Analysis）→ Key Moment の選択と深い読み直し（Moment Facts）→（任意）AI Commentary」の順に、別々のジョブとして進む（キューの構成は問わない）。Game Review は前の段が終われば見られ、後の段が失敗しても見られる。
- Move Classification、Key Moment の選択、評価の数値は Analysis を正とする。深い読み直しは、手順を伸ばして駒の得失を確かめるためだけに使う。カードと Game Review が食い違わないようにするため。
- Moment Facts には factsVersion を付ける。生成ロジックやしきい値を変えたら上げ、古いものは表示せずに作り直す。
- AI Commentary には、元にした factsVersion、モデル、プロンプトのバージョンを付ける。
- AI Commentary の生成を依頼できる人の判定（当面は会員だけにする予定）は、Game Review と Moment Facts の外に置く。Key Moment の選択と Moment Facts の生成は、会員かどうかに関係なく、すべての Game で行う。Moment Facts と AI Commentary のどちらにも、会員の情報を持たせない。会員の仕組みは AI を実装するときに導入し、そのときに ADR 0005 を改める ADR を書く。それまでは、会員を前提にしたテーブルや分岐を作らない。
- 生成済みの AI Commentary は、Share URL の閲覧者にも見せる。費用は生成の1回だけで、閲覧には費用がかからないからだ。
