'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Data types ────────────────────────────────────────────────────
interface ToeicItem { en: string; answer: string; wrongs: [string, string]; }
interface TestItem  { level: number; en: string; answer: string; choices: string[]; }
interface Result    { level: number; correct: boolean; }
interface RunRecord { date: string; score: number; correct: number; }

interface UserProfile { name: string; history: RunRecord[]; }
type UserIdx = 0 | 1 | 2;

const LS_KEY   = 'weekly-test-v3';
const TIME_LIMIT = 8;
const Q_COUNT    = 30;

const DEFAULT_USERS: [UserProfile, UserProfile, UserProfile] = [
  { name: 'User 1', history: [] },
  { name: 'User 2', history: [] },
  { name: 'User 3', history: [] },
];

// ─── Vocabulary banks ──────────────────────────────────────────────
const L1: ToeicItem[] = [
  { en:'book',     answer:'予約する',    wrongs:['読む','買う'] },
  { en:'run',      answer:'経営する',    wrongs:['走る','壊す'] },
  { en:'check',    answer:'確認する',    wrongs:['支払う','送る'] },
  { en:'address',  answer:'取り組む',    wrongs:['住所','送る'] },
  { en:'cover',    answer:'取り上げる',  wrongs:['覆う','返す'] },
  { en:'place',    answer:'注文する',    wrongs:['場所','置く'] },
  { en:'reach',    answer:'連絡する',    wrongs:['届く','走る'] },
  { en:'suit',     answer:'都合がよい',  wrongs:['スーツ','似合う'] },
  { en:'hold',     answer:'開催する',    wrongs:['持つ','止まる'] },
  { en:'minute',   answer:'議事録',      wrongs:['分（時間）','小さな'] },
  { en:'fine',     answer:'罰金',        wrongs:['細かい','晴れた'] },
  { en:'interest', answer:'利息',        wrongs:['趣味','関心'] },
  { en:'save',     answer:'節約する',    wrongs:['救う','保存する'] },
  { en:'issue',    answer:'発行する',    wrongs:['問題','議題'] },
  { en:'party',    answer:'当事者',      wrongs:['パーティー','集団'] },
  { en:'matter',   answer:'重要である',  wrongs:['問題','物質'] },
  { en:'drive',    answer:'推進する',    wrongs:['運転する','追い払う'] },
  { en:'change',   answer:'おつり',      wrongs:['変える','替える'] },
  { en:'leave',    answer:'休暇',        wrongs:['去る','残す'] },
  { en:'charge',   answer:'請求する',    wrongs:['充電する','担当する'] },
  { en:'raise',    answer:'昇給',        wrongs:['上げる','育てる'] },
  { en:'pending',  answer:'保留中の',    wrongs:['完了した','承認済みの'] },
  { en:'launch',   answer:'発売する',    wrongs:['発射する','開始する'] },
  { en:'draft',    answer:'草稿',        wrongs:['送金','採用'] },
  { en:'deal',     answer:'取引',        wrongs:['配る','分量'] },
  { en:'fair',     answer:'見本市',      wrongs:['公平な','晴れた'] },
  { en:'branch',   answer:'支店',        wrongs:['枝','部門'] },
  { en:'plant',    answer:'工場',        wrongs:['植物','植える'] },
  { en:'short',    answer:'不足している',wrongs:['短い','低い'] },
  { en:'bill',     answer:'請求書',      wrongs:['紙幣','法案'] },
];
const L2: ToeicItem[] = [
  { en:'confirm',      answer:'確認する',      wrongs:['変更する','キャンセルする'] },
  { en:'submit',       answer:'提出する',       wrongs:['受け取る','承認する'] },
  { en:'postpone',     answer:'延期する',       wrongs:['キャンセルする','早める'] },
  { en:'notify',       answer:'通知する',       wrongs:['禁止する','尋ねる'] },
  { en:'invoice',      answer:'請求書',         wrongs:['領収書','明細書'] },
  { en:'deadline',     answer:'締め切り',       wrongs:['開始日','予算'] },
  { en:'recruit',      answer:'採用する',       wrongs:['解雇する','昇進させる'] },
  { en:'reimburse',    answer:'払い戻す',       wrongs:['請求する','延長する'] },
  { en:'valid',        answer:'有効な',         wrongs:['無効な','期限切れの'] },
  { en:'renovation',   answer:'改装',           wrongs:['建設','解体'] },
  { en:'inventory',    answer:'在庫',           wrongs:['予算','売上'] },
  { en:'overdue',      answer:'期限切れの',     wrongs:['期限前の','免除された'] },
  { en:'surplus',      answer:'余剰',           wrongs:['不足','損失'] },
  { en:'revenue',      answer:'収益',           wrongs:['費用','損失'] },
  { en:'workload',     answer:'業務量',         wrongs:['勤務時間','残業'] },
  { en:'negotiate',    answer:'交渉する',       wrongs:['拒否する','合意する'] },
  { en:'merge',        answer:'合併する',       wrongs:['分割する','取得する'] },
  { en:'transfer',     answer:'異動する',       wrongs:['昇進する','退職する'] },
  { en:'inspection',   answer:'検査',           wrongs:['修理','配送'] },
  { en:'inquiry',      answer:'問い合わせ',     wrongs:['クレーム','注文'] },
  { en:'estimate',     answer:'見積もり',       wrongs:['予算','費用'] },
  { en:'approve',      answer:'承認する',       wrongs:['断る','提案する'] },
  { en:'warranty',     answer:'保証',           wrongs:['保険','契約'] },
  { en:'obtain',       answer:'入手する',       wrongs:['失う','返す'] },
  { en:'compensate',   answer:'補償する',       wrongs:['評価する','解雇する'] },
  { en:'distribute',   answer:'配布する',       wrongs:['集める','発注する'] },
  { en:'fund',         answer:'資金を提供する', wrongs:['節約する','借りる'] },
  { en:'clarify',      answer:'明確にする',     wrongs:['変更する','取り消す'] },
  { en:'conduct',      answer:'実施する',       wrongs:['中止する','報告する'] },
  { en:'prior to',     answer:'〜の前に',       wrongs:['〜の後に','〜の間に'] },
];
const L3: ToeicItem[] = [
  { en:'complimentary',answer:'無料の',          wrongs:['有料の','追加の'] },
  { en:'itinerary',    answer:'旅程',            wrongs:['予算','スケジュール'] },
  { en:'amenity',      answer:'設備・アメニティ',wrongs:['追加料金','サービス'] },
  { en:'accommodate',  answer:'収容する',        wrongs:['拒否する','移転する'] },
  { en:'facilitate',   answer:'促進する',        wrongs:['妨げる','評価する'] },
  { en:'substantial',  answer:'かなりの',        wrongs:['わずかな','平均的な'] },
  { en:'adjacent',     answer:'隣接した',        wrongs:['遠い','反対側の'] },
  { en:'comply with',  answer:'〜に従う',        wrongs:['〜を無視する','〜を変える'] },
  { en:'refund',       answer:'返金',            wrongs:['追加料金','割引'] },
  { en:'exclusive',    answer:'限定の',          wrongs:['一般の','追加の'] },
  { en:'mandatory',    answer:'義務的な',        wrongs:['任意の','推奨の'] },
  { en:'feasible',     answer:'実行可能な',      wrongs:['不可能な','危険な'] },
  { en:'coordinate',   answer:'調整する',        wrongs:['分担する','報告する'] },
  { en:'initiative',   answer:'主導権',          wrongs:['義務','提案'] },
  { en:'tentative',    answer:'仮の',            wrongs:['確定した','最終の'] },
  { en:'allocate',     answer:'割り当てる',      wrongs:['削減する','廃止する'] },
  { en:'audit',        answer:'監査',            wrongs:['査定','調査'] },
  { en:'consolidate',  answer:'統合する',        wrongs:['分割する','廃止する'] },
  { en:'demographics', answer:'人口統計',        wrongs:['市場規模','地域情報'] },
  { en:'diversify',    answer:'多様化する',      wrongs:['集中する','縮小する'] },
  { en:'expedite',     answer:'促進・迅速化する',wrongs:['遅延させる','中止する'] },
  { en:'logistics',    answer:'物流',            wrongs:['経営管理','戦略'] },
  { en:'optimal',      answer:'最適な',          wrongs:['最低限の','平均的な'] },
  { en:'outsource',    answer:'外部委託する',    wrongs:['内製化する','削減する'] },
  { en:'patent',       answer:'特許',            wrongs:['商標','著作権'] },
  { en:'prototype',    answer:'試作品',          wrongs:['完成品','量産品'] },
  { en:'quota',        answer:'割り当て・ノルマ',wrongs:['予算','制限'] },
  { en:'restructure',  answer:'再編成する',      wrongs:['拡大する','維持する'] },
  { en:'subsidiary',   answer:'子会社',          wrongs:['本社','取引先'] },
  { en:'fluctuate',    answer:'変動する',        wrongs:['安定する','上昇する'] },
];
const L4: ToeicItem[] = [
  { en:'implement',    answer:'実行する',        wrongs:['評価する','提案する'] },
  { en:'consensus',    answer:'合意',            wrongs:['対立','決定'] },
  { en:'acquisition',  answer:'買収',            wrongs:['売却','合併'] },
  { en:'streamline',   answer:'効率化する',      wrongs:['複雑にする','廃止する'] },
  { en:'leverage',     answer:'活用する',        wrongs:['無視する','削減する'] },
  { en:'fiscal',       answer:'財政上の',        wrongs:['法的な','物理的な'] },
  { en:'mitigate',     answer:'軽減する',        wrongs:['悪化させる','放置する'] },
  { en:'procurement',  answer:'調達',            wrongs:['廃棄','製造'] },
  { en:'compliance',   answer:'法令遵守',        wrongs:['競争','改革'] },
  { en:'turnaround',   answer:'業績回復',        wrongs:['倒産','継続'] },
  { en:'mandate',      answer:'命令・権限',      wrongs:['提案','協議'] },
  { en:'tangible',     answer:'有形の',          wrongs:['無形の','仮想の'] },
  { en:'remuneration', answer:'報酬',            wrongs:['罰金','損失'] },
  { en:'arbitrate',    answer:'仲裁する',        wrongs:['訴訟する','調停する'] },
  { en:'attrition',    answer:'自然減・消耗',    wrongs:['急成長','採用増'] },
  { en:'collateral',   answer:'担保',            wrongs:['利息','配当'] },
  { en:'equity',       answer:'株主資本',        wrongs:['負債','流動資産'] },
  { en:'forecast',     answer:'予測する',        wrongs:['報告する','分析する'] },
  { en:'headcount',    answer:'社員数',          wrongs:['売上高','予算'] },
  { en:'liquidate',    answer:'資産を換金する',  wrongs:['資産を増やす','借入する'] },
  { en:'monetize',     answer:'収益化する',      wrongs:['費用化する','廃止する'] },
  { en:'net profit',   answer:'純利益',          wrongs:['売上総利益','営業利益'] },
  { en:'overhaul',     answer:'全面見直し',      wrongs:['小規模修正','現状維持'] },
  { en:'pivot',        answer:'方針転換する',    wrongs:['現状維持する','縮小する'] },
  { en:'proprietary',  answer:'専有の・独自の',  wrongs:['公開の','共有の'] },
  { en:'due diligence',answer:'事前調査',        wrongs:['事後評価','リスク回避'] },
  { en:'divestiture',  answer:'資産売却',        wrongs:['資産取得','設備投資'] },
  { en:'churn',        answer:'顧客離れ率',      wrongs:['新規獲得率','利益率'] },
  { en:'contingency',  answer:'緊急対応策',      wrongs:['予算','戦略'] },
  { en:'liability',    answer:'負債・責任',      wrongs:['資産','利益'] },
];
const L5: ToeicItem[] = [
  { en:'lucrative',    answer:'儲かる',           wrongs:['損失の多い','慈善的な'] },
  { en:'alleviate',    answer:'軽減する',         wrongs:['悪化させる','無視する'] },
  { en:'exacerbate',   answer:'悪化させる',       wrongs:['改善する','維持する'] },
  { en:'curtail',      answer:'削減する',         wrongs:['拡大する','承認する'] },
  { en:'bolster',      answer:'強化する',         wrongs:['弱める','廃棄する'] },
  { en:'articulate',   answer:'明確に表現する',   wrongs:['抑制する','省略する'] },
  { en:'corroborate',  answer:'裏付ける',         wrongs:['反論する','無視する'] },
  { en:'proliferate',  answer:'急増する',         wrongs:['減少する','安定する'] },
  { en:'indispensable',answer:'不可欠な',         wrongs:['不要な','付加的な'] },
  { en:'volatile',     answer:'不安定な',         wrongs:['安定した','堅調な'] },
  { en:'meticulous',   answer:'細心の',           wrongs:['大雑把な','迅速な'] },
  { en:'paramount',    answer:'最重要な',         wrongs:['些細な','付随的な'] },
  { en:'synergy',      answer:'相乗効果',         wrongs:['競合','対立'] },
  { en:'unprecedented',answer:'前例のない',       wrongs:['一般的な','予想された'] },
  { en:'acumen',       answer:'洞察力・判断力',   wrongs:['知識','経験'] },
  { en:'ameliorate',   answer:'改善する',         wrongs:['悪化させる','維持する'] },
  { en:'ambiguous',    answer:'曖昧な',           wrongs:['明確な','具体的な'] },
  { en:'catalyst',     answer:'触媒・起爆剤',     wrongs:['障害','維持要因'] },
  { en:'caveat',       answer:'警告・但し書き',   wrongs:['承認','保証'] },
  { en:'contentious',  answer:'論争を引き起こす', wrongs:['一致した','歓迎された'] },
  { en:'dearth',       answer:'不足',             wrongs:['過剰','余剰'] },
  { en:'expedite',     answer:'促進・迅速化する', wrongs:['遅延させる','中止する'] },
  { en:'extrapolate',  answer:'推定・外挿する',   wrongs:['精密測定する','縮小する'] },
  { en:'foresight',    answer:'先見の明',         wrongs:['後知恵','近視眼的判断'] },
  { en:'impede',       answer:'妨げる',           wrongs:['促進する','加速させる'] },
  { en:'inherent',     answer:'本質的な',         wrongs:['付加的な','一時的な'] },
  { en:'intangible',   answer:'無形の',           wrongs:['有形の','物理的な'] },
  { en:'holistic',     answer:'総合的な',         wrongs:['部分的な','表面的な'] },
  { en:'conjecture',   answer:'推測・憶測',       wrongs:['証拠','確認'] },
  { en:'endemic',      answer:'特定地域に固有の', wrongs:['世界的な','一時的な'] },
];

