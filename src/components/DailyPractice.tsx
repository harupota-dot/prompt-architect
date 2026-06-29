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
  phrase: string;           // English chunk
  meaning: string;          // Correct Japanese meaning
  pronunciationTip: string; // 音声変化の解説
  w: [string, string];      // Wrong Japanese meanings
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

// ─── Dataset (70 チャンク) ─────────────────────────────────────────
const DATA: Item[] = [
  // ══ フラッピング（母音間のtがラ行化） ══
  {
    phrase: "out of order",
    meaning: "故障して・順番が違う",
    pronunciationTip: "【フラッピング】 'out' の t が母音 u と o に挟まれるためラ行化し、「アウダ・オーダ」のように聞こえます。",
    w: ["〜の代わりに", "ちょうどその時"],
  },
  {
    phrase: "let it go",
    meaning: "手放す・諦める",
    pronunciationTip: "【フラッピング】 let の t が i と o に挟まれてラ行化し、「レリゴー」と一気に発音されます。",
    w: ["〜に申し込む", "気づく"],
  },
  {
    phrase: "put it on",
    meaning: "着る・身につける",
    pronunciationTip: "【リンキング＆フラッピング】 put の t が it の i と繋がり、さらにラ行化して「プリロン」のように聞こえます。",
    w: ["延期する", "提出する"],
  },
  {
    phrase: "get it done",
    meaning: "やり遂げる・完了させる",
    pronunciationTip: "【フラッピング】 get の t が it の i との間でラ行化し「ゲリダン」と聞こえます。ネイティブの会話では「ゲラダン」に近い音も出ます。",
    w: ["手放す", "追いつく"],
  },
  {
    phrase: "wait a minute",
    meaning: "ちょっと待って",
    pronunciationTip: "【フラッピング】 wait の t が a と繋がりラ行化し、「ウェイラミニッ(ト)」と聞こえます。minute 末尾の t はほぼ消えます。",
    w: ["取り消す", "乗り遅れる"],
  },
  {
    phrase: "a lot of time",
    meaning: "たくさんの時間",
    pronunciationTip: "【フラッピング＋リダクション】 lot の t がラ行化し、of は「ア」に縮まるため「アラダタイム」のように聞こえます。",
    w: ["締め切り", "空き時間"],
  },
  {
    phrase: "not at all",
    meaning: "全然〜ない・どういたしまして",
    pronunciationTip: "【フラッピング】 not の t と at の t がいずれも母音に挟まれてラ行化し、「ナラロール」のように連続して流れます。",
    w: ["何と言っても", "全力で"],
  },
  {
    phrase: "what a day",
    meaning: "なんて日だ（驚き・疲労）",
    pronunciationTip: "【フラッピング】 what の t が a と繋がりラ行化して「ワラデイ」と聞こえます。感嘆表現でよく使われます。",
    w: ["今日の予定", "一日中"],
  },
  {
    phrase: "write it down",
    meaning: "書き留める",
    pronunciationTip: "【フラッピング】 write の t が it の i と繋がりラ行化し「ライリダウン」と聞こえます。",
    w: ["書き直す", "消去する"],
  },
  {
    phrase: "better late than never",
    meaning: "遅くてもやらないよりはまし",
    pronunciationTip: "【フラッピング】 better の tt と late の t がいずれもラ行化し、「ベラレイダン・ネバー」のようにリズムよく聞こえます。",
    w: ["急がば回れ", "時は金なり"],
  },

  // ══ リンキング（子音が次の母音と繋がる） ══
  {
    phrase: "take a look at it",
    meaning: "それを見る・確認する",
    pronunciationTip: "【リンキング】 take の k と a、look の k と a、at の t と it がすべて繋がり「テイカルッカリッ(ト)」と一息で発音されます。",
    w: ["それを取る", "それを聞く"],
  },
  {
    phrase: "pick it up",
    meaning: "拾い上げる・習得する",
    pronunciationTip: "【リンキング】 pick の ck と it の i が繋がり「ピキラップ」のように聞こえます。",
    w: ["送り届ける", "片付ける"],
  },
  {
    phrase: "turn it off",
    meaning: "（電源を）切る",
    pronunciationTip: "【リンキング】 turn の n と it の i が繋がり「ターニット」→「ターニロフ」と続きます。",
    w: ["つける", "下げる"],
  },
  {
    phrase: "call it a day",
    meaning: "その日の作業を終わりにする",
    pronunciationTip: "【リンキング】 call の l と it の i が繋がり「コーリラデイ」と聞こえます。仕事終わりの定番フレーズです。",
    w: ["一日休む", "予定を延ばす"],
  },
  {
    phrase: "look it up",
    meaning: "調べる（辞書・ネットで）",
    pronunciationTip: "【リンキング】 look の k と it の i が繋がり「ルキラップ」のように発音されます。",
    w: ["見上げる", "確認する"],
  },
  {
    phrase: "hand it in",
    meaning: "提出する",
    pronunciationTip: "【リンキング】 hand の d と it の i、it の t と in の i が繋がり「ハンディティン」のように流れます。",
    w: ["持ち帰る", "引き渡す"],
  },
  {
    phrase: "think about it",
    meaning: "それについて考える",
    pronunciationTip: "【リンキング＋フラッピング】 about の t が it の i と繋がりラ行化し「シンカバウリッ(ト)」と一気に発音されます。",
    w: ["忘れてしまう", "無視する"],
  },
  {
    phrase: "work it out",
    meaning: "解決する・うまく処理する",
    pronunciationTip: "【リンキング】 work の k と it が繋がり「ワーキラウト」と聞こえます。",
    w: ["諦める", "延期する"],
  },
  {
    phrase: "figure it out",
    meaning: "理解する・解き明かす",
    pronunciationTip: "【フラッピング＋リンキング】 figure の r と it が繋がり、it の t もラ行化して「フィギャリラウト」のように流れます。",
    w: ["描き出す", "やり遂げる"],
  },
  {
    phrase: "make an effort",
    meaning: "努力する",
    pronunciationTip: "【リンキング】 make の k と an が繋がり「メイカン・エファト」のように一続きに聞こえます。",
    w: ["影響を与える", "諦める"],
  },

  // ══ リダクション（機能語が短縮・弱化） ══
  {
    phrase: "kind of",
    meaning: "ちょっと・〜のような",
    pronunciationTip: "【リダクション】 of は強形「オヴ」ではなく「ア/ダ」に縮み「カインダ」と聞こえます。カジュアルな会話では 'kinda' と表記されることも。",
    w: ["〜のおかげで", "〜の種類"],
  },
  {
    phrase: "sort of",
    meaning: "ある程度・まあ（曖昧な同意）",
    pronunciationTip: "【リダクション】 of が「ダ/ア」に縮まり「ソーラ」のように聞こえます。'sorta' と書かれることも多いです。",
    w: ["〜を整理する", "選別する"],
  },
  {
    phrase: "going to",
    meaning: "〜するつもり・〜する予定",
    pronunciationTip: "【リダクション】 going to は会話では「ガナ (gonna)」に縮まります。ネイティブは 'I'm gonna call you.' のように発音します。",
    w: ["〜し終えた", "〜だったはず"],
  },
  {
    phrase: "want to",
    meaning: "〜したい",
    pronunciationTip: "【リダクション】 want to は「ウォナ (wanna)」に縮まります。'I wanna go.' のように話し言葉では頻繁に使われます。",
    w: ["〜しなければ", "〜できる"],
  },
  {
    phrase: "have to",
    meaning: "〜しなければならない",
    pronunciationTip: "【リダクション】 have to は「ハフタ」と発音されます。h が弱まり「アフタ」に近く聞こえることもあります。",
    w: ["〜してもよい", "〜するつもり"],
  },
  {
    phrase: "used to",
    meaning: "かつては〜していた",
    pronunciationTip: "【リダクション】 used to は「ユーストゥ → ユーストゥ」が速くなると「ユーストゥ」の d が消え「ユースタ」と聞こえます。",
    w: ["〜に慣れている", "〜に使われる"],
  },
  {
    phrase: "supposed to",
    meaning: "〜することになっている・〜のはず",
    pronunciationTip: "【リダクション】 supposed to は「サポーストゥ → サポーストゥ」が崩れ「サポーズタ」のように聞こえます。",
    w: ["〜と推測される", "仮定する"],
  },
  {
    phrase: "could have",
    meaning: "〜できたはず（できなかった）",
    pronunciationTip: "【リダクション】 could have は「クッダ (coulda)」と縮まります。'You coulda told me.' のように聞こえます。",
    w: ["〜すべきだった", "〜したかもしれない"],
  },
  {
    phrase: "should have",
    meaning: "〜すべきだった（しなかった）",
    pronunciationTip: "【リダクション】 should have は「シュッダ (shoulda)」に縮まります。後悔の表現として頻出です。",
    w: ["〜できたはず", "〜してもよかった"],
  },
  {
    phrase: "would have",
    meaning: "〜したであろう（しなかった）",
    pronunciationTip: "【リダクション】 would have は「ウッダ (woulda)」に縮まります。'I woulda helped you.' のように聞こえます。",
    w: ["〜するだろう", "〜したはず"],
  },

  // ══ H脱落（代名詞の h が消える） ══
  {
    phrase: "give him a call",
    meaning: "彼に電話する",
    pronunciationTip: "【H脱落】 him の h は非強調位置では消え「give'im a call → ギビマコール」のように聞こえます。",
    w: ["彼をやり過ごす", "彼に会いに行く"],
  },
  {
    phrase: "tell her the truth",
    meaning: "彼女に真実を告げる",
    pronunciationTip: "【H脱落】 her の h が落ちて tell と繋がり「テラー・ザ・トゥルース」のように聞こえます。",
    w: ["彼女に嘘をつく", "彼女に頼む"],
  },
  {
    phrase: "ask him about it",
    meaning: "それについて彼に聞く",
    pronunciationTip: "【H脱落＋フラッピング】 him の h が消えて「アスキム」→ about it の t もラ行化し「アスキマバウリッ」と流れます。",
    w: ["彼に許可を求める", "彼を試す"],
  },
  {
    phrase: "help him out",
    meaning: "彼を助け出す",
    pronunciationTip: "【H脱落＋リンキング】 him の h が消えhelpと繋がり「ヘルピマウト」と聞こえます。",
    w: ["彼を外に出す", "彼に反論する"],
  },

  // ══ T消去・弱化（語末や子音前の t が消える） ══
  {
    phrase: "next time",
    meaning: "次回・今度",
    pronunciationTip: "【T消去】 next の t は子音 t の前に来るため消え「ネクスタイム」と聞こえます。",
    w: ["毎回", "今すぐ"],
  },
  {
    phrase: "last night",
    meaning: "昨夜",
    pronunciationTip: "【T消去】 last の t は子音 n の前で消えほぼ「ラスナイト」になります。",
    w: ["毎晩", "先週末"],
  },
  {
    phrase: "just in case",
    meaning: "念のために",
    pronunciationTip: "【T消去＋リンキング】 just の t は消え in の i と繋がり「ジャスキンケイス」のように聞こえます。",
    w: ["いずれにせよ", "場合によっては"],
  },
  {
    phrase: "best friend",
    meaning: "親友",
    pronunciationTip: "【T消去】 best の t は子音 f の前で消え「ベスフレンド」と聞こえます。",
    w: ["古い友人", "同僚"],
  },
  {
    phrase: "first time",
    meaning: "初めて",
    pronunciationTip: "【T消去】 first の t は子音 t の前で消え「ファースタイム」のように発音されます。",
    w: ["最後に", "次回"],
  },

  // ══ アシミレーション（隣の音に同化・融合） ══
  {
    phrase: "don't you",
    meaning: "〜じゃないですか？（確認）",
    pronunciationTip: "【アシミレーション】 don't の t と you の y が融合し「ドンチュ (dontcha)」と聞こえます。",
    w: ["〜してください", "〜するつもり？"],
  },
  {
    phrase: "did you",
    meaning: "〜しましたか？",
    pronunciationTip: "【アシミレーション】 did の d と you の y が融合し「ディジュ (didja)」と聞こえます。",
    w: ["〜できますか？", "〜でしたか？"],
  },
  {
    phrase: "would you",
    meaning: "〜していただけますか？（丁寧な依頼）",
    pronunciationTip: "【アシミレーション】 would の d と you が融合し「ウッジュ (wouldja)」と聞こえます。",
    w: ["〜してはどうですか？", "〜できますか？"],
  },
  {
    phrase: "could you",
    meaning: "〜してもらえますか？",
    pronunciationTip: "【アシミレーション】 could の d と you が融合し「クッジュ (couldja)」と聞こえます。依頼表現の定番です。",
    w: ["〜かもしれません", "〜できましたか？"],
  },
  {
    phrase: "miss you",
    meaning: "あなたに会いたい",
    pronunciationTip: "【アシミレーション】 miss の s と you の y が融合して「ミシュ (mishyu)」のような音になります。",
    w: ["あなたを知っている", "あなたを見た"],
  },

  // ══ TOEICビジネスチャンク ══
  {
    phrase: "in charge of",
    meaning: "〜を担当して・〜の責任者で",
    pronunciationTip: "【リダクション】 of が「ア」に縮まり「インチャーヂャ」と聞こえます。TOEICパート3・4で頻出です。",
    w: ["〜に申し込む", "〜を代表して"],
  },
  {
    phrase: "as soon as possible",
    meaning: "できる限り早く（ASAP）",
    pronunciationTip: "【リダクション】 as は「アズ → ア」に弱まり「ア・スーナズ・パッサブル」のように流れます。ビジネスメールでは ASAP と略されます。",
    w: ["できる限り丁寧に", "できる限り正確に"],
  },
  {
    phrase: "in advance",
    meaning: "前もって・事前に",
    pronunciationTip: "【リンキング】 in の n と advance の a が繋がり「イナドヴァンス」のように聞こえます。",
    w: ["〜に加えて", "結果として"],
  },
  {
    phrase: "on behalf of",
    meaning: "〜を代表して・〜の代わりに",
    pronunciationTip: "【リダクション】 of が「ア/ダ」に縮まり「オン・ビハーフア」と聞こえます。ビジネスメールの冒頭でよく使われます。",
    w: ["〜の隣に", "〜に関して"],
  },
  {
    phrase: "due to",
    meaning: "〜が原因で・〜のせいで",
    pronunciationTip: "【リダクション】 to が「タ/トゥ」に弱まり「デュートゥ → デュータ」と聞こえます。",
    w: ["〜にもかかわらず", "〜の前に"],
  },
  {
    phrase: "in spite of",
    meaning: "〜にもかかわらず",
    pronunciationTip: "【リダクション＋リンキング】 spite の t と of の o が繋がり、of は「ア」に縮まって「インスパイタ」と聞こえます。",
    w: ["〜のおかげで", "〜の代わりに"],
  },
  {
    phrase: "with regard to",
    meaning: "〜に関して（ビジネスメール定番）",
    pronunciationTip: "【リダクション】 regard は r と d で流れるように発音され、to は「タ」に縮まり「ウィズリガードタ」と聞こえます。",
    w: ["〜を尊重して", "〜とともに"],
  },
  {
    phrase: "prior to",
    meaning: "〜の前に・〜に先立ち",
    pronunciationTip: "【リンキング＋リダクション】 prior の r と to が繋がり「プライアータ」と聞こえます。フォーマルな書き言葉でも頻出です。",
    w: ["〜の後に", "〜の代わりに"],
  },
  {
    phrase: "result in",
    meaning: "〜という結果になる",
    pronunciationTip: "【リンキング】 result の t と in の i が繋がり「リザルティン」と聞こえます。",
    w: ["〜から生じる", "〜を含む"],
  },
  {
    phrase: "consist of",
    meaning: "〜から構成される",
    pronunciationTip: "【リダクション】 of が「ア」に縮まり「コンシストア」と聞こえます。",
    w: ["〜に同意する", "〜を含む"],
  },
  {
    phrase: "apply for",
    meaning: "〜に申し込む・応募する",
    pronunciationTip: "【リダクション】 for が「ファー → ファ」に弱まり「アプライファ」のように聞こえます。TOEICパート5・6で頻出の動詞句です。",
    w: ["〜を取り消す", "〜を要求する"],
  },
  {
    phrase: "look forward to",
    meaning: "〜を楽しみにしている",
    pronunciationTip: "【リダクション＋リンキング】 forward の d と to が繋がり「ルックフォーワートゥ → フォーワータ」と流れます。to の後に動名詞（-ing）が続きます。",
    w: ["〜を振り返る", "〜に向かって進む"],
  },
  {
    phrase: "make sure",
    meaning: "確かめる・必ず〜する",
    pronunciationTip: "【リンキング】 make の k と sure が繋がり「メイクシュア」と一息で発音されます。命令文 'Make sure you...' でよく使われます。",
    w: ["見逃さない", "安心させる"],
  },
  {
    phrase: "come up with",
    meaning: "思いつく・〜を考え出す",
    pronunciationTip: "【リンキング】 up の p と with が繋がり「カムアップウィズ」と流れます。アイデアを出す場面で必須の句動詞です。",
    w: ["〜に追いつく", "〜を諦める"],
  },
  {
    phrase: "keep in mind",
    meaning: "覚えておく・肝に銘じる",
    pronunciationTip: "【リンキング】 keep の p と in が繋がり「キーピン・マインド」と聞こえます。",
    w: ["気にしない", "忘れてしまう"],
  },
  {
    phrase: "carry out",
    meaning: "実行する・遂行する",
    pronunciationTip: "【フラッピング】 carry の r と out が繋がり、ry の y が母音化して「キャリーアウト → キャリャウト」のように速く流れます。",
    w: ["中止する", "持ち帰る"],
  },
  {
    phrase: "take part in",
    meaning: "〜に参加する",
    pronunciationTip: "【リンキング＋T消去】 take の k と part の t が連続し、part の t は in の前で「テイクパーリン」のように流れます。",
    w: ["〜を分担する", "〜から離れる"],
  },
  {
    phrase: "in terms of",
    meaning: "〜に関しては・〜の点では",
    pronunciationTip: "【リダクション】 of が「ア」に縮まり「インタームズア」のように聞こえます。比較や説明でよく使われます。",
    w: ["〜のおかげで", "〜にもかかわらず"],
  },
  {
    phrase: "get rid of",
    meaning: "〜を取り除く・捨てる",
    pronunciationTip: "【フラッピング＋リダクション】 get の t がラ行化し、of が「ア」に縮まって「ゲリダ」と流れます。",
    w: ["〜を集める", "〜を保管する"],
  },
  {
    phrase: "point out",
    meaning: "指摘する・注意を向ける",
    pronunciationTip: "【リンキング】 point の t と out の ou が繋がり「ポインタウト」のように聞こえます。",
    w: ["指示する", "証明する"],
  },
  {
    phrase: "cut down on",
    meaning: "〜を減らす・削減する",
    pronunciationTip: "【リンキング】 down の n と on が繋がり「カット・ダウノン」のように流れます。",
    w: ["〜を増やす", "〜を廃止する"],
  },
  {
    phrase: "a piece of cake",
    meaning: "朝飯前・とても簡単なこと",
    pronunciationTip: "【リンキング】 piece の s と of が繋がり「ア・ピーサ・ケイク」と流れます。of はここでも「ア」に縮まります。",
    w: ["大変な仕事", "甘い話"],
  },
  {
    phrase: "break a leg",
    meaning: "頑張って！（舞台・試験前の励まし）",
    pronunciationTip: "【リンキング】 break の k と a が繋がり「ブレイカレッグ」と発音されます。直訳の意味では使いません。",
    w: ["気をつけて", "急いで"],
  },
  {
    phrase: "under the weather",
    meaning: "体調が優れない",
    pronunciationTip: "【リダクション】 the が「ザ → ダ」に弱まり、under と繋がって「アンダダ・ウェザー」と聞こえます。",
    w: ["雨の中で", "天気が悪い"],
  },
  {
    phrase: "once in a while",
    meaning: "時々・たまに",
    pronunciationTip: "【リンキング＋フラッピング】 once の s と in が繋がり、in の n と a が繋がって「ワンシナワイル」のように流れます。",
    w: ["いつも", "全く〜ない"],
  },
  {
    phrase: "on the other hand",
    meaning: "一方で・他方では",
    pronunciationTip: "【リダクション】 the は「ダ」に縮まり「オンダ・アザーハンド」のように聞こえます。",
    w: ["その結果", "最終的に"],
  },
  {
    phrase: "make a difference",
    meaning: "変化をもたらす・重要である",
    pronunciationTip: "【リンキング＋フラッピング】 make の k と a が繋がり、difference の t がラ行化して「メイカ・ディファランス」のように流れます。",
    w: ["違いを無視する", "問題を引き起こす"],
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
  let ring = 'border-gray-200 bg-white text-gray-800';
  if (revealed) {
    if (isAnswer)      ring = 'border-emerald-500 bg-emerald-50 text-emerald-900';
    else if (selected) ring = 'border-red-400 bg-red-50 text-red-800';
    else               ring = 'border-gray-100 bg-gray-50 text-gray-300';
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
export function DailyPractice() {
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

  return (
    <div className={`min-h-screen px-4 pt-2 pb-[120px] max-w-md mx-auto transition-colors duration-200 ${
      flash === 'ok' ? 'bg-emerald-50' : flash === 'ng' ? 'bg-red-50' : 'bg-white'
    }`}>

      {/* ── スコアバー ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold text-gray-700">
          {total > 0 ? `${correct}/${total} (${pct}%)` : '🎧 発音チャンク練習'}
        </span>
        <span className="text-xs font-bold text-gray-700">
          {idx + 1} / {deck.length}
        </span>
      </div>

      {/* ── 問題カード ── */}
      <div className="bg-gray-900 rounded-2xl overflow-hidden mb-5 shadow-lg">
        <div className="px-5 pt-5 pb-4">
          {/* フレーズ */}
          <p className="text-2xl font-black text-white leading-snug mb-3 tracking-wide">
            &ldquo;{item.phrase}&rdquo;
          </p>
          {/* TTS ボタン */}
          <button
            onClick={() => speak(item.phrase)}
            className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-white/20 text-white active:scale-95 transition-transform"
          >
            🔊 ネイティブ発音を聞く
          </button>
        </div>
        <div className="px-5 pb-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
            正しい意味を選んでください
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

      {/* ── 発音のコツ（回答後に表示） ── */}
      {revealed && (
        <div className="rounded-2xl border-2 border-violet-400 bg-violet-50 p-4 mb-5 space-y-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <p className="text-xs font-black text-violet-800 uppercase tracking-widest">
              発音のコツ
            </p>
          </div>
          <p className="text-sm font-bold text-gray-900 leading-relaxed">
            {item.pronunciationTip}
          </p>
          <div className="pt-1">
            <button
              onClick={() => speak(item.phrase)}
              className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-violet-700 text-white active:scale-95 transition-transform"
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
          次のチャンクへ →
        </button>
      )}
    </div>
  );
}
