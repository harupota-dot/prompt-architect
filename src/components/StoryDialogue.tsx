'use client';

import { useState, useCallback } from 'react';

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
    <button onClick={e => { e.stopPropagation(); speak(text); }}
      className={`flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 active:scale-90 transition-all ${
        size === 'sm' ? 'w-8 h-8 text-base' : 'w-6 h-6 text-xs'
      }`} aria-label="発音を聞く">🔊</button>
  );
}

// ─── Types ────────────────────────────────────────────────────────
interface DialogueItem {
  prompt: { en: string; ja: string };
  correct: 'A' | 'B';
  A: { en: string; ja: string };
  B: { en: string; ja: string };
  tip: string;
}
interface Chapter { id: string; icon: string; title: string; items: DialogueItem[]; }
type CourseId = 'daily' | 'hawaii';
type Screen   = 'course' | 'chapters' | 'dialogue' | 'chapter-end' | 'minitest' | 'test-results';
type Mode     = 'study' | 'review';
type Filter   = 'all' | 'needs';
interface CourseData { id: CourseId; icon: string; title: string; sub: string; color: string; chapters: Chapter[]; }

const LS_MEMO = 'story-memorized-v1';
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════════
// ☀️ DAILY COURSE
// ═══════════════════════════════════════════════════════════════════
const DAILY_COURSE: CourseData = {
  id: 'daily', icon: '☀️',
  title: '朝から夜まで完全密着コース',
  sub: '7チャプター・起床から就寝まで',
  color: 'from-amber-400 to-orange-500',
  chapters: [
    {
      id: 'daily-ch1', icon: '⏰', title: '起床から洗面所',
      items: [
        { prompt: { en: "Your alarm has been going off for ten minutes.", ja: "アラームが10分も鳴り続けてるよ。" }, correct: 'A',
          A: { en: "Sorry, I'll get up right now.", ja: "ごめん、今すぐ起きる。" },
          B: { en: "I already turned it off.", ja: "もう止めたよ。" },
          tip: '「has been going off」は現在完了進行形で「ずっと鳴り続けている」。go off はアラームが「鳴る」という意味。right now（今すぐ）と get up（起きる）は朝の定番フレーズ。' },
        { prompt: { en: "Good morning! Did you sleep well?", ja: "おはよう！よく眠れた？" }, correct: 'A',
          A: { en: "Yeah, I slept like a log.", ja: "うん、ぐっすり眠れたよ。" },
          B: { en: "Not yet, I'm going back to sleep.", ja: "まだ。もう一度寝るよ。" },
          tip: '「slept like a log（丸太のように眠った）」は深く熟睡したことを表すイディオム。丸太のように動かずぐっすり眠る様子から来ています。対義語は "I couldn\'t sleep a wink"（まったく眠れなかった）。' },
        { prompt: { en: "The bathroom is free now.", ja: "洗面所、今空いてるよ。" }, correct: 'A',
          A: { en: "Great, I'll be quick.", ja: "よかった、すぐ終わらせるね。" },
          B: { en: "I just came out of there.", ja: "今出てきたところだよ。" },
          tip: '「I\'ll be quick（すぐ終わらせます）」は急ぐことを示す表現。free（空いている）は「無料」以外に「使っていない・空き状態」という意味もあります。The bathroom is free = 洗面所は空いている。' },
        { prompt: { en: "Can I borrow your hair dryer?", ja: "ヘアドライヤー貸してもらえる？" }, correct: 'A',
          A: { en: "Sure, it's on the shelf.", ja: "もちろん、棚の上にあるよ。" },
          B: { en: "I'm using it right now.", ja: "今使ってるよ。" },
          tip: '「borrow（借りる）」と「lend（貸す）」の使い分けが重要。"Can I borrow ~?"（借りてもいい？）は自分がお願いする側。"on the shelf"（棚の上に）の on は表面接触を示す前置詞。' },
        { prompt: { en: "Did you forget to buy toothpaste again?", ja: "また歯磨き粉買うの忘れた？" }, correct: 'A',
          A: { en: "Oh no. I'll pick some up on the way home.", ja: "あ、忘れてた。帰りに買ってくるね。" },
          B: { en: "I never use toothpaste.", ja: "歯磨き粉は使わないよ。" },
          tip: '「pick some up（ついでに買ってくる）」の pick up は「立ち寄って買う」という慣用句。"on the way home"（帰り道に）と組み合わせると非常に自然な英語になります。' },
        { prompt: { en: "You're going to be late if you don't hurry.", ja: "急がないと遅れるよ。" }, correct: 'A',
          A: { en: "I know! I'm almost ready.", ja: "わかってる！もう少しで準備できる。" },
          B: { en: "I don't need to go anywhere today.", ja: "今日はどこも行かないよ。" },
          tip: '「almost ready（もう少しで準備完了）」の almost は「ほとんど・あと少し」。"I\'m almost done"（もうすぐ終わる）など almost は日常で頻出する副詞です。' },
        { prompt: { en: "Do you want me to start the coffee?", ja: "コーヒー淹れようか？" }, correct: 'A',
          A: { en: "Yes please! That would be amazing.", ja: "ぜひ！最高だね。" },
          B: { en: "I already drank the whole pot.", ja: "もうポット全部飲んだよ。" },
          tip: '「Do you want me to ~?」（〜しようか？）は相手への申し出の定番フレーズ。"That would be amazing"（それは最高）は感謝混じりの喜びの表現。よりカジュアルに "That\'d be great!" とも言えます。' },
      ],
    },
    {
      id: 'daily-ch2', icon: '🍳', title: '朝食の準備と食事',
      items: [
        { prompt: { en: "What do you want for breakfast?", ja: "朝ごはん何がいい？" }, correct: 'A',
          A: { en: "Toast and eggs would be perfect.", ja: "トーストと卵が完璧だな。" },
          B: { en: "I already ate three hours ago.", ja: "3時間前にもう食べたよ。" },
          tip: '「would be perfect（完璧だろうな）」の would は柔らかい仮定の表現。直接 "I want toast" より少し上品に聞こえます。朝食の定番: cereal（シリアル）、pancakes（パンケーキ）、oatmeal（オートミール）。' },
        { prompt: { en: "The coffee is ready.", ja: "コーヒーできたよ。" }, correct: 'A',
          A: { en: "Perfect timing! Thank you.", ja: "ちょうどいいタイミング！ありがとう。" },
          B: { en: "I don't drink coffee.", ja: "コーヒーは飲まないよ。" },
          tip: '「Perfect timing!（ちょうどいい！）」は何かがジャストタイミングで来た時の定番リアクション。"You have great timing!"（タイミングいいね！）とも言えます。' },
        { prompt: { en: "How do you like your eggs?", ja: "卵はどんな風に食べたい？" }, correct: 'A',
          A: { en: "Sunny side up, please.", ja: "目玉焼き（片面焼き）でお願い。" },
          B: { en: "I like my eggs frozen.", ja: "冷凍した卵が好きだよ。" },
          tip: '卵の調理法: sunny side up（片面焼き）、over easy（両面焼き半熟）、scrambled（スクランブル）、boiled（ゆで卵）。"How do you like ~?"（どんな風が好き？）は好みを聞く丁寧な表現。' },
        { prompt: { en: "Can you pass the butter?", ja: "バター取ってくれる？" }, correct: 'A',
          A: { en: "Sure, here you go.", ja: "もちろん、はい、どうぞ。" },
          B: { en: "I put it away already.", ja: "もう片付けちゃったよ。" },
          tip: '「here you go（はい、どうぞ）」は物を渡す時の定番フレーズ。"Here you are." も同じ意味。食卓での "Can you pass the ~?"（〜取ってくれる？）は日常でよく使います。' },
        { prompt: { en: "This tastes really good!", ja: "これ本当においしい！" }, correct: 'A',
          A: { en: "I'm glad you like it! I tried a new recipe.", ja: "気に入ってくれて嬉しい！新しいレシピを試したんだ。" },
          B: { en: "I know, I eat it every day.", ja: "知ってる、毎日食べてるから。" },
          tip: '「I\'m glad you like it!（気に入ってくれて嬉しい！）」は料理を褒められた時の自然な返し。tried（try の過去形）で「挑戦した」というニュアンスが出ます。' },
        { prompt: { en: "Are you finished eating?", ja: "もう食べ終わった？" }, correct: 'A',
          A: { en: "Almost. Just finishing up my coffee.", ja: "ほぼ。コーヒーを飲み終えるところ。" },
          B: { en: "I haven't started yet.", ja: "まだ始めてもいないよ。" },
          tip: '「finishing up（仕上げている・終わらせているところ）」の finish up は「完全に終わらせる」ニュアンス。"Just finishing up"で「あともうちょっと」という感じ。Almost（ほとんど）も重要な副詞。' },
        { prompt: { en: "I'll do the dishes.", ja: "食器洗いは私がやるよ。" }, correct: 'A',
          A: { en: "Thank you! I'll wipe the table then.", ja: "ありがとう！じゃあテーブル拭くね。" },
          B: { en: "No, I'll do them myself.", ja: "いや、自分でやるよ。" },
          tip: '「do the dishes（食器を洗う）」の dishes は「皿洗い全般」を指す表現。"I\'ll wipe the table"（テーブルを拭く）の wipe は「拭く」。家事を自然に分担する会話フレーズです。' },
      ],
    },
    {
      id: 'daily-ch3', icon: '👔', title: '身支度と外出',
      items: [
        { prompt: { en: "What should I wear today?", ja: "今日、何着ればいいかな？" }, correct: 'A',
          A: { en: "It's supposed to be warm. A light jacket should be fine.", ja: "暖かくなる予定だよ。軽いジャケットでいいんじゃない。" },
          B: { en: "I'm wearing the same thing as yesterday.", ja: "昨日と同じ服着てるよ。" },
          tip: '「It\'s supposed to ~（〜の予定・見込み）」は天気予報などで「〜らしい」という時に使う。"A light jacket should be fine"の should は「〜でいいはず」という推量を示します。' },
        { prompt: { en: "Have you seen my keys anywhere?", ja: "どこかに私の鍵見なかった？" }, correct: 'A',
          A: { en: "I think I saw them on the kitchen counter.", ja: "キッチンのカウンターにあったと思うよ。" },
          B: { en: "I don't have any keys.", ja: "鍵は持ってないよ。" },
          tip: '「Have you seen ~?（〜を見なかった？）」は現在完了で「最近見た？」という確認。"on the kitchen counter"（キッチンカウンターに）の on は「表面の上に」という意味。' },
        { prompt: { en: "Don't forget to take your umbrella.", ja: "傘を持って行くの忘れないで。" }, correct: 'A',
          A: { en: "Good call. It looks like it might rain later.", ja: "いい指摘ね。後で雨が降りそうだよね。" },
          B: { en: "I never use umbrellas.", ja: "傘は絶対使わないよ。" },
          tip: '「Good call!（いい判断！）」は相手の提案や判断を褒める口語表現。"it looks like it might rain"の might は「〜かもしれない」という低い可能性を表します。' },
        { prompt: { en: "How do I look?", ja: "どう？（格好はどう？）" }, correct: 'A',
          A: { en: "You look great! Very professional.", ja: "すごくいいよ！とてもプロらしく見える。" },
          B: { en: "I can't see you right now.", ja: "今あなたが見えないよ。" },
          tip: '「How do I look?」は外見・服装を確認する定番フレーズ。"You look + 形容詞"（〜に見える）という形も重要。professional（プロらしい）、sharp（かっこいい）、amazing（すごい）など。' },
        { prompt: { en: "Do you have everything?", ja: "忘れ物ない？（全部持った？）" }, correct: 'A',
          A: { en: "I think so. Phone, wallet, keys — all good.", ja: "たぶん大丈夫。スマホ、財布、鍵 — 全部OK。" },
          B: { en: "I don't need anything.", ja: "何も必要ないよ。" },
          tip: '「Do you have everything?（全部ある？）」は出かける前の確認フレーズ。"Phone, wallet, keys"は外出時の三種の神器。"all good（全部OK）"はシンプルで使いやすい確認フレーズ。' },
        { prompt: { en: "I'm heading out now.", ja: "行ってきます。" }, correct: 'A',
          A: { en: "Have a good day! See you tonight.", ja: "いい一日を！今夜また会おう。" },
          B: { en: "Where are you going?", ja: "どこに行くの？" },
          tip: '「I\'m heading out（出かけます）」の head out は「出発する」という意味。日本語の「行ってきます」に最も近い表現。"Have a good day!"（いい一日を！）は朝の別れ際の定番挨拶。' },
        { prompt: { en: "Text me when you get there safely.", ja: "安全に着いたらメッセージして。" }, correct: 'A',
          A: { en: "Will do! Take care.", ja: "わかった！気をつけてね。" },
          B: { en: "I never text anyone.", ja: "誰にもメッセージしないよ。" },
          tip: '「Will do!（了解！やります！）」は依頼を快く受け入れる短い返事。"I will do it"の短縮で、"Sure!" よりやる気が伝わる表現。"when you get there safely"の safely（安全に）が気遣いを示します。' },
      ],
    },
    {
      id: 'daily-ch4', icon: '🚃', title: '移動中と午前中',
      items: [
        { prompt: { en: "The train is packed today.", ja: "今日、電車がすごく混んでるね。" }, correct: 'A',
          A: { en: "I know, I can barely move.", ja: "ほんとに、ほとんど動けないよ。" },
          B: { en: "I love crowded trains.", ja: "混んだ電車が大好き。" },
          tip: '「packed（ぎゅうぎゅう詰めの）」は「満員の」を表す口語表現。"I can barely move"の barely は「かろうじて〜しかできない」。barely + 動詞のセットで覚えましょう。' },
        { prompt: { en: "Did you see the news this morning?", ja: "今朝のニュース見た？" }, correct: 'A',
          A: { en: "No, I didn't have time. What happened?", ja: "見てない、時間なかったよ。何があったの？" },
          B: { en: "I don't watch the news.", ja: "ニュースは見ないよ。" },
          tip: '「What happened?（何があったの？）」は出来事を聞く際の自然な返し。see（目に入った）vs watch（意図的に見る）の区別も重要。"I didn\'t have time"（時間がなかった）も頻出表現。' },
        { prompt: { en: "My stop is coming up.", ja: "もうすぐ私の降りる駅だよ。" }, correct: 'A',
          A: { en: "Oh already? Time flies.", ja: "もうそんな時間？あっという間だね。" },
          B: { en: "Stay on the train longer.", ja: "もっと乗り続けて。" },
          tip: '「coming up（もうすぐ来る）」は near in time という意味。"Time flies（時間が飛ぶように過ぎる）"は時間があっという間だった時の定番フレーズ。比喩的な慣用句として覚えましょう。' },
        { prompt: { en: "Can we go over the plan for the meeting?", ja: "会議の計画を確認しておこうか？" }, correct: 'A',
          A: { en: "Sure. Let's run through it quickly.", ja: "いいよ。さっと確認しよう。" },
          B: { en: "I forgot there was a meeting.", ja: "会議があったの忘れてた。" },
          tip: '「go over（確認する・おさらいする）」は情報を見直す時のフレーズ。"run through it"（ざっと確認する）はより速く軽く確認するニュアンス。どちらもビジネスでよく使います。' },
        { prompt: { en: "The coffee machine is broken again.", ja: "またコーヒーマシンが壊れてる。" }, correct: 'A',
          A: { en: "Oh no, not again. I'll put in a repair request.", ja: "またか、嫌だな。修理依頼を出しておくよ。" },
          B: { en: "I fixed it yesterday.", ja: "昨日直したよ。" },
          tip: '「Oh no, not again!（またか！）」は同じことが繰り返された時の嘆き表現。"put in a repair request"（修理依頼を出す）の put in は「提出する・申し込む」。' },
        { prompt: { en: "Do you have a moment?", ja: "ちょっとよろしいですか？" }, correct: 'A',
          A: { en: "Sure, what's up?", ja: "もちろん、どうしたの？" },
          B: { en: "No, I'm leaving right now.", ja: "ダメ、今すぐ出るから。" },
          tip: '「Do you have a moment?（少しお時間ありますか？）」は相手の時間を借りる丁寧な確認フレーズ。"What\'s up?（どうしたの？）"はカジュアルな返し。ビジネスでは "What can I help you with?" も自然。' },
        { prompt: { en: "Good morning! Ready for today?", ja: "おはよう！今日の準備はいい？" }, correct: 'A',
          A: { en: "Morning! Yeah, I've got a full schedule.", ja: "おはよう！うん、スケジュールぎっしりだよ。" },
          B: { en: "I'm still sleeping.", ja: "まだ寝てるよ。" },
          tip: '「I\'ve got a full schedule（スケジュールがぎっしり）」の got は have got の口語表現。"I have a lot on my plate today"（今日は手一杯）とも言えます。full（いっぱいの）は日常でよく使う形容詞。' },
      ],
    },
    {
      id: 'daily-ch5', icon: '🍱', title: '昼食',
      items: [
        { prompt: { en: "Where should we go for lunch?", ja: "ランチどこに行こうか？" }, correct: 'A',
          A: { en: "There's a new ramen place nearby. Want to try it?", ja: "近くに新しいラーメン屋があるよ。試してみる？" },
          B: { en: "I already ate at my desk.", ja: "もうデスクで食べちゃった。" },
          tip: '「Want to try it?（試してみる？）」は提案の自然な言い方。"There\'s a + 名詞 + nearby"（近くに〜があるよ）も使いやすい表現。try（試す）は食べ物・場所への挑戦全般に使えます。' },
        { prompt: { en: "What are you having?", ja: "何を食べるの？" }, correct: 'A',
          A: { en: "I'm thinking the daily special. What about you?", ja: "日替わりランチにしようかな。あなたは？" },
          B: { en: "I'm not eating today.", ja: "今日は食べない。" },
          tip: '「I\'m thinking ~（〜にしようかな）」は考え中・検討中を表す表現。"What about you?"（あなたは？）で会話を相手に返す技術も大切。the daily special = 日替わりランチ。' },
        { prompt: { en: "Can I get the lunch set with extra rice?", ja: "ランチセットにライスの追加はできますか？" }, correct: 'A',
          A: { en: "Of course! Would you like small or large?", ja: "もちろんです！小盛りと大盛りどちらにしますか？" },
          B: { en: "Rice is not included.", ja: "ライスは含まれていません。" },
          tip: '「Can I get ~?（〜をもらえますか？）」は注文の定番表現。extra（追加の）は頼む時によく使う形容詞。"Would you like small or large?"のような2択で誘導する返しは接客でよく見られます。' },
        { prompt: { en: "This is really good!", ja: "これ本当においしい！" }, correct: 'A',
          A: { en: "Right? I come here all the time.", ja: "でしょ？いつも来てるんだ。" },
          B: { en: "I don't taste anything.", ja: "何も味がしない。" },
          tip: '「Right?（でしょ？）」は共感・同意を強く求める表現。"I come here all the time"（いつもここに来てる）の all the time は「いつも・しょっちゅう」の強調表現。' },
        { prompt: { en: "Split the bill or separate checks?", ja: "割り勘にする？それとも別々に？" }, correct: 'A',
          A: { en: "Let's split it. It'll be easier.", ja: "割り勘にしよう。その方が楽だよ。" },
          B: { en: "I don't have any money.", ja: "お金を持ってないよ。" },
          tip: '「split the bill（割り勘）」は代金を分けること。"separate checks"（別々の会計）はレストランで支払いを別にすること。"It\'ll be easier"（その方が楽）の It\'ll は "It will" の短縮形。' },
        { prompt: { en: "I'm stuffed.", ja: "お腹いっぱいだよ。" }, correct: 'A',
          A: { en: "Same. That was a huge portion.", ja: "私も。量が多かったよね。" },
          B: { en: "You should eat more.", ja: "もっと食べたらいいよ。" },
          tip: '「I\'m stuffed（お腹がいっぱい）」は "I\'m full" より強い「もう無理」な満腹感。"a huge portion"（ものすごく多い量）の portion は「一人前・盛り」。Same.（私も）は短い共感表現。' },
        { prompt: { en: "Want to grab dessert?", ja: "デザートも食べる？" }, correct: 'A',
          A: { en: "Why not! Just a little though.", ja: "いいね！でもちょっとだけ。" },
          B: { en: "I'm on a strict diet.", ja: "厳格なダイエット中なんだ。" },
          tip: '「grab（つかむ）」は「ちょっと食べる・飲む」というカジュアル動詞。"grab lunch / coffee / a bite"などの形で使います。"Why not!（いいじゃない！）"は断る理由がないのでOKという軽い賛成。' },
      ],
    },
    {
      id: 'daily-ch6', icon: '🛒', title: '午後から帰宅',
      items: [
        { prompt: { en: "I need to stop by the grocery store.", ja: "スーパーに寄っていかないと。" }, correct: 'A',
          A: { en: "I'll come with you. I need a few things too.", ja: "一緒に行くよ。私もいくつか必要なものがある。" },
          B: { en: "You don't need to eat.", ja: "食べる必要ないよ。" },
          tip: '「stop by（立ち寄る）」は目的地の途中でちょっと寄ること。"grocery store"（食料品店・スーパー）はアメリカ英語での言い方。"a few things"（いくつかのもの）も買い物文脈で頻出。' },
        { prompt: { en: "This is on sale.", ja: "これ、セールだよ。" }, correct: 'A',
          A: { en: "Oh nice! Let's grab a few extra.", ja: "いいね！多めに買っておこう。" },
          B: { en: "I don't buy sale items.", ja: "セール品は買わないよ。" },
          tip: '「on sale（セール中）」と "for sale（売りに出ている）"は違う意味。on sale = 割引セール中。for sale = 売り物として出ている状態。"grab a few extra"（多めに取る）のgrabはカジュアルに「取る」こと。' },
        { prompt: { en: "Should we get anything for dinner?", ja: "夕食に何か買っていく？" }, correct: 'A',
          A: { en: "How about pasta? It's quick and easy.", ja: "パスタはどう？早くて簡単だよ。" },
          B: { en: "We're skipping dinner tonight.", ja: "今夜は夕食なしだよ。" },
          tip: '「How about ~?（〜はどう？）」は提案の定番フレーズ。"quick and easy"（早くて簡単）は料理の説明でよく使われるセット表現。What about ~? も同じ使い方ができます。' },
        { prompt: { en: "I'm heading home now.", ja: "今から帰るよ。" }, correct: 'A',
          A: { en: "Great, I'll see you soon.", ja: "よかった、すぐ会えるね。" },
          B: { en: "Don't come home.", ja: "帰ってこないで。" },
          tip: '「heading home（家に向かっている）」の head は方向に向かって動くことを表す動詞。"I\'ll see you soon"（すぐに会えるね）は近い将来に会う時の言葉。soon = in a short time。' },
        { prompt: { en: "I'm home!", ja: "ただいま！" }, correct: 'A',
          A: { en: "Welcome back! How was your day?", ja: "おかえり！今日はどうだった？" },
          B: { en: "You were gone for a long time.", ja: "長い時間いなかったね。" },
          tip: '「I\'m home!（ただいま！）」は帰宅の定番フレーズ。返答の "Welcome back!（おかえり！）"はどんな帰宅にも使える温かい表現。"How was your day?"（今日はどうだった？）で自然に会話が続きます。' },
        { prompt: { en: "I'm exhausted. It was a long day.", ja: "疲れたよ。長い一日だったね。" }, correct: 'A',
          A: { en: "Sit down and relax. Dinner will be ready soon.", ja: "座って休んで。もうすぐ夕食できるよ。" },
          B: { en: "It was only 8 hours.", ja: "たった8時間だったじゃない。" },
          tip: '「exhausted（ぐったり疲れた）」は "tired" より強い疲労感。"Sit down and relax"（座って休んで）は帰宅した相手への思いやり。"be ready"（準備できる）は料理完成の定番表現。' },
        { prompt: { en: "Do you need anything from the kitchen?", ja: "キッチンから何か持ってくる？" }, correct: 'A',
          A: { en: "Some water would be great, thanks.", ja: "水をもらえると助かる、ありがとう。" },
          B: { en: "Stay out of my kitchen.", ja: "私のキッチンには入らないで。" },
          tip: '「Some water would be great（水をもらえると助かる）」の would be great は「〜だと嬉しい・助かる」という丁寧な依頼。"Do you need anything from ~?"は相手に何か持ってくる申し出をする便利な一言。' },
      ],
    },
    {
      id: 'daily-ch7', icon: '🛁', title: '夕食から就寝',
      items: [
        { prompt: { en: "Dinner smells amazing!", ja: "夕食、すごくいい匂い！" }, correct: 'A',
          A: { en: "I've been cooking for an hour. Hope you like it.", ja: "1時間作ってたんだ。気に入ってくれるといいな。" },
          B: { en: "I can't smell anything.", ja: "何も匂わないよ。" },
          tip: '「smells amazing（すごくいい匂い）」の smell は感覚動詞なので進行形にしません。"Hope you like it"（気に入ってくれるといいな）は "I hope you like it" の省略形。料理を振る舞う時の自然な一言。' },
        { prompt: { en: "What's on TV tonight?", ja: "今夜のテレビ何がある？" }, correct: 'A',
          A: { en: "There's a documentary I've been wanting to watch.", ja: "ずっと見たかったドキュメンタリーがあるよ。" },
          B: { en: "I don't own a TV.", ja: "テレビは持ってないよ。" },
          tip: '「What\'s on TV?（テレビで何やってる？）」は英語の定番フレーズ。"I\'ve been wanting to watch"の現在完了進行形は「ずっと〜したかった」という継続した気持ちを表します。' },
        { prompt: { en: "Who wants to do the dishes?", ja: "食器洗い、誰かやってくれる？" }, correct: 'A',
          A: { en: "I'll do it. You cooked, so I'll clean up.", ja: "私がやるよ。あなたが料理してくれたから、私が片付けるね。" },
          B: { en: "Not me. I'm busy.", ja: "私じゃない。忙しいよ。" },
          tip: '「You cooked, so I\'ll clean up」（料理してくれたから片付ける）は家事分担の自然な交換条件の表現。"clean up"（片付ける）は皿洗いだけでなく部屋全体の掃除にも使います。' },
        { prompt: { en: "The bath is ready.", ja: "お風呂が沸いてるよ。" }, correct: 'A',
          A: { en: "Thank you! I'll hop in.", ja: "ありがとう！すぐ入るね。" },
          B: { en: "I showered this morning.", ja: "今朝シャワー浴びたよ。" },
          tip: '「hop in（さっと入る）」の hop は「ぴょんと跳ぶ」が原義ですが、「さっと入る」というカジュアルな意味で使われます。"The bath is ready"は「お風呂が沸いた」に対応する自然な英語表現。' },
        { prompt: { en: "Are you going to stay up late?", ja: "夜更かしする？" }, correct: 'A',
          A: { en: "Probably not. I'm already sleepy.", ja: "たぶんしない。もう眠いよ。" },
          B: { en: "I never sleep at night.", ja: "夜は絶対寝ないよ。" },
          tip: '「stay up late（夜更かしする）」の stay up は「起きたままでいる」こと。"probably not"（たぶんしない）は柔らかい否定表現。definitely not より確実性が低く、"まあそうなるかな"というニュアンス。' },
        { prompt: { en: "Don't forget to set your alarm.", ja: "アラームのセットを忘れずに。" }, correct: 'A',
          A: { en: "Already done! Goodnight.", ja: "もうやったよ！おやすみ。" },
          B: { en: "I'll stay up all night instead.", ja: "代わりに徹夜するよ。" },
          tip: '「Already done!（もうやったよ！）」は「もう済んでる」という簡潔な返し。done（完了した）は非常に便利な形容詞。set an alarm = アラームをセットする。Don\'t forget to ~ = 〜を忘れないで。' },
        { prompt: { en: "Sleep well!", ja: "ゆっくり眠ってね！" }, correct: 'A',
          A: { en: "You too! See you in the morning.", ja: "あなたもね！また朝に。" },
          B: { en: "Sleep is for the weak.", ja: "睡眠は弱い人のためにある。" },
          tip: '「You too!（あなたもね！）」は相手の言葉を相手にそのまま返す最短フレーズ。"See you in the morning"（朝にまた会おう）は同居している場合の就寝前の挨拶。Sleep well! = おやすみなさい。' },
      ],
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// 🌴 HAWAII COURSE
// ═══════════════════════════════════════════════════════════════════
const HAWAII_COURSE: CourseData = {
  id: 'hawaii', icon: '🌴',
  title: 'ハワイ旅行 完全シミュレーションコース',
  sub: '7チャプター・空港からチェックアウトまで',
  color: 'from-sky-400 to-cyan-500',
  chapters: [
    {
      id: 'hawaii-ch1', icon: '✈️', title: '空港到着・入国審査',
      items: [
        { prompt: { en: "Passport, please.", ja: "パスポートをお願いします。" }, correct: 'A',
          A: { en: "Here you go.", ja: "はい、どうぞ。" },
          B: { en: "I left it at home.", ja: "家に置いてきました。" },
          tip: '「Here you go（はい、どうぞ）」は物を渡す時の定番フレーズ。"Here you are." も同じ意味。入国審査でのやり取りは短く明確に答えるのがポイントです。' },
        { prompt: { en: "What's the purpose of your visit?", ja: "訪問の目的は何ですか？" }, correct: 'A',
          A: { en: "Sightseeing. Just a vacation.", ja: "観光です。休暇で来ました。" },
          B: { en: "I'm here to work illegally.", ja: "不法就労に来ました。" },
          tip: '「Sightseeing（観光）」と "vacation（休暇）" はどちらも観光目的の定番回答。"Just a vacation"の Just で「ただの〜です」と軽く簡潔に答えるコツ。他: business（仕事）、visiting family（家族訪問）。' },
        { prompt: { en: "How long will you be staying?", ja: "どれくらい滞在されますか？" }, correct: 'A',
          A: { en: "About a week.", ja: "約1週間です。" },
          B: { en: "Forever. I'm never leaving.", ja: "永遠に。もう帰りません。" },
          tip: '「About a week（約1週間）」の about は「約・おおよそ」。数字に自信がなくても about をつければOK。期間の言い方: a few days（数日）、ten days（10日）、two weeks（2週間）。' },
        { prompt: { en: "Do you have anything to declare?", ja: "申告するものはありますか？" }, correct: 'A',
          A: { en: "No, nothing to declare.", ja: "いいえ、申告するものはありません。" },
          B: { en: "Yes, everything in my bag.", ja: "はい、バッグの中のものすべて。" },
          tip: '「nothing to declare（申告なし）」は税関の定番フレーズ。declare = 申告する・宣言する。申告が必要なもの: food items（食品）、over $10,000 in cash（現金1万ドル以上）。' },
        { prompt: { en: "Please look at the camera.", ja: "カメラを見てください。" }, correct: 'A',
          A: { en: "Of course. Like this?", ja: "はい。こんな感じでいいですか？" },
          B: { en: "I'm camera shy.", ja: "カメラが苦手なんです。" },
          tip: '「Of course.（もちろんです）」は丁寧にお願いに従う自然な返し。"Like this?"（こんな感じ？）は確認を求める表現。入国審査では指示に従い簡潔に答えるのが基本です。' },
        { prompt: { en: "Is this your first time visiting Hawaii?", ja: "ハワイは初めての訪問ですか？" }, correct: 'A',
          A: { en: "Yes! I've always dreamed of coming here.", ja: "はい！ずっと来たかったんです。" },
          B: { en: "I live here already.", ja: "もうここに住んでいます。" },
          tip: '「I\'ve always dreamed of coming here（ずっと来たかった）」の "dream of" は「〜を夢見る」。現在完了形で「ずっと前から今まで夢に思っていた」という気持ちを表現します。' },
        { prompt: { en: "Welcome to Hawaii! Enjoy your stay.", ja: "ハワイへようこそ！良い滞在を。" }, correct: 'A',
          A: { en: "Thank you so much! We're so excited.", ja: "ありがとうございます！とてもワクワクしています。" },
          B: { en: "I've been here the whole time.", ja: "ずっとここにいましたけど。" },
          tip: '「We\'re so excited（とてもワクワクしています）」の excited は「興奮・ワクワク」。"so" をつけると「とても」という強調。感謝と喜びを伝えることで入国審査が温かい雰囲気で終わります。' },
      ],
    },
    {
      id: 'hawaii-ch2', icon: '🚕', title: 'ホテルへの移動',
      items: [
        { prompt: { en: "Excuse me, are you available?", ja: "すみません、乗れますか？（空車ですか？）" }, correct: 'A',
          A: { en: "Yes! Where are you heading?", ja: "はい！どちらへ向かいますか？" },
          B: { en: "I'm off duty.", ja: "業務外です。" },
          tip: '「available（利用可能な）」はタクシーや人が「空いている・利用できる」状態を表す形容詞。"Where are you heading?"（どちらへ？）の head は「〜に向かう」動詞。"Where to?" も同じ意味の短縮形。' },
        { prompt: { en: "To the BrightonStar Hotel, please.", ja: "ブライトンスターホテルまでお願いします。" }, correct: 'A',
          A: { en: "Got it. That's about 30 minutes from here.", ja: "了解です。ここから約30分です。" },
          B: { en: "I don't know that hotel.", ja: "そのホテルは知りません。" },
          tip: '「Got it（了解）」はドライバーが目的地を理解したという返事。"That\'s about 30 minutes from here"の about は「約〜」。タクシーで行き先を言う時は "To ~, please" が最もシンプルで自然。' },
        { prompt: { en: "Could you put the AC on? It's really hot.", ja: "エアコンをつけてもらえますか？すごく暑いです。" }, correct: 'A',
          A: { en: "Sure, no problem.", ja: "はい、もちろんです。" },
          B: { en: "The AC is already broken.", ja: "エアコンはもう壊れています。" },
          tip: '「put the AC on（エアコンをつける）」の put on は「（機器を）オンにする・つける」。AC = air conditioning（エアコン）。"Could you ~?"（〜していただけますか？）は丁寧な依頼表現。' },
        { prompt: { en: "Could you drop me off at the front entrance?", ja: "正面玄関で降ろしてもらえますか？" }, correct: 'A',
          A: { en: "Of course! We're almost there.", ja: "もちろんです！もうすぐ着きますよ。" },
          B: { en: "The front entrance is blocked.", ja: "正面玄関は封鎖されています。" },
          tip: '「drop me off（降ろす）」はタクシーや車から降りる時の定番フレーズ。"We\'re almost there"（もうすぐ着く）の almost は「あと少し」。drop off の逆は pick up（乗せる）。' },
        { prompt: { en: "Is there much traffic at this time of day?", ja: "この時間帯は交通量が多いですか？" }, correct: 'A',
          A: { en: "It varies. Rush hour can be pretty bad.", ja: "時によりますね。ラッシュアワーはかなりひどいです。" },
          B: { en: "I don't drive on busy roads.", ja: "混んだ道は走りません。" },
          tip: '「It varies（時によります）」の vary は「変化する・様々」。"pretty bad"（かなりひどい）の pretty は「かなり」という副詞。traffic（交通量）は不可算名詞なので a lot of traffic と言います。' },
        { prompt: { en: "How much is the fare?", ja: "料金はいくらですか？" }, correct: 'A',
          A: { en: "That'll be $28.50, please.", ja: "28ドル50セントになります。" },
          B: { en: "Taxis are free in Hawaii.", ja: "ハワイではタクシーは無料です。" },
          tip: '「That\'ll be ~（〜になります）」は金額を伝える時の丁寧な表現。"That\'ll" = "That will" の短縮形。料金を聞く時は "How much is the fare?" か "What\'s the total?" が自然。fare = 運賃。' },
        { prompt: { en: "Keep the change.", ja: "おつりはいりません（取っておいて）。" }, correct: 'A',
          A: { en: "Thank you so much! Have a wonderful stay.", ja: "ありがとうございます！素晴らしい滞在を。" },
          B: { en: "I need all my change back.", ja: "おつりは全部返してください。" },
          tip: '「Keep the change（おつりはいらない）」はチップを渡す時の定番フレーズ。アメリカでは運転手へのチップは料金の15〜20%が目安。driver\'s reply: "Thank you so much!"が自然。' },
      ],
    },
    {
      id: 'hawaii-ch3', icon: '🏨', title: 'ホテルチェックイン',
      items: [
        { prompt: { en: "Welcome! Do you have a reservation?", ja: "いらっしゃいませ！ご予約はありますか？" }, correct: 'A',
          A: { en: "Yes, I have a reservation under Tanaka.", ja: "はい、田中の名前で予約しています。" },
          B: { en: "No, I just showed up.", ja: "いいえ、ふらっと来ました。" },
          tip: '「reservation under ~（〜の名前で予約）」の under は「〜という名前で」という意味。"I have a reservation"（予約があります）はホテルで必ず使う表現。under + 名字が最も自然。' },
        { prompt: { en: "Can I see your passport and credit card?", ja: "パスポートとクレジットカードを拝見できますか？" }, correct: 'A',
          A: { en: "Sure, here they are.", ja: "はい、どうぞ。" },
          B: { en: "I only have cash.", ja: "現金しか持っていません。" },
          tip: '「here they are（はい、こちらです）」は複数のものを渡す時の表現。1つの場合は "here it is"。パスポートとクレジットカードの2つなので "they" を使います。' },
        { prompt: { en: "We have you booked for three nights, is that right?", ja: "3泊のご予約ですね、よろしかったでしょうか？" }, correct: 'A',
          A: { en: "Yes, that's correct. From the 10th to the 13th.", ja: "はい、その通りです。10日から13日まで。" },
          B: { en: "I want to stay forever.", ja: "永遠に泊まりたいです。" },
          tip: '「that\'s correct（その通りです）」は確認への同意表現。"From the 10th to the 13th"はチェックイン・チェックアウト日を伝える標準的な形式。Is that right? = よろしかったでしょうか？という確認。' },
        { prompt: { en: "Would you prefer a room with an ocean view?", ja: "オーシャンビューのお部屋はいかがですか？" }, correct: 'A',
          A: { en: "Absolutely! If it's available, please.", ja: "ぜひ！空いていればお願いします。" },
          B: { en: "I don't like looking at the ocean.", ja: "海を見るのは好きじゃないです。" },
          tip: '「Absolutely!（ぜひ！もちろん！）」は強い肯定の表現。"If it\'s available"（空いていれば）は条件付きで依頼する丁寧な言い方。ocean view（海の見える眺め）は旅行での重要キーワード。' },
        { prompt: { en: "Is there anything special for your stay?", ja: "滞在中に特別なご要望はありますか？" }, correct: 'A',
          A: { en: "Could we get extra towels? We have two people.", ja: "タオルを多めにもらえますか？2人なので。" },
          B: { en: "I want room service every hour.", ja: "1時間ごとにルームサービスをお願いします。" },
          tip: '「extra towels（追加のタオル）」の extra は「追加の・余分の」。"We have two people"（2人です）は理由を自然に添える方法。ホテルスタッフへのお願いは "Could we get ~?"が丁寧。' },
        { prompt: { en: "Checkout is at 11 AM. Is that okay?", ja: "チェックアウトは午前11時です。よろしいですか？" }, correct: 'A',
          A: { en: "That works for us. Thank you.", ja: "問題ありません。ありがとうございます。" },
          B: { en: "I never check out. I'll live here.", ja: "チェックアウトはしません。ここに住みます。" },
          tip: '「That works for us（私たちには問題ありません）」の "That works" は「それで大丈夫・都合がいい」。"for us" で「私たちには」を追加。checkout時間は11時〜12時が一般的です。' },
        { prompt: { en: "Here's your room key. Your room is 1204.", ja: "お部屋の鍵です。1204号室になります。" }, correct: 'A',
          A: { en: "Thank you! Could you show me how to get there?", ja: "ありがとうございます！行き方を教えていただけますか？" },
          B: { en: "I know where it is already.", ja: "場所はもう知っています。" },
          tip: '「Could you show me how to get there?」はホテルで部屋への道を聞く自然な表現。"show me how to"（〜の方法を見せて）は道順だけでなく操作方法を聞く時にも使えます。' },
      ],
    },
    {
      id: 'hawaii-ch4', icon: '🍽️', title: 'カフェ・プレートランチ',
      items: [
        { prompt: { en: "Welcome in! Table for how many?", ja: "いらっしゃいませ！何名様ですか？" }, correct: 'A',
          A: { en: "Two, please.", ja: "2名お願いします。" },
          B: { en: "I'm eating alone but I need five tables.", ja: "1人ですが、テーブル5つ必要です。" },
          tip: '「Two, please（2名お願いします）」はシンプルかつ明確な答え方。"Table for how many?"（何名様？）の答えは人数 + please だけでOK。"A table for two"（2名用のテーブル）という言い方も使えます。' },
        { prompt: { en: "Can I get you started with something to drink?", ja: "まずお飲み物はいかがですか？" }, correct: 'A',
          A: { en: "Yes, I'll have a water and an iced tea.", ja: "はい、お水とアイスティーをください。" },
          B: { en: "I only drink at home.", ja: "飲み物は家でしか飲みません。" },
          tip: '「I\'ll have ~（〜をいただきます）」は注文の定番表現。水は "just water"、"still water（炭酸なし）"、"sparkling water（炭酸水）"。"Can I get you started with"は接客でよく使う丁寧なフレーズ。' },
        { prompt: { en: "What do you recommend?", ja: "おすすめは何ですか？" }, correct: 'A',
          A: { en: "The plate lunch is very popular here. It comes with rice and mac salad.", ja: "プレートランチがとても人気です。ライスとマカロニサラダがついています。" },
          B: { en: "I recommend the place next door.", ja: "隣のお店をおすすめします。" },
          tip: '「What do you recommend?」はレストランでの必須フレーズ。plate lunch（プレートランチ）はハワイの名物料理。"It comes with ~"（〜がついています）は付け合わせを説明する時の表現。mac salad = macaroni salad。' },
        { prompt: { en: "Can I customize my order?", ja: "注文をカスタマイズできますか？" }, correct: 'A',
          A: { en: "Of course! What would you like to change?", ja: "もちろんです！何を変えますか？" },
          B: { en: "The menu is fixed. No changes.", ja: "メニューは固定です。変更はできません。" },
          tip: '「customize（カスタマイズする）」はファストフードやカフェでの注文変更を指します。"What would you like to change?"の would like to は want to の丁寧な言い方。アメリカの外食文化ではカスタマイズは一般的。' },
        { prompt: { en: "Is everything all right here?", ja: "お料理はいかがでしょうか？" }, correct: 'A',
          A: { en: "Everything is great, thank you!", ja: "全部最高です、ありがとう！" },
          B: { en: "Yes, I'm fine. Stop asking.", ja: "はい、大丈夫です。もう聞かないで。" },
          tip: '「Is everything all right?（お料理はいかがですか？）」は食事中の店員チェックインフレーズ。"Everything is great"（全部最高）はポジティブな返答の定番。"Is everything okay?" も同じ意味。' },
        { prompt: { en: "Would you like a dessert menu?", ja: "デザートメニューをご覧になりますか？" }, correct: 'A',
          A: { en: "Yes please! I heard the haupia is amazing.", ja: "はい！ハウピアが最高と聞いています。" },
          B: { en: "Dessert is not healthy.", ja: "デザートは健康的ではありません。" },
          tip: '「I heard ~（〜と聞きました）」は間接情報を伝える表現。haupia（ハウピア）はハワイの伝統的なコナッツプリン。"Would you like ~?"（〜はいかがですか？）は上品な提案フレーズ。' },
        { prompt: { en: "Can we get the check, please?", ja: "お会計をお願いします。" }, correct: 'A',
          A: { en: "Of course! I'll bring it right out.", ja: "はい！すぐにお持ちします。" },
          B: { en: "We don't have checks here.", ja: "当店では小切手はありません。" },
          tip: '「get the check（お会計）」のcheckはアメリカ英語での「請求書」。イギリス英語では "bill" を使います。"I\'ll bring it right out"の right out = immediately（すぐに）。' },
      ],
    },
    {
      id: 'hawaii-ch5', icon: '🛍️', title: 'ショッピング',
      items: [
        { prompt: { en: "Can I help you find anything?", ja: "何かお探しですか？" }, correct: 'A',
          A: { en: "Yes! I'm looking for a souvenir for my parents.", ja: "はい！両親へのお土産を探しています。" },
          B: { en: "I don't need your help.", ja: "お手伝いは不要です。" },
          tip: '「I\'m looking for ~（〜を探しています）」はショッピングで必須のフレーズ。souvenir（お土産）はフランス語由来の単語。"for my parents"（両親のために）の for は目的・用途を表す前置詞。' },
        { prompt: { en: "Do you have this in a different size?", ja: "これの違うサイズはありますか？" }, correct: 'A',
          A: { en: "Let me check in the back for you.", ja: "バックヤードで確認してきます。" },
          B: { en: "That's the only size we carry.", ja: "それが唯一のサイズです。" },
          tip: '「in the back（バックヤードに・奥に）」は店の倉庫や在庫を保管している場所のこと。"Let me check"（確認してきます）の let me は「〜させてください」という申し出の表現。' },
        { prompt: { en: "Can I try this on?", ja: "試着できますか？" }, correct: 'A',
          A: { en: "Of course! The fitting rooms are right over there.", ja: "もちろんです！試着室はあちらです。" },
          B: { en: "We don't allow trying on clothes.", ja: "試着はできません。" },
          tip: '「try ~ on（試着する）」の try on は服や靴を「身につけて試す」こと。fitting room（試着室）はアメリカ英語で、イギリスでは changing room と言います。"right over there"の right は「ちょうど・すぐ」という強調副詞。' },
        { prompt: { en: "How does it fit?", ja: "サイズはいかがですか？" }, correct: 'A',
          A: { en: "It's a little tight around the shoulders.", ja: "肩のところが少しきついです。" },
          B: { en: "I can't put it on.", ja: "着られませんでした。" },
          tip: '「fit（合う・フィットする）」はサイズ感を表す動詞。"tight（きつい）" ↔ "loose（ゆるい）"。"around the shoulders"（肩のあたりが）のように体の部位には around を使います。"fits perfectly"（ぴったり）も重要表現。' },
        { prompt: { en: "Do you do tax refunds for tourists?", ja: "観光客向けの税金の払い戻しはありますか？" }, correct: 'A',
          A: { en: "Yes! You'll need your passport for that.", ja: "はい！そのためにパスポートが必要になります。" },
          B: { en: "Tourists pay double tax.", ja: "観光客は税金が2倍です。" },
          tip: '「tax refund（税金の払い戻し・免税）」は旅行者が受けられる制度。"You\'ll need ~"（〜が必要です）の will は将来の見通し。パスポートを提示することが多くの国での免税の条件です。' },
        { prompt: { en: "I'll take this one.", ja: "これをいただきます（買います）。" }, correct: 'A',
          A: { en: "Great choice! Will that be cash or card?", ja: "素晴らしいお選びです！現金ですかカードですか？" },
          B: { en: "You can't buy that.", ja: "それは購入できません。" },
          tip: '「I\'ll take this one（これにします）」は購入を決めた時の定番フレーズ。"Great choice!"（素晴らしいお選び！）は店員の定番リアクション。"cash or card?"（現金かカードか？）はお会計前の確認フレーズ。' },
        { prompt: { en: "Would you like it gift-wrapped?", ja: "ギフト包装はご希望ですか？" }, correct: 'A',
          A: { en: "Yes please! It's a present for someone.", ja: "はい！誰かへのプレゼントです。" },
          B: { en: "I hate wrapping paper.", ja: "包装紙が嫌いです。" },
          tip: '「gift-wrapped（ギフト包装された）」の gift-wrap は「プレゼント用に包む」動詞。"for someone"（誰かのために）はプレゼントだと伝える自然な表現。"Could you wrap it as a gift?"とも言えます。' },
      ],
    },
    {
      id: 'hawaii-ch6', icon: '🍷', title: 'ディナー',
      items: [
        { prompt: { en: "Good evening. Do you have a reservation?", ja: "こんばんは。ご予約はございますか？" }, correct: 'A',
          A: { en: "Yes, it's under Sato. A table for two.", ja: "はい、佐藤の名前です。2名です。" },
          B: { en: "No, but I'm very hungry.", ja: "ありません。でもとてもお腹が空いています。" },
          tip: '「A table for two（2名のテーブル）」は予約確認と同時に人数を伝える効率的な表現。"under + 名前"は予約名の表現。ディナーでは予約がある場合、名前と人数をセットで伝えましょう。' },
        { prompt: { en: "Can I tell you about our specials tonight?", ja: "本日のスペシャルメニューをお伝えしてもよろしいですか？" }, correct: 'A',
          A: { en: "Please! We'd love to hear.", ja: "ぜひ！聞かせてください。" },
          B: { en: "We already know everything.", ja: "もう全部知っています。" },
          tip: '「We\'d love to hear（ぜひ聞きたいです）」の "would love to" は "want to" より丁寧で熱意がある表現。スペシャルメニューはレストランで毎日変わる特別な料理のこと。Please! = ぜひ！という短い同意。' },
        { prompt: { en: "How would you like your steak cooked?", ja: "ステーキの焼き加減はいかがなさいますか？" }, correct: 'A',
          A: { en: "Medium rare, please.", ja: "ミディアムレアでお願いします。" },
          B: { en: "I want it completely burned.", ja: "真っ黒に焦がしてください。" },
          tip: 'ステーキの焼き加減: rare（レア）→ medium rare（ミディアムレア）→ medium（ミディアム）→ medium well（ミディアムウェル）→ well done（ウェルダン）。"How would you like it cooked?"は焼き加減を聞く定番フレーズ。' },
        { prompt: { en: "What wine would you recommend with this?", ja: "これに合うワインは何がいいでしょうか？" }, correct: 'A',
          A: { en: "The Pinot Noir pairs very well with that dish.", ja: "ピノ・ノワールがそのお料理によく合います。" },
          B: { en: "Wine and food don't go together.", ja: "ワインと食事は合いません。" },
          tip: '「pair with（〜に合わせる・ペアリングする）」はワインと食事の組み合わせを表す動詞。Pinot Noir（ピノ・ノワール）は代表的な赤ワイン。"What do you recommend with ~?"は丁寧な質問フレーズ。' },
        { prompt: { en: "Is everything to your liking?", ja: "お料理はお口に合っていますか？" }, correct: 'A',
          A: { en: "It's wonderful! The steak is perfectly cooked.", ja: "素晴らしいです！ステーキが完璧な焼き加減です。" },
          B: { en: "I've had better.", ja: "もっとおいしいものを食べたことあります。" },
          tip: '「to your liking（お気に召して）」はフォーマルな接客表現。"perfectly cooked"（完璧な焼き加減）の perfectly は「理想通りに・完璧に」。料理を褒める表現: delicious, divine, incredible など。' },
        { prompt: { en: "Would you like to see the dessert menu?", ja: "デザートメニューをご覧になりますか？" }, correct: 'A',
          A: { en: "Yes, but just a small one. I'm quite full.", ja: "はい、でも少しだけ。かなりお腹いっぱいです。" },
          B: { en: "I only eat dessert.", ja: "デザートしか食べません。" },
          tip: '「just a small one（ちょっとだけ）」は遠慮しながらも注文する柔らかい表現。"quite full"（かなりお腹いっぱい）の quite は「かなり」という強調副詞。Would you like to ~? は丁寧な提案フレーズ。' },
        { prompt: { en: "It was a pleasure serving you this evening.", ja: "本日はお越しいただきありがとうございました。" }, correct: 'A',
          A: { en: "Thank you! Everything was absolutely wonderful.", ja: "ありがとう！全てが本当に素晴らしかったです。" },
          B: { en: "The service was slow.", ja: "サービスが遅かったです。" },
          tip: '「a pleasure serving you（お役に立てて光栄）」は高級レストランでの丁寧なお見送り表現。"absolutely wonderful"（本当に素晴らしい）の absolutely は very より強い強調。旅先での感謝表現を積極的に使いましょう。' },
      ],
    },
    {
      id: 'hawaii-ch7', icon: '🧳', title: 'チェックアウトと帰国',
      items: [
        { prompt: { en: "Good morning! Checking out today?", ja: "おはようございます！本日チェックアウトですか？" }, correct: 'A',
          A: { en: "Yes, we're leaving this morning.", ja: "はい、今朝出発します。" },
          B: { en: "No, I'm staying another week.", ja: "いいえ、もう1週間泊まります。" },
          tip: '「we\'re leaving this morning（今朝出発します）」の leaving は「出発する・離れる」。"this morning"（今朝）は "in the morning" ではなく "this" を使うことに注意。leave = go away from a place。' },
        { prompt: { en: "Could we store our luggage until our flight?", ja: "フライトまで荷物を預かってもらえますか？" }, correct: 'A',
          A: { en: "Absolutely! We'll hold it at the front desk.", ja: "もちろんです！フロントで預かります。" },
          B: { en: "Luggage storage costs extra.", ja: "荷物預かりは追加料金がかかります。" },
          tip: '「store our luggage（荷物を預ける）」の store は「保管する・預ける」。"hold it at the front desk"の hold は「保持する・保管する」。luggage（荷物）は不可算名詞なので "our luggage"（luggage\'s は使わない）。' },
        { prompt: { en: "How was your stay overall?", ja: "総じてご滞在はいかがでしたか？" }, correct: 'A',
          A: { en: "It was absolutely wonderful. We'll definitely be back.", ja: "本当に素晴らしかったです。必ずまた来ます。" },
          B: { en: "It was just okay.", ja: "まあまあでした。" },
          tip: '「absolutely wonderful（本当に素晴らしかった）」の absolutely は very の強い強調表現。"We\'ll definitely be back"（必ずまた来ます）の definitely は確信を示す副詞。旅の締めくくりに感謝を伝えましょう。' },
        { prompt: { en: "Let me call you a cab to the airport.", ja: "空港へのタクシーを呼びましょうか。" }, correct: 'A',
          A: { en: "That would be wonderful, thank you!", ja: "それは助かります、ありがとう！" },
          B: { en: "I'll walk to the airport.", ja: "空港まで歩いて行きます。" },
          tip: '「Let me call you a cab（タクシーを呼びましょう）」の let me は「〜させてください」という申し出。cab（タクシー）は taxi の口語表現。"That would be wonderful"（それは素晴らしい）は申し出を丁寧に受け入れる表現。' },
        { prompt: { en: "Is there anything we can improve for next time?", ja: "次回のためにご意見はございますか？" }, correct: 'A',
          A: { en: "Nothing major. You've been incredibly welcoming.", ja: "特にないです。本当に温かく歓迎してくださいました。" },
          B: { en: "Everything was terrible.", ja: "全部ひどかったです。" },
          tip: '「nothing major（特に大きな問題はない）」の major は「重大な・主要な」。"incredibly welcoming"（信じられないほど温かい歓迎）の incredibly は非常に強い強調。welcoming は形容詞として使えます。' },
        { prompt: { en: "Safe travels! Hope to see you again.", ja: "良いご旅行を！またお会いできることを願っています。" }, correct: 'A',
          A: { en: "Thank you for everything! This was an unforgettable trip.", ja: "全てに感謝します！忘れられない旅行でした。" },
          B: { en: "I won't miss Hawaii at all.", ja: "ハワイが全然恋しくないです。" },
          tip: '「Safe travels（安全な旅を）」は旅立つ人への別れの言葉。"unforgettable trip"（忘れられない旅）の unforgettable = un-（否定）+ forgettable（忘れられる）= 忘れられない。旅行の締めくくりにぴったりの言葉。' },
        { prompt: { en: "Your flight boards in two hours. You're all set!", ja: "搭乗まで2時間です。準備万端ですね！" }, correct: 'A',
          A: { en: "Perfect. We'll head to the gate now.", ja: "完璧です。今からゲートに向かいます。" },
          B: { en: "I missed my flight already.", ja: "もうフライトを逃しました。" },
          tip: '「you\'re all set（準備万端です）」はホテルや店で「準備完了・大丈夫ですよ」と伝える表現。"head to the gate"（ゲートに向かう）の head to は「〜に向かう」。boards（搭乗開始する）も空港で使う重要な動詞。' },
      ],
    },
  ],
};

// ─── Course map ───────────────────────────────────────────────────
const ALL_COURSES: Record<CourseId, CourseData> = {
  daily: DAILY_COURSE,
  hawaii: HAWAII_COURSE,
};

// ─── Flatten all items for review mode ───────────────────────────
interface ReviewEntry { item: DialogueItem; chapterTitle: string; icon: string; }
function getAllReviewItems(): ReviewEntry[] {
  const out: ReviewEntry[] = [];
  for (const c of [DAILY_COURSE, HAWAII_COURSE]) {
    for (const ch of c.chapters) {
      for (const item of ch.items) {
        out.push({ item, chapterTitle: ch.title, icon: ch.icon });
      }
    }
  }
  return out;
}
const ALL_REVIEW_ITEMS = getAllReviewItems();

// ═══════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════
export function StoryDialogue() {
  // ── Navigation ──
  const [screen,     setScreen]     = useState<Screen>('course');
  const [courseId,   setCourseId]   = useState<CourseId | null>(null);
  const [chapterIdx, setChapterIdx] = useState(0);

  // ── Dialogue quiz ──
  const [dialogueIdx,     setDialogueIdx]     = useState(0);
  const [chosen,          setChosen]          = useState<'A'|'B'|null>(null);
  const [flash,           setFlash]           = useState<'ok'|'ng'|null>(null);
  const [chapterCorrect,  setChapterCorrect]  = useState(0);
  const [chapterTotal,    setChapterTotal]    = useState(0);

  // ── Mini-test ──
  const [testItems,   setTestItems]   = useState<DialogueItem[]>([]);
  const [testIdx,     setTestIdx]     = useState(0);
  const [testChosen,  setTestChosen]  = useState<'A'|'B'|null>(null);
  const [testRevealed,setTestRevealed]= useState(false);
  const [testCorrect, setTestCorrect] = useState(0);
  const [testWrong,   setTestWrong]   = useState<DialogueItem[]>([]);

  // ── Review mode ──
  const [mode,      setMode]      = useState<Mode>('study');
  const [filter,    setFilter]    = useState<Filter>('all');
  const [memorized, setMemorized] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set<string>();
    try {
      const s = localStorage.getItem(LS_MEMO);
      return s ? new Set<string>(JSON.parse(s) as string[]) : new Set<string>();
    } catch { return new Set<string>(); }
  });

  const toggleMemo = useCallback((key: string) => {
    setMemorized(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem(LS_MEMO, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // ── Derived ──
  const course  = courseId ? ALL_COURSES[courseId] : null;
  const chapter = course ? course.chapters[chapterIdx] : null;
  const dialogueItem = chapter ? chapter.items[dialogueIdx] : null;
  const testItem = testItems[testIdx] ?? null;
  const memoCount = memorized.size;
  const reviewItems = filter === 'needs'
    ? ALL_REVIEW_ITEMS.filter(r => !memorized.has(r.item.prompt.en))
    : ALL_REVIEW_ITEMS;

  // ── Handlers ──
  const goToCourse = useCallback(() => {
    window.speechSynthesis?.cancel();
    setScreen('course');
    setCourseId(null);
  }, []);

  const startCourse = useCallback((id: CourseId) => {
    setCourseId(id);
    setScreen('chapters');
  }, []);

  const startChapter = useCallback((chapIdx: number) => {
    setChapterIdx(chapIdx);
    setDialogueIdx(0);
    setChosen(null);
    setFlash(null);
    setChapterCorrect(0);
    setChapterTotal(0);
    setScreen('dialogue');
  }, []);

  const startMiniTest = useCallback((chapIdx: number) => {
    if (!course) return;
    setChapterIdx(chapIdx);
    const items = shuffle(course.chapters[chapIdx].items).slice(0, Math.min(7, course.chapters[chapIdx].items.length));
    setTestItems(items);
    setTestIdx(0);
    setTestChosen(null);
    setTestRevealed(false);
    setTestCorrect(0);
    setTestWrong([]);
    setScreen('minitest');
  }, [course]);

  const handleChoose = useCallback((choice: 'A'|'B') => {
    if (chosen || !dialogueItem) return;
    setChosen(choice);
    setChapterTotal(t => t + 1);
    const ok = choice === dialogueItem.correct;
    setFlash(ok ? 'ok' : 'ng');
    if (ok) setChapterCorrect(c => c + 1);
  }, [chosen, dialogueItem]);

  const handleNext = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (!chapter) return;
    if (dialogueIdx + 1 >= chapter.items.length) {
      setScreen('chapter-end');
    } else {
      setDialogueIdx(i => i + 1);
      setChosen(null);
      setFlash(null);
    }
  }, [chapter, dialogueIdx]);

  const handleTestChoose = useCallback((choice: 'A'|'B') => {
    if (testChosen || !testItem) return;
    setTestChosen(choice);
    setTestRevealed(true);
    const ok = choice === testItem.correct;
    if (ok) setTestCorrect(c => c + 1);
    else setTestWrong(w => [...w, testItem]);
  }, [testChosen, testItem]);

  const handleTestNext = useCallback(() => {
    window.speechSynthesis?.cancel();
    if (testIdx + 1 >= testItems.length) {
      setScreen('test-results');
    } else {
      setTestIdx(i => i + 1);
      setTestChosen(null);
      setTestRevealed(false);
    }
  }, [testIdx, testItems.length]);

  // ══════════════════════════════════════════════════════
  // REVIEW MODE (shown on course screen when mode=review)
  // ══════════════════════════════════════════════════════
  const ModeTabs = (
    <div className="flex bg-gray-100 rounded-2xl p-1 mb-4">
      {([['study', '📖 学習する'], ['review', '✅ 復習する']] as [Mode, string][]).map(([m, label]) => (
        <button key={m} onClick={() => setMode(m as Mode)}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${
            mode === m ? 'bg-gray-900 text-white shadow-md' : 'text-gray-700'
          }`}>
          {label}
          {m === 'review' && (
            <span className={`ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded-full ${
              mode === 'review' ? 'bg-white/20 text-white' : 'bg-gray-300 text-gray-700'
            }`}>{memoCount}/{ALL_REVIEW_ITEMS.length}</span>
          )}
        </button>
      ))}
    </div>
  );

  // ══ SCREEN: course ══
  if (screen === 'course') {
    if (mode === 'review') {
      return (
        <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">
          {ModeTabs}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-black text-gray-800 flex-1">全{ALL_REVIEW_ITEMS.length}問・覚えた: {memoCount}問</span>
            <div className="flex bg-gray-100 rounded-xl p-0.5">
              {([['all', 'すべて'], ['needs', '要復習']] as [Filter, string][]).map(([f, label]) => (
                <button key={f} onClick={() => setFilter(f as Filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${filter === f ? 'bg-gray-900 text-white shadow' : 'text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {reviewItems.length === 0 && (
            <div className="text-center py-12">
              <p className="text-4xl mb-3">🎉</p>
              <p className="text-base font-black text-gray-900">全問覚えました！</p>
              <p className="text-xs font-bold text-gray-700 mt-1">「すべて」で復習できます</p>
            </div>
          )}
          <div className="space-y-3">
            {reviewItems.map(({ item, chapterTitle, icon }) => {
              const key = item.prompt.en;
              const isMemo = memorized.has(key);
              return (
                <div key={key} className={`rounded-2xl border-2 overflow-hidden transition-all ${isMemo ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                  <div className="px-4 pt-3 pb-1">
                    <span className="inline-block bg-gray-100 rounded-full px-2 py-0.5 text-[10px] font-black text-gray-800 mb-2">{icon} {chapterTitle}</span>
                    <div className="bg-gray-900 rounded-xl p-3 mb-2">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">相手の発言</p>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-black text-white leading-snug">&ldquo;{item.prompt.en}&rdquo;</p>
                          <p className="text-xs font-bold text-gray-300 mt-0.5">{item.prompt.ja}</p>
                        </div>
                        <SpeakBtn text={item.prompt.en} size="xs" />
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 mb-2">
                      <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">✅ 正解の返答</p>
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-black text-emerald-900 leading-snug">&ldquo;{item[item.correct].en}&rdquo;</p>
                          <p className="text-xs font-bold text-emerald-700 mt-0.5">{item[item.correct].ja}</p>
                        </div>
                        <SpeakBtn text={item[item.correct].en} size="xs" />
                      </div>
                    </div>
                    <div className="border border-sky-300 bg-sky-50 rounded-xl p-3 mb-3">
                      <p className="text-[9px] font-black text-sky-800 uppercase tracking-widest mb-1">💡 使い方・発音のコツ</p>
                      <p className="text-xs font-bold text-gray-900 leading-relaxed">{item.tip}</p>
                    </div>
                  </div>
                  <button onClick={() => toggleMemo(key)}
                    className={`w-full flex items-center gap-3 px-4 py-3 border-t-2 transition-all active:scale-[0.99] ${isMemo ? 'border-emerald-400 bg-emerald-100' : 'border-gray-200 bg-gray-50'}`}>
                    <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${isMemo ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-400'}`}>
                      {isMemo && <span className="text-sm font-black">✓</span>}
                    </div>
                    <span className={`text-sm font-black ${isMemo ? 'text-emerald-800' : 'text-gray-800'}`}>{isMemo ? '覚えた ✅' : '覚えた？ チェックする'}</span>
                    {isMemo && <span className="ml-auto text-[10px] font-bold text-emerald-600">タップで解除</span>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Study mode — course selection
    return (
      <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">
        {ModeTabs}
        <div className="text-center py-3 mb-2">
          <p className="text-xl font-black text-gray-900">🗣️ ストーリー対話特訓</p>
          <p className="text-xs font-bold text-gray-700 mt-1">コースを選んでスタート！</p>
        </div>
        {[DAILY_COURSE, HAWAII_COURSE].map(c => (
          <button key={c.id} onClick={() => startCourse(c.id)}
            className={`w-full bg-gradient-to-br ${c.color} rounded-3xl p-6 text-left text-white shadow-lg active:scale-[0.97] transition-all mb-4`}>
            <span className="text-4xl">{c.icon}</span>
            <p className="text-xl font-black mt-2 leading-tight">{c.title}</p>
            <p className="text-sm font-bold opacity-80 mt-1">{c.sub}</p>
            <div className="mt-3 inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black">
              全{c.chapters.length}チャプター → スタート ▶
            </div>
          </button>
        ))}
      </div>
    );
  }

  // ══ SCREEN: chapters ══
  if (screen === 'chapters' && course) {
    return (
      <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={goToCourse} className="text-xs font-black text-gray-700 px-3 py-1.5 bg-gray-100 rounded-full active:scale-95 transition-all">← コース選択</button>
          <p className="font-black text-gray-900 text-sm flex-1 text-center">{course.icon} {course.title.split('コース')[0]}</p>
          <div className="w-16" />
        </div>
        <div className="space-y-3">
          {course.chapters.map((ch, i) => (
            <div key={ch.id} className="bg-white border-2 border-gray-200 rounded-2xl overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{ch.icon}</span>
                  <div>
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Chapter {i + 1}</p>
                    <p className="text-base font-black text-gray-900">{ch.title}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-gray-600">{ch.items.length}問</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => startChapter(i)}
                    className="flex-1 py-2 rounded-xl bg-gray-900 text-white text-xs font-black active:scale-[0.98] transition-all">
                    ▶ 学習する
                  </button>
                  <button onClick={() => startMiniTest(i)}
                    className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-black active:scale-[0.98] transition-all">
                    📝 小テスト
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ══ SCREEN: dialogue ══
  if (screen === 'dialogue' && chapter && dialogueItem) {
    const isCorrect = chosen !== null && chosen === dialogueItem.correct;
    const isWrong   = chosen !== null && chosen !== dialogueItem.correct;

    return (
      <div className={`min-h-screen px-4 pt-2 pb-[120px] max-w-md mx-auto transition-colors duration-200 ${
        flash === 'ok' ? 'bg-emerald-50' : flash === 'ng' ? 'bg-red-50' : 'bg-white'
      }`}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setScreen('chapters')} className="text-xs font-black text-gray-700 px-3 py-1.5 bg-gray-100 rounded-full active:scale-95 transition-all">← チャプター一覧</button>
          <p className="text-xs font-bold text-gray-800">{dialogueIdx + 1}/{chapter.items.length}</p>
        </div>
        {/* 進捗バー */}
        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
          <div className="h-1.5 bg-gray-900 rounded-full transition-all duration-300" style={{ width: `${((dialogueIdx + 1) / chapter.items.length) * 100}%` }} />
        </div>
        {/* チャプタータイトル */}
        <div className="bg-gray-100 rounded-xl px-3 py-1.5 mb-3 inline-flex items-center gap-1.5">
          <span>{chapter.icon}</span>
          <p className="text-xs font-black text-gray-800">{chapter.title}</p>
        </div>
        {/* 相手の投げかけ */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 shadow-lg">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">相手の発言</p>
          <div className="flex items-start gap-2 mb-1">
            <p className="text-xl font-black text-white leading-snug flex-1">&ldquo;{dialogueItem.prompt.en}&rdquo;</p>
            <SpeakBtn text={dialogueItem.prompt.en} />
          </div>
          <p className="text-sm font-bold text-gray-300">{dialogueItem.prompt.ja}</p>
        </div>
        {/* 2択 */}
        <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2 px-1">あなたの返答を選んでください</p>
        <div className="space-y-3 mb-4">
          {(['A', 'B'] as const).map(key => {
            const opt = dialogueItem[key];
            const isThis = chosen === key;
            const isCorrectOpt = key === dialogueItem.correct;
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
                    chosen ? isCorrectOpt ? 'bg-emerald-500 text-white' : isThis ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500' : 'bg-indigo-600 text-white'
                  }`}>
                    {chosen && isCorrectOpt ? '✅' : chosen && isThis ? '❌' : key}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black leading-snug ${chosen ? isCorrectOpt ? 'text-emerald-900' : isThis ? 'text-red-900' : 'text-gray-500' : 'text-gray-900'}`}>{opt.en}</p>
                    <p className={`text-xs font-bold mt-0.5 ${chosen ? isCorrectOpt ? 'text-emerald-700' : isThis ? 'text-red-700' : 'text-gray-400' : 'text-gray-700'}`}>{opt.ja}</p>
                  </div>
                  <SpeakBtn text={opt.en} size="xs" />
                </div>
              </button>
            );
          })}
        </div>
        {/* 正誤 + 解説 */}
        {chosen && (
          <>
            <div className={`rounded-2xl p-4 mb-3 border-2 ${isCorrect ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
              <p className={`text-base font-black mb-1 ${isCorrect ? 'text-emerald-800' : 'text-red-800'}`}>
                {isCorrect ? '✅ 正解！' : '❌ 不正解'}
              </p>
              {isWrong && (
                <div className="mb-2 flex items-start gap-2 bg-white/70 rounded-xl px-3 py-2 border border-emerald-200">
                  <p className="text-xs font-black text-emerald-900 flex-1">
                    正解: &ldquo;{dialogueItem[dialogueItem.correct].en}&rdquo;<br/>
                    <span className="font-bold text-emerald-700">{dialogueItem[dialogueItem.correct].ja}</span>
                  </p>
                  <SpeakBtn text={dialogueItem[dialogueItem.correct].en} size="xs" />
                </div>
              )}
            </div>
            <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-4 mb-4 space-y-2 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">💡</span>
                <p className="text-xs font-black text-sky-900 uppercase tracking-widest">使い方・発音のコツ</p>
              </div>
              <p className="text-sm font-bold text-gray-900 leading-relaxed">{dialogueItem.tip}</p>
              <button onClick={() => speak(dialogueItem[dialogueItem.correct].en)}
                className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full bg-sky-700 text-white active:scale-95 transition-transform">
                🔊 正解フレーズをもう一度
              </button>
            </div>
            <button onClick={handleNext}
              className="w-full py-3.5 rounded-2xl font-black text-base bg-gray-900 text-white active:scale-[0.98] transition-all shadow-md">
              {dialogueIdx + 1 >= chapter.items.length ? 'チャプター完了 →' : '次の対話へ →'}
            </button>
          </>
        )}
      </div>
    );
  }

  // ══ SCREEN: chapter-end ══
  if (screen === 'chapter-end' && course && chapter) {
    const pct = chapterTotal > 0 ? Math.round(chapterCorrect / chapterTotal * 100) : 0;
    const isLastChapter = chapterIdx >= course.chapters.length - 1;
    return (
      <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">
        <div className="text-center py-8">
          <p className="text-5xl mb-3">🎉</p>
          <p className="text-2xl font-black text-gray-900">チャプター完了！</p>
          <p className="text-base font-bold text-gray-700 mt-1">{chapter.icon} {chapter.title}</p>
          <div className="mt-4 inline-flex items-center gap-3 bg-gray-100 rounded-2xl px-6 py-3">
            <div className="text-center">
              <p className="text-3xl font-black text-gray-900">{pct}%</p>
              <p className="text-xs font-bold text-gray-700">{chapterCorrect}/{chapterTotal} 正解</p>
            </div>
            <div className="w-px h-10 bg-gray-300" />
            <div className="text-center">
              <p className="text-3xl font-black text-gray-900">{chapter.items.length}</p>
              <p className="text-xs font-bold text-gray-700">問出題</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <button onClick={() => startMiniTest(chapterIdx)}
            className="w-full py-4 rounded-2xl font-black text-base bg-amber-500 text-white active:scale-[0.98] transition-all shadow-md">
            📝 小テストに挑戦する（{Math.min(7, chapter.items.length)}問）
          </button>
          {!isLastChapter && (
            <button onClick={() => startChapter(chapterIdx + 1)}
              className="w-full py-3.5 rounded-2xl font-black text-base bg-gray-900 text-white active:scale-[0.98] transition-all shadow-md">
              次のチャプターへ →
            </button>
          )}
          <button onClick={() => setScreen('chapters')}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-800 active:scale-[0.98] transition-all">
            チャプター一覧に戻る
          </button>
          <button onClick={goToCourse}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-800 active:scale-[0.98] transition-all">
            コース選択に戻る
          </button>
        </div>
      </div>
    );
  }

  // ══ SCREEN: minitest ══
  if (screen === 'minitest' && testItem) {
    const isCorrectTest = testChosen !== null && testChosen === testItem.correct;
    const isWrongTest   = testChosen !== null && testChosen !== testItem.correct;
    return (
      <div className={`min-h-screen px-4 pt-2 pb-[120px] max-w-md mx-auto transition-colors duration-200 ${
        testChosen ? (isCorrectTest ? 'bg-emerald-50' : 'bg-red-50') : 'bg-white'
      }`}>
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setScreen('chapters')} className="text-xs font-black text-gray-700 px-3 py-1.5 bg-gray-100 rounded-full active:scale-95 transition-all">← チャプター一覧</button>
          <p className="text-xs font-bold text-gray-800">📝 小テスト {testIdx + 1}/{testItems.length}</p>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full mb-3">
          <div className="h-1.5 bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${((testIdx + 1) / testItems.length) * 100}%` }} />
        </div>
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-3 py-1.5 mb-3 inline-flex items-center gap-1.5">
          <span className="text-xs font-black text-amber-800">🔒 実践テスト中 — 日本語訳は非表示</span>
        </div>
        {/* 投げかけ（英語のみ） */}
        <div className="bg-gray-900 rounded-2xl p-4 mb-4 shadow-lg">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">相手の発言（英語のみ）</p>
          <div className="flex items-start gap-2">
            <p className="text-xl font-black text-white leading-snug flex-1">&ldquo;{testItem.prompt.en}&rdquo;</p>
            <SpeakBtn text={testItem.prompt.en} />
          </div>
          {testRevealed && <p className="text-sm font-bold text-gray-300 mt-2">{testItem.prompt.ja}</p>}
        </div>
        {/* 2択（英語のみ） */}
        {!testRevealed && (
          <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest mb-2 px-1">正しい返答を英語で選んでください</p>
        )}
        <div className="space-y-3 mb-4">
          {(['A', 'B'] as const).map(key => {
            const opt = testItem[key];
            const isThis = testChosen === key;
            const isCorrectOpt = key === testItem.correct;
            let cardCls = 'border-2 border-gray-200 bg-white';
            if (testChosen) {
              if (isCorrectOpt)       cardCls = 'border-2 border-emerald-500 bg-emerald-50';
              else if (isThis)        cardCls = 'border-2 border-red-400 bg-red-50';
              else                    cardCls = 'border-2 border-gray-100 bg-gray-50 opacity-60';
            }
            return (
              <button key={key} disabled={!!testChosen} onClick={() => handleTestChoose(key)}
                className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] ${cardCls}`}>
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm ${
                    testChosen ? isCorrectOpt ? 'bg-emerald-500 text-white' : isThis ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-500' : 'bg-indigo-600 text-white'
                  }`}>
                    {testChosen && isCorrectOpt ? '✅' : testChosen && isThis ? '❌' : key}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-black leading-snug ${testChosen ? isCorrectOpt ? 'text-emerald-900' : isThis ? 'text-red-900' : 'text-gray-500' : 'text-gray-900'}`}>{opt.en}</p>
                    {testRevealed && <p className={`text-xs font-bold mt-0.5 ${isCorrectOpt ? 'text-emerald-700' : isThis ? 'text-red-700' : 'text-gray-400'}`}>{opt.ja}</p>}
                  </div>
                  <SpeakBtn text={opt.en} size="xs" />
                </div>
              </button>
            );
          })}
        </div>
        {/* 正誤 + tip */}
        {testRevealed && (
          <>
            <div className={`rounded-2xl p-3 mb-3 border-2 ${isCorrectTest ? 'border-emerald-400 bg-emerald-50' : 'border-red-400 bg-red-50'}`}>
              <p className={`text-base font-black ${isCorrectTest ? 'text-emerald-800' : 'text-red-800'}`}>
                {isCorrectTest ? '✅ 正解！' : `❌ 不正解 — 正解: ${testItem[testItem.correct].en}`}
              </p>
            </div>
            <div className="rounded-2xl border-2 border-sky-400 bg-sky-50 p-3 mb-4">
              <p className="text-xs font-black text-sky-900 uppercase tracking-widest mb-1">💡 使い方・発音のコツ</p>
              <p className="text-xs font-bold text-gray-900 leading-relaxed">{testItem.tip}</p>
            </div>
            <button onClick={handleTestNext}
              className="w-full py-3.5 rounded-2xl font-black text-base bg-gray-900 text-white active:scale-[0.98] transition-all shadow-md">
              {testIdx + 1 >= testItems.length ? '結果を見る →' : '次の問題へ →'}
            </button>
          </>
        )}
      </div>
    );
  }

  // ══ SCREEN: test-results ══
  if (screen === 'test-results') {
    const pct = testItems.length > 0 ? Math.round(testCorrect / testItems.length * 100) : 0;
    const grade = pct >= 90 ? { label: '🏆 完璧！', color: 'text-emerald-700' }
                : pct >= 70 ? { label: '😊 よくできました！', color: 'text-blue-700' }
                : pct >= 50 ? { label: '📚 もう少し！', color: 'text-amber-700' }
                : { label: '💪 復習しよう！', color: 'text-red-700' };
    return (
      <div className="px-4 pt-2 pb-[120px] max-w-md mx-auto">
        <div className="text-center py-8">
          <p className="text-5xl mb-3">📊</p>
          <p className="text-2xl font-black text-gray-900">テスト結果</p>
          <p className={`text-base font-black mt-1 ${grade.color}`}>{grade.label}</p>
          <div className="mt-4 inline-flex items-center gap-3 bg-gray-100 rounded-2xl px-6 py-3">
            <div className="text-center">
              <p className="text-3xl font-black text-gray-900">{pct}%</p>
              <p className="text-xs font-bold text-gray-700">{testCorrect}/{testItems.length} 正解</p>
            </div>
          </div>
        </div>
        {testWrong.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-black text-gray-900 mb-2">❌ 間違えた問題 — 復習しよう</p>
            <div className="space-y-2">
              {testWrong.map(item => {
                const key = item.prompt.en;
                const isMemo = memorized.has(key);
                return (
                  <div key={key} className="bg-red-50 border-2 border-red-200 rounded-2xl p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1">
                        <p className="text-sm font-black text-gray-900">&ldquo;{item.prompt.en}&rdquo;</p>
                        <p className="text-xs font-bold text-gray-700">{item.prompt.ja}</p>
                        <p className="text-xs font-black text-emerald-800 mt-1">正解: &ldquo;{item[item.correct].en}&rdquo;</p>
                      </div>
                      <SpeakBtn text={item[item.correct].en} size="xs" />
                    </div>
                    <button onClick={() => { if (isMemo) toggleMemo(key); }}
                      className={`w-full py-2 rounded-xl text-xs font-black transition-all ${
                        isMemo ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-gray-900 text-white active:scale-95'
                      }`}>
                      {isMemo ? '✓ 要復習マーク済み' : '📌 要復習にマーク'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-3">
          <button onClick={() => startMiniTest(chapterIdx)}
            className="w-full py-3.5 rounded-2xl font-black text-base bg-amber-500 text-white active:scale-[0.98] transition-all shadow-md">
            🔄 もう一度テストする
          </button>
          <button onClick={() => startChapter(chapterIdx)}
            className="w-full py-3.5 rounded-2xl font-black text-base bg-gray-900 text-white active:scale-[0.98] transition-all shadow-md">
            📖 このチャプターを再学習
          </button>
          <button onClick={() => setScreen('chapters')}
            className="w-full py-3 rounded-2xl font-bold text-sm bg-gray-100 text-gray-800 active:scale-[0.98] transition-all">
            チャプター一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return null;
}
