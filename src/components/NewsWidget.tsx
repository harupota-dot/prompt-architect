'use client';

import { useState } from 'react';

// ── 型定義 ──────────────────────────────────────────────────────
type NewsCategory =
  | 'テクノロジー'
  | 'AI'
  | '経済'
  | 'ビジネス'
  | '政治'
  | '国内'
  | '国際'
  | '科学'
  | '環境'
  | '文化'
  | 'スポーツ'
  | 'トレンド';

interface NewsItem {
  headline: string;
  summary:  string;
  category: NewsCategory;
  emoji:    string;
}

// ── カテゴリ別スタイル ───────────────────────────────────────────
const CATEGORY_STYLE: Record<NewsCategory, string> = {
  'テクノロジー': 'bg-blue-100 text-blue-700 border border-blue-200',
  'AI':          'bg-violet-100 text-violet-700 border border-violet-200',
  '経済':        'bg-emerald-100 text-emerald-700 border border-emerald-200',
  'ビジネス':    'bg-teal-100 text-teal-700 border border-teal-200',
  '政治':        'bg-red-100 text-red-700 border border-red-200',
  '国内':        'bg-rose-100 text-rose-700 border border-rose-200',
  '国際':        'bg-orange-100 text-orange-700 border border-orange-200',
  '科学':        'bg-cyan-100 text-cyan-700 border border-cyan-200',
  '環境':        'bg-green-100 text-green-700 border border-green-200',
  '文化':        'bg-pink-100 text-pink-700 border border-pink-200',
  'スポーツ':    'bg-amber-100 text-amber-700 border border-amber-200',
  'トレンド':    'bg-yellow-100 text-yellow-700 border border-yellow-200',
};

