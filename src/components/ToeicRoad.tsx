'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// Level definitions
// ─────────────────────────────────────────────────────────────────
interface ToeicLevel {
  level:    number;
  score:    string;   // e.g. "300"
  title:    string;
  emoji:    string;
  color:    string;   // Tailwind gradient
  req:      number;   // correct answers needed to unlock next
}

const TOEIC_LEVELS: ToeicLevel[] = [
  { level:1, score:'〜300', title:'超基礎（中学英語）',   emoji:'📗', color:'from-green-400 to-emerald-500',  req:20 },
  { level:2, score:'〜500', title:'基礎固め',             emoji:'📘', color:'from-blue-400 to-cyan-500',      req:20 },
  { level:3, score:'〜700', title:'実用会話',             emoji:'📙', color:'from-amber-400 to-yellow-500',   req:20 },
  { level:4, score:'〜800', title:'ビジネス応用',          emoji:'📕', color:'from-orange-500 to-red-500',    req:20 },
  { level:5, score:'900+',  title:'ネイティブ級',          emoji:'🏆', color:'from-violet-500 to-indigo-600', req:0  },
];

// ─────────────────────────────────────────────────────────────────
// Quiz item type
// ─────────────────────────────────────────────────────────────────
interface ToeicItem {
  en:     string;   // English word / phrase (spoken + displayed)
  answer: string;   // correct Japanese / English paraphrase
  wrongs: [string, string];
  note?:  string;   // optional context/usage note
}

// ─────────────────────────────────────────────────────────────────
// Datasets
// ─────────────────────────────────────────────────────────────────

// Level 1 — TOEIC 300: 中学英語レベルの TOEIC 頻出意味
const L1: ToeicItem[] = [
  { en:'book',         answer:'予約する',      wrongs:['読む','買う'],         note:'reserve a table / a room' },
  { en:'run',          answer:'経営する',      wrongs:['走る','壊す'],         note:'run a company / a shop' },
  { en:'check',        answer:'確認する',      wrongs:['支払う','送る'],       note:'check your schedule' },
  { en:'address',      answer:'取り組む',      wrongs:['住所','送る'],         note:'address the issue' },
  { en:'cover',        answer:'取り上げる',    wrongs:['覆う','返す'],         note:'the report covers the topic' },
  { en:'place',        answer:'注文する',      wrongs:['場所','置く'],         note:'place an order' },
  { en:'reach',        answer:'連絡する',      wrongs:['届く','走る'],         note:'please reach me by email' },
  { en:'suit',         answer:'都合がよい',    wrongs:['スーツ','似合う'],     note:'does Tuesday suit you?' },
  { en:'hold',         answer:'開催する',      wrongs:['持つ','止まる'],       note:'hold a meeting' },
  { en:'minute',       answer:'議事録',        wrongs:['分（時間）','小さな'], note:'take the minutes of a meeting' },
  { en:'change',       answer:'おつり',        wrongs:['変える','替える'],     note:'keep the change' },
  { en:'fine',         answer:'罰金',          wrongs:['細かい','晴れた'],     note:'pay a fine' },
  { en:'interest',     answer:'利息',          wrongs:['興味','関心'],         note:'interest rate' },
  { en:'light',        answer:'軽い',          wrongs:['光','点灯する'],       note:'light luggage' },
  { en:'save',         answer:'節約する',      wrongs:['救う','保存する'],     note:'save time / money' },
  { en:'pull',         answer:'引き付ける',    wrongs:['引っ張る','押す'],     note:'pull in customers' },
  { en:'issue',        answer:'発行する',      wrongs:['問題','議題'],         note:'issue a ticket / a card' },
  { en:'party',        answer:'当事者',        wrongs:['パーティー','集団'],   note:'third party' },
  { en:'matter',       answer:'重要である',    wrongs:['問題','物質'],         note:'it doesn\'t matter' },
  { en:'drive',        answer:'推進する',      wrongs:['運転する','追い払う'], note:'drive growth' },
  { en:'order',        answer:'注文',          wrongs:['命令','順序'],         note:'take your order' },
  { en:'cash',         answer:'現金',          wrongs:['キャッシュ','小切手'], note:'pay in cash' },
  { en:'break',        answer:'休憩',          wrongs:['壊れる','分ける'],     note:'take a short break' },
  { en:'advance',      answer:'前払いの',      wrongs:['進歩','事前の'],       note:'in advance' },
];

