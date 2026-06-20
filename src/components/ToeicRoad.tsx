'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface ToeicLevel {
  level: number; score: string; title: string; emoji: string; color: string; req: number;
}
interface ToeicItem {
  en: string; answer: string; wrongs: [string, string]; note?: string;
}
interface ToeicProgress {
  levelCorrect: Record<number, number>;
  unlockedUp:   number;
}
interface PlayerScore {
  name: string; current: number; target: number;
}

// ─────────────────────────────────────────────────────────────────
// Level definitions
// ─────────────────────────────────────────────────────────────────
const TOEIC_LEVELS: ToeicLevel[] = [
  { level:1, score:'〜300', title:'超基礎（中学英語）',  emoji:'📗', color:'from-green-400 to-emerald-500',  req:20 },
  { level:2, score:'〜500', title:'基礎固め',            emoji:'📘', color:'from-blue-400 to-cyan-500',      req:20 },
  { level:3, score:'〜700', title:'実用会話',            emoji:'📙', color:'from-amber-400 to-yellow-500',   req:20 },
  { level:4, score:'〜800', title:'ビジネス応用',        emoji:'📕', color:'from-orange-500 to-red-500',     req:20 },
  { level:5, score:'900+',  title:'ネイティブ級',        emoji:'🏆', color:'from-violet-500 to-indigo-600',  req:0  },
];

// ─────────────────────────────────────────────────────────────────
// Datasets — Level 1 (TOEIC ~300, 中学英語・基礎TOEIC多義語)
// ─────────────────────────────────────────────────────────────────
const L1: ToeicItem[] = [
  { en:'book',         answer:'予約する',    wrongs:['読む','買う'],           note:'book a room / a table' },
  { en:'run',          answer:'経営する',    wrongs:['走る','壊す'],           note:'run a company' },
  { en:'check',        answer:'確認する',    wrongs:['支払う','送る'],         note:'check your schedule' },
  { en:'address',      answer:'取り組む',    wrongs:['住所','送る'],           note:'address the issue' },
  { en:'cover',        answer:'取り上げる',  wrongs:['覆う','返す'],           note:'the report covers the topic' },
  { en:'place',        answer:'注文する',    wrongs:['場所','置く'],           note:'place an order' },
  { en:'reach',        answer:'連絡する',    wrongs:['届く','走る'],           note:'reach me by email' },
  { en:'suit',         answer:'都合がよい',  wrongs:['スーツ','似合う'],       note:'does Tuesday suit you?' },
  { en:'hold',         answer:'開催する',    wrongs:['持つ','止まる'],         note:'hold a meeting' },
  { en:'minute',       answer:'議事録',      wrongs:['分（時間）','小さな'],   note:'take the minutes' },
  { en:'change',       answer:'おつり',      wrongs:['変える','替える'],       note:'keep the change' },
  { en:'fine',         answer:'罰金',        wrongs:['細かい','晴れた'],       note:'pay a fine' },
  { en:'interest',     answer:'利息',        wrongs:['趣味','関心'],           note:'interest rate' },
  { en:'light',        answer:'軽い',        wrongs:['光','点灯する'],         note:'light luggage' },
  { en:'save',         answer:'節約する',    wrongs:['救う','保存する'],       note:'save time / money' },
  { en:'pull',         answer:'引き付ける',  wrongs:['引っ張る','押す'],       note:'pull in customers' },
  { en:'issue',        answer:'発行する',    wrongs:['問題','議題'],           note:'issue a ticket' },
  { en:'party',        answer:'当事者',      wrongs:['パーティー','集団'],     note:'third party' },
  { en:'matter',       answer:'重要である',  wrongs:['問題','物質'],           note:"it doesn't matter" },
  { en:'drive',        answer:'推進する',    wrongs:['運転する','追い払う'],   note:'drive growth' },
  { en:'order',        answer:'注文',        wrongs:['命令','順序'],           note:'take your order' },
  { en:'cash',         answer:'現金',        wrongs:['小切手','振込み'],       note:'pay in cash' },
  { en:'break',        answer:'休憩',        wrongs:['壊れる','分ける'],       note:'take a short break' },
  { en:'advance',      answer:'前払いの',    wrongs:['進歩','事後の'],         note:'in advance' },
  { en:'return',       answer:'返却する',    wrongs:['旅行する','帰国する'],   note:'return the item' },
  { en:'note',         answer:'メモする',    wrongs:['音符','紙幣'],           note:'please note the date' },
  { en:'engage',       answer:'従事する',    wrongs:['断る','解雇する'],       note:'engage in a project' },
  { en:'stock',        answer:'在庫',        wrongs:['株式','倉庫'],           note:'out of stock' },
  { en:'settle',       answer:'解決する',    wrongs:['移住する','定める'],     note:'settle the dispute' },
  { en:'terms',        answer:'条件',        wrongs:['期間','用語'],           note:'terms of the contract' },
  { en:'attend',       answer:'出席する',    wrongs:['注意する','世話する'],   note:'attend the meeting' },
  { en:'found',        answer:'設立する',    wrongs:['見つける','基盤'],       note:'found a company' },
  { en:'bill',         answer:'請求書',      wrongs:['紙幣','法案'],           note:'pay the bill' },
  { en:'sign',         answer:'署名する',    wrongs:['サイン','標識'],         note:'sign the contract' },
  { en:'post',         answer:'投稿する',    wrongs:['郵便','柱'],             note:'post an announcement' },
  { en:'press',        answer:'報道機関',    wrongs:['押す','印刷する'],       note:'press release' },
  { en:'round',        answer:'一巡り',      wrongs:['丸い','丸める'],         note:'round of applause' },
  { en:'short',        answer:'不足している',wrongs:['短い','低い'],           note:'short of supplies' },
  { en:'charge',       answer:'請求する',    wrongs:['充電する','担当する'],   note:'charge a fee' },
  { en:'leave',        answer:'休暇',        wrongs:['去る','残す'],           note:'take annual leave' },
  { en:'branch',       answer:'支店',        wrongs:['枝','部門'],             note:'branch office' },
  { en:'deal',         answer:'取引',        wrongs:['配る','分量'],           note:'close a deal' },
  { en:'keep',         answer:'維持する',    wrongs:['保管する','続ける'],     note:'keep records' },
  { en:'raise',        answer:'昇給',        wrongs:['上げる','育てる'],       note:'get a raise' },
  { en:'term',         answer:'任期',        wrongs:['学期','用語'],           note:'serve a term' },
  { en:'plant',        answer:'工場',        wrongs:['植物','植える'],         note:'manufacturing plant' },
  { en:'pending',      answer:'保留中の',    wrongs:['完了した','承認済みの'], note:'pending approval' },
  { en:'fair',         answer:'見本市',      wrongs:['公平な','晴れた'],       note:'trade fair' },
  { en:'draft',        answer:'草稿',        wrongs:['送金','採用'],           note:'draft of the report' },
  { en:'launch',       answer:'発売する',    wrongs:['発射する','開始する'],   note:'launch a new product' },
];

