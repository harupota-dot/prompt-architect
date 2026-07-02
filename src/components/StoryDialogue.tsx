'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── TTS ──────────────────────────────────────────────────────────
function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.85;
  window.speechSynthesis.speak(utt);
}

function SpeakBtn({ text, size = 'sm' }: { text: string; size?: 'sm' | 'xs' }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); speak(text); }}
      className={`flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 active:scale-90 transition-all ${
        size === 'sm' ? 'w-8 h-8 text-base' : 'w-6 h-6 text-xs'
      }`}
      aria-label="発音を聞く"
    >🔊</button>
  );
}

// ─── Types ────────────────────────────────────────────────────────
interface DialogueItem {
  situation: string;
  prompt: { en: string; ja: string };
  correct: 'A' | 'B';
  A: { en: string; ja: string };
  B: { en: string; ja: string };
  tip: string;
}

type CourseId = 'daily' | 'hawaii';

// ─── Shuffle ──────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════════
// ☀️ DAILY COURSE — 朝から夜まで（50問）
// ═══════════════════════════════════════════════════════════════════
const DAILY_DATA: DialogueItem[] = [
  // ── 朝の目覚め ──
  {
    situation: '☀️ 朝の目覚め',
    prompt: { en: "Good morning! Did you sleep well?", ja: "おはよう！よく眠れた？" },
    correct: 'A',
    A: { en: "Yeah, I slept like a log.", ja: "うん、ぐっすり眠れたよ。" },
    B: { en: "Good night, see you tomorrow.", ja: "おやすみ、また明日。" },
    tip: '「slept like a log（丸太のように眠った）」は「ぐっすり眠った」の定番イディオム。like a log の log は「丸太」で、動かない丸太のように熟睡したことを表します。',
  },
  {
    situation: '☀️ 朝の目覚め',
    prompt: { en: "Time to get up! You're going to be late!", ja: "起きる時間よ！遅刻するよ！" },
    correct: 'A',
    A: { en: "Five more minutes, please!", ja: "あと5分だけ！" },
    B: { en: "I'll go to bed now.", ja: "今から寝ます。" },
    tip: '「Five more minutes」は日常でよく聞くフレーズ。"more" を使うことで「追加でもう〜」というニュアンスになります。Five の fi と more の m がリンクして「ファイヴモア」と一息で発音されます。',
  },
  {
    situation: '☀️ 朝の目覚め',
    prompt: { en: "How did you sleep?", ja: "眠れた？" },
    correct: 'A',
    A: { en: "Not great. I kept waking up.", ja: "あまりよくなかった。何度も目が覚めて。" },
    B: { en: "I'm heading out now.", ja: "今から外出します。" },
    tip: '「kept -ing」は「何度も〜し続けた」という繰り返しのニュアンス。I kept waking up で「何度も目が覚め続けた」という状態を表します。kept は keep の過去形。',
  },
  {
    situation: '☀️ 朝の目覚め',
    prompt: { en: "Are you up yet?", ja: "もう起きてる？" },
    correct: 'A',
    A: { en: "Yeah, just getting ready.", ja: "うん、今準備してるよ。" },
    B: { en: "I'll go to sleep now.", ja: "今から寝ます。" },
    tip: '「yet」を疑問文で使うと「もう〜した？」という確認の意味。Are you up yet? の yet は「もう」。getting ready は「準備中」で、現在進行形が自然な口語表現です。',
  },
  {
    situation: '☀️ 朝の目覚め',
    prompt: { en: "Coffee's ready!", ja: "コーヒーが入ったよ！" },
    correct: 'A',
    A: { en: "Oh, thank you! I really need it.", ja: "ありがとう！本当に助かる。" },
    B: { en: "I'm not thirsty at all.", ja: "全然のどが渇いてないよ。" },
    tip: '「I really need it」の really は強調の副詞。「本当に必要だ」という感謝と本音が伝わります。Coffee の ff が s の前でリンクして「コフィーズ」と発音します。',
  },
  // ── 朝食 ──
  {
    situation: '🍳 朝食',
    prompt: { en: "What do you want for breakfast?", ja: "朝食は何がいい？" },
    correct: 'A',
    A: { en: "Just toast and coffee for me.", ja: "トーストとコーヒーだけでいいよ。" },
    B: { en: "I'm heading out right now.", ja: "今すぐ出かけます。" },
    tip: '「Just 〜 for me」は「私は〜だけでいい」という軽い断りのニュアンス。「for me」をつけることで「私の場合は」という個人の好みを表せます。とても便利な口語表現です。',
  },
  {
    situation: '🍳 朝食',
    prompt: { en: "Breakfast is getting cold!", ja: "朝食が冷めちゃうよ！" },
    correct: 'A',
    A: { en: "I'll be right there!", ja: "今すぐ行く！" },
    B: { en: "I'll have lunch instead.", ja: "代わりにランチを食べます。" },
    tip: '「I\'ll be right there!」の right は「すぐに・ちょうど」という強調の副詞。「right now（今すぐ）」と同じ用法です。there と here がリンクして「アイルビーライッデア」と流れます。',
  },
  {
    situation: '🍳 朝食',
    prompt: { en: "Do you want eggs?", ja: "卵はいる？" },
    correct: 'A',
    A: { en: "Yes, please! Scrambled, if you don't mind.", ja: "はい！スクランブルエッグでお願いします。" },
    B: { en: "I'm not hungry at all.", ja: "全然お腹空いてない。" },
    tip: '「if you don\'t mind（よければ・もしよかったら）」は依頼や注文を柔らかくする丁寧な表現。「don\'t mind」の d と m がリンキングして「ドントゥマインド」と聞こえます。',
  },
  {
    situation: '🍳 朝食',
    prompt: { en: "Did you eat breakfast?", ja: "朝食は食べた？" },
    correct: 'A',
    A: { en: "I skipped it. I was running late.", ja: "抜かした。遅刻しそうだったから。" },
    B: { en: "Let me sleep a little more.", ja: "もう少し寝かせて。" },
    tip: '「running late（遅刻しそう）」は「時間が間に合わない」状態のよく使われる表現。「I was running late」はフラッピングで running の ng と late の l がつながり「ランニンレイト」のように発音されます。',
  },
  {
    situation: '🍳 朝食',
    prompt: { en: "Try this! I made pancakes.", ja: "食べてみて！パンケーキ作ったよ。" },
    correct: 'A',
    A: { en: "They look amazing! Thank you!", ja: "すごくおいしそう！ありがとう！" },
    B: { en: "No thanks, I already had dinner.", ja: "いや、もう夕食食べたから。" },
    tip: '「They look amazing!」の look は「見た目が〜だ」という感覚動詞。taste（味）、smell（匂い）、look（見た目）のように五感を表す動詞は補語に形容詞をとります。',
  },
  // ── 通勤 ──
  {
    situation: '🚃 通勤',
    prompt: { en: "You look tired this morning.", ja: "今朝は疲れた顔してるね。" },
    correct: 'A',
    A: { en: "Yeah, the train was packed.", ja: "うん、電車がすごく混んでたから。" },
    B: { en: "Good evening! Have a nice day.", ja: "こんばんは！良い一日を。" },
    tip: '「packed（満員の・ぎゅうぎゅうの）」は電車・バスの混雑を表す定番単語。「packed train」は満員電車のこと。pack は「詰め込む」という動詞から来ています。',
  },
  {
    situation: '🚃 通勤',
    prompt: { en: "Are you taking the train?", ja: "電車で行くの？" },
    correct: 'A',
    A: { en: "Yeah, the 8:15 one.", ja: "うん、8時15分のに乗る。" },
    B: { en: "I already arrived.", ja: "もう到着しました。" },
    tip: '「the 8:15 one」の one は前に出た名詞（train）の代わり。「the 8:15 train」と言わずに one で受けるのが自然な口語。時刻の読み方は「エイトフィフティーン」が一般的です。',
  },
  {
    situation: '🚃 通勤',
    prompt: { en: "We're running behind schedule.", ja: "スケジュールより遅れているね。" },
    correct: 'A',
    A: { en: "Don't worry, we'll make it.", ja: "大丈夫、間に合うよ。" },
    B: { en: "Goodnight, everyone!", ja: "みなさん、おやすみなさい！" },
    tip: '「make it（間に合う・やり遂げる）」は非常に便利な句動詞。「間に合う」「参加できる」「成功する」など文脈で意味が変わります。"we\'ll make it" で「何とかなるよ」という前向きな表現に。',
  },
  {
    situation: '🚃 通勤',
    prompt: { en: "Excuse me, is this seat taken?", ja: "すみません、この席は空いていますか？" },
    correct: 'A',
    A: { en: "No, go ahead.", ja: "空いてます、どうぞ。" },
    B: { en: "Yes, please sit down.", ja: "はい、どうぞ座ってください。" },
    tip: '「Is this seat taken?」は席が埋まっているかを確認する定番フレーズ。「No, go ahead」の no は「空いてない（人はいない）→どうぞ」という意味。肯定・否定が日本語と逆になる点に注意！',
  },
  {
    situation: '🚃 通勤',
    prompt: { en: "The train is delayed again.", ja: "また電車が遅延してる。" },
    correct: 'A',
    A: { en: "Ugh, not again...", ja: "またか、もう…" },
    B: { en: "Perfect! Right on time.", ja: "完璧！ちょうどいい時間だ。" },
    tip: '「Not again...」は「またか・勘弁してよ」といううんざりした気持ちを表す慣用的な表現。Ugh（アッ）は不満や嫌悪を表す感嘆詞で、文字通りのため息の音です。',
  },
  // ── 職場 ──
  {
    situation: '🏢 職場・学校',
    prompt: { en: "Good morning, everyone!", ja: "みなさん、おはようございます！" },
    correct: 'A',
    A: { en: "Morning! Ready for the meeting?", ja: "おはよう！会議の準備できてる？" },
    B: { en: "Good night! See you tomorrow.", ja: "おやすみ！また明日。" },
    tip: '「Morning!」は "Good morning!" の省略形で、職場でよく使われるカジュアルな挨拶。"Ready for 〜?" は「〜の準備はできてる？」という確認フレーズ。ready の d がフラッピングして「レリ」のように聞こえます。',
  },
  {
    situation: '🏢 職場・学校',
    prompt: { en: "Can you help me with this?", ja: "これ手伝ってくれる？" },
    correct: 'A',
    A: { en: "Sure, what do you need?", ja: "もちろん、何が必要？" },
    B: { en: "I'm heading home for the day.", ja: "今日はもう帰ります。" },
    tip: '「What do you need?」は「何が必要ですか？」という自然な助けの申し出。"what" の wh は「ワット」ではなく「ワッ(ト)」のように語末の t が弱くなります。',
  },
  {
    situation: '🏢 職場・学校',
    prompt: { en: "The meeting starts in 5 minutes.", ja: "会議があと5分で始まるよ。" },
    correct: 'A',
    A: { en: "I'll be right there.", ja: "すぐ行きます。" },
    B: { en: "See you next week.", ja: "また来週。" },
    tip: '「in 5 minutes（5分後に）」の in は「〜後に」という未来を指す前置詞。「I\'ll be right there」の right は「ちょうど・今すぐ」を強調する副詞。be there で「そこに行く」というニュアンスです。',
  },
  {
    situation: '🏢 職場・学校',
    prompt: { en: "Great work on that presentation!", ja: "あのプレゼン、素晴らしかったよ！" },
    correct: 'A',
    A: { en: "Thank you! I'm glad it went well.", ja: "ありがとう！うまくいってよかった。" },
    B: { en: "It was all your fault.", ja: "全部あなたのせいです。" },
    tip: '「I\'m glad it went well」は「うまくいってよかった」という安堵と喜びの表現。"went well" は go well の過去形で、「順調に進んだ」という意味。日本語の「うまくいった」にぴったり対応します。',
  },
  {
    situation: '🏢 職場・学校',
    prompt: { en: "Can we push the deadline?", ja: "締め切りを延ばせる？" },
    correct: 'A',
    A: { en: "Let me check the schedule.", ja: "スケジュールを確認させて。" },
    B: { en: "I already finished everything.", ja: "もう全部終わりました。" },
    tip: '「push the deadline（締め切りを押し延ばす）」の push は「後ろに押す＝延期する」というビジネス口語表現。「Let me 〜」は「〜させてください」という柔らかい依頼。check の ck と the が繋がって「チェッキャ」のように聞こえます。',
  },
  // ── 昼食 ──
  {
    situation: '🍱 昼食',
    prompt: { en: "What do you want for lunch?", ja: "ランチは何がいい？" },
    correct: 'A',
    A: { en: "I'm down for anything.", ja: "何でもいいよ。" },
    B: { en: "I'm already full, thanks.", ja: "もうお腹いっぱいだよ。" },
    tip: '「I\'m down for anything」の down for は「〜に乗り気・〜でいい」という口語表現。"I\'m in for anything" も似た表現。「何でもOK」という柔軟さをノリよく伝えられます。',
  },
  {
    situation: '🍱 昼食',
    prompt: { en: "Have you eaten yet?", ja: "もう食べた？" },
    correct: 'A',
    A: { en: "Not yet. Want to grab lunch together?", ja: "まだ。一緒にランチしない？" },
    B: { en: "I'm cooking dinner right now.", ja: "今夕食を作っています。" },
    tip: '「grab lunch（ランチをさっと食べる）」の grab は「素早く取る」という意味から、「さっとランチを済ませる」という口語フレーズに。grab a coffee（コーヒーをちょっと飲む）なども同様の使い方です。',
  },
  {
    situation: '🍱 昼食',
    prompt: { en: "This place is packed.", ja: "ここ混んでるね。" },
    correct: 'A',
    A: { en: "Yeah, let's try somewhere else.", ja: "そうだね、別のところにしよう。" },
    B: { en: "Good morning! Welcome.", ja: "おはようございます！いらっしゃいませ。" },
    tip: '「somewhere else（どこか別の場所）」は else を使って「他の〜」を表す表現。somewhere else、someone else、something else のように else は「他の」という意味を追加します。',
  },
  {
    situation: '🍱 昼食',
    prompt: { en: "Do you want dessert?", ja: "デザートはどう？" },
    correct: 'A',
    A: { en: "I'll pass. I'm watching my sugar intake.", ja: "遠慮しとく。糖分を控えてるから。" },
    B: { en: "I'm starving! Let's order more!", ja: "お腹ペコペコ！もっと頼もう！" },
    tip: '「I\'ll pass（遠慮します・パスします）」は断る時の定番フレーズ。「watching my 〜（〜に気をつけている）」は健康管理の文脈でよく使います。watching my weight（体重管理）、watching my budget（予算管理）なども同様。',
  },
  {
    situation: '🍱 昼食',
    prompt: { en: "How's your food?", ja: "料理はどう？" },
    correct: 'A',
    A: { en: "It's delicious! Really hitting the spot.", ja: "おいしい！ちょうど食べたかったやつ。" },
    B: { en: "I haven't ordered yet.", ja: "まだ注文してないです。" },
    tip: '「hitting the spot（ちょうど欲しかったものを満たす）」は食べ物や飲み物が「ちょうどいい！」「これが食べたかった！」という感覚を表すイディオム。spot の t がフラッピングして「スパリン」のように聞こえます。',
  },
  // ── 午後 ──
  {
    situation: '🌤️ 午後',
    prompt: { en: "I have so much work to do.", ja: "やること多すぎる〜。" },
    correct: 'A',
    A: { en: "Hang in there! You've got this.", ja: "頑張って！あなたならできる。" },
    B: { en: "Great job! You're all done.", ja: "お疲れ様！もう終わりだよ。" },
    tip: '「You\'ve got this」は「あなたならできる」という現代英語の励まし表現。got の t がフラッピングして「ガリス」のように聞こえます。「Hang in there（そこにしがみついて＝頑張って）」も合わせて覚えておきましょう。',
  },
  {
    situation: '🌤️ 午後',
    prompt: { en: "Do you have a minute?", ja: "少し時間ある？" },
    correct: 'A',
    A: { en: "Sure, what's up?", ja: "もちろん、どうしたの？" },
    B: { en: "I'm sleeping right now.", ja: "今寝てます。" },
    tip: '「Do you have a minute?（少し時間ある？）」は何かを相談・確認したい時の前置き。「what\'s up?」は「どうしたの？/何があったの？」という定番の聞き方。what\'s の ts と up がリンクして「ワッサップ」と聞こえます。',
  },
  {
    situation: '🌤️ 午後',
    prompt: { en: "Let's take a short break.", ja: "少し休憩しよう。" },
    correct: 'A',
    A: { en: "Great idea. I could use one.", ja: "いい考え。休みたかったんだ。" },
    B: { en: "I'm asleep. Wake me up later.", ja: "寝てます。後で起こして。" },
    tip: '「I could use 〜（〜があるといいな）」は欲しいものや状況を柔らかく表す表現。I could use a break（休憩したい）、I could use a coffee（コーヒーが飲みたい）のように使います。直接的に言うより丁寧な印象に。',
  },
  {
    situation: '🌤️ 午後',
    prompt: { en: "Can you send me that file?", ja: "あのファイル送ってもらえる？" },
    correct: 'A',
    A: { en: "Sure, I'll send it now.", ja: "もちろん、今すぐ送ります。" },
    B: { en: "I've never seen that file.", ja: "そのファイル見たことない。" },
    tip: '「I\'ll send it now」の it は前に出た the file を指す代名詞。"I\'ll" は "I will" の短縮形で、会話では必ずこちらを使います。send it の t と n がリンクして「センディット」のように流れます。',
  },
  {
    situation: '🌤️ 午後',
    prompt: { en: "I'm heading out for coffee. Want anything?", ja: "コーヒー買いに行くけど、何かいる？" },
    correct: 'A',
    A: { en: "A latte would be great, thanks!", ja: "ラテがいい！ありがとう！" },
    B: { en: "I'm going home early today.", ja: "今日は早退します。" },
    tip: '「Would be great（〜してもらえたら嬉しい）」は would を使うことで丁寧さが増す表現。"That would be great!" も受け取った時の感謝として定番。latte の tt がフラッピングして「ラリ」のように聞こえます。',
  },
  // ── 帰宅前 ──
  {
    situation: '🏠 帰宅前',
    prompt: { en: "I'm heading home now.", ja: "もう帰るよ。" },
    correct: 'A',
    A: { en: "Get home safe!", ja: "気をつけて帰ってね！" },
    B: { en: "Welcome! Come on in.", ja: "いらっしゃい！入って。" },
    tip: '「Get home safe」は別れ際の定番フレーズ。「safe（安全に）」は副詞的に使っていて "safely" の口語版。"Safe travels!" や "Drive safe!" も同様のパターン。get と home がリンクして「ゲッホーム」のように発音されます。',
  },
  {
    situation: '🏠 帰宅前',
    prompt: { en: "Long day, huh?", ja: "長い一日だったね？" },
    correct: 'A',
    A: { en: "You're telling me. I'm exhausted.", ja: "本当だよ。もうクタクタ。" },
    B: { en: "The day just started!", ja: "まだ一日が始まったばかりだよ。" },
    tip: '「You\'re telling me（言わなくてもわかってるよ）」は相手の言葉に「そうそう！まったくだよ！」と強く同意する表現。"Tell me about it" と同じ意味でとても口語的。huh は驚きや確認を求める発音記号的な発音です。',
  },
  {
    situation: '🏠 帰宅前',
    prompt: { en: "Want to grab a drink after work?", ja: "仕事の後、一杯どう？" },
    correct: 'A',
    A: { en: "Sounds good! I could use one.", ja: "いいね！一杯やりたかった。" },
    B: { en: "I'm going to bed right now.", ja: "今すぐ寝ます。" },
    tip: '「Sounds good!」は提案への賛成の定番フレーズ。"Sounds great!" "Sounds fun!" と形容詞を変えて使えます。"grab a drink（一杯やる）" の grab は「さっと取る→さくっと飲む」というカジュアルなニュアンスです。',
  },
  {
    situation: '🏠 帰宅前',
    prompt: { en: "See you tomorrow!", ja: "また明日！" },
    correct: 'A',
    A: { en: "See you! Have a good evening!", ja: "またね！良い夜を！" },
    B: { en: "Good morning! Have a great day!", ja: "おはよう！良い一日を！" },
    tip: '「Have a good evening」は別れの挨拶の定番。morning（朝）、afternoon（昼）、evening（夜）と時間帯に応じて使い分けましょう。"See you!" の you の y がリンクして「シーヤ!」のように聞こえます。',
  },
  {
    situation: '🏠 帰宅前',
    prompt: { en: "Are you done for today?", ja: "今日はもう終わり？" },
    correct: 'A',
    A: { en: "Yeah, finally! Packing up now.", ja: "そう、やっと！今片付けてるよ。" },
    B: { en: "I just got here!", ja: "今ここに来たばかりです！" },
    tip: '「Finally!（やっと！）」は待ちに待った状況への安堵感の表現。Packing up は「荷物をまとめる・片付ける」という意味。"done for today" は「今日の分は終わった」という表現で仕事の終わりに使います。',
  },
  // ── 夕食 ──
  {
    situation: '🍽️ 夕食',
    prompt: { en: "What's for dinner?", ja: "夕食は何？" },
    correct: 'A',
    A: { en: "I was thinking pasta tonight.", ja: "今夜はパスタにしようと思ってた。" },
    B: { en: "Breakfast is almost ready!", ja: "朝食がもうすぐ出来ます！" },
    tip: '「I was thinking 〜（〜しようと思ってた）」の was thinking は過去進行形で「心の中で考えていた」というニュアンス。直接「パスタにしよう」と言うより柔らかい提案の言い方です。',
  },
  {
    situation: '🍽️ 夕食',
    prompt: { en: "Do you want to eat out?", ja: "外食する？" },
    correct: 'A',
    A: { en: "Sure! What are you feeling?", ja: "いいよ！何が食べたい？" },
    B: { en: "I already had a big lunch.", ja: "ランチをたくさん食べたから。" },
    tip: '「What are you feeling?（何が食べたい気分？）」はレストランを選ぶ時の定番フレーズ。feel は「〜の気分だ」という意味でも使います。"I\'m feeling Italian.（イタリアン気分）" のような言い方も自然。',
  },
  {
    situation: '🍽️ 夕食',
    prompt: { en: "This is delicious!", ja: "これおいしい！" },
    correct: 'A',
    A: { en: "Thank you! It's my mom's recipe.", ja: "ありがとう！お母さんのレシピなんだ。" },
    B: { en: "I haven't tried it yet.", ja: "まだ試してません。" },
    tip: '「It\'s my mom\'s recipe」の所有格（\'s）は料理のルーツを伝える自然な言い方。"my mom\'s" の m\'s と recipe の r がリンクして「マムズレシピ」と一息で発音されます。',
  },
  {
    situation: '🍽️ 夕食',
    prompt: { en: "Save room for dessert!", ja: "デザートのためにお腹を空けておいて！" },
    correct: 'A',
    A: { en: "Oh, I'll definitely make room!", ja: "もちろん、絶対食べる！" },
    B: { en: "I'm still fast asleep.", ja: "まだぐっすり寝ています。" },
    tip: '「Save room（お腹に場所を残す）」は食事中に「まだデザートがある！」と伝える表現。"make room" も同様。room には「物理的な部屋」以外に「スペース・余地」という意味があります。',
  },
  {
    situation: '🍽️ 夕食',
    prompt: { en: "Can you pass the salt?", ja: "塩を取ってもらえる？" },
    correct: 'A',
    A: { en: "Sure, here you go.", ja: "どうぞ。" },
    B: { en: "It's in the refrigerator.", ja: "冷蔵庫に入ってます。" },
    tip: '「Here you go（はい、どうぞ）」は物を手渡す時の定番フレーズ。"Here you are" も同じ意味。go の g と you の y がリンクして「ヒアヤゴー」のように発音されます。日本語の「はい」にぴったり対応。',
  },
  // ── 夜のくつろぎ ──
  {
    situation: '🛋️ 夜のくつろぎ',
    prompt: { en: "What should we watch?", ja: "何を見ようか？" },
    correct: 'A',
    A: { en: "How about that new show everyone's talking about?", ja: "みんなが話してる新しいドラマはどう？" },
    B: { en: "Time to wake up and start the day!", ja: "起きて一日を始める時間だよ！" },
    tip: '「everyone\'s talking about」は「みんなが話題にしている」という現在進行形の関係節。"that show everyone\'s talking about" で「みんなが話題にしているあのドラマ」という意味になります。',
  },
  {
    situation: '🛋️ 夜のくつろぎ',
    prompt: { en: "I can't believe that ending!", ja: "あのエンディングは信じられない！" },
    correct: 'A',
    A: { en: "Right? I didn't see that coming at all!", ja: "でしょ！全然予想できなかった！" },
    B: { en: "Good morning! It's a new day.", ja: "おはよう！新しい一日が始まるよ。" },
    tip: '「I didn\'t see that coming（予想できなかった）」は「先が見えなかった」というイディオム。予期しない出来事への驚きを表す定番表現。"Right?（でしょ？）" は同意を求める/示す最短フレーズ。',
  },
  {
    situation: '🛋️ 夜のくつろぎ',
    prompt: { en: "Do you want some tea?", ja: "お茶はいる？" },
    correct: 'A',
    A: { en: "Yes, please. That sounds lovely.", ja: "ぜひ。それは嬉しいな。" },
    B: { en: "I'm on my way to work.", ja: "仕事に向かっています。" },
    tip: '「That sounds lovely（それは素敵だね・嬉しいな）」の sounds は感覚動詞で「〜のように聞こえる→〜な感じがする」という意味。lovely は「素敵な・愛らしい」という意味で、イギリス英語ではよく使われます。',
  },
  {
    situation: '🛋️ 夜のくつろぎ',
    prompt: { en: "How was your day overall?", ja: "今日一日、全体的にどうだった？" },
    correct: 'A',
    A: { en: "Busy but good. How about yours?", ja: "忙しかったけど良かった。あなたは？" },
    B: { en: "It hasn't started yet!", ja: "まだ始まってないよ！" },
    tip: '「Busy but good（忙しかったけど良かった）」は充実した一日を簡潔に表す定番の返し方。"How about yours?（あなたは？）" で会話を相手に返すのが自然な会話の流れです。',
  },
  {
    situation: '🛋️ 夜のくつろぎ',
    prompt: { en: "Let's just relax tonight.", ja: "今夜はゆっくりしようよ。" },
    correct: 'A',
    A: { en: "Sounds perfect. I'm exhausted.", ja: "最高だね。もうクタクタ。" },
    B: { en: "Let's go running then!", ja: "じゃあランニングしよう！" },
    tip: '「Sounds perfect（最高だね）」は提案への熱烈な賛同。"Sounds + 形容詞" は相手の言葉への反応として非常によく使われるパターン。exhausted（へとへとの）は tired より強い疲労感を表します。',
  },
  // ── 就寝 ──
  {
    situation: '🌙 就寝',
    prompt: { en: "I'm going to bed. Night!", ja: "寝るね。おやすみ！" },
    correct: 'A',
    A: { en: "Good night! Sleep well.", ja: "おやすみ！ゆっくり休んでね。" },
    B: { en: "Good morning! Rise and shine.", ja: "おはよう！起きる時間だよ。" },
    tip: '「Sleep well（よく眠って）」は別れの「おやすみ」に添える定番フレーズ。well は「良く・十分に」という副詞。"Sweet dreams!（良い夢を！）" も合わせて覚えておきましょう。',
  },
  {
    situation: '🌙 就寝',
    prompt: { en: "I can't sleep.", ja: "眠れない。" },
    correct: 'A',
    A: { en: "Try some deep breathing. It usually helps.", ja: "腹式呼吸を試してみて。大体効くよ。" },
    B: { en: "You should eat more.", ja: "もっと食べたほうがいいよ。" },
    tip: '「deep breathing（深呼吸）」は健康・リラックスの文脈でよく使われる単語。"It usually helps" の usually（たいてい・普通は）は「必ず」ではなく「多くの場合」というニュアンス。',
  },
  {
    situation: '🌙 就寝',
    prompt: { en: "Don't forget to set your alarm.", ja: "アラームのセットを忘れずに。" },
    correct: 'A',
    A: { en: "Already done. Thanks for reminding me.", ja: "もうやったよ。気づかせてくれてありがとう。" },
    B: { en: "I'll stay up all night.", ja: "徹夜します。" },
    tip: '「Thanks for reminding me（気づかせてくれてありがとう）」は reminder（リマインダー）に感謝する丁寧な表現。"Don\'t forget to 〜" と "Remember to 〜" は同じ意味で使えます。',
  },
  {
    situation: '🌙 就寝',
    prompt: { en: "I'm so tired. What a day.", ja: "疲れた〜。今日はキツかったな。" },
    correct: 'A',
    A: { en: "I know, right? Get some rest.", ja: "わかる！しっかり休んで。" },
    B: { en: "The day just started!", ja: "まだ一日が始まったばかりだよ！" },
    tip: '「What a day!（なんて一日だ！）」は良い意味にも悪い意味にも使える感嘆表現。「I know, right?（わかる！でしょ！）」は相手への強い共感を示す口語フレーズで、アメリカ英語で特によく耳にします。',
  },
  {
    situation: '🌙 就寝',
    prompt: { en: "Sleep well!", ja: "ゆっくり眠ってね！" },
    correct: 'A',
    A: { en: "You too! See you in the morning.", ja: "あなたもね！また朝に。" },
    B: { en: "Good morning! I'm ready.", ja: "おはよう！準備できてるよ。" },
    tip: '「You too!（あなたもね！）」は相手の挨拶やお礼を相手に返す最短の返し方。"See you in the morning" は「朝にまた会おう」という意味で、家族や同居人との就寝前の挨拶として自然です。',
  },
];

