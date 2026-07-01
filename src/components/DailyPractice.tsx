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

// ─── Dataset (75 ネイティブ日常フレーズ) ──────────────────────────
const DATA: Item[] = [
  // ══ 挨拶・リアクション ══
  {
    phrase: "I'm on my way.",
    meaning: "今向かっています",
    tip: "到着が近いことを相手に伝えるフレーズ。「今出発するよ」より具体的に「もう動いてるよ」というニュアンスがあります。",
    w: ["もう到着しました", "少し遅れます"],
  },
  {
    phrase: "I'm good.",
    meaning: "大丈夫です・結構です",
    tip: "「元気ですか？」への返答にもなりますが、何かを勧められた時に「いや、大丈夫」と断る時にも使います。文脈で意味が変わる便利な一言。",
    w: ["ちょっと待ってください", "もっとください"],
  },
  {
    phrase: "Take it easy.",
    meaning: "ゆっくりしてね・お大事に",
    tip: "別れ際の挨拶にも使いますし、疲れている相手や怒っている相手に「落ち着いて」と伝える時にも使えます。",
    w: ["急いでください", "もっと頑張って"],
  },
  {
    phrase: "Same here.",
    meaning: "私も同じです",
    tip: "「Me too.」と同じ意味ですが、より会話らしい自然な言い方。相手の言ったことが自分にも当てはまる時にサッと使えます。",
    w: ["私はちょっと違います", "全然違います"],
  },
  {
    phrase: "Not bad.",
    meaning: "悪くないね・まあまあだよ",
    tip: "直訳は「悪くない」ですが、控えめな好評価として使います。「How was it?」に対して「まあよかったよ」という感じ。",
    w: ["最悪でした", "とても良かった"],
  },
  {
    phrase: "My bad.",
    meaning: "私のミスです・ごめん",
    tip: "軽いミスやうっかりをカジュアルに認める口語表現。フォーマルな場には不向きですが、友人や同僚との会話では自然な謝り方です。",
    w: ["あなたのせいです", "問題ありません"],
  },
  {
    phrase: "There you go.",
    meaning: "ほらね・それでいいですよ",
    tip: "相手が正しいことをした時（「そうそう、その調子」）や、予想通りのことが起きた時（「ほらやっぱり」）の両方に使えます。",
    w: ["そこへ行ってください", "もう一度やって"],
  },
  {
    phrase: "Go for it.",
    meaning: "やってみて！・行け！",
    tip: "相手の背中を押す時のシンプルな励まし。「Should I try it?」と聞かれたら「Go for it!」と返すだけで OK です。",
    w: ["やめておいて", "気をつけて"],
  },
  {
    phrase: "You got it.",
    meaning: "了解・任せて",
    tip: "依頼に「Sure!」より積極的に応じる返事。「Can you handle this?」→「You got it!」のような流れで使います。",
    w: ["それは難しいです", "もう持っています"],
  },
  {
    phrase: "I hear you.",
    meaning: "わかるよ・言いたいことはわかる",
    tip: "完全同意ではなくても、相手の気持ちや言い分をちゃんと受け止めているという共感を示す表現です。",
    w: ["あなたの声が聞こえません", "賛成できません"],
  },

  // ══ 同意・賛成 ══
  {
    phrase: "Sounds good to me.",
    meaning: "それでいいね・賛成です",
    tip: "提案や計画に対して「いいね、それで行こう」と賛同するフレーズ。「to me」がついているので「私は」という個人の同意感があります。",
    w: ["ちょっと心配です", "考えさせてください"],
  },
  {
    phrase: "That works.",
    meaning: "それで大丈夫・それでいきましょう",
    tip: "スケジュールや条件が「合う・機能する」時に使います。「Does Tuesday work for you?」→「That works!」のように使います。",
    w: ["それは壊れています", "うまくいきません"],
  },
  {
    phrase: "Makes sense.",
    meaning: "納得・それは理にかなっている",
    tip: "説明を聞いて「なるほど」と思った時の自然な反応。「Make sense?」と疑問形にすると「わかった？」と確認できます。",
    w: ["意味がわかりません", "やり直してください"],
  },
  {
    phrase: "Exactly.",
    meaning: "まさに・その通り",
    tip: "相手の言ったことに100%同意する時の力強い表現。「Yes.」より断然テンションが上がって見えます。",
    w: ["全然違います", "ほとんどそうです"],
  },
  {
    phrase: "Fair enough.",
    meaning: "まあそうだね・一理ある",
    tip: "完全には同意しないけれど、相手の言い分を認める時のニュートラルな返し方。議論をうまく着地させるのに便利です。",
    w: ["絶対に嫌です", "それは不公平です"],
  },
  {
    phrase: "I'm with you.",
    meaning: "同意します・あなたの味方です",
    tip: "意見だけでなく、感情的・立場的にも「一緒にいるよ」というサポートを示せる温かい表現です。",
    w: ["あなたに反対です", "一人にしてください"],
  },
  {
    phrase: "Sure thing.",
    meaning: "もちろん・いいですよ",
    tip: "依頼や提案に気軽に応じる口語表現。「Sure.」よりノリが良くてフレンドリーな印象を与えます。",
    w: ["絶対にダメです", "考えておきます"],
  },
  {
    phrase: "Why not?",
    meaning: "いいじゃない・やろうよ",
    tip: "断る理由が特にない時の軽い同意。逆に「なんでダメなの？」と理由を問う時にも使われます。文脈で判断しましょう。",
    w: ["絶対やりません", "理由を教えて"],
  },

  // ══ 気持ち・状態 ══
  {
    phrase: "I'm beat.",
    meaning: "へとへとです・もうクタクタ",
    tip: "「I'm tired.」より強い疲労感を表します。長い仕事や運動の後に使うと、伝わり方がかなりリアルになります。",
    w: ["元気いっぱいです", "怒っています"],
  },
  {
    phrase: "I'm stuffed.",
    meaning: "お腹いっぱいです",
    tip: "食事後によく使うカジュアル表現。「Full」よりも「もう限界」というニュアンスが強め。食事会のお断りにも使えます。",
    w: ["お腹が空きました", "気持ち悪いです"],
  },
  {
    phrase: "I'm lost.",
    meaning: "迷子です・わからなくなった",
    tip: "道に迷った時だけでなく、会話や授業についていけない時にも使います。「Sorry, I'm lost — can you repeat that?」という感じで。",
    w: ["見つかりました", "全部わかりました"],
  },
  {
    phrase: "I'm in.",
    meaning: "参加します・やります",
    tip: "誘いや提案に乗る時の短くてノリのいい返事。「Are you coming?」→「I'm in!」でOK。チームへの参加宣言にも使えます。",
    w: ["参加しません", "考え中です"],
  },
  {
    phrase: "I'm out.",
    meaning: "パスします・抜けます",
    tip: "逆に断る・その場を去る時の表現。「I'm in.」のセットで覚えておくと便利です。「Count me out.」と同じ意味。",
    w: ["参加します", "まだここにいます"],
  },
  {
    phrase: "I'm down.",
    meaning: "乗った！・やる気あるよ",
    tip: "「I'm in.」と同じく誘いに応じる表現。若者言葉から広まり、今は幅広い世代が使います。",
    w: ["気分が悪いです", "断ります"],
  },
  {
    phrase: "I'm over it.",
    meaning: "もう気にしてない・吹っ切れた",
    tip: "過去の出来事や感情を引きずっていないことを示します。失恋や失敗について「もう立ち直ったよ」と伝える時に便利です。",
    w: ["まだ怒っています", "もう一度やります"],
  },

  // ══ 依頼・提案 ══
  {
    phrase: "Let me know.",
    meaning: "教えてください・連絡して",
    tip: "情報が入ったら知らせてほしいという柔らかな依頼。「Let me know if you need anything.（何かあれば知らせて）」と使うことも多いです。",
    w: ["放っておいてください", "自分で決めます"],
  },
  {
    phrase: "Go ahead.",
    meaning: "どうぞ・先に行って",
    tip: "相手に「許可を与える」または「先に行っていい」と伝える表現。扉を開けて譲る時にも使えます。",
    w: ["止まってください", "後でいいですよ"],
  },
  {
    phrase: "Take your time.",
    meaning: "ゆっくりでいいですよ",
    tip: "相手に急いでほしい気持ちがあっても、プレッシャーをかけずに待てることを示す思いやりのある表現。",
    w: ["急いでください", "時間がないです"],
  },
  {
    phrase: "Bear with me.",
    meaning: "もう少し待ってください・辛抱して",
    tip: "ちょっと時間がかかることを謝りつつお願いする表現。プレゼンや電話中に「少しお待ちを」という時に使えます。",
    w: ["私について来てください", "今すぐやめて"],
  },
  {
    phrase: "Leave it to me.",
    meaning: "私に任せて",
    tip: "責任を持って引き受けることを宣言する頼もしいフレーズ。「I'll handle it.」と同じ意味です。",
    w: ["私は関係ありません", "あなたがやって"],
  },
  {
    phrase: "Count me in.",
    meaning: "私も混ぜて・参加します",
    tip: "誰かのプランに自分を入れてほしいとアピールする表現。「Count me out.（抜かして）」の逆として覚えると便利です。",
    w: ["数えないでください", "参加しません"],
  },
  {
    phrase: "Help yourself.",
    meaning: "ご自由にどうぞ",
    tip: "食べ物や物を自由に使っていいと伝える歓迎の言葉。直訳は「自分でやって」ですが、実際は「遠慮しないで」という意味です。",
    w: ["手伝ってください", "触らないでください"],
  },
  {
    phrase: "Bear in mind.",
    meaning: "念頭においてください・覚えておいて",
    tip: "忘れないよう注意を促す表現。「Keep in mind.」と全く同じ意味で、どちらも会話・ビジネスで使えます。",
    w: ["すぐに忘れていいですよ", "心配しないで"],
  },

  // ══ 確認・理解 ══
  {
    phrase: "Make sense?",
    meaning: "意味わかりますか？・理解できた？",
    tip: "説明した後に相手の理解を確認する定番の一言。「Does that make sense?」の短縮形で、カジュアルな会話でよく使われます。",
    w: ["もう一度言って", "気にしないで"],
  },
  {
    phrase: "Got it.",
    meaning: "わかった・了解",
    tip: "指示や説明を理解したと短く伝える返事。「I got it.」とも言います。仕事でもカジュアルな場でも自然に使えます。",
    w: ["まだわかりません", "取ってきました"],
  },
  {
    phrase: "You know what I mean?",
    meaning: "言いたいこと、わかる？",
    tip: "うまく言葉にできない時に、相手に自分のニュアンスを確認するフレーズ。会話中によく聞くフィラー的な表現でもあります。",
    w: ["私の名前知ってる？", "あなたは何が好き？"],
  },
  {
    phrase: "I get it.",
    meaning: "わかりました・理解しました",
    tip: "「Got it.」と同じ意味ですが、少しだけ強調した感じ。「Now I get it.（今やっとわかった！）」という形でもよく使います。",
    w: ["取ってきます", "全然わかりません"],
  },
  {
    phrase: "Come again?",
    meaning: "もう一度言ってもらえますか？",
    tip: "聞き取れなかった時の丁寧な聞き返し表現。「What?」よりずっと礼儀正しく聞こえます。ビジネスでも使えます。",
    w: ["また来てください", "もう帰りますか？"],
  },
  {
    phrase: "What do you mean?",
    meaning: "どういう意味ですか？",
    tip: "相手の言葉が理解できなかった時に使う自然な返し。驚きや反論のニュアンスで「それってどういうこと？」とも使えます。",
    w: ["何を食べたいですか？", "どこへ行きますか？"],
  },
  {
    phrase: "I'm not sure.",
    meaning: "わかりません・確信が持てません",
    tip: "「I don't know.」より柔らかい表現で、考え中・調べてみる余地を残すニュアンスがあります。ビジネスでも自然です。",
    w: ["確かめました", "絶対にそうです"],
  },

  // ══ 断り・受け入れ ══
  {
    phrase: "Never mind.",
    meaning: "気にしないで・やっぱりいい",
    tip: "一度言ったことを取り消す時や、相手にプレッシャーをかけたくない時に使います。少しがっかりした雰囲気が出ることも。",
    w: ["絶対に覚えておいて", "もう一度やって"],
  },
  {
    phrase: "It's not a big deal.",
    meaning: "大したことじゃないよ",
    tip: "問題を小さく見せる時や相手を安心させる時に使います。自分がミスした時の言い訳にもなりうるので使い所に注意。",
    w: ["これは大問題です", "すぐ直してください"],
  },
  {
    phrase: "I'll pass.",
    meaning: "パスします・遠慮します",
    tip: "参加や提案を穏やかに断る定番フレーズ。「I'll pass on the dessert.（デザートは遠慮します）」のように使えます。",
    w: ["喜んで参加します", "全部もらいます"],
  },
  {
    phrase: "That's too bad.",
    meaning: "それは残念ですね",
    tip: "相手の悪いニュースに共感を示す自然な返し。「I'm sorry to hear that.」より軽めのカジュアルな表現です。",
    w: ["それは最高ですね", "あなたのせいです"],
  },
  {
    phrase: "It is what it is.",
    meaning: "そういうもんだよ・しょうがない",
    tip: "どうにもならない状況を受け入れる時の達観した表現。諦めではなく「現実を受け入れよう」という前向きな意味合いもあります。",
    w: ["もっと頑張ればいい", "絶対に変えられる"],
  },

  // ══ 時間・行動 ══
  {
    phrase: "I'll get it.",
    meaning: "私がやります・私が取ってきます",
    tip: "電話が鳴った時に「私が出る」や、ドアのベルが鳴った時に「私が行く」という場面で使います。申し出る時の便利な一言。",
    w: ["私はできません", "後でやります"],
  },
  {
    phrase: "Let's figure it out.",
    meaning: "一緒に考えよう・どうにかしよう",
    tip: "問題解決に前向きに取り組む姿勢を示します。「I don't know, but let's figure it out.」と繋げると自然です。",
    w: ["もう諦めよう", "誰かに任せよう"],
  },
  {
    phrase: "Hang in there.",
    meaning: "頑張って・くじけないで",
    tip: "苦しんでいる相手を励ます温かい言葉。「Keep going.」より感情的なサポートのニュアンスが強い表現です。",
    w: ["やめていいよ", "ぶら下がって"],
  },
  {
    phrase: "Hold on.",
    meaning: "少し待って",
    tip: "何かを止めてもらう時の短い一言。電話で「少々お待ちください」という場面でもよく使われます。",
    w: ["放してください", "続けてください"],
  },
  {
    phrase: "Catch you later.",
    meaning: "またね・じゃあまた",
    tip: "別れ際のカジュアルな挨拶。「See you later.」と同じ意味ですが、よりスラング的でノリのいい印象を与えます。",
    w: ["今すぐ連絡して", "あとで捕まえる"],
  },

  // ══ 感嘆・雑談 ══
  {
    phrase: "No way!",
    meaning: "まさか！・嘘でしょ！",
    tip: "信じられないことや驚いたことへの強いリアクション。語尾を上げると驚き、語尾を下げると否定の意味になります。",
    w: ["通れません", "もちろんです"],
  },
  {
    phrase: "You're kidding!",
    meaning: "冗談でしょ！・まさか！",
    tip: "驚いた時のリアクションとして非常によく使われます。「You're kidding me!」と言うとより強い驚きが出ます。",
    w: ["冗談を言ってください", "子供ですね"],
  },
  {
    phrase: "Tell me about it.",
    meaning: "まったくだよね・そうそう",
    tip: "「詳しく教えて」ではなく「よーくわかるよ、私も同じ気持ち！」という強い共感の表現。意味が逆になるので注意。",
    w: ["話してください", "それは知りません"],
  },
  {
    phrase: "Long time no see.",
    meaning: "久しぶり！",
    tip: "長い間会っていなかった人に再会した時の定番挨拶。英語では文法的に不自然ですが、慣用句として定着しています。",
    w: ["はじめまして", "またすぐ会いましょう"],
  },
  {
    phrase: "What a small world!",
    meaning: "世間は狭いね！",
    tip: "偶然の出会いや意外な繋がりに驚いた時の表現。「小さな世界だ！」という意味から転じた慣用句です。",
    w: ["地球は広いね", "なんて大きな世界"],
  },
  {
    phrase: "That's news to me.",
    meaning: "初耳です・それは知らなかった",
    tip: "聞いたことがない情報に対する自然な反応。「私にとってはニュースだ」という直訳から来ています。",
    w: ["それはよく知っています", "ニュースを見てください"],
  },
  {
    phrase: "I could use a break.",
    meaning: "少し休みたいな",
    tip: "「could use」は「〜があるといいな」という表現。直接「休みたい」と言うより少し遠回しで柔らかく聞こえます。",
    w: ["全然疲れていません", "休んではいけません"],
  },
  {
    phrase: "It's up to you.",
    meaning: "あなた次第です",
    tip: "判断や決断を相手に委ねる表現。相手にプレッシャーをかけずに選ばせる時や、どちらでもいい時に使います。",
    w: ["私が決めます", "どちらでもいけません"],
  },
  {
    phrase: "Keep it up!",
    meaning: "その調子で続けて！",
    tip: "相手が良い仕事をしている時に褒めながら励ます言葉。「You're doing great, keep it up!」と組み合わせてよく使います。",
    w: ["もうやめて", "元に戻して"],
  },
  {
    phrase: "Be right back.",
    meaning: "すぐ戻ります",
    tip: "席を外す時に伝える短い一言。チャットやゲームでは「BRB」と略されます。「I'll be right back.」の省略形です。",
    w: ["永遠に戻りません", "後で戻ります"],
  },

  // ══ 職場・日常生活 ══
  {
    phrase: "My plate is full.",
    meaning: "手一杯です・いっぱいいっぱいです",
    tip: "仕事が多すぎて余裕がない状態を「皿がいっぱい」に例えた表現。「お皿にもう乗らない」というイメージから来ています。",
    w: ["お皿が汚れています", "もっとください"],
  },
  {
    phrase: "Touch base later.",
    meaning: "後で連絡しましょう",
    tip: "後で確認や連絡を取り合うことを軽く約束する表現。野球の「塁（base）に触れる」から来たビジネス定番フレーズです。",
    w: ["もう連絡しません", "今すぐ話しましょう"],
  },
  {
    phrase: "Get the ball rolling.",
    meaning: "物事を始める・取り掛かろう",
    tip: "ボールを転がし始めるイメージから、計画や仕事をスタートさせることを指します。「Let's get the ball rolling!」と使えます。",
    w: ["ボールを止める", "ゆっくり進める"],
  },
  {
    phrase: "You're all set.",
    meaning: "準備万端ですよ・大丈夫ですよ",
    tip: "相手が必要なものを全て揃えた時や、手続きが完了した時に伝える安心の一言。ホテルや店でよく耳にします。",
    w: ["まだ準備できていません", "全部やり直して"],
  },
  {
    phrase: "I'll take care of it.",
    meaning: "私が対処します・任せてください",
    tip: "問題や仕事を自分が解決すると申し出る表現。「Leave it to me.」と似ていますが、より具体的な行動のニュアンスがあります。",
    w: ["私には無理です", "誰かに頼んでください"],
  },
  {
    phrase: "Can you cover for me?",
    meaning: "代わりにやってもらえる？",
    tip: "代役をお願いする時のフレンドリーな依頼。仕事の代わりだけでなく「ちょっと言い訳してくれる？」という場面でも使います。",
    w: ["私を隠してください", "一緒に来てください"],
  },
  {
    phrase: "Let's get to it.",
    meaning: "さっそく取り掛かろう",
    tip: "話より行動を促すやる気のある表現。「Let's get started.」とほぼ同じ意味ですが、より口語的でテンポが良い言い方。",
    w: ["もう少し待ちましょう", "やめましょう"],
  },
  {
    phrase: "On it.",
    meaning: "取り掛かっています・了解",
    tip: "指示を受けてすぐに動くことを示す簡潔な返答。「I'm on it.」の省略形で、忙しいやり取りの中でサクッと使えます。",
    w: ["その上にいます", "まだ始めていません"],
  },
  {
    phrase: "Wrap it up.",
    meaning: "まとめましょう・終わりにしよう",
    tip: "会議や作業を締めくくる時に使います。「時間が来たので終わりにしよう」というニュアンスで、少し急かす感じもあります。",
    w: ["もっと続けましょう", "包んでください"],
  },
  {
    phrase: "That's a good point.",
    meaning: "良い指摘ですね",
    tip: "相手の意見を評価して議論を前向きに進める表現。相手の発言を受け止めつつ会話をスムーズにつなぐ便利なフレーズです。",
    w: ["鉛筆がいいですね", "その点は間違っています"],
  },

  // ══ 感謝・関係 ══
  {
    phrase: "I owe you one.",
    meaning: "一つ借りができたね・ありがとう",
    tip: "助けてもらった時に「今度お礼するね」というニュアンスで使います。「You owe me one.（借りができたね）」とも言えます。",
    w: ["あなたに貸します", "お金を返して"],
  },
  {
    phrase: "No hard feelings.",
    meaning: "悪く思わないでね・わだかまりなしで",
    tip: "関係を良く保ちたい時に使う大人なフレーズ。断った後や意見が分かれた後に「気にしないでね」と関係を修復する時に使います。",
    w: ["とても怒っています", "気持ちが固いです"],
  },
  {
    phrase: "My pleasure.",
    meaning: "こちらこそ・喜んで",
    tip: "「Thank you」への返答として「You're welcome」より温かみがあります。「それが私の喜びです」というニュアンスで、相手に感謝されるのも嬉しいという姿勢が伝わります。",
    w: ["私の苦しみです", "大変でした"],
  },
  {
    phrase: "I appreciate it.",
    meaning: "ありがとうございます（感謝しています）",
    tip: "「Thank you」より少し丁寧で心のこもった感謝表現。ビジネスメールや少しフォーマルな場面でも自然に使えます。",
    w: ["全然嬉しくないです", "必要ありません"],
  },
  {
    phrase: "Don't mention it.",
    meaning: "どういたしまして・気にしないで",
    tip: "お礼に対する謙虚な返し方。「わざわざ言うほどのことじゃない」というニュアンスで、相手への親しみが感じられます。",
    w: ["必ず話してください", "もっと感謝して"],
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