// ─────────────────────────────────────────────────────────────────
// Level 2 (TOEIC ~500, 基礎ビジネス語彙)
// ─────────────────────────────────────────────────────────────────
const L2: ToeicItem[] = [
  { en:'appointment',  answer:'（面会の）約束',wrongs:['任命','予定'],          note:'make an appointment' },
  { en:'submit',       answer:'提出する',      wrongs:['受け取る','承認する'],  note:'submit a report' },
  { en:'require',      answer:'必要とする',    wrongs:['求める','依頼する'],    note:'requires experience' },
  { en:'confirm',      answer:'確認する',      wrongs:['変更する','キャンセル'],note:'confirm your reservation' },
  { en:'proceed',      answer:'進む',          wrongs:['止まる','戻る'],        note:'proceed with the plan' },
  { en:'estimate',     answer:'見積もり',      wrongs:['予算','費用'],          note:'cost estimate' },
  { en:'notify',       answer:'通知する',      wrongs:['禁止する','尋ねる'],    note:'notify employees' },
  { en:'postpone',     answer:'延期する',      wrongs:['キャンセルする','早める'],note:'postpone the meeting' },
  { en:'obtain',       answer:'入手する',      wrongs:['失う','返す'],          note:'obtain a license' },
  { en:'distribute',   answer:'配布する',      wrongs:['集める','発注する'],    note:'distribute handouts' },
  { en:'available',    answer:'入手可能な',    wrongs:['混んでいる','必要な'],  note:'is this item available?' },
  { en:'qualified',    answer:'資格のある',    wrongs:['不適切な','有名な'],    note:'qualified candidates' },
  { en:'contract',     answer:'契約',          wrongs:['連絡先','商品'],        note:'sign a contract' },
  { en:'invoice',      answer:'請求書',        wrongs:['領収書','明細書'],      note:'send an invoice' },
  { en:'deadline',     answer:'締め切り',      wrongs:['開始日','予算'],        note:'meet the deadline' },
  { en:'prior to',     answer:'〜の前に',      wrongs:['〜の後に','〜の間に'],  note:'prior to the meeting' },
  { en:'ensure',       answer:'確実にする',    wrongs:['疑う','取り消す'],      note:'ensure accuracy' },
  { en:'relocate',     answer:'移転する',      wrongs:['復帰する','閉店する'],  note:'the office will relocate' },
  { en:'renovation',   answer:'改装',          wrongs:['建設','解体'],          note:'under renovation' },
  { en:'inventory',    answer:'在庫',          wrongs:['予算','売上'],          note:'check the inventory' },
  { en:'approve',      answer:'承認する',      wrongs:['断る','提案する'],      note:'approve the budget' },
  { en:'retain',       answer:'保持する',      wrongs:['失う','採用する'],      note:'retain customers' },
  { en:'depart',       answer:'出発する',      wrongs:['到着する','移動する'],  note:'the flight departs at noon' },
  { en:'schedule',     answer:'予定を立てる',  wrongs:['延期する','取り消す'],  note:'schedule a meeting' },
  { en:'applied',      answer:'応募した',      wrongs:['採用された','辞退した'],note:'applied for the position' },
  { en:'clarify',      answer:'明確にする',    wrongs:['変更する','取り消す'],  note:'clarify the requirements' },
  { en:'compensate',   answer:'補償する',      wrongs:['評価する','解雇する'],  note:'compensate for the damage' },
  { en:'conduct',      answer:'実施する',      wrongs:['中止する','報告する'],  note:'conduct a survey' },
  { en:'enclose',      answer:'同封する',      wrongs:['印刷する','返送する'],  note:'enclosed in the package' },
  { en:'exhibit',      answer:'展示する',      wrongs:['購入する','撤去する'],  note:'exhibit at the trade show' },
  { en:'fund',         answer:'資金を提供する',wrongs:['節約する','借りる'],    note:'fund the project' },
  { en:'headquarters', answer:'本社',          wrongs:['支店','倉庫'],          note:'company headquarters' },
  { en:'inspection',   answer:'検査',          wrongs:['修理','配送'],          note:'quality inspection' },
  { en:'inquiry',      answer:'問い合わせ',    wrongs:['クレーム','注文'],      note:'sales inquiry' },
  { en:'installment',  answer:'分割払い',      wrongs:['一括払い','前払い'],    note:'monthly installments' },
  { en:'maintenance',  answer:'維持管理',      wrongs:['建設','解体'],          note:'regular maintenance' },
  { en:'merge',        answer:'合併する',      wrongs:['分割する','取得する'],  note:'merge with another firm' },
  { en:'negotiate',    answer:'交渉する',      wrongs:['拒否する','合意する'],  note:'negotiate the terms' },
  { en:'overdue',      answer:'期限切れの',    wrongs:['期限前の','免除された'],note:'overdue payment' },
  { en:'projection',   answer:'見通し・予測',  wrongs:['実績','計画'],          note:'sales projection' },
  { en:'recruit',      answer:'採用する',      wrongs:['解雇する','昇進させる'],note:'recruit new staff' },
  { en:'reimburse',    answer:'払い戻す',      wrongs:['請求する','延長する'],  note:'reimburse travel expenses' },
  { en:'renovate',     answer:'改修する',      wrongs:['取り壊す','建設する'],  note:'renovate the office' },
  { en:'revenue',      answer:'収益',          wrongs:['費用','損失'],          note:'annual revenue' },
  { en:'surplus',      answer:'余剰',          wrongs:['不足','損失'],          note:'budget surplus' },
  { en:'transfer',     answer:'異動する',      wrongs:['昇進する','退職する'],  note:'transfer to another branch' },
  { en:'valid',        answer:'有効な',        wrongs:['無効な','期限切れの'],  note:'valid until December' },
  { en:'warranty',     answer:'保証',          wrongs:['保険','契約'],          note:'one-year warranty' },
  { en:'workload',     answer:'業務量',        wrongs:['勤務時間','残業'],      note:'heavy workload' },
  { en:'yield',        answer:'収益をもたらす',wrongs:['損失を出す','投資する'],note:'yield high returns' },
];