// ═══════════════════════════════════════════════════════════════════
// 🌴 HAWAII COURSE — ハワイ旅行・ホテル滞在（40問）
// ═══════════════════════════════════════════════════════════════════
const HAWAII_DATA: DialogueItem[] = [
  // ── 空港・到着 ──
  {
    situation: '✈️ 空港・入国審査',
    prompt: { en: "What's the purpose of your visit?", ja: "訪問の目的は何ですか？" },
    correct: 'A',
    A: { en: "Just vacation.", ja: "観光です。" },
    B: { en: "Check, please.", ja: "お会計をお願いします。" },
    tip: '「Just vacation」は "For vacation." や "Tourism." と同じく入国審査の定番回答。other options: business（仕事）、visiting family（家族の訪問）。短く明確に答えるのがコツです。',
  },
  {
    situation: '✈️ 空港・入国審査',
    prompt: { en: "How long will you be staying?", ja: "どれくらい滞在されますか？" },
    correct: 'A',
    A: { en: "About a week.", ja: "約1週間です。" },
    B: { en: "I'm checking out now.", ja: "今チェックアウトします。" },
    tip: '「About a week（約1週間）」の about は「約・だいたい」という意味の前置詞。期間の答え方: a week（1週間）、10 days（10日間）、two weeks（2週間）のように言えます。',
  },
  {
    situation: '✈️ 空港・入国審査',
    prompt: { en: "Do you have anything to declare?", ja: "申告するものはありますか？" },
    correct: 'A',
    A: { en: "No, nothing to declare.", ja: "いいえ、申告するものはありません。" },
    B: { en: "Room service, please.", ja: "ルームサービスをお願いします。" },
    tip: '「Nothing to declare（申告なし）」は税関審査の定番フレーズ。declare は「申告する・宣言する」という意味。申告が必要なものは food（食品）、cash over $10,000（1万ドル以上の現金）などです。',
  },
  {
    situation: '✈️ 空港・入国審査',
    prompt: { en: "Can I see your passport, please?", ja: "パスポートを見せていただけますか？" },
    correct: 'A',
    A: { en: "Sure, here you go.", ja: "はい、どうぞ。" },
    B: { en: "I'd like to check in.", ja: "チェックインをしたいです。" },
    tip: '「Here you go（はい、どうぞ）」は物を渡す時の定番フレーズ。"Here you are." も同じ意味。パスポートを渡す、商品を渡すなど日常的に使える万能フレーズです。',
  },
  {
    situation: '✈️ 空港・入国審査',
    prompt: { en: "Welcome to Hawaii! Enjoy your stay.", ja: "ハワイへようこそ！良い滞在を。" },
    correct: 'A',
    A: { en: "Thank you! I'm so excited to be here!", ja: "ありがとうございます！来られて本当に嬉しいです！" },
    B: { en: "Check please. I'm in a hurry.", ja: "お会計を。急いでいます。" },
    tip: '「I\'m so excited to be here!（ここに来られて本当にワクワクしています！）」は旅先での喜びを伝える自然な表現。excited の d がフラッピングして「エクサイリッド」のように聞こえます。',
  },
  // ── タクシー・交通 ──
  {
    situation: '🚕 タクシー・交通',
    prompt: { en: "Where to, sir?", ja: "どちらまで？" },
    correct: 'A',
    A: { en: "To the BrightonStar Hotel, please.", ja: "ブライトンスターホテルまでお願いします。" },
    B: { en: "Here is your change.", ja: "おつりです。" },
    tip: '「Where to?」はタクシーで必ず聞かれる短縮形。「Where would you like to go?」の省略。目的地を言う時は "To the 〜, please" が定番。please を添えると丁寧な印象になります。',
  },
  {
    situation: '🚕 タクシー・交通',
    prompt: { en: "How far is it to Waikiki?", ja: "ワイキキまでどのくらいかかりますか？" },
    correct: 'A',
    A: { en: "About 20 minutes from here.", ja: "ここから約20分です。" },
    B: { en: "Go straight and turn left.", ja: "まっすぐ行って左に曲がってください。" },
    tip: '「About 20 minutes from here」は距離を時間で答える自然な言い方。"it takes about 〜" も同じ意味。日本語でも「〜分くらい」と言うのと同じ感覚です。',
  },
  {
    situation: '🚕 タクシー・交通',
    prompt: { en: "Can you turn on the meter?", ja: "メーターをつけてもらえますか？" },
    correct: 'A',
    A: { en: "Of course, sir.", ja: "もちろんです。" },
    B: { en: "Cash or card?", ja: "現金ですかカードですか？" },
    tip: '「Of course（もちろんです）」は快諾を示す丁寧な返事。"Certainly"（かしこまりました）より口語的。sir（お客様・様）はタクシーなどサービス業で男性客への敬称として使われます。',
  },
  {
    situation: '🚕 タクシー・交通',
    prompt: { en: "Here we are! BrightonStar Hotel.", ja: "到着です！ブライトンスターホテルです。" },
    correct: 'A',
    A: { en: "How much do I owe you?", ja: "いくらですか？" },
    B: { en: "Here is your menu.", ja: "こちらメニューです。" },
    tip: '「How much do I owe you?（いくらですか？/おいくらですか？）」の owe は「（お金を）借りている」という意味。直訳は「いくら借りていますか？」ですが「おいくらになりますか？」として使えます。',
  },
  {
    situation: '🚕 タクシー・交通',
    prompt: { en: "Keep the change.", ja: "おつりはいりません。" },
    correct: 'A',
    A: { en: "Thank you so much! Have a great stay!", ja: "ありがとうございます！良いご滞在を！" },
    B: { en: "I'll be right back with more.", ja: "もっと持ってすぐ戻ります。" },
    tip: '「Keep the change（おつりはいりません・チップです）」はアメリカでのチップ文化を表すフレーズ。change は「おつり」の意味。change の ch と keep がリンクして「チェンジ」と一息で発音されます。',
  },
  // ── ホテルチェックイン ──
  {
    situation: '🏨 ホテル・チェックイン',
    prompt: { en: "Do you have a reservation?", ja: "ご予約はありますか？" },
    correct: 'A',
    A: { en: "Yes, under the name Tanaka.", ja: "はい、田中という名前で。" },
    B: { en: "I'd like to check out.", ja: "チェックアウトをしたいです。" },
    tip: '「Under the name 〜（〜という名前で）」は予約を確認する時の定番フレーズ。reservationの r と under がリンクして「リザーベイションアンダー」と流れます。My name is の代わりによく使われます。',
  },
  {
    situation: '🏨 ホテル・チェックイン',
    prompt: { en: "Can I see your ID?", ja: "身分証明書を見せてもらえますか？" },
    correct: 'A',
    A: { en: "Sure, here's my passport.", ja: "はい、パスポートです。" },
    B: { en: "Keep the change.", ja: "おつりはいりません。" },
    tip: '「here\'s my passport（こちらがパスポートです）」の here\'s は "here is" の短縮形。物を渡す時に "Here you go" か "Here\'s my 〜" のどちらかが使えます。ID はアメリカ英語でパスポートや運転免許証を指します。',
  },
  {
    situation: '🏨 ホテル・チェックイン',
    prompt: { en: "Would you prefer a king or two queens?", ja: "キングとクイーン2台、どちらがよろしいですか？" },
    correct: 'A',
    A: { en: "A king bed, please.", ja: "キングベッドをお願いします。" },
    B: { en: "I'll take the lunch menu.", ja: "ランチメニューにします。" },
    tip: '「A king bed, please」のように "please" を文末につけると丁寧さが増します。queen は「クイーンサイズのベッド」を指すホテル用語。"Would you prefer A or B?" は二択の丁寧な質問形式です。',
  },
  {
    situation: '🏨 ホテル・チェックイン',
    prompt: { en: "Here's your room key.", ja: "お部屋のカギです。" },
    correct: 'A',
    A: { en: "Thank you! What floor is my room on?", ja: "ありがとうございます！何階ですか？" },
    B: { en: "Can I get the check?", ja: "お会計をいただけますか？" },
    tip: '「What floor is my room on?（何階ですか？）」は on を使って「〜の上（階）に」を表現します。"Which floor?" だけでも通じますが、より自然なのは "What floor is 〜 on?" の形です。',
  },
  {
    situation: '🏨 ホテル・チェックイン',
    prompt: { en: "Enjoy your stay!", ja: "良いご滞在を！" },
    correct: 'A',
    A: { en: "Thank you! I'm sure I will.", ja: "ありがとうございます！きっと楽しみます。" },
    B: { en: "I'll have the steak, please.", ja: "ステーキをいただきます。" },
    tip: '「I\'m sure I will（きっとそうなると思います）」は相手の願いや期待に応えるポジティブな返し。"I\'m sure" は "I\'m certain" より口語的な確信の表現。ホテルの挨拶への自然な返し方です。',
  },
  // ── レストラン ──
  {
    situation: '🍴 レストラン',
    prompt: { en: "Are you ready to order?", ja: "ご注文はお決まりですか？" },
    correct: 'A',
    A: { en: "Yes, I'll have the fish tacos, please.", ja: "はい、フィッシュタコスをいただきます。" },
    B: { en: "I'm checking out tomorrow.", ja: "明日チェックアウトします。" },
    tip: '「I\'ll have 〜（〜をいただきます）」はレストランでの注文の定番フレーズ。"I want" より丁寧な言い方。"I\'d like 〜" はさらに丁寧。have の h が弱まって「アイルハヴ→アイラヴ」のように聞こえることも。',
  },
  {
    situation: '🍴 レストラン',
    prompt: { en: "How would you like your steak?", ja: "ステーキの焼き加減はいかがなさいますか？" },
    correct: 'A',
    A: { en: "Medium rare, please.", ja: "ミディアムレアでお願いします。" },
    B: { en: "Extra towels, please.", ja: "タオルを余分にください。" },
    tip: '焼き加減の表現: rare（レア）、medium rare（ミディアムレア）、medium（ミディアム）、medium well（ミディアムウェル）、well done（ウェルダン）。Please を最後につけるだけで丁寧に聞こえます。',
  },
  {
    situation: '🍴 レストラン',
    prompt: { en: "Can I get you anything else?", ja: "他に何かお持ちしましょうか？" },
    correct: 'A',
    A: { en: "Just the check, please.", ja: "お会計だけお願いします。" },
    B: { en: "I'm late for my flight.", ja: "フライトに遅れそうです。" },
    tip: '「Just the check, please（お会計だけお願いします）」のチェックを求める定番フレーズ。"Can I get the bill?" も同じ意味（billはイギリス英語でも使われます）。Just を使うことで「それだけ」という限定の意味を出します。',
  },
  {
    situation: '🍴 レストラン',
    prompt: { en: "Is everything okay with your meal?", ja: "お食事はいかがですか？" },
    correct: 'A',
    A: { en: "It's wonderful! Compliments to the chef.", ja: "素晴らしいです！シェフに褒め言葉を。" },
    B: { en: "I'd like a wake-up call at 7.", ja: "7時にモーニングコールをお願いします。" },
    tip: '「Compliments to the chef!（シェフに拍手・敬意を！）」は料理を褒める最高の言葉。直訳「シェフへの称賛を伝えてください」という意味。wonderful の der がリンクして「ワンダフル」と発音します。',
  },
  {
    situation: '🍴 レストラン',
    prompt: { en: "Would you like to see the dessert menu?", ja: "デザートメニューをご覧になりますか？" },
    correct: 'A',
    A: { en: "Why not? What do you recommend?", ja: "いいですね！何がおすすめですか？" },
    B: { en: "Two adults and one child, please.", ja: "大人2名と子供1名でお願いします。" },
    tip: '「Why not?（いいじゃないですか！/もちろんですよ！）」は提案への軽い同意。「What do you recommend?（何がおすすめ？）」も合わせて覚えると、レストランでのやり取りがスムーズになります。',
  },
  // ── ビーチ ──
  {
    situation: '🏖️ ビーチ',
    prompt: { en: "Can I rent a surfboard?", ja: "サーフボードを借りられますか？" },
    correct: 'A',
    A: { en: "Sure! Have you surfed before?", ja: "もちろん！サーフィンの経験はありますか？" },
    B: { en: "Check please.", ja: "お会計をお願いします。" },
    tip: '「Have you 〜 before?（以前に〜したことがありますか？）」は経験を確認する現在完了形。before（以前に）をつけることで「過去の経験」を聞いていることが明確になります。',
  },
  {
    situation: '🏖️ ビーチ',
    prompt: { en: "Could you take a photo for us?", ja: "写真を撮っていただけますか？" },
    correct: 'A',
    A: { en: "Of course! Say cheese!", ja: "もちろん！はい、チーズ！" },
    B: { en: "Turn left, then right.", ja: "左に曲がって、それから右に。" },
    tip: '「Say cheese!（はいチーズ！）」は写真を撮る時の定番掛け声。cheese と言う時に口角が上がって笑顔になるから生まれた表現。海外では "Say cheese!" "1,2,3!" などいくつかのパターンがあります。',
  },
  {
    situation: '🏖️ ビーチ',
    prompt: { en: "The waves look amazing today!", ja: "今日は波がすごい！" },
    correct: 'A',
    A: { en: "I know! It's perfect weather.", ja: "そうだね！最高の天気だね。" },
    B: { en: "I'm checking out today.", ja: "今日チェックアウトします。" },
    tip: '「I know!（わかる！/そうだよね！）」は相手への強い共感の定番表現。"Perfect weather（完璧な天気）" の perfect はネイティブが大好きな最大級の褒め言葉。weather の th は舌を歯に当てて「ウェザー」と発音します。',
  },
  {
    situation: '🏖️ ビーチ',
    prompt: { en: "Watch out for the jellyfish!", ja: "クラゲに気をつけて！" },
    correct: 'A',
    A: { en: "Oh no! Thanks for the warning!", ja: "えー！警告してくれてありがとう！" },
    B: { en: "Excellent service, thank you!", ja: "素晴らしいサービスをありがとう！" },
    tip: '「Watch out for 〜（〜に気をつけて）」は危険を知らせる警告表現。"Be careful of 〜" と同じ意味。Thanks for the warning の warning は「警告」。Watch out! だけでも「危ない！」という緊急の警告になります。',
  },
  {
    situation: '🏖️ ビーチ',
    prompt: { en: "Would you like some sunscreen?", ja: "日焼け止めはいりますか？" },
    correct: 'A',
    A: { en: "Yes, please! I burn easily.", ja: "ぜひ！すぐ日焼けするので。" },
    B: { en: "I'll take a taxi, thank you.", ja: "タクシーで行きます、ありがとう。" },
    tip: '「I burn easily（すぐ日焼けする）」の burn は「日焼けする」という意味でも使います。easily（簡単に・すぐに）を加えることで「焼けやすい体質」というニュアンスが出ます。',
  },
  // ── ショッピング ──
  {
    situation: '🛍️ ショッピング',
    prompt: { en: "Can I help you find something?", ja: "何かお探しですか？" },
    correct: 'A',
    A: { en: "Yes, I'm looking for a souvenir.", ja: "はい、お土産を探しています。" },
    B: { en: "I've already checked in.", ja: "もうチェックインしました。" },
    tip: '「I\'m looking for 〜（〜を探しています）」は店での定番フレーズ。look for は「〜を探す」という句動詞。souvenir（お土産）は「スーバニア」のように発音します。フランス語起源の単語です。',
  },
  {
    situation: '🛍️ ショッピング',
    prompt: { en: "Do you have this in a smaller size?", ja: "これの小さいサイズはありますか？" },
    correct: 'A',
    A: { en: "Let me check in the back.", ja: "バックヤードを確認してきます。" },
    B: { en: "I'll have the salad, please.", ja: "サラダをいただきます。" },
    tip: '「Let me check in the back（バックヤードを確認してきます）」の back は「バックヤード・倉庫」のこと。Let me は「〜させてください」という申し出の表現。in the back で「奥の方・倉庫」を指します。',
  },
  {
    situation: '🛍️ ショッピング',
    prompt: { en: "Cash or card?", ja: "現金かカードか、どちらになさいますか？" },
    correct: 'A',
    A: { en: "Card, please.", ja: "カードでお願いします。" },
    B: { en: "Window seat, please.", ja: "窓際の席をお願いします。" },
    tip: '「Card, please（カードで）」は支払い方法を答える最シンプルな言い方。"I\'ll pay by card" や "Can I use a card?" も同じ場面で使えます。アメリカではクレジット・デビットカードが一般的です。',
  },
  {
    situation: '🛍️ ショッピング',
    prompt: { en: "Would you like it gift-wrapped?", ja: "ギフト包装はご希望ですか？" },
    correct: 'A',
    A: { en: "Yes, please! It's for my family.", ja: "はい！家族へのプレゼントです。" },
    B: { en: "Extra towels, please.", ja: "タオルを余分にください。" },
    tip: '「Gift-wrapped（ギフト包装された）」は形容詞として使われる複合語。"for my family" の for は「〜のため」という目的を表す前置詞。ギフト購入時に gift wrap / gift wrapping と言うだけで伝わります。',
  },
  {
    situation: '🛍️ ショッピング',
    prompt: { en: "Have a nice day!", ja: "良い一日を！" },
    correct: 'A',
    A: { en: "You too! Thanks for your help.", ja: "あなたもね！助けてくれてありがとう。" },
    B: { en: "Just the check, please.", ja: "お会計だけお願いします。" },
    tip: '「Thanks for your help（助けてくれてありがとう）」は店員さんへのお礼の定番フレーズ。"You too!" は相手の言葉をそのままお返しする最短の返し。"Have a nice day!" に "You too!" だけで完璧な会話になります。',
  },
  // ── アクティビティ ──
  {
    situation: '🤿 アクティビティ',
    prompt: { en: "Have you ever snorkeled before?", ja: "シュノーケリングをしたことはありますか？" },
    correct: 'A',
    A: { en: "Yes, but I'm still a beginner.", ja: "はい、でもまだ初心者です。" },
    B: { en: "Medium, please.", ja: "ミディアムでお願いします。" },
    tip: '「I\'m still a beginner（まだ初心者です）」の still は「まだ」という継続を示す副詞。have you ever 〜? は「今まで〜したことがありますか？」という経験を聞く現在完了形の疑問文です。',
  },
  {
    situation: '🤿 アクティビティ',
    prompt: { en: "Is this your first time in Hawaii?", ja: "ハワイは初めてですか？" },
    correct: 'A',
    A: { en: "Yes! I've always dreamed of coming here.", ja: "はい！ずっと来たかったんです。" },
    B: { en: "I'll have coffee, please.", ja: "コーヒーをいただきます。" },
    tip: '「I\'ve always dreamed of 〜（ずっと〜を夢見ていました）」の dreamed of は「〜を夢見る」。現在完了形（have dreamed）で「ずっと前から今まで」という継続の感情を表せます。旅先での会話に最適です。',
  },
  {
    situation: '🤿 アクティビティ',
    prompt: { en: "Are you enjoying the luau?", ja: "ルアウパーティーは楽しんでますか？" },
    correct: 'A',
    A: { en: "It's incredible! The food and music are amazing.", ja: "素晴らしい！食事も音楽も最高です。" },
    B: { en: "Check-in is at 3 PM.", ja: "チェックインは午後3時です。" },
    tip: '「It\'s incredible!（信じられないくらい素晴らしい！）」は amazing、wonderful、fantastic の仲間。luau（ルアウ）はハワイの伝統的な宴会・パーティーのこと。旅先で褒める言葉を増やすと会話が弾みます。',
  },
  {
    situation: '🤿 アクティビティ',
    prompt: { en: "Watch your step!", ja: "足元に気をつけて！" },
    correct: 'A',
    A: { en: "Thanks! I almost didn't see that.", ja: "ありがとう！危うく気づかなかったよ。" },
    B: { en: "I'll be right there.", ja: "すぐ行きます。" },
    tip: '「I almost didn\'t see that（危うく気づかなかった）」の almost（ほとんど・危うく〜するところだった）は「あと少しで〜だった」という惜しい状況を表します。Watch your step = Look where you\'re going（足元を見て）。',
  },
  {
    situation: '🤿 アクティビティ',
    prompt: { en: "What time does the tour start?", ja: "ツアーは何時に出発しますか？" },
    correct: 'A',
    A: { en: "It departs at 9 AM sharp.", ja: "午前9時きっかりに出発します。" },
    B: { en: "Just the check, please.", ja: "お会計だけお願いします。" },
    tip: '「at 9 AM sharp（9時きっかりに）」の sharp は「ちょうど・きっかり」を意味する副詞。"on the dot" も同じ意味。depart（出発する）はより正式な言葉。leave も同じ場面で使えます。',
  },
  // ── チェックアウト ──
  {
    situation: '🏨 ホテル・チェックアウト',
    prompt: { en: "I'd like to check out, please.", ja: "チェックアウトをお願いします。" },
    correct: 'A',
    A: { en: "Of course. Can I have your room number?", ja: "かしこまりました。お部屋番号をいただけますか？" },
    B: { en: "Wake-up call at 7, please.", ja: "7時にモーニングコールをお願いします。" },
    tip: '「I\'d like to 〜（〜したいのですが）」の I\'d like to は "I want to" の丁寧な言い方。ホテルやレストランなどサービス業で使うと好印象。"Can I have your room number?" の can は許可ではなく「〜をもらえますか？」という依頼の用法です。',
  },
  {
    situation: '🏨 ホテル・チェックアウト',
    prompt: { en: "Did you enjoy your stay?", ja: "ご滞在はいかがでしたか？" },
    correct: 'A',
    A: { en: "Absolutely! It was fantastic.", ja: "もちろんです！素晴らしかったです。" },
    B: { en: "Window seat, please.", ja: "窓際の席をお願いします。" },
    tip: '「Absolutely!（もちろんです！/まさに！）」は強い肯定・同意を示す表現。"Certainly" "Definitely" "Of course" と同じ場面で使えます。fantastic（素晴らしい）はよく使われる感情豊かな形容詞です。',
  },
  {
    situation: '🏨 ホテル・チェックアウト',
    prompt: { en: "Would you like to review your bill?", ja: "明細をご確認されますか？" },
    correct: 'A',
    A: { en: "Yes, please.", ja: "はい、お願いします。" },
    B: { en: "Turn left at the traffic light.", ja: "信号を左に曲がってください。" },
    tip: '「Yes, please（はい、お願いします）」は最シンプルかつ丁寧な返事。review（確認する・見直す）はホテルの会計確認でよく使われます。bill（明細書・請求書）は check とも言います。',
  },
  {
    situation: '🏨 ホテル・チェックアウト',
    prompt: { en: "We hope to see you again!", ja: "またのお越しをお待ちしております！" },
    correct: 'A',
    A: { en: "Definitely! I'll be back for sure.", ja: "絶対また来ます！必ず戻ってきます。" },
    B: { en: "Just a moment, please.", ja: "少々お待ちください。" },
    tip: '「I\'ll be back for sure（必ず戻ってきます）」は「ターミネーター」の "I\'ll be back" をもじった形でも有名。for sure（確実に・絶対に）はカジュアルな強調表現。certainly や definitely の口語版です。',
  },
  {
    situation: '🏨 ホテル・チェックアウト',
    prompt: { en: "Safe travels!", ja: "良いご旅行を！" },
    correct: 'A',
    A: { en: "Thank you! I had the best time.", ja: "ありがとうございます！最高の時間でした。" },
    B: { en: "Can I get a wake-up call?", ja: "モーニングコールをお願いできますか？" },
    tip: '「I had the best time!（最高の時間でした！）」は旅行の締めくくりにぴったりの表現。"the best" を使うことで「これまでで最高の」という最上級のニュアンスが出ます。Safe travels は旅立つ人への別れの言葉です。',
  },
];