// Level 2 — TOEIC 500: 基礎ビジネス語彙
const L2: ToeicItem[] = [
  { en:'appointment',  answer:'（面会の）約束', wrongs:['任命','予定'],        note:'make an appointment' },
  { en:'submit',       answer:'提出する',       wrongs:['受け取る','承認する'],note:'submit a report' },
  { en:'require',      answer:'必要とする',     wrongs:['求める','依頼する'],  note:'this position requires experience' },
  { en:'confirm',      answer:'確認する',       wrongs:['変更する','キャンセル'],note:'confirm your reservation' },
  { en:'proceed',      answer:'進む',           wrongs:['止まる','戻る'],      note:'proceed with the plan' },
  { en:'estimate',     answer:'見積もり',       wrongs:['予算','費用'],        note:'cost estimate' },
  { en:'notify',       answer:'通知する',       wrongs:['禁止する','確認する'],note:'notify employees of the change' },
  { en:'postpone',     answer:'延期する',       wrongs:['キャンセルする','早める'],note:'postpone the meeting' },
  { en:'obtain',       answer:'入手する',       wrongs:['失う','返す'],        note:'obtain a license' },
  { en:'distribute',   answer:'配布する',       wrongs:['集める','発注する'],  note:'distribute the handouts' },
  { en:'available',    answer:'入手可能な',     wrongs:['混んでいる','必要な'],note:'is this item available?' },
  { en:'qualified',    answer:'資格のある',     wrongs:['不適切な','有名な'],  note:'qualified candidates' },
  { en:'contract',     answer:'契約',           wrongs:['連絡先','商品'],      note:'sign a contract' },
  { en:'invoice',      answer:'請求書',         wrongs:['領収書','明細書'],    note:'send an invoice' },
  { en:'deadline',     answer:'締め切り',       wrongs:['開始日','予算'],      note:'meet the deadline' },
  { en:'prior to',     answer:'〜の前に',       wrongs:['〜の後に','〜の間に'],note:'prior to the meeting' },
  { en:'ensure',       answer:'確実にする',     wrongs:['疑う','取り消す'],    note:'ensure accuracy' },
  { en:'relocate',     answer:'移転する',       wrongs:['復帰する','閉店する'],note:'the office will relocate' },
  { en:'renovation',   answer:'改装',           wrongs:['建設','解体'],        note:'under renovation' },
  { en:'inventory',    answer:'在庫',           wrongs:['予算','売上'],        note:'check the inventory' },
  { en:'schedule',     answer:'予定を立てる',   wrongs:['延期する','取り消す'],note:'schedule a meeting' },
  { en:'approve',      answer:'承認する',       wrongs:['断る','提案する'],    note:'approve the budget' },
  { en:'retain',       answer:'保持する',       wrongs:['失う','採用する'],    note:'retain customers' },
  { en:'depart',       answer:'出発する',       wrongs:['到着する','移動する'],note:'the flight departs at noon' },
];

// Level 3 — TOEIC 700: 実用会話・旅行・サービス系
const L3: ToeicItem[] = [
  { en:'complimentary',answer:'無料の',         wrongs:['有料の','追加の'],    note:'complimentary breakfast' },
  { en:'itinerary',    answer:'旅程',           wrongs:['予算','スケジュール'],note:'travel itinerary' },
  { en:'amenity',      answer:'設備・アメニティ',wrongs:['追加料金','サービス'],note:'hotel amenities' },
  { en:'accommodate',  answer:'収容する',       wrongs:['拒否する','移転する'],note:'accommodate 200 guests' },
  { en:'inquire',      answer:'問い合わせる',   wrongs:['断る','報告する'],    note:'inquire about availability' },
  { en:'facilitate',   answer:'促進する',       wrongs:['妨げる','評価する'],  note:'facilitate communication' },
  { en:'reimburse',    answer:'払い戻す',       wrongs:['請求する','延長する'],note:'reimburse travel expenses' },
  { en:'periodically', answer:'定期的に',       wrongs:['即時に','一度だけ'],  note:'review periodically' },
  { en:'substantial',  answer:'かなりの',       wrongs:['わずかな','平均的な'],note:'substantial discount' },
  { en:'adjacent',     answer:'隣接した',       wrongs:['遠い','反対側の'],    note:'adjacent to the station' },
  { en:'comply with',  answer:'〜に従う',       wrongs:['〜を無視する','〜を変える'],note:'comply with regulations' },
  { en:'negotiate',    answer:'交渉する',       wrongs:['拒否する','合意する'],note:'negotiate a deal' },
  { en:'refund',       answer:'返金',           wrongs:['追加料金','割引'],    note:'request a refund' },
  { en:'exclusive',    answer:'限定の',         wrongs:['一般の','追加の'],    note:'exclusive offer' },
  { en:'mandatory',    answer:'義務的な',       wrongs:['任意の','推奨の'],    note:'mandatory training' },
  { en:'feasible',     answer:'実行可能な',     wrongs:['不可能な','危険な'],  note:'a feasible plan' },
  { en:'surplus',      answer:'余剰',           wrongs:['不足','損失'],        note:'budget surplus' },
  { en:'coordinate',   answer:'調整する',       wrongs:['分担する','報告する'],note:'coordinate the event' },
  { en:'initiative',   answer:'主導権',         wrongs:['義務','提案'],        note:'take the initiative' },
  { en:'premises',     answer:'構内・敷地',     wrongs:['前提','本部'],        note:'on the premises' },
  { en:'delegate',     answer:'委任する',       wrongs:['報告する','解雇する'],note:'delegate tasks' },
  { en:'tentative',    answer:'仮の',           wrongs:['確定した','最終の'],  note:'tentative schedule' },
  { en:'proofread',    answer:'校正する',       wrongs:['作成する','配布する'],note:'proofread the document' },
  { en:'reconcile',    answer:'調整する',       wrongs:['却下する','報告する'],note:'reconcile accounts' },
];