// ─────────────────────────────────────────────────────────────────
// Level 3 (TOEIC ~700, 実用会話・サービス・旅行)
// ─────────────────────────────────────────────────────────────────
const L3: ToeicItem[] = [
  { en:'complimentary',answer:'無料の',         wrongs:['有料の','追加の'],      note:'complimentary breakfast' },
  { en:'itinerary',    answer:'旅程',           wrongs:['予算','スケジュール'],  note:'travel itinerary' },
  { en:'amenity',      answer:'設備・アメニティ',wrongs:['追加料金','サービス'], note:'hotel amenities' },
  { en:'accommodate',  answer:'収容する',       wrongs:['拒否する','移転する'],  note:'accommodate 200 guests' },
  { en:'inquire',      answer:'問い合わせる',   wrongs:['断る','報告する'],      note:'inquire about availability' },
  { en:'facilitate',   answer:'促進する',       wrongs:['妨げる','評価する'],    note:'facilitate communication' },
  { en:'periodically', answer:'定期的に',       wrongs:['即時に','一度だけ'],    note:'review periodically' },
  { en:'substantial',  answer:'かなりの',       wrongs:['わずかな','平均的な'],  note:'substantial discount' },
  { en:'adjacent',     answer:'隣接した',       wrongs:['遠い','反対側の'],      note:'adjacent to the station' },
  { en:'comply with',  answer:'〜に従う',       wrongs:['〜を無視する','〜を変える'],note:'comply with regulations' },
  { en:'refund',       answer:'返金',           wrongs:['追加料金','割引'],      note:'request a refund' },
  { en:'exclusive',    answer:'限定の',         wrongs:['一般の','追加の'],      note:'exclusive offer' },
  { en:'mandatory',    answer:'義務的な',       wrongs:['任意の','推奨の'],      note:'mandatory training' },
  { en:'feasible',     answer:'実行可能な',     wrongs:['不可能な','危険な'],    note:'a feasible plan' },
  { en:'coordinate',   answer:'調整する',       wrongs:['分担する','報告する'],  note:'coordinate the event' },
  { en:'initiative',   answer:'主導権',         wrongs:['義務','提案'],          note:'take the initiative' },
  { en:'premises',     answer:'構内・敷地',     wrongs:['前提','本部'],          note:'on the premises' },
  { en:'delegate',     answer:'委任する',       wrongs:['報告する','解雇する'],  note:'delegate tasks' },
  { en:'tentative',    answer:'仮の',           wrongs:['確定した','最終の'],    note:'tentative schedule' },
  { en:'proofread',    answer:'校正する',       wrongs:['作成する','配布する'],  note:'proofread the document' },
  { en:'reconcile',    answer:'調整する',       wrongs:['却下する','報告する'],  note:'reconcile accounts' },
  { en:'affiliate',    answer:'系列会社',       wrongs:['競合他社','取引先'],    note:'affiliated company' },
  { en:'allocate',     answer:'割り当てる',     wrongs:['削減する','廃止する'],  note:'allocate the budget' },
  { en:'audit',        answer:'監査',           wrongs:['査定','調査'],          note:'annual audit' },
  { en:'authorize',    answer:'承認・許可する', wrongs:['拒否する','保留する'],  note:'authorize the purchase' },
  { en:'benchmark',    answer:'基準',           wrongs:['目標','評価'],          note:'industry benchmark' },
  { en:'consolidate',  answer:'統合する',       wrongs:['分割する','廃止する'],  note:'consolidate departments' },
  { en:'correlation',  answer:'相関関係',       wrongs:['因果関係','対比'],      note:'strong correlation' },
  { en:'demographics', answer:'人口統計',       wrongs:['市場規模','地域情報'],  note:'target demographics' },
  { en:'depreciation', answer:'減価償却',       wrongs:['資産増加','利益'],      note:'annual depreciation' },
  { en:'diversify',    answer:'多様化する',     wrongs:['集中する','縮小する'],  note:'diversify the portfolio' },
  { en:'expedite',     answer:'促進・迅速化する',wrongs:['遅延させる','中止する'],note:'expedite the shipment' },
  { en:'fluctuate',    answer:'変動する',       wrongs:['安定する','上昇する'],  note:'prices fluctuate daily' },
  { en:'gross',        answer:'総計の',         wrongs:['純利益の','税引き後の'],note:'gross profit' },
  { en:'incentive',    answer:'奨励策・インセンティブ',wrongs:['罰則','規制'],  note:'sales incentive' },
  { en:'liable',       answer:'責任がある',     wrongs:['免責される','任意の'],  note:'liable for damages' },
  { en:'logistics',    answer:'物流',           wrongs:['経営管理','戦略'],      note:'logistics department' },
  { en:'margins',      answer:'利幅・マージン', wrongs:['売上高','費用'],        note:'profit margins' },
  { en:'negotiate',    answer:'交渉する',       wrongs:['指示する','合意する'],  note:'negotiate a lower price' },
  { en:'offset',       answer:'相殺する',       wrongs:['加算する','延長する'],  note:'offset the costs' },
  { en:'optimal',      answer:'最適な',         wrongs:['最低限の','平均的な'],  note:'optimal performance' },
  { en:'outsource',    answer:'外部委託する',   wrongs:['内製化する','削減する'],note:'outsource production' },
  { en:'overhead',     answer:'経費・管理費',   wrongs:['売上','純利益'],        note:'reduce overhead' },
  { en:'patent',       answer:'特許',           wrongs:['商標','著作権'],        note:'file a patent' },
  { en:'prototype',    answer:'試作品',         wrongs:['完成品','量産品'],      note:'build a prototype' },
  { en:'quota',        answer:'割り当て・ノルマ',wrongs:['予算','制限'],         note:'sales quota' },
  { en:'rationale',    answer:'根拠・理由',     wrongs:['結果','目標'],          note:'rationale behind the decision' },
  { en:'restructure',  answer:'再編成する',     wrongs:['拡大する','維持する'],  note:'restructure the department' },
  { en:'revenue stream',answer:'収益源',        wrongs:['費用項目','損失'],      note:'new revenue stream' },
  { en:'subsidiary',   answer:'子会社',         wrongs:['本社','取引先'],        note:'wholly-owned subsidiary' },
];