const BANKS: [number, ToeicItem[]][] = [[1,L1],[2,L2],[3,L3],[4,L4],[5,L5]];
const LEVEL_LABELS: Record<number,string> = { 1:'〜300',2:'〜500',3:'〜700',4:'〜800',5:'900+' };

// ─── Helpers ───────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTest(): TestItem[] {
  const perLevel = Math.floor(Q_COUNT / BANKS.length);
  const items: TestItem[] = [];
  for (const [level, bank] of BANKS) {
    const picked = shuffle(bank).slice(0, perLevel);
    for (const item of picked) {
      items.push({ level, en: item.en, answer: item.answer, choices: shuffle([item.answer, ...item.wrongs]) });
    }
  }
  return shuffle(items);
}

function estimateScore(results: Result[]): number {
  const weights: Record<number,number> = { 1:8, 2:12, 3:15, 4:18, 5:20 };
  const maxWeighted = BANKS.reduce((s,[lv]) => s + Math.floor(Q_COUNT/BANKS.length) * weights[lv], 0);
  const earned = results.filter(r => r.correct).reduce((s,r) => s + weights[r.level], 0);
  const score = Math.round((earned / maxWeighted) * 690 + 300);
  return Math.min(990, Math.max(300, Math.round(score / 5) * 5));
}