// Level 4 — TOEIC 800: ビジネス応用・人事・財務
const L4: ToeicItem[] = [
  { en:'implement',    answer:'実行する',       wrongs:['評価する','提案する'],note:'implement a new policy' },
  { en:'consensus',    answer:'合意',           wrongs:['対立','決定'],        note:'reach a consensus' },
  { en:'stipulate',    answer:'規定する',       wrongs:['交渉する','廃止する'],note:'stipulate the terms' },
  { en:'acquisition',  answer:'買収',           wrongs:['売却','合併'],        note:'merger and acquisition' },
  { en:'liability',    answer:'負債・責任',     wrongs:['資産','利益'],        note:'limit liability' },
  { en:'benchmark',    answer:'基準',           wrongs:['目標','評価'],        note:'industry benchmark' },
  { en:'overhead',     answer:'経費',           wrongs:['売上','純利益'],      note:'reduce overhead costs' },
  { en:'streamline',   answer:'効率化する',     wrongs:['複雑にする','廃止する'],note:'streamline the process' },
  { en:'leverage',     answer:'活用する',       wrongs:['無視する','削減する'],note:'leverage existing resources' },
  { en:'fiscal',       answer:'財政上の',       wrongs:['法的な','物理的な'],  note:'fiscal year' },
  { en:'subsidiaries', answer:'子会社',         wrongs:['本社','取引先'],      note:'wholly-owned subsidiaries' },
  { en:'escalate',     answer:'段階的に拡大する',wrongs:['縮小する','安定する'],note:'escalate the issue' },
  { en:'mitigate',     answer:'軽減する',       wrongs:['悪化させる','放置する'],note:'mitigate risk' },
  { en:'contingency',  answer:'緊急対応策',     wrongs:['予算','戦略'],        note:'contingency plan' },
  { en:'procurement',  answer:'調達',           wrongs:['廃棄','製造'],        note:'procurement department' },
  { en:'compliance',   answer:'法令遵守',       wrongs:['競争','改革'],        note:'compliance officer' },
  { en:'turnaround',   answer:'業績回復',       wrongs:['倒産','継続'],        note:'achieve a turnaround' },
  { en:'mandate',      answer:'命令・権限',     wrongs:['提案','協議'],        note:'act within the mandate' },
  { en:'disparate',    answer:'異なる',         wrongs:['類似した','統一した'],note:'disparate teams' },
  { en:'proprietor',   answer:'所有者',         wrongs:['従業員','取締役'],    note:'sole proprietor' },
  { en:'tangible',     answer:'有形の',         wrongs:['無形の','仮想の'],    note:'tangible assets' },
  { en:'onboard',      answer:'採用・教育する', wrongs:['解雇する','昇格させる'],note:'onboard new employees' },
  { en:'remuneration', answer:'報酬',           wrongs:['罰金','損失'],        note:'remuneration package' },
  { en:'prospectus',   answer:'目論見書',       wrongs:['契約書','報告書'],    note:'investment prospectus' },
];