// ─────────────────────────────────────────────────────────────────
// Level 4 (TOEIC ~800, ビジネス応用・人事・財務)
// ─────────────────────────────────────────────────────────────────
const L4: ToeicItem[] = [
  { en:'implement',    answer:'実行する',       wrongs:['評価する','提案する'],  note:'implement a new policy' },
  { en:'consensus',    answer:'合意',           wrongs:['対立','決定'],          note:'reach a consensus' },
  { en:'stipulate',    answer:'規定する',       wrongs:['交渉する','廃止する'],  note:'stipulate the terms' },
  { en:'acquisition',  answer:'買収',           wrongs:['売却','合併'],          note:'merger and acquisition' },
  { en:'liability',    answer:'負債・責任',     wrongs:['資産','利益'],          note:'limit liability' },
  { en:'streamline',   answer:'効率化する',     wrongs:['複雑にする','廃止する'],note:'streamline the process' },
  { en:'leverage',     answer:'活用する',       wrongs:['無視する','削減する'],  note:'leverage resources' },
  { en:'fiscal',       answer:'財政上の',       wrongs:['法的な','物理的な'],    note:'fiscal year' },
  { en:'escalate',     answer:'段階的に拡大する',wrongs:['縮小する','安定する'], note:'escalate the issue' },
  { en:'mitigate',     answer:'軽減する',       wrongs:['悪化させる','放置する'],note:'mitigate risk' },
  { en:'contingency',  answer:'緊急対応策',     wrongs:['予算','戦略'],          note:'contingency plan' },
  { en:'procurement',  answer:'調達',           wrongs:['廃棄','製造'],          note:'procurement department' },
  { en:'compliance',   answer:'法令遵守',       wrongs:['競争','改革'],          note:'compliance officer' },
  { en:'turnaround',   answer:'業績回復',       wrongs:['倒産','継続'],          note:'achieve a turnaround' },
  { en:'mandate',      answer:'命令・権限',     wrongs:['提案','協議'],          note:'act within the mandate' },
  { en:'disparate',    answer:'異なる',         wrongs:['類似した','統一した'],  note:'disparate teams' },
  { en:'proprietor',   answer:'所有者',         wrongs:['従業員','取締役'],      note:'sole proprietor' },
  { en:'tangible',     answer:'有形の',         wrongs:['無形の','仮想の'],      note:'tangible assets' },
  { en:'onboard',      answer:'採用・教育する', wrongs:['解雇する','昇格させる'],note:'onboard new employees' },
  { en:'remuneration', answer:'報酬',           wrongs:['罰金','損失'],          note:'remuneration package' },
  { en:'prospectus',   answer:'目論見書',       wrongs:['契約書','報告書'],      note:'investment prospectus' },
  { en:'arbitrate',    answer:'仲裁する',       wrongs:['訴訟する','調停する'],  note:'arbitrate a dispute' },
  { en:'attrition',    answer:'自然減・消耗',   wrongs:['急成長','採用増'],      note:'staff attrition rate' },
  { en:'benchmark against',answer:'〜と比較評価する',wrongs:['〜を模倣する','〜を無視する'],note:'benchmark against competitors' },
  { en:'capital expenditure',answer:'設備投資', wrongs:['運転費用','人件費'],    note:'capital expenditure budget' },
  { en:'cascade',      answer:'段階的に伝達する',wrongs:['一括通知する','秘密にする'],note:'cascade the information down' },
  { en:'churn',        answer:'顧客離れ率',     wrongs:['新規獲得率','利益率'],  note:'customer churn rate' },
  { en:'clawback',     answer:'返還請求',       wrongs:['追加報酬','補助金'],    note:'bonus clawback clause' },
  { en:'collateral',   answer:'担保',           wrongs:['利息','配当'],          note:'collateral for the loan' },
  { en:'depreciate',   answer:'価値が下がる',   wrongs:['価値が上がる','安定する'],note:'assets depreciate over time' },
  { en:'divestiture',  answer:'資産売却',       wrongs:['資産取得','設備投資'],  note:'plan a divestiture' },
  { en:'due diligence',answer:'デューデリジェンス（事前調査）',wrongs:['事後評価','リスク回避'],note:'conduct due diligence' },
  { en:'equity',       answer:'株主資本',       wrongs:['負債','流動資産'],      note:'return on equity' },
  { en:'fiduciary',    answer:'受託者（の）',   wrongs:['株主','債権者'],        note:'fiduciary duty' },
  { en:'forecast',     answer:'予測する',       wrongs:['報告する','分析する'],  note:'forecast the results' },
  { en:'granular',     answer:'詳細な・細かい', wrongs:['大まかな','概算の'],    note:'granular data analysis' },
  { en:'headcount',    answer:'社員数',         wrongs:['売上高','予算'],        note:'reduce headcount' },
  { en:'incentivize',  answer:'動機付けする',   wrongs:['罰則を与える','無視する'],note:'incentivize performance' },
  { en:'joint venture',answer:'合弁事業',       wrongs:['完全子会社','業務提携'],note:'enter a joint venture' },
  { en:'key performance indicator',answer:'重要業績評価指標',wrongs:['市場調査','損益計算'],note:'set KPIs' },
  { en:'liquidate',    answer:'資産を換金する', wrongs:['資産を増やす','借入する'],note:'liquidate assets' },
  { en:'monetize',     answer:'収益化する',     wrongs:['費用化する','廃止する'],note:'monetize the platform' },
  { en:'net profit',   answer:'純利益',         wrongs:['売上総利益','営業利益'],note:'net profit margin' },
  { en:'non-disclosure',answer:'守秘義務',      wrongs:['情報公開','開示義務'],  note:'non-disclosure agreement' },
  { en:'organic growth',answer:'自力成長',      wrongs:['買収による成長','外部投資'],note:'organic growth strategy' },
  { en:'overhaul',     answer:'全面見直し',     wrongs:['小規模修正','現状維持'],note:'overhaul the system' },
  { en:'pipeline',     answer:'案件パイプライン',wrongs:['生産ライン','配送網'], note:'sales pipeline' },
  { en:'pivot',        answer:'方針転換する',   wrongs:['現状維持する','縮小する'],note:'pivot the business model' },
  { en:'proprietary',  answer:'専有の・独自の', wrongs:['公開の','共有の'],      note:'proprietary technology' },
  { en:'run rate',     answer:'年間換算の実績', wrongs:['成長率','粗利率'],      note:'current run rate' },
];

