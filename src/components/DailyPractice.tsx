'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── TTS ──────────────────────────────────────────────────────────
function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.82;
  window.speechSynthesis.speak(utt);
}

// ─── Types ────────────────────────────────────────────────────────
interface Item {
  phrase: string;   // English phrase
  meaning: string;  // Correct Japanese meaning
  tip: string;      // 使い方・ニュアンスの解説
  w: [string, string];  // Wrong Japanese meanings
}

// ─── Shuffle ──────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LS_MEMO_PHRASES = 'phrase-memorized-v1';

// ─── Dataset (100 ネイティブ日常フレーズ) ─────────────────────────
const DATA: Item[] = [
  // ══ 挨拶・リアクション ══
  {
    phrase: "Sounds good.",
    meaning: "いいね・了解",
    tip: "提案への同意の定番フレーズ。リンキングで「サウンズグッ(d)」のように語尾の d が弱まります。\"Sounds great!\" と言うとより強い賛同になります。",
    w: ["よくないね", "わかりません"],
  },
  {
    phrase: "Not bad.",
    meaning: "まあまあだよ・悪くないよ",
    tip: "直訳は「悪くない」ですが、控えめな好評価として使います。\"Pretty good.\" より少し落ち着いたニュアンス。",
    w: ["最悪でした", "とても良かった"],
  },
  {
    phrase: "My bad.",
    meaning: "私のミスです・ごめん",
    tip: "軽いミスをカジュアルに認める表現。フォーマルな場には不向きなので、親しい間柄や友人同士で使います。",
    w: ["あなたのせいです", "問題ありません"],
  },
  {
    phrase: "Same here.",
    meaning: "私も同じです",
    tip: "\"Me too.\" と同じ意味ですが、より会話らしい自然な言い方。相手の言ったことが自分にも当てはまる時にサッと使えます。",
    w: ["私はちょっと違います", "全然違います"],
  },
  {
    phrase: "Fair enough.",
    meaning: "まあそうだね・一理ある",
    tip: "完全には同意しないが、相手の言い分を認める表現。\"I see your point.\" と似たニュアンスで、議論を丸く収める時に便利です。",
    w: ["絶対嫌です", "それは不公平です"],
  },
  {
    phrase: "I hear you.",
    meaning: "わかるよ・気持ちはわかる",
    tip: "完全同意でなくても相手の言い分を受け止める共感表現。\"I understand.\" より感情的なつながりを感じさせます。",
    w: ["聞こえません", "反対します"],
  },
  {
    phrase: "There you go.",
    meaning: "ほらね・そうそう・どうぞ",
    tip: "相手が正しいことをした時、予想通りの展開の時、または何かを手渡す時に使います。状況によって意味が変わる多用途フレーズ。",
    w: ["そこへ行って", "もう一度やって"],
  },
  {
    phrase: "No way!",
    meaning: "まさか！・嘘でしょ！",
    tip: "強い驚きや否定を示す感嘆表現。語尾上げ＝驚き、語尾下げ＝否定のニュアンスになります。",
    w: ["通れません", "もちろんです"],
  },
  {
    phrase: "Tell me about it.",
    meaning: "まったくそうだよ！・よくわかる",
    tip: "「詳しく教えて」ではなく「よーくわかるよ！」という強い共感表現。愚痴や不満への共感として使います。",
    w: ["話してください", "それは知りません"],
  },
  {
    phrase: "Long time no see.",
    meaning: "久しぶり！",
    tip: "長い間会っていなかった人への定番挨拶。文法的には不自然ですが慣用句として定着しています。",
    w: ["はじめまして", "またすぐ会いましょう"],
  },
  // ══ 同意・賛成 ══
  {
    phrase: "Sounds good to me.",
    meaning: "私はそれでいいよ",
    tip: "\"Sounds good.\" に \"to me\" を加えることで「私は」という個人的な同意のニュアンスが加わります。",
    w: ["ちょっと心配です", "考えさせてください"],
  },
  {
    phrase: "That works.",
    meaning: "それで大丈夫・それでいきましょう",
    tip: "スケジュールや条件が「合う・機能する」時に使います。\"That works for me.\" と言うとより個人的な表現になります。",
    w: ["それは壊れています", "うまくいきません"],
  },
  {
    phrase: "Makes sense.",
    meaning: "納得・理にかなっている",
    tip: "説明を聞いて「なるほど」と思った時の自然な反応。\"That makes sense.\" を短くしたカジュアル形です。",
    w: ["意味がわかりません", "やり直してください"],
  },
  {
    phrase: "Exactly.",
    meaning: "まさに・その通り",
    tip: "相手の言ったことに100%同意する時の力強い表現。\"Yes.\" より断然気持ちが伝わります。",
    w: ["全然違います", "ほとんどそうです"],
  },
  {
    phrase: "Sure thing.",
    meaning: "もちろん・いいですよ",
    tip: "依頼や提案に気軽に応じる口語表現。\"Sure.\" よりフレンドリーで快諾しているニュアンスが強くなります。",
    w: ["絶対ダメです", "考えておきます"],
  },
  {
    phrase: "Why not?",
    meaning: "いいじゃない・やろうよ",
    tip: "断る理由が特にない時の軽い同意。誘いに乗る時の「いいよ、なんで断るの？」というノリのいい返事です。",
    w: ["絶対やりません", "理由を教えて"],
  },
  {
    phrase: "Absolutely.",
    meaning: "まさに・絶対に・もちろん",
    tip: "質問や提案への強力な肯定。\"Yes\" より断然テンションが上がって聞こえ、確信を持っているニュアンスを出せます。",
    w: ["絶対違います", "それは無理です"],
  },
  {
    phrase: "I'm down.",
    meaning: "乗った！・やる気あるよ",
    tip: "誘いに応じる口語表現。若者言葉から広まり今は幅広い世代が使います。\"I'm in.\" と同じ意味です。",
    w: ["気分が悪いです", "断ります"],
  },
  {
    phrase: "Count me in.",
    meaning: "私も混ぜて・参加します",
    tip: "誰かのプランに自分を入れてほしいとアピールする表現。逆に \"Count me out.\" で「私は遠慮する」になります。",
    w: ["数えないで", "参加しません"],
  },
  {
    phrase: "You got it.",
    meaning: "了解・任せて",
    tip: "依頼に積極的に応じる返事。\"Sure!\" よりやる気が伝わり、「ちゃんとやるよ」という安心感を与えます。",
    w: ["それは難しいです", "もう持っています"],
  },
  // ══ 気持ち・状態 ══
  {
    phrase: "I'm beat.",
    meaning: "へとへとです・もうクタクタ",
    tip: "\"I'm tired.\" より強い疲労感を表します。長い仕事や運動の後に使うと気持ちがよく伝わります。",
    w: ["元気いっぱいです", "怒っています"],
  },
  {
    phrase: "I'm stuffed.",
    meaning: "お腹いっぱいです",
    tip: "食事後のカジュアル表現。\"I'm full.\" より「もう限界、詰め込まれた」というニュアンスが強くなります。",
    w: ["お腹が空きました", "気持ち悪いです"],
  },
  {
    phrase: "I'm lost.",
    meaning: "迷子です・わからなくなった",
    tip: "道に迷った時だけでなく、話についていけない時にも使います。\"I'm confused.\" よりカジュアルな表現。",
    w: ["見つかりました", "全部わかりました"],
  },
  {
    phrase: "I'm over it.",
    meaning: "もう気にしてない・吹っ切れた",
    tip: "過去の出来事や感情を引きずっていないことを示します。\"I've moved on.\" と似た意味。",
    w: ["まだ怒っています", "もう一度やります"],
  },
  {
    phrase: "I could use a break.",
    meaning: "少し休みたいな",
    tip: "\"could use\" は「〜があるといいな」という遠回しな柔らかい表現。直接的に言わずに休憩を提案するのに使えます。",
    w: ["全然疲れていません", "休んではいけません"],
  },
  {
    phrase: "I'm on it.",
    meaning: "やっています・取り掛かっています",
    tip: "指示を受けてすぐに動くことを示す返答。\"I'm working on it.\" より短くてテンポよく聞こえます。",
    w: ["その上にいます", "まだ始めていません"],
  },
  {
    phrase: "I'm not sure.",
    meaning: "わかりません・確信が持てません",
    tip: "\"I don't know.\" より柔らかく、考え中・調べる余地を残す表現。不確かさを正直に伝えられます。",
    w: ["確かめました", "絶対にそうです"],
  },
  {
    phrase: "I'm all ears.",
    meaning: "全部聞いてますよ・話して",
    tip: "相手の話を集中して聞く準備ができているという表現。「耳を全部使って聞く」というユーモアのあるイメージです。",
    w: ["耳が聞こえません", "話さないでください"],
  },
  {
    phrase: "I'm in.",
    meaning: "参加します・やります",
    tip: "誘いや提案に乗る時の短くてノリのいい返事。\"Count me in.\" を一言で言った形です。",
    w: ["参加しません", "考え中です"],
  },
  {
    phrase: "I'm out.",
    meaning: "パスします・抜けます",
    tip: "\"I'm in.\" の逆。その場を去る時や提案を断る時の表現。\"I'll pass.\" よりカジュアルです。",
    w: ["参加します", "まだここにいます"],
  },
  // ══ 依頼・提案 ══
  {
    phrase: "Let me know.",
    meaning: "教えてください・連絡して",
    tip: "情報が入ったら知らせてほしいという柔らかな依頼。\"Please tell me.\" より自然でネイティブらしい表現です。",
    w: ["放っておいて", "自分で決めます"],
  },
  {
    phrase: "Go ahead.",
    meaning: "どうぞ・先に行って",
    tip: "相手に「許可を与える」または「先に行っていい」と伝える表現。電話や会議でも「どうぞ話してください」の意味でも使います。",
    w: ["止まってください", "後でいいですよ"],
  },
  {
    phrase: "Take your time.",
    meaning: "ゆっくりでいいですよ",
    tip: "プレッシャーをかけずに待てることを示す思いやりの表現。焦っている相手を落ち着かせる効果があります。",
    w: ["急いでください", "時間がないです"],
  },
  {
    phrase: "Bear with me.",
    meaning: "もう少し待ってください",
    tip: "時間がかかることを謝りつつお願いする表現。プレゼン中や説明中に「もう少しで要点に入ります」と伝える時に使えます。",
    w: ["私について来て", "今すぐやめて"],
  },
  {
    phrase: "Leave it to me.",
    meaning: "私に任せて",
    tip: "責任を持って引き受けることを宣言するフレーズ。自信を持って相手を安心させたい時に使います。",
    w: ["私は関係ありません", "あなたがやって"],
  },
  {
    phrase: "Help yourself.",
    meaning: "ご自由にどうぞ",
    tip: "食べ物や物を自由に使っていいと伝える言葉。「遠慮しないで自分でやって」というニュアンスです。",
    w: ["手伝ってください", "触らないでください"],
  },
  {
    phrase: "Bear in mind.",
    meaning: "念頭においてください・覚えておいて",
    tip: "忘れないよう注意を促す表現。\"Keep in mind.\" と同じ意味で、重要なことを記憶するよう促します。",
    w: ["すぐ忘れていいですよ", "心配しないで"],
  },
  {
    phrase: "Let me check on that.",
    meaning: "確認してみます",
    tip: "答えがわからない時に「確認してから答える」と伝える丁寧な表現。即答できない場面で信頼感を保てます。",
    w: ["知っています", "あなたが確認して"],
  },
  {
    phrase: "Can you hold on?",
    meaning: "少し待ってもらえますか？",
    tip: "電話や会話で「ちょっと待って」と伝える表現。電話では文字通り「保留にしていいですか？」の意味でもあります。",
    w: ["続けてください", "手を放してください"],
  },
  {
    phrase: "I'll look into it.",
    meaning: "調べてみます",
    tip: "ある件について調査・確認することを申し出る表現。\"I'll check.\" より丁寧で、積極的に取り組む姿勢が伝わります。",
    w: ["見ています", "無視します"],
  },
  {
    phrase: "Feel free to ask.",
    meaning: "遠慮なく聞いてください",
    tip: "\"Feel free to ~\" は「遠慮なく〜してください」という汎用表現。\"Feel free to join us.\" などにも使えます。",
    w: ["必ず聞いてください", "聞かないでください"],
  },
  // ══ 確認・理解 ══
  {
    phrase: "Make sense?",
    meaning: "意味わかりますか？",
    tip: "説明した後に相手の理解を確認する定番の一言。\"Does that make sense?\" を縮めたカジュアル形です。",
    w: ["もう一度言って", "気にしないで"],
  },
  {
    phrase: "Got it.",
    meaning: "わかった・了解",
    tip: "指示や説明を理解したと短く伝える返事。\"I got it.\" を縮めた形で、テンポよく会話を進められます。",
    w: ["まだわかりません", "取ってきました"],
  },
  {
    phrase: "You know what I mean?",
    meaning: "言いたいこと、わかる？",
    tip: "うまく言葉にできない時に、相手に理解を確認するフレーズ。口語では \"You know what I mean?\" と素早く言います。",
    w: ["私の名前知ってる？", "あなたは何が好き？"],
  },
  {
    phrase: "I get it.",
    meaning: "わかりました・理解しました",
    tip: "\"Got it.\" と同じ意味ですが、少し強調した感じ。\"I get it now.\" と言うと「ようやくわかった」になります。",
    w: ["取ってきます", "全然わかりません"],
  },
  {
    phrase: "Come again?",
    meaning: "もう一度言ってもらえますか？",
    tip: "聞き取れなかった時の丁寧な聞き返し表現。\"What?\" より礼儀正しく、ネイティブが自然に使うフレーズです。",
    w: ["また来てください", "もう帰りますか？"],
  },
  {
    phrase: "What do you mean?",
    meaning: "どういう意味ですか？",
    tip: "相手の言葉が理解できなかった時の自然な返し。\"What?\" より丁寧で、説明を求めていることが明確に伝わります。",
    w: ["何を食べたいですか？", "どこへ行きますか？"],
  },
  {
    phrase: "Are you with me?",
    meaning: "ついてきてますか？・わかってる？",
    tip: "説明が相手に伝わっているか確認する表現。プレゼンや授業で使うと、聴衆の理解度を確認できます。",
    w: ["一緒に来てください", "あなたのそばにいます"],
  },
  {
    phrase: "Just to clarify,",
    meaning: "念のため確認ですが〜",
    tip: "誤解を防ぐために確認・明確化をする時の前置き表現。\"I just want to make sure...\" と同じ意味で使えます。",
    w: ["もっとはっきり言って", "それで終わりです"],
  },
  {
    phrase: "Let me get this straight.",
    meaning: "ちょっと整理させてください",
    tip: "情報を確認・整理する時の表現。複雑な情報を受け取った後に「つまり〜ということですよね？」と確認する前置きに使います。",
    w: ["まっすぐ歩いて", "これを持っていきます"],
  },
  {
    phrase: "Follow me?",
    meaning: "理解できてますか？",
    tip: "説明しながら相手がついてきているか確認する表現。\"Are you following me?\" を短くした形です。",
    w: ["私についてきて", "どこへ行くの？"],
  },
  // ══ 断り・受け入れ ══
  {
    phrase: "Never mind.",
    meaning: "気にしないで・やっぱりいい",
    tip: "一度言ったことを取り消す時や、プレッシャーをかけたくない時に使います。軽い諦めや、相手への配慮を示します。",
    w: ["絶対覚えておいて", "もう一度やって"],
  },
  {
    phrase: "It's not a big deal.",
    meaning: "大したことじゃないよ",
    tip: "問題を小さく見せる時や相手を安心させる時に使います。逆に皮肉として「大したことだ」の意味でも使われることがあります。",
    w: ["これは大問題です", "すぐ直してください"],
  },
  {
    phrase: "I'll pass.",
    meaning: "パスします・遠慮します",
    tip: "参加や提案を穏やかに断る定番フレーズ。\"No, thank you.\" より口語的でカジュアルな断り方です。",
    w: ["喜んで参加します", "全部もらいます"],
  },
  {
    phrase: "That's too bad.",
    meaning: "それは残念ですね",
    tip: "相手の悪いニュースに共感を示す自然な返し。\"I'm sorry to hear that.\" より軽めですが、同じ共感を伝えます。",
    w: ["それは最高ですね", "あなたのせいです"],
  },
  {
    phrase: "It is what it is.",
    meaning: "そういうもんだよ・しょうがない",
    tip: "どうにもならない状況を受け入れる達観した表現。日本語の「まあ、しょうがないよね」に近いニュアンスです。",
    w: ["もっと頑張ればいい", "絶対変えられる"],
  },
  {
    phrase: "I'd rather not.",
    meaning: "できればやりたくないです",
    tip: "断る際の柔らかい表現。\"No\" より丁寧で間接的なため、相手の感情を傷つけにくい言い方です。",
    w: ["むしろやりたいです", "もっとやって"],
  },
  {
    phrase: "I'm afraid not.",
    meaning: "残念ながらそれはできません",
    tip: "断る時や否定的な返答をする時の丁寧な表現。\"No\" とは言わずに断れる、ビジネスでも使える表現です。",
    w: ["怖くはありません", "もちろんできます"],
  },
  {
    phrase: "Thanks anyway.",
    meaning: "とにかくありがとう",
    tip: "断った後でもお礼を言う礼儀正しい表現。相手が助けようとしてくれたことへの感謝を示します。",
    w: ["どうもありがとう", "もっとやってほしいです"],
  },
  {
    phrase: "No hard feelings.",
    meaning: "悪く思わないでね・わだかまりなしで",
    tip: "関係を良く保ちたい時に使う大人なフレーズ。断った後や意見が対立した後に使うと、関係修復に役立ちます。",
    w: ["とても怒っています", "気持ちが固いです"],
  },
  {
    phrase: "If you insist.",
    meaning: "そこまで言うなら・しょうがないね",
    tip: "相手が強く勧める時に、渋々受け入れる表現。少しユーモラスな雰囲気で使われることも多いです。",
    w: ["絶対断ります", "あなたが正しいです"],
  },
  // ══ 職場・日常行動 ══
  {
    phrase: "I'll get back to you.",
    meaning: "後で連絡します",
    tip: "今すぐ答えられない時に使う定番フレーズ。ビジネスでも日常でも必須の表現です。",
    w: ["もう連絡しません", "すぐ答えます"],
  },
  {
    phrase: "Let me think about it.",
    meaning: "少し考えさせてください",
    tip: "即答せずに検討時間をもらう表現。\"I'll consider it.\" より会話的で柔らかい言い方です。",
    w: ["考えたくありません", "すぐ決めます"],
  },
  {
    phrase: "I'll get it.",
    meaning: "私がやります・私が出ます",
    tip: "電話やドアのベルが鳴った時に「私が出る」と申し出る表現。誰かが動く前に「取るよ」と言う時にも使います。",
    w: ["私はできません", "後でやります"],
  },
  {
    phrase: "Let's figure it out.",
    meaning: "一緒に考えよう・どうにかしよう",
    tip: "問題解決に前向きに取り組む姿勢を示します。\"Let's solve this together.\" より口語的な言い方です。",
    w: ["もう諦めよう", "誰かに任せよう"],
  },
  {
    phrase: "Hang in there.",
    meaning: "頑張って・くじけないで",
    tip: "苦しんでいる相手を励ます温かい言葉。\"Keep going.\" より感情的なサポートのニュアンスが強いです。",
    w: ["やめていいよ", "ぶら下がって"],
  },
  {
    phrase: "Hold on.",
    meaning: "少し待って",
    tip: "何かを止めてもらう時の短い一言。電話での「少々お待ちください」にも使います。\"Hold on a sec.\" とも言います。",
    w: ["放してください", "続けてください"],
  },
  {
    phrase: "Be right back.",
    meaning: "すぐ戻ります",
    tip: "席を外す時に伝える短い一言。チャットでは \"BRB\" と略されます。\"I'll be right back.\" の短縮形です。",
    w: ["永遠に戻りません", "後で戻ります"],
  },
  {
    phrase: "My plate is full.",
    meaning: "手一杯です",
    tip: "仕事が多すぎて余裕がない状態を「皿がいっぱい」に例えた表現。丁寧に断る時にも使えます。",
    w: ["お皿が汚れています", "もっとください"],
  },
  {
    phrase: "Get the ball rolling.",
    meaning: "物事を始める・取り掛かろう",
    tip: "ボールを転がし始めるイメージから、物事をスタートさせること。会議やプロジェクト開始時によく使われます。",
    w: ["ボールを止める", "ゆっくり進める"],
  },
  {
    phrase: "You're all set.",
    meaning: "準備万端ですよ・大丈夫ですよ",
    tip: "相手が必要なものを全て揃えた時に伝える安心の一言。ホテルのチェックインやカフェでもよく聞きます。",
    w: ["まだ準備できていません", "全部やり直して"],
  },
  {
    phrase: "I'll take care of it.",
    meaning: "私が対処します・任せてください",
    tip: "問題や仕事を自分が解決すると申し出る表現。\"Leave it to me.\" と同じ意味で責任感が伝わります。",
    w: ["私には無理です", "誰かに頼んでください"],
  },
  {
    phrase: "Wrap it up.",
    meaning: "まとめましょう・終わりにしよう",
    tip: "会議や作業を締めくくる時に使います。少し急かす感じもあるので、トーンに注意して使いましょう。",
    w: ["もっと続けましょう", "包んでください"],
  },
  {
    phrase: "That's a good point.",
    meaning: "良い指摘ですね",
    tip: "相手の意見を評価して議論を前向きに進める表現。批判的な議論でも相手を立てながら進められます。",
    w: ["鉛筆がいいですね", "その点は間違っています"],
  },
  {
    phrase: "Touch base later.",
    meaning: "後で連絡しましょう",
    tip: "後で確認や連絡を取り合うことを軽く約束する表現。\"Let's touch base after the meeting.\" などと使います。",
    w: ["もう連絡しません", "今すぐ話しましょう"],
  },
  {
    phrase: "Keep it up!",
    meaning: "その調子で続けて！",
    tip: "相手が良い仕事をしている時に褒めながら励ます言葉。\"Keep up the good work!\" と言うとより具体的になります。",
    w: ["もうやめて", "元に戻して"],
  },
  {
    phrase: "Let's get to it.",
    meaning: "さっそく取り掛かろう",
    tip: "話より行動を促すやる気のある表現。会議が長引いた後や、計画が決まった後によく使われます。",
    w: ["もう少し待ちましょう", "やめましょう"],
  },
  {
    phrase: "On it.",
    meaning: "取り掛かっています・了解",
    tip: "指示を受けてすぐに動くことを示す簡潔な返答。\"I'm on it.\" の省略形でテンポよく聞こえます。",
    w: ["その上にいます", "まだ始めていません"],
  },
  {
    phrase: "It's up to you.",
    meaning: "あなた次第です",
    tip: "判断や決断を相手に委ねる表現。\"You decide.\" より柔らかく、相手を尊重している印象を与えます。",
    w: ["私が決めます", "どちらでもいけません"],
  },
  {
    phrase: "I owe you one.",
    meaning: "一つ借りができたね・ありがとう",
    tip: "助けてもらった時に「今度お礼するね」というニュアンスで使います。友人間での感謝の気持ちを伝えます。",
    w: ["あなたに貸します", "お金を返して"],
  },
  // ══ 感謝・関係・その他 ══
  {
    phrase: "I appreciate it.",
    meaning: "ありがとうございます（感謝しています）",
    tip: "\"Thank you\" より丁寧で心のこもった感謝表現。ビジネスシーンでも使えるフォーマルな表現です。",
    w: ["全然嬉しくないです", "必要ありません"],
  },
  {
    phrase: "My pleasure.",
    meaning: "こちらこそ・喜んで",
    tip: "\"Thank you\" への返答として \"You're welcome\" より温かみがあります。「あなたのためにできて光栄です」というニュアンス。",
    w: ["私の苦しみです", "大変でした"],
  },
  {
    phrase: "Go for it.",
    meaning: "やってみて！・行け！",
    tip: "相手の背中を押す時のシンプルな励まし。\"Just do it.\" より優しく応援しているニュアンスがあります。",
    w: ["やめておいて", "気をつけて"],
  },
  {
    phrase: "I'm on my way.",
    meaning: "今向かっています",
    tip: "到着が近いことを相手に伝えるフレーズ。「今出発するよ」より具体的に「もう動いてるよ」というニュアンスがあります。",
    w: ["もう到着しました", "少し遅れます"],
  },
  {
    phrase: "Keep me posted.",
    meaning: "随時教えてください・報告し続けて",
    tip: "何かが進展したら知らせてほしいという依頼。プロジェクトの進捗や状況変化を定期的に共有してほしい時に使います。",
    w: ["黙ってて", "もう連絡しないで"],
  },
  {
    phrase: "I'll let you know.",
    meaning: "後で連絡します・わかったら教えます",
    tip: "情報が決まったら知らせるという約束の表現。\"I'll get back to you.\" と同じ意味ですが、情報共有のニュアンスが強いです。",
    w: ["何も言いません", "あなたが連絡して"],
  },
  {
    phrase: "Good for you!",
    meaning: "よかったね！・頑張ったね！",
    tip: "相手のいいニュースを祝うフレーズ。ただし語調によって「へえ、そう（皮肉）」の意味にも聞こえるので注意。",
    w: ["残念だったね", "あなたは悪いです"],
  },
  {
    phrase: "Hang on a sec.",
    meaning: "ちょっと待って",
    tip: "\"Hold on.\" と同じ意味のカジュアルな表現。sec = second（秒）の省略で、ほんの少し待ってほしい時に使います。",
    w: ["永遠に待って", "続けてください"],
  },
  {
    phrase: "What's going on?",
    meaning: "何があったの？・何してるの？",
    tip: "状況を確認したり、何かが起きている時に使うフレーズ。\"What's up?\" より状況を把握しようとしているニュアンスが強いです。",
    w: ["何が上にある？", "どこへ行くの？"],
  },
  {
    phrase: "Don't mention it.",
    meaning: "どういたしまして・気にしないで",
    tip: "お礼に対する謙虚な返し方。「わざわざ言うほどのことじゃない」というニュアンスで、相手への親しみが感じられます。",
    w: ["必ず話してください", "もっと感謝して"],
  },
  // ══ 追加 ══
  {
    phrase: "Take it or leave it.",
    meaning: "これが条件・嫌なら結構",
    tip: "交渉や提案で「これ以上変えられない、受け入れるかどうかはあなた次第」という表現。少し強い言い方なので使う場面に注意。",
    w: ["どちらでも同じです", "もっと選んでください"],
  },
  {
    phrase: "You're telling me.",
    meaning: "まったくだよ！・わかる！",
    tip: "\"Tell me about it.\" と同じく、相手の言ったことに強く同意する共感フレーズ。「私に言わなくてもわかってるよ」というニュアンス。",
    w: ["話してください", "あなたが教えて"],
  },
  {
    phrase: "I'll handle it.",
    meaning: "私が対処します",
    tip: "問題や仕事を自分が解決すると申し出る表現。\"I'll take care of it.\" と同じ意味で、責任を取る姿勢を示します。",
    w: ["私には無理です", "誰かに頼んでください"],
  },
  {
    phrase: "That figures.",
    meaning: "やっぱりね・それはそうだ",
    tip: "予想通りのことが起きた時の反応。\"I knew it.\" と似たニュアンスで、少し呆れた時にも使います。",
    w: ["計算が合いません", "図が正しいです"],
  },
  {
    phrase: "No problem.",
    meaning: "問題ありません・大丈夫です",
    tip: "謝罪やお礼への返答として定番の表現。\"You're welcome.\" の代わりとしてもよく使われます。",
    w: ["大変な問題です", "後で確認します"],
  },
  {
    phrase: "What a small world!",
    meaning: "世間は狭いね！",
    tip: "偶然の出会いや意外なつながりに驚いた時の表現。共通の知人を発見した時などによく使います。",
    w: ["地球は広いね", "なんて大きな世界"],
  },
  {
    phrase: "Take it easy.",
    meaning: "ゆっくりしてね・お大事に",
    tip: "別れ際の挨拶にも使いますし、疲れている相手や怒っている相手に「落ち着いて」と伝える時にも使えます。",
    w: ["急いでください", "もっと頑張って"],
  },
  {
    phrase: "I'm good.",
    meaning: "大丈夫です・結構です",
    tip: "「元気ですか？」への返答にもなりますが、何かを勧められた時に「いや、大丈夫」と断る時にも使います。文脈で意味が変わる便利な一言。",
    w: ["ちょっと待ってください", "もっとください"],
  },
  {
    phrase: "Catch you later.",
    meaning: "またね・じゃあまた",
    tip: "別れ際のカジュアルな挨拶。\"See you later.\" より口語的でノリのいい印象を与えます。",
    w: ["今すぐ連絡して", "あとで捕まえる"],
  },
  {
    phrase: "You're kidding!",
    meaning: "冗談でしょ！",
    tip: "驚いた時のリアクション。\"You're kidding me!\" とも言います。語調によって驚きの大きさが変わります。",
    w: ["冗談を言って", "子供ですね"],
  },
  {
    phrase: "That's news to me.",
    meaning: "初耳です",
    tip: "\"私にとってはニュースだ\" という直訳から来た表現。知らなかったことが判明した時の自然な反応です。",
    w: ["よく知っています", "ニュースを見てください"],
  },
];