// ── モックニュースデータ（51件 = 17トリプレット × 3）────────────
// ※ 3件ずつ異なるカテゴリになるよう配置（日替わりで多様性を確保）
// ※ 本番では /api/news 経由で News API / The Guardian API 等と連携
const NEWS_ITEMS: NewsItem[] = [

  // ─ Triplet 1: AI / 経済 / 国内 ─
  {
    headline: 'OpenAIが次世代モデルを公開、推論能力が研究者水準に到達',
    summary:  '複雑な数学・科学問題でのベンチマークスコアが専門家を上回り、実用AIへの移行が加速している。',
    category: 'AI', emoji: '🤖',
  },
  {
    headline: '日銀が追加利上げを決定、17年ぶりの金利正常化へ',
    summary:  '政策金利を0.5%に引き上げ。住宅ローンへの影響が注目され、変動型から固定型への切り替えが急増。',
    category: '経済', emoji: '🏦',
  },
  {
    headline: '訪日外国人数が過去最高、円安効果でインバウンド需要が急拡大',
    summary:  '年間3,500万人超えが視野に。観光地・宿泊施設のオーバーツーリズム対策と地方への分散促進が課題。',
    category: '国内', emoji: '🗾',
  },

  // ─ Triplet 2: テクノロジー / 国際 / 文化 ─
  {
    headline: 'Googleが量子コンピュータで従来の1億倍高速な計算を実証',
    summary:  '新型量子チップ「Willow」が特定計算問題を数分で解くことに成功。創薬・材料科学への応用が期待される。',
    category: 'テクノロジー', emoji: '⚛️',
  },
  {
    headline: '日米同盟強化で在日米軍の指揮体系が見直し、防衛協力が深化',
    summary:  '共同対処能力の向上を目的に、自衛隊と米軍の統合運用体制が改編。インド太平洋の安定維持が狙い。',
    category: '国際', emoji: '🤝',
  },
  {
    headline: '日本のアニメ・漫画産業が3兆円市場に、海外売上が国内を逆転',
    summary:  'NetflixやCrunchyrollでの配信拡大により、欧米・アジアでの認知度が急上昇。IPビジネスの多角化も進む。',
    category: '文化', emoji: '🎌',
  },

  // ─ Triplet 3: AI / ビジネス / 科学 ─
  {
    headline: 'AI規制法案がEUで施行、企業に透明性の開示義務',
    summary:  '世界初のAI包括規制が本格運用開始。高リスクAIシステムには第三者監査と説明可能性が義務付けられる。',
    category: 'AI', emoji: '⚖️',
  },
  {
    headline: 'フリーランス保護法が施行、個人事業主への発注ルール厳格化',
    summary:  '報酬の支払い期限や契約書の義務化が進む。副業・フリーランスの増加に対応した法整備が本格化。',
    category: 'ビジネス', emoji: '📋',
  },
  {
    headline: 'IPS細胞から作製した人工膵臓でインスリン分泌に成功、臨床試験へ',
    summary:  '1型糖尿病の根本治療に向けた大きな進展。移植拒絶反応の低減技術も確立し、5年以内の実用化を目指す。',
    category: '科学', emoji: '🔬',
  },

  // ─ Triplet 4: テクノロジー / 経済 / スポーツ ─
  {
    headline: 'スマートフォンにAIチップが標準搭載、端末内処理が主流へ',
    summary:  'クラウド依存を減らし、プライバシーを守りながら高速処理を実現。2025年モデルから業界標準化の見通し。',
    category: 'テクノロジー', emoji: '📱',
  },
  {
    headline: '円安が1ドル=155円台で推移、輸出企業に恩恵・輸入コスト圧迫',
    summary:  '食料品や光熱費への影響が続く一方、製造業の海外収益は過去最高水準。家計への影響は二極化している。',
    category: '経済', emoji: '💴',
  },
  {
    headline: 'パリ五輪が環境配慮型大会として高評価、カーボンニュートラルを達成',
    summary:  'セーヌ川の水質改善・再生可能エネルギー100%・食料廃棄ゼロを実現。今後の国際大会の基準となる見通し。',
    category: 'スポーツ', emoji: '🏅',
  },

  // ─ Triplet 5: 国内 / 国際 / 環境 ─
  {
    headline: 'マイナンバーカードと健康保険証の統合が完全移行、全国で運用開始',
    summary:  '旧保険証は経過措置期間終了後に失効。窓口負担の確認やデジタル申請がマイナカードに一本化される。',
    category: '国内', emoji: '💳',
  },
  {
    headline: '国連安保理でAI兵器規制を巡る議論が始動、各国の立場が割れる',
    summary:  '自律型致死兵器（LAWS）の開発・使用に関する国際ルール策定が急務。人道的懸念と軍事的優位性の両立が論点。',
    category: '国際', emoji: '🕊️',
  },
  {
    headline: '2024年の世界平均気温が観測史上最高を更新、1.5℃超えが現実に',
    summary:  'パリ協定の目標ラインを初めて超過。熱波・洪水・干ばつの頻度増加が農業・インフラに打撃を与えている。',
    category: '環境', emoji: '🌡️',
  },

  // ─ Triplet 6: AI / ビジネス / トレンド ─
  {
    headline: 'メタが脳波でコンピュータを操作するBCIデバイスを発表',
    summary:  '手を使わずに文字入力や画面操作を実現。神経疾患患者支援を入口に、一般消費者向け展開も視野に。',
    category: 'AI', emoji: '🧠',
  },
  {
    headline: 'EC市場が20兆円突破、リアル店舗との融合「OMO」が加速',
    summary:  '実店舗とオンラインを横断した顧客体験の設計が競争軸に。アプリを起点とした購買行動が定着しつつある。',
    category: 'ビジネス', emoji: '🛍️',
  },
  {
    headline: 'Z世代の読書量が増加、「デジタルデトックス」で紙の本が再評価',
    summary:  'SNS疲れを背景に書店来店者数が増加傾向。短時間・集中読書の習慣が生産性向上にも寄与すると注目される。',
    category: 'トレンド', emoji: '📚',
  },

  // ─ Triplet 7: テクノロジー / 政治 / 文化 ─
  {
    headline: 'サイバー攻撃件数が前年比40%増、企業のセキュリティ投資が急増',
    summary:  'ランサムウェアとフィッシング攻撃が特に増加。中小企業への攻撃が国内でも深刻化している。',
    category: 'テクノロジー', emoji: '🔒',
  },
  {
    headline: 'G7サミットで気候変動目標の強化合意、2035年排出50%削減へ',
    summary:  '先進7カ国が脱炭素化の期限を前倒しで合意。太陽光・風力への移行支援で開発途上国への資金協力も決定。',
    category: '政治', emoji: '🌍',
  },
  {
    headline: '国内音楽ストリーミング市場が拡大、邦楽アーティストの海外人気が急増',
    summary:  'Spotifyでの日本語楽曲再生数が3年で10倍に。K-POPに続きJ-POPがグローバルトレンドになりつつある。',
    category: '文化', emoji: '🎵',
  },

  // ─ Triplet 8: 経済 / 科学 / トレンド ─
  {
    headline: '国内スタートアップへの投資額が過去最高、生成AI関連が牽引',
    summary:  '2024年の国内ベンチャー投資が1兆円超えの見通し。AI・ヘルステック・クリーンテックに資金が集中。',
    category: '経済', emoji: '🚀',
  },
  {
    headline: 'JAXAの小惑星サンプル分析で有機物と水を発見、生命の起源に迫る',
    summary:  'リュウグウのサンプルから20種以上のアミノ酸を検出。地球外からの生命材料供給仮説の有力な証拠となった。',
    category: '科学', emoji: '🌌',
  },
  {
    headline: 'メンタルヘルスへの関心が高まり、企業のウェルビーイング施策が標準化',
    summary:  '心理的安全性の確保やマインドフルネスプログラムの導入企業が急増。休職者数の減少効果も実証されつつある。',
    category: 'トレンド', emoji: '🧘',
  },

  // ─ Triplet 9: 国内 / 国際 / スポーツ ─
  {
    headline: '少子化対策で政府が「こども誰でも通園制度」を全国展開',
    summary:  '保育施設に空きがある時間帯に未就園児を一時預かりする制度が全国展開。保護者の育児負担軽減を目指す。',
    category: '国内', emoji: '👶',
  },
  {
    headline: 'インド経済が世界3位に浮上、若年層人口が成長エンジン',
    summary:  'GDPで日本・ドイツを上回り存在感が急拡大。テック・製造業への外資流入が続き、中間層の消費も急増中。',
    category: '国際', emoji: '🇮🇳',
  },
  {
    headline: '大谷翔平が本塁打・打点の二冠を獲得、歴史的シーズンを達成',
    summary:  '投打ともに超一流の成績を維持しMLBの歴史に新記録を刻む。日本国内での中継視聴率も過去最高を更新。',
    category: 'スポーツ', emoji: '⚾',
  },

  // ─ Triplet 10: AI / テクノロジー / 環境 ─
  {
    headline: 'ChatGPTのユーザー数が3億人突破、教育・医療現場への浸透が加速',
    summary:  '個別学習支援や診断補助ツールとしての活用事例が急増。倫理・著作権問題への対応が各国で議論される。',
    category: 'AI', emoji: '💬',
  },
  {
    headline: '自動運転レベル4が都市部で商用解禁、タクシー無人化が現実に',
    summary:  '特定エリア内での無人タクシー運行が許可され、料金は通常タクシーの約6割程度になると予測される。',
    category: 'テクノロジー', emoji: '🚗',
  },
  {
    headline: '海洋プラスチック問題への国際条約が採択、2030年から規制強化',
    summary:  'プラスチック製造の削減・代替素材への移行・廃棄物管理の強化が各国に義務付けられる見込み。',
    category: '環境', emoji: '🌊',
  },

  // ─ Triplet 11: ビジネス / 政治 / 文化 ─
  {
    headline: '日本の実質賃金がプラス転換、物価上昇を上回る賃上げが実現',
    summary:  '春闘で大手企業を中心に5%超えの賃上げが相次ぎ、30年ぶりの好循環実現への期待が高まっている。',
    category: 'ビジネス', emoji: '📈',
  },
  {
    headline: '韓国との歴史問題で日韓外相会談、関係改善に向けた協議継続',
    summary:  '徴用工問題と慰安婦問題の解決策について継続的な対話の枠組みを設置。経済・文化交流の拡大も合意。',
    category: '政治', emoji: '🇯🇵',
  },
  {
    headline: '「推し活」市場が1兆円超え、エンタメ消費が若者の支出トップに',
    summary:  'アイドル・アニメ・スポーツ選手への応援消費が活発化。関連グッズ・ライブ・デジタルコンテンツが牽引。',
    category: '文化', emoji: '💜',
  },

  // ─ Triplet 12: 経済 / 科学 / トレンド ─
  {
    headline: '電気代・ガス代の補助終了後も高水準、エネルギーコスト対策が急務',
    summary:  '家庭・企業ともに節電意識が高まり、太陽光パネルや蓄電池の設置補助への需要が急増している。',
    category: '経済', emoji: '⚡',
  },
  {
    headline: '全固体電池が2027年量産化へ、EVの航続距離が2倍に',
    summary:  '充電時間の大幅短縮と安全性向上を同時に実現。国内メーカーが特許を多数保有し、競争優位が期待される。',
    category: '科学', emoji: '🔋',
  },
  {
    headline: '睡眠テックが急成長、脳波解析で質の高い睡眠を設計する時代へ',
    summary:  'スマートリングやマットレスセンサーでの睡眠スコア計測が普及。職場での「パワーナップ」制度化も広がる。',
    category: 'トレンド', emoji: '😴',
  },

  // ─ Triplet 13: 国内 / 国際 / 政治 ─
  {
    headline: '2025年問題：団塊世代全員が75歳以上となり、医療・介護費が急増',
    summary:  '高齢化率30%超えの到来で医療・介護人材の不足が深刻化。AI・ロボット活用による省人化策が急ピッチで進む。',
    category: '国内', emoji: '🏥',
  },
  {
    headline: '中東情勢の緊迫化で原油価格が上昇、日本の輸入コストに影響',
    summary:  '地政学リスクの高まりで原油先物が上昇。エネルギー安全保障の観点から再生可能エネルギー転換が加速。',
    category: '国際', emoji: '🛢️',
  },
  {
    headline: '衆院選後の連立政権が発足、経済対策と防衛費増額を最優先課題に',
    summary:  '物価高対策・子育て支援・防衛力強化を三本柱に掲げ、補正予算の早期成立を目指す方針を表明。',
    category: '政治', emoji: '🏛️',
  },

  // ─ Triplet 14: AI / ビジネス / スポーツ ─
  {
    headline: '半導体不足が再燃、自動車・家電メーカーが生産調整を迫られる',
    summary:  '地政学リスクと需要急増が重なり、主要チップの納期が半年以上に。国内半導体工場への投資が拡大。',
    category: 'AI', emoji: '💡',
  },
  {
    headline: '中小企業のDX化率が5割超え、補助金活用が後押し',
    summary:  'IT導入補助金の対象拡大により、中小企業でもクラウド会計・在庫管理・AI活用が急速に普及中。',
    category: 'ビジネス', emoji: '🖥️',
  },
  {
    headline: 'Jリーグが新規参入クラブの増加でリーグ拡大、地方活性化に貢献',
    summary:  '地域に根差したサッカークラブが増え、地方経済への波及効果が注目されている。女性ファン層の拡大も顕著。',
    category: 'スポーツ', emoji: '⚽',
  },

  // ─ Triplet 15: テクノロジー / 環境 / トレンド ─
  {
    headline: '量子暗号通信の実用化が近づく、金融・医療データ保護に革命',
    summary:  '解読不可能な通信路を光ファイバーで実現。政府・金融機関での先行導入が始まり、2030年代の普及を目指す。',
    category: 'テクノロジー', emoji: '🔐',
  },
  {
    headline: '都市の平均気温を2℃下げる「緑のインフラ」整備が世界で加速',
    summary:  '屋上緑化・街路樹の拡充・水辺空間の復元が熱中症リスク低減と生物多様性回復の両面で効果を上げている。',
    category: '環境', emoji: '🌿',
  },
  {
    headline: '地方移住者が過去最多を更新、リモートワーク定着で「関係人口」も急増',
    summary:  '東京圏からの転出者が転入者を上回る傾向が続く。UIJターン支援策の拡充で移住コストが大幅に低下。',
    category: 'トレンド', emoji: '🏡',
  },

  // ─ Triplet 16: 国内 / 経済 / 文化 ─
  {
    headline: '能登半島地震の復興が進展、インフラ整備と移住支援が本格化',
    summary:  '仮設住宅から復興住宅への移行が加速。地域産業の再生に向けたクラウドファンディングや企業誘致も活発化。',
    category: '国内', emoji: '🏗️',
  },
  {
    headline: '高校での「金融教育」が必修化、株式・投資・資産形成の基本を学ぶ',
    summary:  '新学習指導要領でNISA・複利・リスク管理などが高校家庭科に組み込まれ、若者の資産形成意識が変わり始めている。',
    category: '経済', emoji: '📊',
  },
  {
    headline: '世界遺産登録で注目が集まる「佐渡島の金山」、観光・文化振興に弾み',
    summary:  'ユネスコ登録決定後、国内外からの注目度が急上昇。地域の伝統産業と観光の融合モデルとして全国から視察が相次ぐ。',
    category: '文化', emoji: '⛰️',
  },

  // ─ Triplet 17: AI / 国内 / 科学 ─
  {
    headline: 'AIによる新素材発見が加速、創薬・半導体・電池設計に革命',
    summary:  '生成AIが膨大な物質データベースを解析し、実験室で数年かかる新素材の候補探索を数時間で完了させている。',
    category: 'AI', emoji: '🧪',
  },
  {
    headline: '教員不足が深刻化、文科省が教職の処遇改善と業務効率化を緊急発表',
    summary:  '給特法の見直しで残業代相当分を支給する方向で検討。AIを活用した採点・事務作業の自動化も支援策に含まれる。',
    category: '国内', emoji: '🏫',
  },
  {
    headline: '国際宇宙ステーション引退後の後継機計画が始動、日本も参画へ',
    summary:  'NASAが民間宇宙ステーション「Gateway」への移行を発表。JAXAとの協力体制が強化され、日本人飛行士の搭乗機会も確保。',
    category: '科学', emoji: '🛸',
  },
];