// ─────────────────────────────────────────────────────────────────
// Level 5 (TOEIC 900+, ネイティブ級・高度語彙)
// ─────────────────────────────────────────────────────────────────
const L5: ToeicItem[] = [
  { en:'lucrative',    answer:'儲かる',             wrongs:['損失の多い','慈善的な'],  note:'lucrative contract' },
  { en:'alleviate',    answer:'軽減する',           wrongs:['悪化させる','無視する'],  note:'alleviate the shortage' },
  { en:'exacerbate',   answer:'悪化させる',         wrongs:['改善する','維持する'],    note:'exacerbate the problem' },
  { en:'perpetuate',   answer:'永続させる',         wrongs:['廃止する','改革する'],    note:'perpetuate a cycle' },
  { en:'curtail',      answer:'削減する',           wrongs:['拡大する','承認する'],    note:'curtail spending' },
  { en:'bolster',      answer:'強化する',           wrongs:['弱める','廃棄する'],      note:'bolster the economy' },
  { en:'rhetoric',     answer:'修辞・言説',         wrongs:['財務','法律'],            note:'political rhetoric' },
  { en:'articulate',   answer:'明確に表現する',     wrongs:['抑制する','省略する'],    note:'articulate a vision' },
  { en:'corroborate',  answer:'裏付ける',           wrongs:['反論する','無視する'],    note:'corroborate the findings' },
  { en:'circumvent',   answer:'回避する',           wrongs:['遵守する','強化する'],    note:'circumvent regulations' },
  { en:'proliferate',  answer:'急増する',           wrongs:['減少する','安定する'],    note:'proliferate across sectors' },
  { en:'indispensable',answer:'不可欠な',           wrongs:['不要な','付加的な'],      note:'indispensable skill' },
  { en:'volatile',     answer:'不安定な',           wrongs:['安定した','堅調な'],      note:'volatile market' },
  { en:'meticulous',   answer:'細心の',             wrongs:['大雑把な','迅速な'],      note:'meticulous planning' },
  { en:'holistic',     answer:'総合的な',           wrongs:['部分的な','表面的な'],    note:'holistic approach' },
  { en:'paramount',    answer:'最重要な',           wrongs:['些細な','付随的な'],      note:'of paramount importance' },
  { en:'synergy',      answer:'相乗効果',           wrongs:['競合','対立'],            note:'synergy between teams' },
  { en:'unprecedented',answer:'前例のない',         wrongs:['一般的な','予想された'],  note:'unprecedented growth' },
  { en:'acumen',       answer:'洞察力・判断力',     wrongs:['知識','経験'],            note:'business acumen' },
  { en:'adjudicate',   answer:'裁定する',           wrongs:['交渉する','棄却する'],    note:'adjudicate a claim' },
  { en:'ameliorate',   answer:'改善する',           wrongs:['悪化させる','維持する'],  note:'ameliorate conditions' },
  { en:'ambiguous',    answer:'曖昧な',             wrongs:['明確な','具体的な'],      note:'ambiguous wording' },
  { en:'anachronistic',answer:'時代遅れの',         wrongs:['革新的な','一般的な'],    note:'anachronistic approach' },
  { en:'asymmetric',   answer:'非対称な',           wrongs:['均等な','対称的な'],      note:'asymmetric information' },
  { en:'atypical',     answer:'非典型的な',         wrongs:['典型的な','標準的な'],    note:'atypical result' },
  { en:'candid',       answer:'率直な',             wrongs:['曖昧な','間接的な'],      note:'candid feedback' },
  { en:'catalyst',     answer:'触媒・起爆剤',       wrongs:['障害','維持要因'],        note:'catalyst for change' },
  { en:'caveat',       answer:'警告・但し書き',     wrongs:['承認','保証'],            note:'with one caveat' },
  { en:'commensurate', answer:'釣り合った',         wrongs:['不均衡な','一方的な'],    note:'commensurate with experience' },
  { en:'conjecture',   answer:'推測・憶測',         wrongs:['証拠','確認'],            note:'mere conjecture' },
  { en:'contentious',  answer:'論争を引き起こす',   wrongs:['一致した','歓迎された'],  note:'contentious issue' },
  { en:'dearth',       answer:'不足',               wrongs:['過剰','余剰'],            note:'dearth of skilled workers' },
  { en:'delineate',    answer:'明確に示す',         wrongs:['曖昧にする','削除する'],  note:'delineate the scope' },
  { en:'dichotomy',    answer:'二項対立',           wrongs:['協調関係','統一体'],      note:'false dichotomy' },
  { en:'endemic',      answer:'特定地域に固有の',   wrongs:['世界的な','一時的な'],    note:'endemic to the region' },
  { en:'equivocate',   answer:'曖昧に話す',         wrongs:['明確に述べる','沈黙する'],note:'stop equivocating' },
  { en:'extrapolate',  answer:'推定・外挿する',     wrongs:['精密測定する','縮小する'],note:'extrapolate the trend' },
  { en:'foresight',    answer:'先見の明',           wrongs:['後知恵','近視眼的判断'],  note:'strategic foresight' },
  { en:'granular',     answer:'詳細な・細かい',     wrongs:['大まかな','抽象的な'],    note:'granular level analysis' },
  { en:'heuristic',    answer:'経験則による',       wrongs:['理論的な','数式的な'],    note:'heuristic approach' },
  { en:'impede',       answer:'妨げる',             wrongs:['促進する','加速させる'],  note:'impede progress' },
  { en:'incumbent',    answer:'現職の',             wrongs:['前任の','新任の'],        note:'incumbent CEO' },
  { en:'infer',        answer:'推測する',           wrongs:['証明する','反証する'],    note:'infer from the data' },
  { en:'inherent',     answer:'本質的な',           wrongs:['付加的な','一時的な'],    note:'inherent risk' },
  { en:'instigate',    answer:'扇動・引き起こす',   wrongs:['抑制する','解決する'],    note:'instigate change' },
  { en:'intangible',   answer:'無形の',             wrongs:['有形の','物理的な'],      note:'intangible assets' },
  { en:'iterative',    answer:'反復的な',           wrongs:['一度限りの','線形的な'],  note:'iterative process' },
  { en:'juxtapose',    answer:'並置して比較する',   wrongs:['統合する','対立させる'],  note:'juxtapose two ideas' },
  { en:'litigious',    answer:'訴訟好きな',         wrongs:['協調的な','従順な'],      note:'litigious environment' },
  { en:'nascent',      answer:'萌芽期の・新興の',   wrongs:['成熟した','衰退期の'],    note:'nascent industry' },
];

const DATASETS: Record<number, ToeicItem[]> = {
  1: L1, 2: L2, 3: L3, 4: L4, 5: L5,
};

// ─────────────────────────────────────────────────────────────────
// localStorage
// ─────────────────────────────────────────────────────────────────
const LS_KEY       = 'toeic-road-v2';
const LS_PLAYERS   = 'toeic-players-v1';
const TEST_TOTAL   = 20;
const TEST_PASS    = 18;