const COURSES: { id: CourseId; icon: string; title: string; sub: string; color: string; count: number }[] = [
  { id: 'daily',  icon: '☀️', title: '朝から夜まで\n日常会話コース', sub: '目覚めから就寝まで10シーン・50問', color: 'from-amber-400 to-orange-500', count: DAILY_DATA.length  },
  { id: 'hawaii', icon: '🌴', title: 'ハワイ旅行\nホテル滞在コース', sub: '空港からチェックアウトまで8シーン・40問',  color: 'from-sky-400 to-cyan-500',   count: HAWAII_DATA.length },
];

const COURSE_DATA: Record<CourseId, DialogueItem[]> = {
  daily:  DAILY_DATA,
  hawaii: HAWAII_DATA,
};

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
export function StoryDialogue() {
  const [course,   setCourse]   = useState<CourseId | null>(null);
  const [deck,     setDeck]     = useState<DialogueItem[]>([]);
  const [idx,      setIdx]      = useState(0);
  const [chosen,   setChosen]   = useState<'A'|'B'|null>(null);
  const [flash,    setFlash]    = useState<'ok'|'ng'|null>(null);
  const [correct,  setCorrect]  = useState(0);
  const [total,    setTotal]    = useState(0);

  const item = deck[idx % deck.length] as DialogueItem | undefined;

  // 選択したコースのデッキをシャッフルして開始
  const startCourse = useCallback((id: CourseId) => {
    setDeck(shuffle(COURSE_DATA[id]));
    setCourse(id);
    setIdx(0);
    setChosen(null);
    setFlash(null);
    setCorrect(0);
    setTotal(0);
  }, []);

  // リセット時にSpeechSynthesisを止める
  const resetToMenu = useCallback(() => {
    window.speechSynthesis?.cancel();
    setCourse(null);
    setDeck([]);
  }, []);

  // 選択処理
  const handleChoose = useCallback((choice: 'A'|'B') => {
    if (chosen || !item) return;
    setChosen(choice);
    setTotal(t => t + 1);
    if (choice === item.correct) {
      setCorrect(c => c + 1);
      setFlash('ok');
    } else {
      setFlash('ng');
    }
  }, [chosen, item]);

  // 次の問題へ
  const handleNext = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (idx + 1 >= deck.length) {
      setDeck(shuffle(deck));
      setIdx(0);
    } else {
      setIdx(i => i + 1);
    }
    setChosen(null);
    setFlash(null);
  }, [idx, deck]);

  useEffect(() => {
    setChosen(null);
    setFlash(null);
  }, [idx]);

  const pct = total > 0 ? Math.round(correct / total * 100) : 0;

  // ══ コース選択画面 ══
  if (!course) {
    return (
      <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto space-y-4">
        <div className="text-center py-4">
          <p className="text-xl font-black text-gray-900">🗣️ ストーリー対話特訓</p>
          <p className="text-xs font-bold text-gray-700 mt-1">コースを選んでスタート！</p>
        </div>
        {COURSES.map(c => (
          <button key={c.id} onClick={() => startCourse(c.id)}
            className={`w-full bg-gradient-to-br ${c.color} rounded-3xl p-6 text-left text-white shadow-lg active:scale-[0.97] transition-all`}>
            <span className="text-4xl">{c.icon}</span>
            <p className="text-xl font-black mt-2 leading-tight whitespace-pre-line">{c.title}</p>
            <p className="text-sm font-bold opacity-80 mt-1">{c.sub}</p>
            <div className="mt-3 inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black">
              全{c.count}問 → スタート ▶
            </div>
          </button>
        ))}
        <p className="text-center text-[10px] font-bold text-gray-600 pt-2">
          ストーリーの流れに沿って順番に出題。1周終わると自動でシャッフルして再出題されます。
        </p>
      </div>
    );
  }

  if (!item) return null;

  const isCorrect = chosen !== null && chosen === item.correct;
  const isWrong   = chosen !== null && chosen !== item.correct;

  return (
    <div className={`min-h-screen px-4 pt-2 pb-[120px] max-w-md mx-auto transition-colors duration-200 ${
      flash === 'ok' ? 'bg-emerald-50' : flash === 'ng' ? 'bg-red-50' : 'bg-white'
    }`}>

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={resetToMenu}
          className="text-xs font-black text-gray-700 px-3 py-1.5 bg-gray-100 rounded-full active:scale-95 transition-all">
          ← コース選択
        </button>
        <div className="text-xs font-bold text-gray-800 text-center">
          {total > 0 ? `${correct}/${total} (${pct}%)` : (course === 'daily' ? '☀️ 日常会話' : '🌴 ハワイ旅行')}
        </div>
        <span className="text-xs font-bold text-gray-800">{idx + 1}/{deck.length}</span>
      </div>

      {/* ── シーン表示 ── */}
      <div className="bg-gray-100 rounded-xl px-3 py-1.5 mb-3 inline-block">
        <p className="text-xs font-black text-gray-800">{item.situation}</p>
      </div>

      {/* ── 相手の投げかけ ── */}
      <div className="bg-gray-900 rounded-2xl p-4 mb-4 shadow-lg">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">相手の発言</p>
        <div className="flex items-start gap-2 mb-1">
          <p className="text-xl font-black text-white leading-snug flex-1">&ldquo;{item.prompt.en}&rdquo;</p>
          <SpeakBtn text={item.prompt.en} />
        </div>
        <p className="text-sm font-bold text-gray-300">{item.prompt.ja}</p>
      </div>

      {/* ── 2択ボタン ── */}
      <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2 px-1">
        あなたの返答を選んでください
      </p>
      <div className="space-y-3 mb-4">
        {(['A', 'B'] as const).map(key => {
          const opt = item[key];
          const isThis    = chosen === key;
          const isCorrectOpt = key === item.correct;
          let cardCls = 'border-2 border-gray-200 bg-white';
          if (chosen) {
            if (isCorrectOpt)       cardCls = 'border-2 border-emerald-500 bg-emerald-50';
            else if (isThis)        cardCls = 'border-2 border-red-400 bg-red-50';
            else                    cardCls = 'border-2 border-gray-100 bg-gray-50 opacity-60';
          }
          return (
            <button key={key} disabled={!!chosen} onClick={() => handleChoose(key)}
              className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] ${cardCls}`}>
              <div className="flex items-start gap-3">
                <span className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm ${
                  chosen
                    ? isCorrectOpt ? 'bg-emerald-500 text-white' : isThis ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500'
                    : 'bg-indigo-600 text-white'
                }`}>
                  {chosen && isCorrectOpt ? '✅' : chosen && isThis ? '❌' : key}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-black leading-snug ${
                    chosen
                      ? isCorrectOpt ? 'text-emerald-900' : isThis ? 'text-red-900' : 'text-gray-500'
                      : 'text-gray-900'
                  }`}>{opt.en}</p>
                  <p className={`text-xs font-bold mt-0.5 ${
                    chosen
                      ? isCorrectOpt ? 'text-emerald-700' : isThis ? 'text-red-700' : 'text-gray-400'
                      : 'text-gray-700'
                  }`}>{opt.ja}</p>
                </div>
                <SpeakBtn text={opt.en} size="xs" />
              </div>
            </button>
          );
        })}
      </div>

      {/* ── 正誤 + 解説（回答後） ── */}
      {chosen && (
        <>
          <div className={`rounded-2xl p-4 mb-3 border-2 ${
            isCorrect
              ? 'border-emerald-400 bg-emerald-50'
              : 'border-red-400 bg-red-50'
          }`}>
            <p className={`text-base font-black mb-1 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
              {isCorrect ? '✅ 正解！' : '❌ 不正解'}
            </p>
            {isWrong && (
              <div className="mb-2 flex items-start gap-2 bg-white/70 rounded-xl px-3 py-2 border border-emerald-200">
                <p className="text-xs font-black text-emerald-900 flex-1">
                  正解: &ldquo;{item[item.correct].en}&rdquo;<br/>
                  <span className="font-bold text-emerald-700">{item[item.correct].ja}</span>
                </p>
                <SpeakBtn text={item[item.correct].en} size="xs" />
              </div>
            )}
          </div>

          {/* 発音のコツ・使い方解説 */}
          <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-4 mb-4 space-y-2 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <p className="text-xs font-black text-sky-900 uppercase tracking-widest">使い方・発音のコツ</p>
            </div>
            <p className="text-sm font-bold text-gray-900 leading-relaxed">{item.tip}</p>
            <button onClick={() => speak(item[item.correct].en)}
              className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-sky-700 text-white active:scale-95 transition-transform">
              🔊 正解フレーズをもう一度
            </button>
          </div>

          <button onClick={handleNext}
            className="w-full py-3.5 rounded-2xl font-black text-base bg-gray-900 text-white active:scale-[0.98] transition-all shadow-md">
            次の対話へ →
          </button>
        </>
      )}
    </div>
  );
}
