'use client';

import { useState, useCallback, useEffect } from 'react';

// ─── TTS ──────────────────────────────────────────────────────────
function speak(text: string) {
  if (typeof window === 'undefined') return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US';
  utt.rate = 0.88;
  window.speechSynthesis.speak(utt);
}

// ─── Types ────────────────────────────────────────────────────────
interface Item {
  q: string;          // English question
  qJa: string;        // Japanese
  a: string;          // Correct answer
  aJa: string;
  w: [string, string]; // Wrong answers
  wJa: [string, string];
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

// ─── Dataset (72 items) ───────────────────────────────────────────
const DATA: Item[] = [
  // Greetings & small talk
  { q:"How's it going?", qJa:"調子はどう?", a:"Not bad, thanks!", aJa:"悪くないよ、ありがとう！", w:["I'm running late.","See you later."], wJa:["遅れてる。","またね。"] },
  { q:"Long time no see!", qJa:"久しぶり！", a:"Yeah, it's been a while!", aJa:"そうだね、しばらくぶり！", w:["Nice to meet you.","Good luck."], wJa:["はじめまして。","頑張って。"] },
  { q:"What are you up to?", qJa:"何してるの？", a:"Just hanging out.", aJa:"ぶらぶらしてるよ。", w:["I'm very tired.","The train is late."], wJa:["すごく疲れた。","電車が遅れてる。"] },
  { q:"How was your weekend?", qJa:"週末どうだった？", a:"Pretty relaxing, actually.", aJa:"わりとのんびりしてたよ。", w:["I don't have a ticket.","What's the price?"], wJa:["チケットがない。","値段はいくら？"] },
  { q:"You look tired.", qJa:"疲れてそうだね。", a:"Yeah, I didn't sleep well.", aJa:"うん、あんまり眠れなかった。", w:["I'll take this one.","Can I sit here?"], wJa:["これにします。","ここに座っていい？"] },
  { q:"Any plans for today?", qJa:"今日は何か予定ある？", a:"Nothing much. Just chilling.", aJa:"特にない。のんびりするよ。", w:["The weather is great.","I need a receipt."], wJa:["天気いいね。","領収書ください。"] },
  { q:"You seem happy today!", qJa:"今日は嬉しそうだね！", a:"I got great news this morning.", aJa:"今朝いい知らせがあったんだ。", w:["I'm allergic to cats.","Turn left at the corner."], wJa:["猫アレルギーです。","角を左に曲がって。"] },
  { q:"What's new with you?", qJa:"最近どう？何かある？", a:"Not much. Same old, same old.", aJa:"特にないよ。いつも通りかな。", w:["It's on the third floor.","I'll call you later."], wJa:["3階にあります。","後で電話するね。"] },

  // Cafe / restaurant
  { q:"Are you ready to order?", qJa:"ご注文はお決まりですか？", a:"Yes, I'll have a latte, please.", aJa:"はい、ラテをください。", w:["I lost my wallet.","The bus is coming."], wJa:["財布をなくした。","バスが来てる。"] },
  { q:"Is this seat taken?", qJa:"この席は空いてますか？", a:"No, go ahead!", aJa:"空いてますよ、どうぞ！", w:["I need to check out.","My flight is at noon."], wJa:["チェックアウトしたい。","フライトは正午です。"] },
  { q:"How would you like your coffee?", qJa:"コーヒーはどうしますか？", a:"Black, please.", aJa:"ブラックでお願いします。", w:["I'm vegetarian.","Where's the nearest ATM?"], wJa:["ベジタリアンです。","最寄りのATMはどこ？"] },
  { q:"Can I get you anything else?", qJa:"他に何かお持ちしますか？", a:"No thanks, just the bill.", aJa:"大丈夫です。お会計だけ。", w:["I missed the train.","Is it far from here?"], wJa:["電車乗り遅れた。","ここから遠いですか？"] },
  { q:"Would you like to try our special?", qJa:"本日のおすすめはいかがですか？", a:"Sure, what is it?", aJa:"いいですよ、何ですか？", w:["I'll be right back.","It's getting late."], wJa:["すぐ戻ります。","遅くなってきた。"] },
  { q:"Is this table okay?", qJa:"このテーブルでよろしいですか？", a:"Could we sit by the window?", aJa:"窓側に座れますか？", w:["I need to charge my phone.","What time does it open?"], wJa:["スマホ充電したい。","何時に開きますか？"] },

  // Work / school
  { q:"Did you finish the report?", qJa:"レポート終わった？", a:"Almost. Just a few more edits.", aJa:"もうすぐ。あと少し直すだけ。", w:["I like this color.","It's sold out."], wJa:["この色好き。","売り切れです。"] },
  { q:"Have you met the new teammate?", qJa:"新しいチームメンバーと会った？", a:"Yeah, she seems really capable.", aJa:"うん、すごくできる人みたい。", w:["I need size medium.","The battery is dead."], wJa:["Mサイズが欲しい。","電池が切れた。"] },
  { q:"The meeting got pushed back.", qJa:"会議が後ろにずれたよ。", a:"Oh good. I needed more time anyway.", aJa:"よかった。もう少し時間が欲しかったし。", w:["Can I try it on?","Where's the exit?"], wJa:["試着できますか？","出口はどこ？"] },
  { q:"Are you coming to the team lunch?", qJa:"チームランチ来る？", a:"Absolutely! What time?", aJa:"もちろん！何時？", w:["It's too noisy here.","I left my umbrella."], wJa:["ここうるさすぎ。","傘忘れた。"] },
  { q:"Can you cover for me tomorrow?", qJa:"明日代わってもらえる？", a:"Sure, what do I need to do?", aJa:"いいよ、何をすればいい？", w:["I need a map.","It's not my size."], wJa:["地図が欲しい。","サイズが合わない。"] },
  { q:"I totally blanked in the meeting.", qJa:"会議で頭が真っ白になっちゃった。", a:"That happens. Don't worry about it.", aJa:"そういうこともあるよ。気にしないで。", w:["The signal is weak.","I need a doctor."], wJa:["電波が弱い。","医者が必要です。"] },

  // Shopping
  { q:"Can I help you find anything?", qJa:"何かお探しですか？", a:"I'm just browsing, thanks.", aJa:"見てるだけです。ありがとう。", w:["The train is delayed.","I have a reservation."], wJa:["電車が遅れてる。","予約があります。"] },
  { q:"Do you have this in a smaller size?", qJa:"もう少し小さいサイズはありますか？", a:"Let me check in the back.", aJa:"在庫を確認してきます。", w:["It's raining outside.","I'm on my way."], wJa:["外は雨が降ってる。","今向かってるよ。"] },
  { q:"Is this on sale?", qJa:"これはセール中ですか？", a:"Yes, it's 30% off today.", aJa:"はい、今日は30%引きです。", w:["I need a window seat.","I'm allergic to nuts."], wJa:["窓側の席が欲しい。","ナッツアレルギーです。"] },
  { q:"Would you like a bag?", qJa:"袋はご利用ですか？", a:"Yes, please. Just one.", aJa:"はい、一枚でいいです。", w:["It's a 10-minute walk.","I'll call back later."], wJa:["徒歩10分です。","後でかけ直します。"] },
  { q:"Are you paying by cash or card?", qJa:"現金ですか、カードですか？", a:"Card, please.", aJa:"カードでお願いします。", w:["Take the first left.","I need a refund."], wJa:["最初の角を左に。","返金してほしい。"] },

  // Directions
  { q:"Excuse me, is there a convenience store near here?", qJa:"すみません、近くにコンビニはありますか？", a:"Yes, go straight and it's on your right.", aJa:"まっすぐ行くと右手にありますよ。", w:["I'll have the set menu.","The check, please."], wJa:["セットメニューにします。","お会計をお願いします。"] },
  { q:"How do I get to the station?", qJa:"駅へはどう行けばいいですか？", a:"Take the second left, then it's straight ahead.", aJa:"2番目の角を左に曲がって、まっすぐです。", w:["I need a charger.","The bill, please."], wJa:["充電器が欲しい。","お会計お願いします。"] },
  { q:"Is it walking distance?", qJa:"歩いて行けますか？", a:"It's about a 10-minute walk.", aJa:"歩いて約10分です。", w:["I'd like a table for two.","The food was great."], wJa:["2人席をお願いします。","食事がおいしかった。"] },
  { q:"Can I walk there from here?", qJa:"ここから歩いて行けますか？", a:"It's a bit far. You'd better take a bus.", aJa:"少し遠いです。バスに乗った方がいいですよ。", w:["I need help.","Turn right here."], wJa:["助けてください。","ここを右に曲がって。"] },

  // Plans / invitations
  { q:"Wanna grab lunch later?", qJa:"後でランチどう？", a:"Yeah, sounds great! Where?", aJa:"いいね！どこに行く？", w:["The line is long.","I'll do it tomorrow."], wJa:["列が長い。","明日やります。"] },
  { q:"Are you free this weekend?", qJa:"今週末は空いてる？", a:"I think so. What did you have in mind?", aJa:"多分ね。何か考えてる？", w:["I need to cancel.","It's expensive."], wJa:["キャンセルしたい。","高いなぁ。"] },
  { q:"Do you want to come?", qJa:"一緒に来る？", a:"I'd love to! What time?", aJa:"行きたい！何時？", w:["I'm full, thanks.","I'll pass this time."], wJa:["もうお腹いっぱい。","今回はパスします。"] },
  { q:"Let's hang out sometime.", qJa:"今度遊ぼうよ。", a:"Definitely! Let me know when.", aJa:"絶対！予定が決まったら教えて。", w:["I disagree.","It's too crowded."], wJa:["反対です。","混みすぎてる。"] },
  { q:"Can you make it on Friday?", qJa:"金曜日は来れる？", a:"Let me check my schedule.", aJa:"予定を確認してみるね。", w:["I'm not interested.","It's out of stock."], wJa:["興味ないです。","在庫切れです。"] },

  // Feelings / reactions
  { q:"That's so funny!", qJa:"それ面白すぎる！", a:"Right? I couldn't stop laughing!", aJa:"でしょ？笑いが止まらなかった！", w:["I need a moment.","Please be quiet."], wJa:["少し待って。","静かにしてください。"] },
  { q:"I'm so nervous.", qJa:"すごく緊張してる。", a:"Just breathe. You'll do great.", aJa:"深呼吸して。うまくいくよ。", w:["Let me rephrase that.","I'll check it later."], wJa:["言い直しますね。","後で確認します。"] },
  { q:"I'm absolutely exhausted.", qJa:"もうへとへとだよ。", a:"You should get some rest.", aJa:"少し休んだ方がいいよ。", w:["That's unexpected.","Keep the change."], wJa:["意外だな。","おつりはいいよ。"] },
  { q:"That's such a relief!", qJa:"それはほっとした！", a:"I know, right? I was so worried.", aJa:"わかる。すごく心配してたんだよね。", w:["Can I borrow a pen?","Do you have Wi-Fi?"], wJa:["ペン貸して。","Wi-Fiはありますか？"] },
  { q:"I can't believe that happened.", qJa:"信じられない、そんなことが。", a:"Me neither. It was shocking.", aJa:"私も。衝撃だったよね。", w:["Could you speak louder?","I'll take a rain check."], wJa:["もっと大きな声で。","また今度にします。"] },

  // Compliments
  { q:"You did a great job!", qJa:"よくやったね！", a:"Thanks, I really put in the effort.", aJa:"ありがとう、すごく頑張ったんだ。", w:["I need directions.","Do you have a menu?"], wJa:["道を教えてください。","メニューはありますか？"] },
  { q:"I love your jacket!", qJa:"そのジャケット素敵！", a:"Thanks! I got it on sale.", aJa:"ありがとう！セールで買ったんだ。", w:["The taxi is here.","I need more time."], wJa:["タクシー来たよ。","もう少し時間が欲しい。"] },
  { q:"Your English is really good!", qJa:"英語上手ですね！", a:"Thank you! I've been practicing a lot.", aJa:"ありがとうございます。たくさん練習してます。", w:["I can't find it.","What floor is it on?"], wJa:["見つからない。","何階にありますか？"] },

  // Apologies / misunderstandings
  { q:"Sorry, I'm late!", qJa:"ごめん、遅れた！", a:"No worries, I just got here too.", aJa:"大丈夫、私もさっき着いたとこ。", w:["I'll try again.","Do you accept cards?"], wJa:["もう一度やってみます。","カード使えますか？"] },
  { q:"I think I misunderstood.", qJa:"勘違いしてたみたい。", a:"It's okay, let me explain again.", aJa:"大丈夫、もう一度説明するね。", w:["I'm in a hurry.","Can we split the bill?"], wJa:["急いでます。","割り勘にできますか？"] },
  { q:"Could you say that again?", qJa:"もう一度言ってもらえますか？", a:"Of course! I said the meeting's moved.", aJa:"もちろん！会議の日程が変わったって言ったんだよ。", w:["I'll pay for it.","This is too spicy."], wJa:["払います。","これ辛すぎ。"] },
  { q:"I think I got the wrong order.", qJa:"注文を間違えたみたいです。", a:"I'm so sorry, let me fix that for you.", aJa:"大変失礼しました、すぐに直しますね。", w:["I have jet lag.","Can I get a refill?"], wJa:["時差ぼけしてます。","お代わりもらえますか？"] },

  // Requests & offers
  { q:"Could you give me a hand?", qJa:"手伝ってもらえる？", a:"Sure! What do you need?", aJa:"もちろん！何が必要？", w:["It's my treat.","I'll skip dessert."], wJa:["おごるよ。","デザートはいらない。"] },
  { q:"Do you mind if I open the window?", qJa:"窓を開けてもいいですか？", a:"Not at all, go ahead.", aJa:"全然いいよ、どうぞ。", w:["I'm getting sleepy.","Let's hurry."], wJa:["眠くなってきた。","急ごう。"] },
  { q:"Let me know if you need anything.", qJa:"何か必要なことがあれば言ってね。", a:"Will do, thanks so much.", aJa:"わかった、ありがとう。", w:["What's the Wi-Fi password?","I'll get the next round."], wJa:["Wi-Fiのパスワードは？","次は私が買うよ。"] },
  { q:"Can I borrow your charger?", qJa:"充電器貸して？", a:"Sure, here you go.", aJa:"いいよ、どうぞ。", w:["I need a bigger size.","It's non-refundable."], wJa:["大きいサイズが欲しい。","返金不可です。"] },
  { q:"Want me to take a photo for you?", qJa:"写真を撮りましょうか？", a:"That would be great, thank you!", aJa:"ありがたいです、ありがとう！", w:["It's a dead end.","I'll come back later."], wJa:["行き止まりです。","後でまた来ます。"] },

  // Phone / messaging
  { q:"Can I call you back later?", qJa:"後でかけ直してもいいですか？", a:"Of course, take your time.", aJa:"もちろん、ゆっくりで大丈夫。", w:["I have a question.","The signal is bad."], wJa:["質問があります。","電波が悪い。"] },
  { q:"Did you get my message?", qJa:"メッセージ届いた？", a:"Yes, just saw it. I'll reply now.", aJa:"うん、ちょうど見たところ。今返信するね。", w:["I'll pass.","Is service included?"], wJa:["パスします。","サービス料は含まれてますか？"] },
  { q:"Sorry, I missed your call.", qJa:"ごめん、電話に出られなかった。", a:"No problem, I just wanted to confirm.", aJa:"大丈夫、確認したかっただけだから。", w:["I'm on a diet.","Do you have a loyalty card?"], wJa:["ダイエット中です。","会員カードはありますか？"] },

  // Weather
  { q:"Nice weather today, isn't it?", qJa:"今日いい天気だね。", a:"It really is. Perfect for a walk.", aJa:"本当に。散歩日和だよね。", w:["I need a medium.","Let me double-check."], wJa:["Mサイズをください。","確認してみます。"] },
  { q:"Looks like it's going to rain.", qJa:"雨が降りそうだね。", a:"Yeah, I should've brought an umbrella.", aJa:"そうだね、傘を持ってくれば良かった。", w:["I'll have the same.","It's on the house."], wJa:["同じものをください。","サービスです。"] },
  { q:"It's freezing today!", qJa:"今日は凍えそうに寒い！", a:"I know! I should've worn a warmer coat.", aJa:"だよね！もっと厚着すれば良かった。", w:["Can I sit here?","What's the damage?"], wJa:["ここ座っていい？","おいくらですか？"] },

  // Wrapping up
  { q:"I should get going.", qJa:"そろそろ行かなきゃ。", a:"Already? Well, it was great seeing you.", aJa:"もう？会えてよかったよ。", w:["I'll manage.","Can I exchange this?"], wJa:["なんとかなります。","交換できますか？"] },
  { q:"Thanks for everything!", qJa:"いろいろありがとう！", a:"Anytime! Take care of yourself.", aJa:"いつでも！体に気をつけてね。", w:["I'll think about it.","Not for me, thanks."], wJa:["考えておきます。","私はいいです。"] },
  { q:"It was really nice talking with you.", qJa:"話せて本当に楽しかったよ。", a:"Same here! We should do this more often.", aJa:"私もだよ！もっと話そうね。", w:["Check, please.","I'm a vegetarian."], wJa:["お会計ください。","ベジタリアンです。"] },
  { q:"Keep in touch!", qJa:"また連絡してね！", a:"Definitely! I'll text you.", aJa:"もちろん！テキストするね。", w:["I'll manage on my own.","I need the remote."], wJa:["自分でなんとかします。","リモコン欲しい。"] },
];

// ─── Choice card ──────────────────────────────────────────────────
function ChoiceBtn({
  text, ja, isAnswer, selected, revealed, disabled, onSelect,
}: {
  text: string; ja: string; isAnswer: boolean;
  selected: boolean; revealed: boolean; disabled: boolean;
  onSelect: () => void;
}) {
  const [showJa, setShowJa] = useState(false);

  // Reset ja display when question changes
  useEffect(() => { setShowJa(false); }, [text]);

  let ring = 'border-gray-200 bg-white text-gray-800';
  if (revealed) {
    if (isAnswer)       ring = 'border-emerald-400 bg-emerald-50 text-emerald-800';
    else if (selected)  ring = 'border-red-300 bg-red-50 text-red-700';
    else                ring = 'border-gray-100 bg-gray-50 text-gray-300';
  }

  return (
    <div className={`rounded-2xl border-2 transition-all duration-150 ${ring} overflow-hidden`}>
      <button
        onClick={onSelect}
        disabled={disabled}
        className="w-full text-left px-4 py-3.5 font-bold text-sm leading-snug active:opacity-70"
      >
        {text}
      </button>
      <div className="flex gap-2 px-3 pb-3 pt-0">
        <button
          onClick={() => speak(text)}
          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-600 active:scale-95 transition-transform"
        >
          🔊 発音
        </button>
        <button
          onClick={() => setShowJa(v => !v)}
          className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 active:scale-95 transition-transform"
        >
          {showJa ? '▲ 和訳' : '和訳 ▼'}
        </button>
        {showJa && (
          <span className="text-[10px] text-gray-500 self-center">{ja}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────
export function DailyPractice() {
  const [deck, setDeck]         = useState<Item[]>(() => shuffle(DATA));
  const [idx, setIdx]           = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showQJa, setShowQJa]   = useState(false);
  const [correct, setCorrect]   = useState(0);
  const [total, setTotal]       = useState(0);
  const [flash, setFlash]       = useState<'ok'|'ng'|null>(null);

  const item = deck[idx % deck.length];

  // Rebuild shuffled choices each time item changes
  const [choices, setChoices] = useState<{ text: string; ja: string; isAnswer: boolean }[]>([]);
  useEffect(() => {
    setChoices(shuffle([
      { text: item.a,    ja: item.aJa,    isAnswer: true  },
      { text: item.w[0], ja: item.wJa[0], isAnswer: false },
      { text: item.w[1], ja: item.wJa[1], isAnswer: false },
    ]));
    setSelected(null);
    setRevealed(false);
    setShowQJa(false);
  }, [idx, item]);

  const handleSelect = useCallback((text: string, isAnswer: boolean) => {
    if (revealed) return;
    setSelected(text);
    setRevealed(true);
    setTotal(t => t + 1);
    if (isAnswer) {
      setCorrect(c => c + 1);
      setFlash('ok');
    } else {
      setFlash('ng');
    }
    setTimeout(() => {
      setFlash(null);
      if (idx + 1 >= deck.length) {
        setDeck(shuffle(DATA));
        setIdx(0);
      } else {
        setIdx(i => i + 1);
      }
    }, 900);
  }, [revealed, idx, deck.length]);

  const pct = total > 0 ? Math.round(correct / total * 100) : 0;

  return (
    <div className={`min-h-screen px-4 pt-2 pb-[120px] max-w-md mx-auto transition-colors duration-150 ${
      flash === 'ok' ? 'bg-emerald-50' : flash === 'ng' ? 'bg-red-50' : 'bg-white'
    }`}>

      {/* Score bar */}
      <div className="flex items-center justify-between mb-4 px-1">
        <span className="text-xs font-bold text-gray-400">
          {total > 0 ? `${correct}/${total} (${pct}%)` : 'Daily Practice'}
        </span>
        <span className="text-xs font-bold text-gray-400">
          {idx + 1} / {deck.length}
        </span>
      </div>

      {/* Question card */}
      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden mb-5">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xl font-black text-gray-900 leading-snug mb-4">{item.q}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => speak(item.q)}
              className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full bg-indigo-600 text-white active:scale-95 transition-transform"
            >
              🔊 発音
            </button>
            <button
              onClick={() => setShowQJa(v => !v)}
              className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 active:scale-95 transition-transform"
            >
              {showQJa ? '▲ 和訳' : '和訳 ▼'}
            </button>
            {showQJa && (
              <span className="text-xs text-gray-500 w-full mt-1">{item.qJa}</span>
            )}
          </div>
        </div>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        {choices.map(c => (
          <ChoiceBtn
            key={c.text}
            text={c.text}
            ja={c.ja}
            isAnswer={c.isAnswer}
            selected={selected === c.text}
            revealed={revealed}
            disabled={revealed}
            onSelect={() => handleSelect(c.text, c.isAnswer)}
          />
        ))}
      </div>
    </div>
  );
}