// ── ユーティリティ ──────────────────────────────────────────────
function dayOfYear(): number {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

/** 1日に表示するニュース数（3件 = 1トリプレット）*/
const NEWS_PER_DAY = 3;

function getTodayNews(): NewsItem[] {
  const day = dayOfYear();
  const n   = NEWS_ITEMS.length;
  // 各トリプレットが異なるカテゴリ構成になるよう配列を設計済み
  return Array.from({ length: NEWS_PER_DAY }, (_, i) =>
    NEWS_ITEMS[(day * NEWS_PER_DAY + i) % n]
  );
}

// ── メインコンポーネント ─────────────────────────────────────────
export function NewsWidget() {
  const [collapsed, setCollapsed] = useState(false);
  const todayNews = getTodayNews();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── ヘッダー ── */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:opacity-95 transition-all"
      >
        <span className="text-xl">📰</span>
        <div className="flex-1 text-left">
          <p className="text-xs font-black text-white">知っておくべきニュース</p>
          <p className="text-[10px] text-slate-300">今日のピックアップ {NEWS_PER_DAY}件</p>
        </div>
        <span className="text-[9px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-medium">
          日替わり更新
        </span>
        <span className={`text-white text-xs transition-transform ${collapsed ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {!collapsed && (
        <div className="divide-y divide-gray-100">
          {todayNews.map((item, idx) => (
            <div key={idx} className="px-4 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-3">
                {/* 絵文字アイコン */}
                <span className="text-2xl flex-shrink-0 leading-none mt-0.5">{item.emoji}</span>

                <div className="flex-1 min-w-0">
                  {/* カテゴリバッジ */}
                  <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-full mb-1.5 ${CATEGORY_STYLE[item.category]}`}>
                    {item.category}
                  </span>

                  {/* ヘッドライン */}
                  <p className="text-xs font-bold text-gray-900 leading-snug">
                    {item.headline}
                  </p>

                  {/* サマリー */}
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* フッター */}
          <div className="px-4 py-2 bg-gray-50 flex items-center justify-between">
            <p className="text-[9px] text-gray-400">
              ※ モックデータ表示中 — News API連携で最新ニュースに更新可能
            </p>
            <span className="text-[9px] text-gray-400 font-medium">
              {new Date().toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