function loadProgress(): ToeicProgress {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { levelCorrect: { 1:0,2:0,3:0,4:0,5:0 }, unlockedUp: 1 };
}
function saveProgress(p: ToeicProgress) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}
function loadPlayers(): [PlayerScore, PlayerScore] {
  try {
    const raw = localStorage.getItem(LS_PLAYERS);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [
    { name:'Player 1', current:0, target:900 },
    { name:'Player 2', current:0, target:900 },
  ];
}
function savePlayers(ps: [PlayerScore, PlayerScore]) {
  try { localStorage.setItem(LS_PLAYERS, JSON.stringify(ps)); } catch { /* ignore */ }
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
      utt.onend = done; utt.onerror = done;
    }
    setTimeout(() => {
      try { window.speechSynthesis.speak(utt); } catch { onEnd?.(); }
    }, 80);
  } catch { onEnd?.(); }
}

interface QuizState { item: ToeicItem; choices: string[] }

function buildQuiz(lv: number, usedEns: Set<string>): QuizState {
  const all  = DATASETS[lv];
  // prefer unused, fall back to full pool
  const pool = all.filter(i => !usedEns.has(i.en));
  const src  = pool.length > 0 ? pool : all;
  const item = src[Math.floor(Math.random() * src.length)];

  // Dynamic distractors: unique answers from other items, guaranteed ≠ correct answer
  const others = [...new Set(
    all.filter(i => i.en !== item.en && i.answer !== item.answer).map(i => i.answer)
  )];
  const distractors = shuffle(others).slice(0, 2);
  // Fallback to wrongs if pool is tiny
  if (distractors.length < 2) {
    for (const w of item.wrongs) {
      if (distractors.length >= 2) break;
      if (w !== item.answer && !distractors.includes(w)) distractors.push(w);
    }
  }

  return { item, choices: shuffle([item.answer, ...distractors]) };
}

// Build a fixed 20-question test queue (no repeats)
function buildTestQueue(lv: number): QuizState[] {
  const all     = shuffle([...DATASETS[lv]]);
  const items   = all.slice(0, TEST_TOTAL);
  return items.map(item => {
    const others = [...new Set(
      all.filter(i => i.en !== item.en && i.answer !== item.answer).map(i => i.answer)
    )];
    const distractors = shuffle(others).slice(0, 2);
    if (distractors.length < 2) {
      for (const w of item.wrongs) {
        if (distractors.length >= 2) break;
        if (w !== item.answer && !distractors.includes(w)) distractors.push(w);
      }
    }
    return { item, choices: shuffle([item.answer, ...distractors]) };
  });
}