// Level 5 — TOEIC 900: ネイティブ級・高度ビジネス語彙
const L5: ToeicItem[] = [
  { en:'lucrative',    answer:'儲かる',         wrongs:['損失の多い','慈善的な'],note:'lucrative contract' },
  { en:'alleviate',    answer:'軽減する',       wrongs:['悪化させる','無視する'],note:'alleviate the shortage' },
  { en:'exacerbate',   answer:'悪化させる',     wrongs:['改善する','維持する'], note:'exacerbate the problem' },
  { en:'perpetuate',   answer:'永続させる',     wrongs:['廃止する','改革する'], note:'perpetuate a cycle' },
  { en:'curtail',      answer:'削減する',       wrongs:['拡大する','承認する'], note:'curtail spending' },
  { en:'bolster',      answer:'強化する',       wrongs:['弱める','廃棄する'],   note:'bolster the economy' },
  { en:'rhetoric',     answer:'修辞・言説',     wrongs:['財務','法律'],         note:'political rhetoric' },
  { en:'articulate',   answer:'明確に表現する', wrongs:['抑制する','省略する'], note:'articulate a vision' },
  { en:'corroborate',  answer:'裏付ける',       wrongs:['反論する','無視する'], note:'corroborate the findings' },
  { en:'circumvent',   answer:'回避する',       wrongs:['遵守する','強化する'], note:'circumvent regulations' },
  { en:'proliferate',  answer:'急増する',       wrongs:['減少する','安定する'], note:'proliferate across sectors' },
  { en:'indispensable',answer:'不可欠な',       wrongs:['不要な','有益な'],     note:'indispensable skill' },
  { en:'volatile',     answer:'不安定な',       wrongs:['安定した','堅調な'],   note:'volatile market' },
  { en:'meticulous',   answer:'細心の',         wrongs:['大雑把な','迅速な'],   note:'meticulous planning' },
  { en:'consensus-driven', answer:'合意形成を重視する', wrongs:['独断的な','競争的な'], note:'consensus-driven culture' },
  { en:'holistic',     answer:'総合的な',       wrongs:['部分的な','表面的な'], note:'holistic approach' },
  { en:'paramount',    answer:'最重要な',       wrongs:['些細な','付随的な'],   note:'of paramount importance' },
  { en:'synergy',      answer:'相乗効果',       wrongs:['競合','対立'],         note:'create synergy between teams' },
  { en:'benchmark against', answer:'〜と比較評価する', wrongs:['〜を模倣する','〜を無視する'], note:'benchmark against competitors' },
  { en:'unprecedented',answer:'前例のない',     wrongs:['一般的な','予想された'],note:'unprecedented growth' },
  { en:'proprietary',  answer:'専有の・独自の', wrongs:['公開の','共有の'],     note:'proprietary technology' },
  { en:'arbitrate',    answer:'仲裁する',       wrongs:['交渉する','裁判する'], note:'arbitrate a dispute' },
  { en:'resilient',    answer:'回復力のある',   wrongs:['脆弱な','停滞した'],   note:'resilient supply chain' },
  { en:'succinct',     answer:'簡潔な',         wrongs:['冗長な','曖昧な'],     note:'succinct summary' },
];

const DATASETS: Record<number, ToeicItem[]> = {
  1: L1, 2: L2, 3: L3, 4: L4, 5: L5,
};

// ─────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────
const LS_KEY = 'toeic-road-v1';

interface ToeicProgress {
  levelCorrect: Record<number, number>;  // correct count per level
  unlockedUp:   number;                  // highest unlocked level
}

function loadToeicProgress(): ToeicProgress {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { levelCorrect: { 1:0,2:0,3:0,4:0,5:0 }, unlockedUp: 1 };
}
function saveToeicProgress(p: ToeicProgress) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speak(text: string, onEnd?: () => void, rate = 0.84): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return; }
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US'; utt.rate = rate; utt.pitch = 1.0; utt.volume = 1.0;
    if (onEnd) {
      let fired = false;
      const done = () => { if (!fired) { fired = true; onEnd(); } };
      utt.onend  = done;
      utt.onerror = done;
    }
    setTimeout(() => {
      try { window.speechSynthesis.speak(utt); } catch { onEnd?.(); }
    }, 80);
  } catch { onEnd?.(); }
}

interface QuizState {
  item:    ToeicItem;
  choices: string[];
}