// ─── Timer ring ────────────────────────────────────────────────────
function TimerRing({ timeLeft }: { timeLeft: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (timeLeft / TIME_LIMIT);
  const color = timeLeft <= 2 ? '#ef4444' : timeLeft <= 4 ? '#f59e0b' : '#6366f1';
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={circ} strokeDashoffset={circ - dash} strokeLinecap="round"
        style={{ transform:'rotate(-90deg)', transformOrigin:'50% 50%', transition:'stroke-dashoffset 0.25s linear, stroke 0.25s' }} />
      <text x="28" y="33" textAnchor="middle" fontSize="14" fontWeight="bold" fill={color}>{timeLeft}</text>
    </svg>
  );
}

// ─── Score mini-chart ──────────────────────────────────────────────
function ScoreChart({ history }: { history: RunRecord[] }) {
  if (history.length < 2) return null;
  const recent = [...history].reverse().slice(0, 8);
  const max = Math.max(...recent.map(r => r.score));
  const min = Math.min(...recent.map(r => r.score));
  const range = Math.max(max - min, 100);
  return (
    <div className="flex items-end gap-1 h-16 mt-1 px-1">
      {recent.map((r, i) => {
        const heightPct = ((r.score - min) / range) * 70 + 30;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <span className="text-[8px] font-black text-indigo-700">{r.score}</span>
            <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${heightPct}%` }} />
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────
export function WeeklyTest() {
  const [users,        setUsers]        = useState<[UserProfile, UserProfile, UserProfile]>(DEFAULT_USERS);
  const [selectedUser, setSelectedUser] = useState<UserIdx>(0);
  const [historyUser,  setHistoryUser]  = useState<UserIdx>(0);
  const [showHistory,  setShowHistory]  = useState(false);
  const [editingName,  setEditingName]  = useState(false);
  const [nameInput,    setNameInput]    = useState('');

  const [phase,    setPhase]    = useState<'gate'|'test'|'result'>('gate');
  const [questions,setQuestions]= useState<TestItem[]>([]);
  const [qIdx,     setQIdx]     = useState(0);
  const [results,  setResults]  = useState<Result[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [flash,    setFlash]    = useState<'correct'|'wrong'|null>(null);
  const [answered, setAnswered] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { users?: [UserProfile, UserProfile, UserProfile] };
        if (data.users && Array.isArray(data.users) && data.users.length === 3) {
          setUsers(data.users as [UserProfile, UserProfile, UserProfile]);
        }
      }
    } catch { /* ignore */ }
  }, []);

  const saveUsers = useCallback((updated: [UserProfile, UserProfile, UserProfile]) => {
    setUsers(updated);
    localStorage.setItem(LS_KEY, JSON.stringify({ users: updated }));
  }, []);

  const handleNameSave = useCallback(() => {
    const updated: [UserProfile, UserProfile, UserProfile] = [
      ...users.map((u, i) => i === selectedUser ? { ...u, name: nameInput || u.name } : u)
    ] as [UserProfile, UserProfile, UserProfile];
    saveUsers(updated);
    setEditingName(false);
  }, [users, selectedUser, nameInput, saveUsers]);

  // Timer tick
  useEffect(() => {
    if (phase !== 'test' || answered) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleAnswer(null); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx, answered]);

  const handleAnswer = useCallback((choice: string | null) => {
    if (answered) return;
    clearInterval(timerRef.current!);
    setAnswered(true);
    const q = questions[qIdx];
    const correct = choice === q.answer;
    setFlash(correct ? 'correct' : 'wrong');
    const newResults = [...results, { level: q.level, correct }];

    setTimeout(() => {
      setFlash(null);
      if (qIdx + 1 >= Q_COUNT) {
        const score = estimateScore(newResults);
        const rec: RunRecord = {
          date: new Date().toLocaleDateString('ja-JP'),
          score,
          correct: newResults.filter(r => r.correct).length,
        };
        const updated: [UserProfile, UserProfile, UserProfile] = users.map((u, i) =>
          i === selectedUser
            ? { ...u, history: [rec, ...u.history].slice(0, 20) }
            : u
        ) as [UserProfile, UserProfile, UserProfile];
        saveUsers(updated);
        setResults(newResults);
        setPhase('result');
      } else {
        setResults(newResults);
        setQIdx(i => i + 1);
        setTimeLeft(TIME_LIMIT);
        setAnswered(false);
      }
    }, 380);
  }, [answered, questions, qIdx, results, users, selectedUser, saveUsers]);

  const startTest = useCallback(() => {
    const qs = buildTest();
    setQuestions(qs);
    setQIdx(0);
    setResults([]);
    setTimeLeft(TIME_LIMIT);
    setAnswered(false);
    setFlash(null);
    setPhase('test');
  }, []);

  // ─── Gate screen ───────────────────────────────────────────────
  if (phase === 'gate') {
    const currentUser = users[selectedUser];
    const latestScore = currentUser.history[0]?.score;

    return (
      <div className="px-4 pb-32 pt-4 max-w-md mx-auto">
        <div className="text-center mb-5">
          <div className="text-4xl mb-1">📋</div>
          <h1 className="text-xl font-black text-gray-900">TOEIC 実力テスト</h1>
          <p className="text-xs font-bold text-gray-700 mt-1">いつでも受験可能 · 30問 · 8秒制限</p>
        </div>

        {/* ── 3-user selection ── */}
        <div className="mb-4">
          <p className="text-xs font-black text-gray-900 mb-2">受験者を選んでください</p>
          <div className="grid grid-cols-3 gap-2">
            {users.map((u, i) => {
              const latest = u.history[0];
              const isSelected = selectedUser === i;
              return (
                <button key={i} onClick={() => { setSelectedUser(i as UserIdx); setEditingName(false); }}
                  className={`rounded-2xl p-3 border-2 transition-all text-center ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white'}`}>
                  <p className="text-xs font-black text-gray-900 truncate mb-1">{u.name}</p>
                  {latest ? (
                    <p className="text-xl font-black text-indigo-600">{latest.score}</p>
                  ) : (
                    <p className="text-xs font-bold text-gray-500">未受験</p>
                  )}
                  <p className="text-[10px] font-bold text-gray-600 mt-0.5">{u.history.length}回受験</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Name edit ── */}
        <div className="mb-4 bg-gray-50 rounded-2xl p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-gray-800">
              選択中: <span className="text-indigo-700">{currentUser.name}</span>
              {latestScore && <span className="ml-2 text-gray-600">最新スコア: {latestScore}点</span>}
            </p>
            <button onClick={() => { setEditingName(e => !e); setNameInput(currentUser.name); }}
              className="text-[10px] font-black text-indigo-700 px-2 py-1 bg-indigo-100 rounded-full active:scale-95">
              ✏️ 名前変更
            </button>
          </div>
          {editingName && (
            <div className="flex gap-2">
              <input value={nameInput} onChange={e => setNameInput(e.target.value)}
                className="flex-1 border-2 border-indigo-300 rounded-xl px-3 py-2 text-sm font-bold focus:outline-none"
                placeholder="名前を入力" maxLength={12} />
              <button onClick={handleNameSave}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black active:scale-95">
                保存
              </button>
            </div>
          )}
        </div>

        {/* ── Test info ── */}
        <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 mb-4">
          <ul className="space-y-1.5 text-xs font-bold text-gray-800">
            <li className="flex gap-2"><span>📝</span>30問 · 全5レベルから6問ずつ出題</li>
            <li className="flex gap-2"><span>⏱️</span>1問あたり8秒（超過＝不正解）</li>
            <li className="flex gap-2"><span>🎯</span>3択形式で語彙力を測定</li>
            <li className="flex gap-2"><span>📊</span>推定TOEICスコアと弱点レベル分析</li>
          </ul>
        </div>

        {/* ── Score history ── */}
        <div className="mb-5">
          <button onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between text-xs font-black text-gray-900 py-2.5 px-4 rounded-xl bg-gray-100 active:bg-gray-200">
            <span>📈 過去のスコアを見る（Score History）</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div className="mt-2 border-2 border-gray-200 rounded-2xl overflow-hidden">
              {/* User tabs */}
              <div className="flex bg-gray-100 p-1 gap-1">
                {users.map((u, i) => (
                  <button key={i} onClick={() => setHistoryUser(i as UserIdx)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-black transition-all ${historyUser === i ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}>
                    {u.name}
                  </button>
                ))}
              </div>
              <div className="p-3">
                {users[historyUser].history.length === 0 ? (
                  <p className="text-center text-xs font-bold text-gray-600 py-4">まだ記録がありません</p>
                ) : (
                  <>
                    <ScoreChart history={users[historyUser].history} />
                    <div className="space-y-1.5 mt-2">
                      {users[historyUser].history.map((r, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                          <span className="text-xs font-bold text-gray-700">{r.date}</span>
                          <span className="text-base font-black text-indigo-600">{r.score}点</span>
                          <span className="text-xs font-bold text-gray-700">{r.correct}/{Q_COUNT}問正解</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={startTest}
          className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-black text-base active:scale-95 transition-transform shadow-lg">
          テスト開始 →（{currentUser.name}）
        </button>
      </div>
    );
  }

  // ─── Test screen ───────────────────────────────────────────────
  if (phase === 'test') {
    const q = questions[qIdx];
    const progress = qIdx / Q_COUNT;
    return (
      <div className={`min-h-screen px-4 pb-32 pt-4 max-w-md mx-auto transition-colors duration-150 ${
        flash === 'correct' ? 'bg-emerald-50' : flash === 'wrong' ? 'bg-red-50' : 'bg-white'
      }`}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width:`${progress*100}%` }} />
          </div>
          <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{qIdx+1}/{Q_COUNT}</span>
          <TimerRing timeLeft={timeLeft} />
        </div>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
            Lv{q.level} · TOEIC {LEVEL_LABELS[q.level]}
          </span>
          <span className="text-[10px] font-bold text-gray-700">{users[selectedUser].name}</span>
        </div>
        <div className="mb-8 bg-gray-50 rounded-2xl p-8 text-center border border-gray-100">
          <p className="text-3xl font-black text-gray-900 tracking-wide">{q.en}</p>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {q.choices.map(c => {
            let cls = 'w-full text-left px-5 py-4 rounded-2xl font-bold text-sm border transition-all duration-100 ';
            if (answered) {
              if (c === q.answer) cls += 'bg-emerald-100 border-emerald-300 text-emerald-800';
              else cls += 'bg-gray-50 border-gray-100 text-gray-400';
            } else {
              cls += 'bg-white border-gray-200 text-gray-900 active:scale-98 active:bg-gray-50';
            }
            return (
              <button key={c} onClick={() => handleAnswer(c)} disabled={answered} className={cls}>{c}</button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Result screen ─────────────────────────────────────────────
  if (phase === 'result') {
    const score   = estimateScore(results);
    const correct = results.filter(r => r.correct).length;
    const pct     = Math.round(correct / Q_COUNT * 100);
    const currentUser = users[selectedUser];

    const byLevel: Record<number, { total: number; correct: number }> = {};
    for (const r of results) {
      if (!byLevel[r.level]) byLevel[r.level] = { total: 0, correct: 0 };
      byLevel[r.level].total++;
      if (r.correct) byLevel[r.level].correct++;
    }
    const weakLevels = Object.entries(byLevel)
      .filter(([, v]) => v.correct / v.total < 0.5)
      .map(([lv]) => Number(lv));

    const scoreLabel =
      score >= 860 ? 'TOEIC Gold 🥇' :
      score >= 730 ? 'TOEIC Silver 🥈' :
      score >= 600 ? 'Intermediate 📗' : 'Foundation 📘';

    return (
      <div className="px-4 pb-32 pt-4 max-w-md mx-auto">
        <div className="text-center mb-5">
          <p className="text-sm font-black text-indigo-700 mb-1">{currentUser.name}のスコア</p>
          <div className="text-6xl font-black text-indigo-600 mb-1">{score}</div>
          <p className="text-sm font-bold text-gray-800">推定TOEICスコア</p>
          <p className="text-xs font-bold text-indigo-600 mt-0.5">{scoreLabel}</p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-gray-800">正解率</span>
            <span className="text-sm font-black text-gray-900">{correct}/{Q_COUNT}問 ({pct}%)</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width:`${pct}%` }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
          <p className="text-xs font-black text-gray-800 px-4 pt-3 pb-2">レベル別正解率</p>
          {([1,2,3,4,5] as const).map(lv => {
            const d = byLevel[lv] ?? { total:0, correct:0 };
            const p = d.total > 0 ? d.correct / d.total : 0;
            return (
              <div key={lv} className="flex items-center gap-3 px-4 py-2 border-t border-gray-100">
                <span className="text-[10px] font-black text-gray-700 w-16">Lv{lv} {LEVEL_LABELS[lv]}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all"
                    style={{ width:`${p*100}%`, background: p>=0.8?'#10b981':p>=0.5?'#f59e0b':'#ef4444' }} />
                </div>
                <span className="text-xs font-black text-gray-800 w-10 text-right">{d.correct}/{d.total}</span>
              </div>
            );
          })}
        </div>

        {weakLevels.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 mb-4">
            <p className="text-xs font-black text-amber-800 mb-1">⚠️ 要強化レベル</p>
            <p className="text-xs font-bold text-amber-700">
              {weakLevels.map(lv => `Lv${lv} (TOEIC ${LEVEL_LABELS[lv]})`).join(' · ')}
            </p>
          </div>
        )}

        {/* Score history of selected user */}
        {currentUser.history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
            <p className="text-xs font-black text-gray-800 mb-2">📊 {currentUser.name}のスコア履歴</p>
            <ScoreChart history={currentUser.history} />
            <div className="space-y-1 mt-2">
              {currentUser.history.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700">{r.date}</span>
                  <span className="font-black text-indigo-600 text-sm">{r.score}点</span>
                  <span className="font-bold text-gray-700">{r.correct}/{Q_COUNT}問</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => setPhase('gate')}
          className="w-full border-2 border-gray-200 rounded-2xl py-3 text-sm font-black text-gray-800 active:bg-gray-50">
          ← ユーザー選択に戻る
        </button>
      </div>
    );
  }

  return null;
}