// ─────────────────────────────────────────────────────────────────
// Player Score Card
// ─────────────────────────────────────────────────────────────────
function PlayerCard({ player, idx, onChange }: {
  player: PlayerScore; idx: number;
  onChange: (field: keyof PlayerScore, val: string | number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const pct = player.target > 0 ? Math.min(100, Math.round((player.current / player.target) * 100)) : 0;
  const colors = idx === 0
    ? { bar: 'bg-gradient-to-r from-blue-400 to-cyan-500', ring: 'ring-blue-200', text: 'text-blue-700' }
    : { bar: 'bg-gradient-to-r from-rose-400 to-pink-500', ring: 'ring-rose-200', text: 'text-rose-700' };

  return (
    <div className={`flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3 ring-2 ${colors.ring}`}>
      {editing ? (
        <div className="flex flex-col gap-1.5">
          <input value={player.name} onChange={e => onChange('name', e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1 text-xs font-bold w-full" placeholder="Name" />
          <div className="flex gap-1">
            <input type="number" value={player.current} onChange={e => onChange('current', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-full" placeholder="Score" />
            <input type="number" value={player.target} onChange={e => onChange('target', Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-xs w-full" placeholder="Target" />
          </div>
          <button onClick={() => setEditing(false)}
            className="text-[10px] font-black text-white bg-gray-700 rounded-lg py-1">保存</button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-1">
            <p className={`text-xs font-black ${colors.text}`}>{player.name}</p>
            <button onClick={() => setEditing(true)} className="text-[10px] text-gray-400 hover:text-gray-600">✏️</button>
          </div>
          <div className="flex items-end gap-1">
            <p className="text-2xl font-black text-gray-900 leading-none">{player.current}</p>
            <p className="text-[10px] text-gray-400 mb-0.5">/ {player.target} 目標</p>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${colors.bar} transition-all duration-500`} style={{ width:`${pct}%` }} />
          </div>
          <p className="text-[9px] text-gray-400 mt-0.5 text-right">{pct}%</p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Practice Mode
// ─────────────────────────────────────────────────────────────────
function PracticeMode({ lv }: { lv: number }) {
  const [quiz,       setQuiz]       = useState<QuizState | null>(null);
  const [result,     setResult]     = useState<'correct'|'wrong'|null>(null);
  const [locked,     setLocked]     = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [showNote,   setShowNote]   = useState(false);
  const [sessionOk,  setSessionOk]  = useState(0);
  const [sessionTot, setSessionTot] = useState(0);
  const usedRef = useRef<Set<string>>(new Set());

  const next = useCallback((prevEn?: string) => {
    if (prevEn) usedRef.current.add(prevEn);
    // reset used set when all exhausted
    if (usedRef.current.size >= DATASETS[lv].length) usedRef.current.clear();
    const q = buildQuiz(lv, usedRef.current);
    setQuiz(q); setResult(null); setLocked(false); setShowNote(false);
  }, [lv]);

  useEffect(() => { usedRef.current.clear(); next(); }, [lv]); // eslint-disable-line

  const playWord = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speak(quiz.item.en, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => { if (quiz) playWord(); }, [quiz?.item.en]); // eslint-disable-line

  const handleTap = (choice: string) => {
    if (locked || !quiz) return;
    const ok = choice === quiz.item.answer;
    setSessionTot(t => t + 1);
    if (ok) {
      setSessionOk(c => c + 1);
      setResult('correct'); setLocked(true);
      setTimeout(() => next(quiz.item.en), 1200);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 800);
    }
  };

  if (!quiz) return <div className="text-center py-8 text-gray-400 text-sm">Loading…</div>;
  const accuracy = sessionTot > 0 ? Math.round((sessionOk / sessionTot) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Word card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-800 flex items-center gap-2">
          <span className="text-white text-xs font-black uppercase tracking-wider">Practice — Listen &amp; Choose</span>
        </div>
        <div className="px-5 py-5 flex flex-col items-center gap-3">
          <p className="text-3xl font-black text-gray-900 tracking-wide text-center">{quiz.item.en}</p>
          <div className="flex gap-2 flex-wrap justify-center">
            <button onClick={playWord}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                speaking ? 'bg-indigo-400 text-white animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}>
              <span>🔊</span><span>{speaking ? 'Playing…' : 'Listen Again'}</span>
            </button>
            <button onClick={() => setShowNote(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-black text-sm border transition-all active:scale-95 ${
                showNote ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'
              }`}>
              <span>{showNote ? '🙈' : '👁️'}</span>
              <span className="text-xs">{showNote ? 'Hide' : 'Note'}</span>
            </button>
          </div>
          {showNote && quiz.item.note && (
            <div className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-xs font-bold text-amber-700 text-center">💡 <span className="italic">{quiz.item.note}</span></p>
            </div>
          )}
          {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
          {result === 'wrong'   && <p className="text-red-500 font-black">✗ Try again!</p>}
        </div>
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => {
          const isCorrectShowing = result === 'correct' && choice === quiz.item.answer;
          return (
            <button key={`${quiz.item.en}-${idx}`} onClick={() => handleTap(choice)}
              disabled={locked}
              className={`w-full px-4 py-4 rounded-2xl text-left font-semibold text-sm border transition-all active:scale-[0.98] shadow-sm ${
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

      <button onClick={() => next(quiz.item.en)}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm">
        Skip →
      </button>

      {/* Session stats */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Session</span>
          <span className="text-base font-black text-indigo-600">{accuracy}%</span>
        </div>
        <span className="text-xs text-gray-400">{sessionOk}/{sessionTot}</span>
        <button onClick={() => { setSessionOk(0); setSessionTot(0); }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1">
          Reset
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Level Up Test Mode
// ─────────────────────────────────────────────────────────────────
type TestPhase = 'ready' | 'running' | 'result';

function LevelUpTest({ lv, onPass }: { lv: number; onPass: () => void }) {
  const [phase,     setPhase]     = useState<TestPhase>('ready');
  const [queue,     setQueue]     = useState<QuizState[]>([]);
  const [qi,        setQi]        = useState(0);
  const [correct,   setCorrect]   = useState(0);
  const [result,    setResult]    = useState<'correct'|'wrong'|null>(null);
  const [locked,    setLocked]    = useState(false);
  const [speaking,  setSpeaking]  = useState(false);

  const startTest = () => {
    const q = buildTestQueue(lv);
    setQueue(q); setQi(0); setCorrect(0); setResult(null); setLocked(false);
    setPhase('running');
  };

  const quiz = queue[qi] ?? null;

  const playWord = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speak(quiz.item.en, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => {
    if (phase === 'running' && quiz) playWord();
  }, [qi, phase]); // eslint-disable-line

  const handleTap = (choice: string) => {
    if (locked || !quiz) return;
    const ok = choice === quiz.item.answer;
    if (ok) { setCorrect(c => c + 1); setResult('correct'); }
    else    { setResult('wrong'); }
    setLocked(true);
    setTimeout(() => {
      const nextQi = qi + 1;
      if (nextQi >= TEST_TOTAL) {
        setPhase('result');
      } else {
        setQi(nextQi); setResult(null); setLocked(false);
      }
    }, 900);
  };

  const passed = correct >= TEST_PASS;

  if (phase === 'ready') return (
    <div className="flex flex-col items-center gap-4 py-6 px-4">
      <div className="text-5xl">📋</div>
      <p className="text-xl font-black text-gray-900">昇級試験</p>
      <div className="bg-gray-50 rounded-2xl border border-gray-200 px-5 py-4 w-full text-sm text-gray-700 space-y-1">
        <p>• 全 <strong>{TEST_TOTAL} 問</strong> が連続出題されます</p>
        <p>• <strong>{TEST_PASS} 問以上（90%以上）</strong> 正解で合格</p>
        <p>• 合格すると次のレベルが解放されます</p>
        <p>• 不合格でも何度でも挑戦できます</p>
      </div>
      <button onClick={startTest}
        className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg shadow-md active:scale-95 transition-all">
        試験を開始する 🚀
      </button>
    </div>
  );

  if (phase === 'result') return (
    <div className="flex flex-col items-center gap-4 py-6 px-4">
      <div className="text-5xl">{passed ? '🎉' : '😤'}</div>
      <p className="text-2xl font-black text-gray-900">{passed ? '合格！' : '不合格…'}</p>
      <div className={`w-full rounded-2xl px-6 py-5 text-center ${passed ? 'bg-emerald-50 border border-emerald-300' : 'bg-red-50 border border-red-300'}`}>
        <p className="text-4xl font-black">{correct} <span className="text-xl text-gray-500">/ {TEST_TOTAL}</span></p>
        <p className={`text-sm font-bold mt-1 ${passed ? 'text-emerald-700' : 'text-red-600'}`}>
          {passed ? '次のレベルが解放されました！' : `あと ${TEST_PASS - correct} 問正解で合格です`}
        </p>
      </div>
      {passed && (
        <button onClick={onPass}
          className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base shadow-md active:scale-95 transition-all">
          次のレベルへ →
        </button>
      )}
      <button onClick={() => { setPhase('ready'); }}
        className="w-full py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-sm">
        {passed ? 'もう一度練習する' : '再挑戦する'}
      </button>
    </div>
  );

  if (!quiz) return null;
  const lvInfo = TOEIC_LEVELS[lv - 1];

  return (
    <div className="flex flex-col gap-3">
      {/* Test header */}
      <div className={`rounded-2xl bg-gradient-to-r ${lvInfo.color} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-black">昇級試験 — Level {lv}</p>
          <p className="text-lg font-black">{qi + 1} <span className="text-sm opacity-70">/ {TEST_TOTAL}</span></p>
        </div>
        <div className="mt-2 h-1.5 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width:`${((qi)/TEST_TOTAL)*100}%` }} />
        </div>
        <div className="flex justify-between text-[10px] mt-1 opacity-70">
          <span>正解: {correct}</span>
          <span>合格ライン: {TEST_PASS}/{TEST_TOTAL}</span>
        </div>
      </div>

      {/* Quiz */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-5 flex flex-col items-center gap-3">
        <p className="text-3xl font-black text-gray-900 tracking-wide text-center">{quiz.item.en}</p>
        <button onClick={() => { setSpeaking(true); speak(quiz.item.en, () => setSpeaking(false)); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-black text-sm transition-all active:scale-95 ${
            speaking ? 'bg-indigo-400 text-white animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}>
          <span>🔊</span><span>{speaking ? 'Playing…' : 'Listen Again'}</span>
        </button>
        {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
        {result === 'wrong'   && <p className="text-red-500 font-black">✗ Wrong — {quiz.item.answer}</p>}
      </div>

      {/* Choices */}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => {
          const isCorrectShowing = result === 'correct' && choice === quiz.item.answer;
          const isWrongShowing   = result === 'wrong' && choice === quiz.item.answer;
          return (
            <button key={`test-${qi}-${idx}`} onClick={() => handleTap(choice)}
              disabled={locked}
              className={`w-full px-4 py-4 rounded-2xl text-left font-semibold text-sm border transition-all active:scale-[0.98] shadow-sm ${
                isCorrectShowing || isWrongShowing
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : result === 'wrong' && locked ? 'bg-gray-50 border-gray-200 text-gray-400'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-indigo-50 hover:border-indigo-300'
              }`}>
              <span className="text-gray-400 font-black mr-2">{['A','B','C'][idx]}.</span>
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────
type SubMode = 'select' | 'practice' | 'test';

export function ToeicRoad() {
  const [progress,  setProgress]  = useState<ToeicProgress | null>(null);
  const [players,   setPlayers]   = useState<[PlayerScore, PlayerScore] | null>(null);
  const [currentLv, setCurrentLv] = useState(1);
  const [subMode,   setSubMode]   = useState<SubMode>('select');

  // Hydrate
  useEffect(() => {
    setProgress(loadProgress());
    setPlayers(loadPlayers());
  }, []);

  const handlePass = useCallback(() => {
    if (!progress) return;
    const nextLv  = Math.min(currentLv + 1, 5);
    const newProg: ToeicProgress = {
      levelCorrect: progress.levelCorrect,
      unlockedUp:   Math.max(progress.unlockedUp, nextLv),
    };
    setProgress(newProg);
    saveProgress(newProg);
    setCurrentLv(nextLv);
    setSubMode('select');
  }, [progress, currentLv]);

  const updatePlayer = (idx: 0|1, field: keyof PlayerScore, val: string | number) => {
    if (!players) return;
    const updated: [PlayerScore, PlayerScore] = [{ ...players[0] }, { ...players[1] }];
    (updated[idx] as unknown as Record<string, string | number>)[field] = val;
    setPlayers(updated);
    savePlayers(updated);
  };

  if (!progress || !players) {
    return <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>;
  }

  const unlocked = progress.unlockedUp;
  const lvInfo   = TOEIC_LEVELS[currentLv - 1];

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">

      {/* ── Player Score Tracker ── */}
      <div className="bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3">
        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">📊 Score Tracker</p>
        <div className="flex gap-3">
          <PlayerCard player={players[0]} idx={0} onChange={(f, v) => updatePlayer(0, f, v)} />
          <PlayerCard player={players[1]} idx={1} onChange={(f, v) => updatePlayer(1, f, v)} />
        </div>
      </div>

      {/* ── Level selector ── */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
        {TOEIC_LEVELS.map(tlv => {
          const isUnlocked = tlv.level <= unlocked;
          return (
            <button key={tlv.level}
              onClick={() => {
                if (!isUnlocked) return;
                window.speechSynthesis?.cancel();
                setCurrentLv(tlv.level);
                setSubMode('select');
              }}
              disabled={!isUnlocked}
              className={`flex-1 min-w-0 py-2 px-1 rounded-xl text-[10px] font-black transition-all ${
                currentLv === tlv.level ? 'bg-white text-gray-900 shadow-md'
                : isUnlocked ? 'text-gray-500 hover:text-gray-700'
                : 'text-gray-300 cursor-not-allowed'
              }`}>
              <span className="block text-sm leading-none">{isUnlocked ? tlv.emoji : '🔒'}</span>
              <span className="block mt-0.5">Lv{tlv.level}</span>
              <span className="block text-[8px] text-gray-400">{tlv.score}</span>
            </button>
          );
        })}
      </div>

      {/* ── Level banner ── */}
      <div className={`rounded-2xl bg-gradient-to-r ${lvInfo.color} px-5 py-3 text-white shadow-md`}>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">TOEIC Road</p>
        <p className="text-xl font-black mt-0.5">{lvInfo.emoji} Level {lvInfo.level}: {lvInfo.title}</p>
        <p className="text-[11px] opacity-80 mt-0.5">目標スコア {lvInfo.score} • {DATASETS[currentLv].length} 問収録</p>
      </div>

      {/* ── Mode select ── */}
      {subMode === 'select' && (
        <div className="flex flex-col gap-3">
          <button onClick={() => setSubMode('practice')}
            className="w-full py-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-md active:scale-95 transition-all flex flex-col items-center gap-1">
            <span>📖 Practice</span>
            <span className="text-xs font-semibold opacity-80">繰り返し練習モード（無制限）</span>
          </button>
          {currentLv < 5 ? (
            <button onClick={() => setSubMode('test')}
              className="w-full py-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-lg shadow-md active:scale-95 transition-all flex flex-col items-center gap-1">
              <span>📋 Level Up Test</span>
              <span className="text-xs font-semibold opacity-80">昇級試験 — {TEST_TOTAL}問・{TEST_PASS}問以上で合格</span>
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black text-center shadow-md">
              🏆 最高レベル到達！ — Congratulations!
            </div>
          )}

          {/* Overall progress */}
          <div className="bg-gray-50 rounded-2xl border border-gray-200 px-4 py-3">
            <p className="text-[11px] font-black text-gray-500 mb-2">Overall Unlock Progress</p>
            <div className="flex gap-2">
              {TOEIC_LEVELS.map(tlv => (
                <div key={tlv.level} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-lg">{tlv.level <= unlocked ? tlv.emoji : '🔒'}</span>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${tlv.color} transition-all`}
                      style={{ width: tlv.level <= unlocked ? '100%' : '0%' }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{tlv.level <= unlocked ? '解放済' : '🔒'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Practice ── */}
      {subMode === 'practice' && (
        <>
          <button onClick={() => { window.speechSynthesis?.cancel(); setSubMode('select'); }}
            className="text-left text-xs text-gray-500 hover:text-gray-800 font-bold px-1">← モード選択に戻る</button>
          <PracticeMode lv={currentLv} />
        </>
      )}

      {/* ── Level Up Test ── */}
      {subMode === 'test' && (
        <>
          <button onClick={() => { window.speechSynthesis?.cancel(); setSubMode('select'); }}
            className="text-left text-xs text-gray-500 hover:text-gray-800 font-bold px-1">← モード選択に戻る</button>
          <LevelUpTest lv={currentLv} onPass={handlePass} />
        </>
      )}

    </div>
  );
}