function buildQuiz(lv: number, prevEn?: string): QuizState {
  const pool    = DATASETS[lv].filter(i => i.en !== prevEn);
  const item    = pool[Math.floor(Math.random() * pool.length)];
  const choices = shuffle([item.answer, ...item.wrongs]);
  return { item, choices };
}

// ─────────────────────────────────────────────────────────────────
// ToeicRoad — main component
// ─────────────────────────────────────────────────────────────────
export function ToeicRoad() {
  const [progress,    setProgress]    = useState<ToeicProgress | null>(null);
  const [currentLv,   setCurrentLv]   = useState(1);
  const [quiz,        setQuiz]        = useState<QuizState | null>(null);
  const [result,      setResult]      = useState<'correct' | 'wrong' | null>(null);
  const [locked,      setLocked]      = useState(false);
  const [speaking,    setSpeaking]    = useState(false);
  const [showText,    setShowText]    = useState(false);
  const [justUnlock,  setJustUnlock]  = useState(false);
  const [sessionOk,   setSessionOk]   = useState(0);
  const [sessionTot,  setSessionTot]  = useState(0);
  const prevEnRef = useRef<string | undefined>(undefined);

  // Hydrate
  useEffect(() => {
    const p = loadToeicProgress();
    setProgress(p);
    setCurrentLv(Math.min(p.unlockedUp, 5));
  }, []);

  // Build quiz when level or progress first loads
  useEffect(() => {
    if (!progress) return;
    prevEnRef.current = undefined;
    setQuiz(buildQuiz(currentLv));
    setResult(null); setLocked(false); setShowText(false);
  }, [currentLv, progress === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const playWord = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speak(quiz.item.en, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => {
    if (quiz) playWord();
  }, [quiz?.item.en]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (!quiz) return;
    prevEnRef.current = quiz.item.en;
    setQuiz(buildQuiz(currentLv, prevEnRef.current));
    setResult(null); setLocked(false); setShowText(false);
  }, [quiz, currentLv]);

  const handleTap = (choice: string) => {
    if (locked || !quiz || !progress) return;
    const ok = choice === quiz.item.answer;
    setSessionTot(t => t + 1);
    if (ok) {
      setSessionOk(c => c + 1);
      setResult('correct');
      setLocked(true);

      const lv      = currentLv;
      const prevCnt = progress.levelCorrect[lv] ?? 0;
      const newCnt  = prevCnt + 1;
      const req     = TOEIC_LEVELS[lv - 1].req;
      const shouldUnlock = req > 0 && newCnt >= req && lv < 5 && (progress.unlockedUp ?? 1) < lv + 1;

      const newProgress: ToeicProgress = {
        levelCorrect: { ...progress.levelCorrect, [lv]: newCnt },
        unlockedUp:   shouldUnlock ? lv + 1 : (progress.unlockedUp ?? 1),
      };
      setProgress(newProgress);
      saveToeicProgress(newProgress);

      if (shouldUnlock) {
        setJustUnlock(true);
        setTimeout(() => setJustUnlock(false), 3000);
      }
      setTimeout(next, 1200);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 800);
    }
  };

  if (!progress || !quiz) {
    return <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>;
  }

  const lv         = TOEIC_LEVELS[currentLv - 1];
  const lvCorrect  = progress.levelCorrect[currentLv] ?? 0;
  const progressPct= lv.req > 0 ? Math.min(100, Math.round((lvCorrect / lv.req) * 100)) : 100;
  const unlocked   = progress.unlockedUp ?? 1;
  const accuracy   = sessionTot > 0 ? Math.round((sessionOk / sessionTot) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">

      {/* ── Level Banner ── */}
      <div className={`rounded-2xl bg-gradient-to-r ${lv.color} px-5 py-4 text-white shadow-md`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">TOEIC Road</p>
            <p className="text-xl font-black leading-tight mt-0.5">
              {lv.emoji} Level {lv.level}: {lv.title}
            </p>
            <p className="text-[11px] opacity-80 mt-0.5">目標スコア {lv.score}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{lvCorrect}</p>
            <p className="text-[10px] opacity-70">/ {lv.req || '∞'} correct</p>
          </div>
        </div>
        {/* Progress bar */}
        {lv.req > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] opacity-70 mb-1">
              <span>Progress to Level {currentLv + 1}</span>
              <span>{lv.req - lvCorrect > 0 ? `あと${lv.req - lvCorrect}問` : '🔓 Unlocked!'}</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width:`${progressPct}%` }} />
            </div>
          </div>
        )}
        {currentLv === 5 && (
          <p className="text-[11px] mt-2 opacity-80 font-bold">🏆 You've reached the top level!</p>
        )}
      </div>

      {/* Unlock celebration */}
      {justUnlock && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-2xl animate-bounce shadow">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="text-sm font-black text-yellow-800">Level {currentLv} Unlocked!</p>
            <p className="text-xs text-yellow-600">Switch to the new level above!</p>
          </div>
        </div>
      )}

      {/* ── Level selector tabs ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {TOEIC_LEVELS.map(tlv => {
          const isUnlocked = tlv.level <= unlocked;
          return (
            <button key={tlv.level}
              onClick={() => {
                if (!isUnlocked) return;
                window.speechSynthesis?.cancel();
                setCurrentLv(tlv.level);
                setSessionOk(0); setSessionTot(0);
              }}
              disabled={!isUnlocked}
              className={`flex-1 min-w-0 py-2 px-1 rounded-xl text-[10px] font-black transition-all ${
                currentLv === tlv.level
                  ? 'bg-white text-gray-900 shadow-md'
                  : isUnlocked
                  ? 'text-gray-500 hover:text-gray-700'
                  : 'text-gray-300 cursor-not-allowed'
              }`}>
              <span className="block text-sm leading-none">{isUnlocked ? tlv.emoji : '🔒'}</span>
              <span className="block mt-0.5">Lv{tlv.level}</span>
              <span className={`block text-[8px] ${currentLv === tlv.level ? 'text-gray-500' : 'text-gray-400'}`}>
                {tlv.score}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Quiz card ── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className={`px-4 py-2.5 bg-gradient-to-r ${lv.color} flex items-center gap-2`}>
          <span className="text-white text-xs font-black uppercase tracking-wider">
            Listen &amp; Choose the Meaning
          </span>
        </div>
        <div className="px-5 py-5 flex flex-col items-center gap-3">

          {/* Word display */}
          <p className="text-3xl font-black text-gray-900 tracking-wide text-center">{quiz.item.en}</p>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={playWord}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                speaking ? 'bg-indigo-400 text-white animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}>
              <span className="text-base">🔊</span>
              <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
            </button>
            <button onClick={() => setShowText(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-sm transition-all active:scale-95 border ${
                showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
              }`}>
              <span>{showText ? '🙈' : '👁️'}</span>
              <span className="text-xs">{showText ? 'Hide' : 'Note'}</span>
            </button>
          </div>

          {/* Usage note */}
          {showText && quiz.item.note && (
            <div className="w-full px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-bold text-amber-700 text-center">
                💡 Example: <span className="italic">{quiz.item.note}</span>
              </p>
            </div>
          )}

          {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
          {result === 'wrong'   && <p className="text-red-500 font-black">Try again!</p>}
        </div>
      </div>

      {/* ── 3 answer choices ── */}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => {
          const isCorrectShowing = result === 'correct' && choice === quiz.item.answer;
          return (
            <button key={idx} onClick={() => handleTap(choice)}
              disabled={result === 'correct'}
              className={`w-full px-4 py-4 rounded-2xl text-left font-semibold text-sm leading-snug border transition-all active:scale-[0.98] shadow-sm ${
                isCorrectShowing
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.01]'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-indigo-50 hover:border-indigo-300'
              }`}>
              <span className="text-gray-400 font-black mr-2">{['A','B','C'][idx]}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      <button onClick={next}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all">
        Skip →
      </button>

      {/* ── Session score ── */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Session</span>
          <span className="text-base font-black text-indigo-600">{accuracy}%</span>
        </div>
        <span className="text-xs text-gray-400">{sessionOk} / {sessionTot} correct</span>
        <button onClick={() => { setSessionOk(0); setSessionTot(0); }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
          Reset
        </button>
      </div>

      {/* Total progress summary */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3">
        <p className="text-[11px] font-black text-gray-500 mb-2">Overall Progress</p>
        <div className="flex gap-2">
          {TOEIC_LEVELS.map(tlv => {
            const cnt = progress.levelCorrect[tlv.level] ?? 0;
            const locked2 = tlv.level > unlocked;
            return (
              <div key={tlv.level} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-lg">{locked2 ? '🔒' : tlv.emoji}</span>
                <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${tlv.color}`}
                    style={{ width: tlv.req > 0 ? `${Math.min(100,(cnt/tlv.req)*100)}%` : '100%' }}
                  />
                </div>
                <span className="text-[9px] text-gray-400">{locked2 ? '🔒' : `${cnt}問`}</span>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