// ─── ChoiceBtn ────────────────────────────────────────────────────
function ChoiceBtn({
  text, isAnswer, selected, revealed, disabled, onSelect,
}: {
  text: string; isAnswer: boolean;
  selected: boolean; revealed: boolean; disabled: boolean;
  onSelect: () => void;
}) {
  let ring = 'border-gray-200 bg-white text-gray-900';
  if (revealed) {
    if (isAnswer)      ring = 'border-emerald-500 bg-emerald-50 text-emerald-900';
    else if (selected) ring = 'border-red-400 bg-red-50 text-red-900';
    else               ring = 'border-gray-100 bg-gray-50 text-gray-400';
  }

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`w-full text-left px-4 py-3.5 rounded-2xl border-2 font-bold text-sm leading-snug transition-all duration-150 active:opacity-70 ${ring}`}
    >
      {revealed && isAnswer && <span className="mr-1.5">✅</span>}
      {revealed && selected && !isAnswer && <span className="mr-1.5">❌</span>}
      {text}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
type PhraseMode   = 'practice' | 'review';
type PhraseFilter = 'all' | 'needs';

export function DailyPractice() {
  // ── モード・フィルター ──
  const [mode,   setMode]   = useState<PhraseMode>('practice');
  const [filter, setFilter] = useState<PhraseFilter>('all');
  const [memorized, setMemorized] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const stored = localStorage.getItem(LS_MEMO_PHRASES);
      return stored ? new Set<string>(JSON.parse(stored) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const toggleMemo = useCallback((key: string) => {
    setMemorized(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(LS_MEMO_PHRASES, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // ── 練習モード state ──
  const [deck, setDeck]         = useState<Item[]>(() => shuffle(DATA));
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [flash, setFlash]       = useState<'ok'|'ng'|null>(null);
  const [correct, setCorrect]   = useState(0);
  const [total, setTotal]       = useState(0);

  const item = deck[idx % deck.length];

  const [choices, setChoices] = useState<{ text: string; isAnswer: boolean }[]>([]);
  useEffect(() => {
    setChoices(shuffle([
      { text: item.meaning, isAnswer: true  },
      { text: item.w[0],    isAnswer: false },
      { text: item.w[1],    isAnswer: false },
    ]));
    setSelected(null);
    setRevealed(false);
    setFlash(null);
  }, [idx, item]);

  const handleSelect = useCallback((text: string, isAnswer: boolean) => {
    if (revealed) return;
    setSelected(text);
    setRevealed(true);
    setTotal(t => t + 1);
    setFlash(isAnswer ? 'ok' : 'ng');
    if (isAnswer) setCorrect(c => c + 1);
  }, [revealed]);

  const handleNext = useCallback(() => {
    if (idx + 1 >= deck.length) {
      setDeck(shuffle(DATA));
      setIdx(0);
    } else {
      setIdx(i => i + 1);
    }
  }, [idx, deck.length]);

  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  const memoCount = memorized.size;

  // ── 復習リスト ──
  const reviewItems = filter === 'needs'
    ? DATA.filter(it => !memorized.has(it.phrase))
    : DATA;

  // ── モードタブ（両モード共通ヘッダー） ──
  const ModeTabs = (
    <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
      {([['practice', '📖 練習する'], ['review', '✅ 復習する']] as [PhraseMode, string][]).map(([m, label]) => (
        <button key={m} onClick={() => setMode(m)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
            mode === m ? 'bg-gray-900 text-white shadow-md' : 'text-gray-700'
          }`}>
          {label}
          {m === 'review' && (
            <span className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              mode === 'review' ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
            }`}>
              {memoCount}/{DATA.length}
            </span>
          )}
        </button>
      ))}
    </div>
  );

  // ══ 復習モード ══
  if (mode === 'review') {
    return (
      <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">
        {ModeTabs}

        {/* フィルター */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-black text-gray-800 flex-1">
            全{DATA.length}フレーズ・覚えた: {memoCount}個
          </span>
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {([['all', 'すべて表示'], ['needs', '要復習のみ']] as [PhraseFilter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                  filter === f ? 'bg-gray-900 text-white shadow' : 'text-gray-700'
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {reviewItems.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-base font-black text-gray-900">全フレーズを覚えました！</p>
            <p className="text-xs font-bold text-gray-700 mt-1">「すべて表示」で復習できます</p>
          </div>
        )}

        <div className="space-y-3">
          {reviewItems.map(it => {
            const isMemo = memorized.has(it.phrase);
            return (
              <div key={it.phrase}
                className={`rounded-2xl border-2 overflow-hidden transition-all ${
                  isMemo ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'
                }`}>

                <div className="px-4 pt-4 pb-3">
                  {/* 英語フレーズ + TTS */}
                  <div className="flex items-start gap-2 mb-1">
                    <p className="text-xl font-black text-gray-900 leading-snug flex-1">
                      &ldquo;{it.phrase}&rdquo;
                    </p>
                    <button
                      onClick={() => speak(it.phrase)}
                      className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 active:scale-90 transition-all text-base"
                      aria-label="発音を聞く"
                    >🔊</button>
                  </div>

                  {/* 日本語の意味 */}
                  <p className="text-base font-black text-gray-800 mb-3">{it.meaning}</p>

                  {/* 使い方・ニュアンス解説 */}
                  <div className="border border-sky-300 bg-sky-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-sky-800 uppercase tracking-widest mb-1">💡 使い方・ニュアンス</p>
                    <p className="text-xs font-bold text-gray-900 leading-relaxed">{it.tip}</p>
                  </div>
                </div>

                {/* 覚えたチェック */}
                <button onClick={() => toggleMemo(it.phrase)}
                  className={`w-full flex items-center gap-3 px-4 py-3 border-t-2 transition-all active:scale-[0.99] ${
                    isMemo ? 'border-emerald-400 bg-emerald-100' : 'border-gray-200 bg-gray-50'
                  }`}>
                  <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    isMemo ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-400'
                  }`}>
                    {isMemo && <span className="text-sm font-black">✓</span>}
                  </div>
                  <span className={`text-sm font-black ${isMemo ? 'text-emerald-800' : 'text-gray-800'}`}>
                    {isMemo ? '覚えた ✅' : '覚えた？ チェックする'}
                  </span>
                  {isMemo && (
                    <span className="ml-auto text-[10px] font-bold text-emerald-600">タップで解除</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ══ 練習モード ══
  return (
    <div className={`min-h-screen px-4 pt-2 pb-[120px] max-w-md mx-auto transition-colors duration-200 ${
      flash === 'ok' ? 'bg-emerald-50' : flash === 'ng' ? 'bg-red-50' : 'bg-white'
    }`}>

      {ModeTabs}

      {/* ── スコアバー ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold text-gray-800">
          {total > 0 ? `${correct}/${total} (${pct}%)` : '💬 ネイティブ日常フレーズ'}
        </span>
        <span className="text-xs font-bold text-gray-800">
          {idx + 1} / {deck.length}
        </span>
      </div>

      {/* ── 問題カード ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden mb-5 shadow-lg">
        <div className="px-5 pt-5 pb-4">
          <p className="text-2xl font-black text-white leading-snug mb-3 tracking-wide">
            &ldquo;{item.phrase}&rdquo;
          </p>
          <button
            onClick={() => speak(item.phrase)}
            className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-white/20 text-white active:scale-95 transition-transform"
          >
            🔊 ネイティブ発音を聞く
          </button>
        </div>
        <div className="px-5 pb-4">
          <p className="text-[11px] font-black text-gray-300 uppercase tracking-widest">
            正しい日本語訳を選んでください
          </p>
        </div>
      </div>

      {/* ── 選択肢 ── */}
      <div className="space-y-3 mb-5">
        {choices.map(c => (
          <ChoiceBtn
            key={c.text}
            text={c.text}
            isAnswer={c.isAnswer}
            selected={selected === c.text}
            revealed={revealed}
            disabled={revealed}
            onSelect={() => handleSelect(c.text, c.isAnswer)}
          />
        ))}
      </div>

      {/* ── 使い方・ニュアンス解説（回答後に表示） ── */}
      {revealed && (
        <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-4 mb-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">💡</span>
            <p className="text-xs font-black text-sky-900 uppercase tracking-widest">
              使い方・ニュアンス
            </p>
          </div>
          <p className="text-xs font-black text-gray-900 bg-white/70 rounded-xl px-3 py-2 border border-sky-200">
            &ldquo;{item.phrase}&rdquo; ＝ <span className="text-sky-900">{item.meaning}</span>
          </p>
          <p className="text-sm font-bold text-gray-900 leading-relaxed">
            {item.tip}
          </p>
          <div className="pt-1">
            <button
              onClick={() => speak(item.phrase)}
              className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-sky-700 text-white active:scale-95 transition-transform"
            >
              🔊 もう一度聞く
            </button>
          </div>
        </div>
      )}

      {/* ── 次へボタン ── */}
      {revealed && (
        <button
          onClick={handleNext}
          className="w-full py-3.5 rounded-2xl font-black text-base bg-gray-900 text-white active:scale-[0.98] transition-all shadow-md"
        >
          次のフレーズへ →
        </button>
      )}
    </div>
  );
}
