'use client';

import { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────────────────
// データ型・ストレージ
// ─────────────────────────────────────────────────────────────────
interface GoalItem {
  id:        string;
  text:      string;
  createdAt: number;
}
interface GoalsData {
  certifications: GoalItem[];
  skills:         GoalItem[];
}

const GOALS_KEY = 'sparta-goals-v1';

function load(): GoalsData {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { certifications: [], skills: [] };
}
function save(data: GoalsData) {
  try { localStorage.setItem(GOALS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

// ─────────────────────────────────────────────────────────────────
// サブコンポーネント：1つのリスト
// ─────────────────────────────────────────────────────────────────
function GoalSection({
  title, icon, accentClass, items,
  onAdd, onDelete,
}: {
  title:       string;
  icon:        string;
  accentClass: string;
  items:       GoalItem[];
  onAdd:       (text: string) => void;
  onDelete:    (id: string) => void;
}) {
  const [inputVal, setInputVal] = useState('');

  const submit = () => {
    const t = inputVal.trim();
    if (!t) return;
    onAdd(t);
    setInputVal('');
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <div className={`px-4 py-2.5 flex items-center gap-2 ${accentClass}`}>
        <span className="text-base">{icon}</span>
        <p className="text-xs font-black text-white">{title}</p>
        <span className="ml-auto text-[10px] text-white/70">{items.length}件</span>
      </div>

      {/* 入力欄 */}
      <div className="px-4 pt-3 pb-2 flex gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); }}
          placeholder="追加する…"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={submit}
          disabled={!inputVal.trim()}
          className="px-3 py-2 rounded-xl bg-indigo-600 disabled:bg-gray-200 text-white text-sm font-bold transition-all active:scale-95"
        >＋</button>
      </div>

      {/* リスト */}
      {items.length === 0 ? (
        <p className="px-4 pb-4 text-xs text-gray-400 text-center py-3">
          まだ登録がありません
        </p>
      ) : (
        <ul className="px-4 pb-4 space-y-2">
          {items.map(item => (
            <li key={item.id}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl">
              <span className="text-lg">{icon}</span>
              <span className="flex-1 text-sm text-gray-800 leading-snug">{item.text}</span>
              <button
                onClick={() => onDelete(item.id)}
                className="flex-shrink-0 text-gray-300 hover:text-red-400 transition-colors text-sm"
                title="削除"
              >🗑️</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// GoalsList — メインコンポーネント
// ─────────────────────────────────────────────────────────────────
export function GoalsList() {
  const [data, setData] = useState<GoalsData>({ certifications: [], skills: [] });

  useEffect(() => { setData(load()); }, []);

  const update = (next: GoalsData) => { setData(next); save(next); };

  const addItem = (key: keyof GoalsData, text: string) => {
    const item: GoalItem = { id: Date.now().toString(), text, createdAt: Date.now() };
    update({ ...data, [key]: [item, ...data[key]] });
  };

  const deleteItem = (key: keyof GoalsData, id: string) => {
    update({ ...data, [key]: data[key].filter(i => i.id !== id) });
  };

  return (
    <div className="space-y-3">
      <GoalSection
        title="取得したい資格一覧"
        icon="🏆"
        accentClass="bg-gradient-to-r from-amber-500 to-yellow-400"
        items={data.certifications}
        onAdd={t => addItem('certifications', t)}
        onDelete={id => deleteItem('certifications', id)}
      />
      <GoalSection
        title="習得したい技能一覧"
        icon="⚡"
        accentClass="bg-gradient-to-r from-indigo-600 to-violet-500"
        items={data.skills}
        onAdd={t => addItem('skills', t)}
        onDelete={id => deleteItem('skills', id)}
      />
    </div>
  );
}
