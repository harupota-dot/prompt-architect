'use client';

const QUOTES = [
  { en: "Every artist was first an amateur.", ja: "すべてのアーティストは、最初はアマチュアだった。", author: "Ralph Waldo Emerson" },
  { en: "Music gives a soul to the universe, wings to the mind, flight to the imagination, and life to everything.", ja: "音楽は宇宙に魂を与え、心に翼を与え、想像力に飛翔を与え、すべてに命を与える。", author: "Plato" },
  { en: "The only way to do great work is to love what you do.", ja: "偉大な仕事をする唯一の方法は、自分のやっていることを愛すること。", author: "Steve Jobs" },
  { en: "Fall seven times, stand up eight.", ja: "七転び八起き。", author: "日本のことわざ" },
  { en: "If you hear a voice within you say 'you cannot paint,' then by all means paint, and that voice will be silenced.", ja: "「お前には絵が描けない」という心の声が聞こえたら、とにかく描け。その声は黙る。", author: "Vincent van Gogh" },
  { en: "Believe you can and you're halfway there.", ja: "できると信じた瞬間、もう半分は達成している。", author: "Theodore Roosevelt" },
  { en: "Without music, life would be a mistake.", ja: "音楽なしでは、人生は間違いだ。", author: "Friedrich Nietzsche" },
  { en: "You must be the change you wish to see in the world.", ja: "あなたが世界に見たいと思う変化に、あなた自身がなりなさい。", author: "Mahatma Gandhi" },
  { en: "People who are crazy enough to think they can change the world are the ones who do.", ja: "世界を変えられると本気で思っているクレイジーな人たちが、本当に世界を変えてきた。", author: "Steve Jobs" },
  { en: "The beautiful thing about learning is that nobody can take it away from you.", ja: "学ぶことの素晴らしいところは、誰もそれをあなたから奪えないことだ。", author: "B.B. King" },
  { en: "It always seems impossible until it's done.", ja: "達成するまでは、すべてが不可能に見える。", author: "Nelson Mandela" },
  { en: "I don't have talent, so I just get up earlier.", ja: "才能がないから、ただ人より早く起きるだけだ。", author: "Celine Dion" },
  { en: "Your time is limited, so don't waste it living someone else's life.", ja: "時間は限られている。他人の人生を生きることで無駄にするな。", author: "Steve Jobs" },
  { en: "To live is the rarest thing in the world. Most people exist, that is all.", ja: "生きることは、世界で最も稀なことだ。ほとんどの人はただ存在しているだけ。", author: "Oscar Wilde" },
  { en: "The secret of getting ahead is getting started.", ja: "前進の秘訣は、始めることだ。", author: "Mark Twain" },
  { en: "Pain is temporary. Quitting lasts forever.", ja: "痛みは一時的だ。しかし諦めは永遠に続く。", author: "Lance Armstrong" },
  { en: "You only live once, but if you do it right, once is enough.", ja: "人生は一度きり。でも正しく生きれば、一度で十分だ。", author: "Mae West" },
  { en: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", ja: "私たちは繰り返し行うことの産物だ。卓越は行為ではなく、習慣なのだ。", author: "Aristotle" },
  // アニメ名言
  { en: "If you don't take risks, you can't create a future.", ja: "リスクを取らなければ、未来は作れない。", author: "Monkey D. Luffy — ONE PIECE" },
  { en: "Whatever you lose, you'll find it again. But what you throw away you'll never get back.", ja: "失ったものはまた見つかる。でも捨てたものは二度と戻らない。", author: "Himura Kenshin — 浪漫撫子" },
  { en: "The world isn't perfect, but it's there for us doing the best it can.", ja: "世界は完璧じゃない。でも僕たちのために、できる限り頑張っている。", author: "Edward Elric — Fullmetal Alchemist" },
  { en: "People's lives don't end when they die. It ends when they lose faith.", ja: "人の命は死んだときに終わるんじゃない。信念を失ったときに終わる。", author: "Itachi Uchiha — NARUTO" },
  { en: "If you don't like your destiny, don't accept it. Instead, have the courage to change it.", ja: "自分の運命が気に入らなければ、受け入れるな。変える勇気を持て。", author: "Naruto Uzumaki — NARUTO" },
  { en: "Whether you win or lose, looking back and learning from your experience is a part of life.", ja: "勝っても負けても、振り返って経験から学ぶことが人生の一部だ。", author: "Hinata Shoyo — ハイキュー!!" },
  { en: "Give up on your dreams? Never. That's your way of the ninja.", ja: "夢を諦める？絶対にない。それがお前の忍道だ。", author: "Kakashi Hatake — NARUTO" },
  { en: "No matter how many times you fall, stand up once more. That's the spirit.", ja: "何度倒れても、もう一度立ち上がる。それが魂だ。", author: "Guts — ベルセルク" },
  { en: "Knowing you're different is only the beginning. Accepting it is the next step.", ja: "自分が違うと知ることは始まりに過ぎない。受け入れることが次のステップだ。", author: "Retsuko — アグレッシブ烈子" },
  { en: "Don't give up! There's no such thing as a perfect life, but you can live life to its fullest.", ja: "諦めるな！完璧な人生なんてない。でも精一杯生きることはできる。", author: "Izuku Midoriya — 僕のヒーローアカデミア" },
  { en: "Even if I don't have the power, I still have the will to keep going.", ja: "力がなくても、前に進む意志だけはある。", author: "Tanjiro Kamado — 鬼滅の刃" },
];

export function DailyQuote() {
  const idx   = new Date().getDate() % QUOTES.length;
  const quote = QUOTES[idx];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg">
      <div className="absolute top-0 right-0 text-[80px] opacity-5 leading-none select-none pointer-events-none">❝</div>
      <p className="text-xs font-black text-slate-300 uppercase tracking-widest mb-3">✨ Daily Quote</p>
      <p className="text-base font-extrabold text-white leading-relaxed mb-2">
        &ldquo;{quote.en}&rdquo;
      </p>
      <p className="text-sm text-slate-200 leading-relaxed mb-3 italic font-medium">
        「{quote.ja}」
      </p>
      <p className="text-xs font-black text-slate-300 text-right">— {quote.author}</p>
    </div>
  );
}
