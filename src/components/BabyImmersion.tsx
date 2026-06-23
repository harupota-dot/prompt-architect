'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────
const CORRECT_DELAY = 380;
const LEVEL_THRESHOLDS = [0,5,10,15,20,26,33,41,50,60,71,83,96,110,125,141,158,176,195,215];
const LS_WORDS = 'words-combo-v5';
const LS_QA    = 'qa-combo-v5';

function getLevel(n: number): number {
  let lv = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (n >= LEVEL_THRESHOLDS[i]) lv = i + 1; else break;
  }
  return lv;
}
function nextThreshold(n: number): number | null {
  const lv = getLevel(n);
  return lv < 20 ? LEVEL_THRESHOLDS[lv] : null;
}

// ─────────────────────────────────────────────────────────────────
// 単語データ — Level 1〜20 各レベル独立ハードコード（各20語）
// ─────────────────────────────────────────────────────────────────
interface Word { en: string; emoji: string; ja: string; }

// Lv1: 超基礎（中学1年）
const W1: Word[] = [
  {en:'apple',    emoji:'🍎',ja:'りんご'},      {en:'dog',      emoji:'🐶',ja:'いぬ'},
  {en:'cat',      emoji:'🐱',ja:'ねこ'},        {en:'run',      emoji:'🏃',ja:'はしる'},
  {en:'eat',      emoji:'🍽️',ja:'たべる'},     {en:'drink',    emoji:'🥤',ja:'のむ'},
  {en:'big',      emoji:'🐘',ja:'おおきい'},    {en:'small',    emoji:'🐭',ja:'ちいさい'},
  {en:'red',      emoji:'🔴',ja:'あか'},        {en:'blue',     emoji:'🔵',ja:'あお'},
  {en:'sun',      emoji:'☀️',ja:'たいよう'},    {en:'water',    emoji:'💧',ja:'みず'},
  {en:'book',     emoji:'📚',ja:'ほん'},        {en:'happy',    emoji:'😄',ja:'うれしい'},
  {en:'sad',      emoji:'😢',ja:'かなしい'},    {en:'go',       emoji:'➡️',ja:'いく'},
  {en:'see',      emoji:'👁️',ja:'みる'},        {en:'yes',      emoji:'✅',ja:'はい'},
  {en:'no',       emoji:'❌',ja:'いいえ'},      {en:'name',     emoji:'🏷️',ja:'なまえ'},
];
// Lv2: 超基礎（中学1年続き）
const W2: Word[] = [
  {en:'banana',   emoji:'🍌',ja:'バナナ'},      {en:'bird',     emoji:'🐦',ja:'とり'},
  {en:'fish',     emoji:'🐟',ja:'さかな'},      {en:'moon',     emoji:'🌙',ja:'つき'},
  {en:'star',     emoji:'⭐',ja:'ほし'},        {en:'rain',     emoji:'🌧️',ja:'あめ'},
  {en:'walk',     emoji:'🚶',ja:'あるく'},      {en:'sleep',    emoji:'😴',ja:'ねる'},
  {en:'play',     emoji:'🎮',ja:'あそぶ'},      {en:'read',     emoji:'📖',ja:'よむ'},
  {en:'hot',      emoji:'🔥',ja:'あつい'},      {en:'cold',     emoji:'🥶',ja:'さむい'},
  {en:'good',     emoji:'👍',ja:'よい'},        {en:'bad',      emoji:'👎',ja:'わるい'},
  {en:'open',     emoji:'🔓',ja:'あける'},      {en:'close',    emoji:'🔒',ja:'しめる'},
  {en:'friend',   emoji:'🤝',ja:'ともだち'},    {en:'white',    emoji:'⬜',ja:'しろ'},
  {en:'black',    emoji:'⬛',ja:'くろ'},        {en:'fast',     emoji:'⚡',ja:'はやい'},
];
// Lv3: 基礎（中学2年）
const W3: Word[] = [
  {en:'bread',    emoji:'🍞',ja:'パン'},        {en:'rice',     emoji:'🍚',ja:'ごはん'},
  {en:'milk',     emoji:'🥛',ja:'ぎゅうにゅう'},{en:'tree',     emoji:'🌳',ja:'き'},
  {en:'flower',   emoji:'🌸',ja:'はな'},        {en:'car',      emoji:'🚗',ja:'くるま'},
  {en:'bus',      emoji:'🚌',ja:'バス'},        {en:'house',    emoji:'🏠',ja:'いえ'},
  {en:'school',   emoji:'🏫',ja:'がっこう'},    {en:'door',     emoji:'🚪',ja:'ドア'},
  {en:'mother',   emoji:'👩',ja:'おかあさん'},  {en:'father',   emoji:'👨',ja:'おとうさん'},
  {en:'money',    emoji:'💴',ja:'おかね'},      {en:'time',     emoji:'⏰',ja:'じかん'},
  {en:'music',    emoji:'🎵',ja:'おんがく'},    {en:'color',    emoji:'🎨',ja:'いろ'},
  {en:'write',    emoji:'✏️',ja:'かく'},        {en:'slow',     emoji:'🐢',ja:'おそい'},
  {en:'new',      emoji:'🆕',ja:'あたらしい'},  {en:'old',      emoji:'🏚️',ja:'ふるい'},
];
// Lv4: 基礎（中学2〜3年）
const W4: Word[] = [
  {en:'orange',   emoji:'🍊',ja:'オレンジ'},    {en:'coffee',   emoji:'☕',ja:'コーヒー'},
  {en:'train',    emoji:'🚂',ja:'でんしゃ'},    {en:'city',     emoji:'🏙️',ja:'まち'},
  {en:'river',    emoji:'🌊',ja:'かわ'},        {en:'mountain', emoji:'⛰️',ja:'やま'},
  {en:'morning',  emoji:'🌅',ja:'あさ'},        {en:'evening',  emoji:'🌆',ja:'ゆうがた'},
  {en:'warm',     emoji:'🌡️',ja:'あたたかい'}, {en:'clean',    emoji:'✨',ja:'きれいな'},
  {en:'strong',   emoji:'💪',ja:'つよい'},      {en:'weak',     emoji:'😔',ja:'よわい'},
  {en:'near',     emoji:'📍',ja:'ちかい'},      {en:'far',      emoji:'🔭',ja:'とおい'},
  {en:'green',    emoji:'🟢',ja:'みどり'},      {en:'yellow',   emoji:'🟡',ja:'きいろ'},
  {en:'phone',    emoji:'📱',ja:'でんわ'},      {en:'family',   emoji:'👨‍👩‍👧',ja:'かぞく'},
  {en:'child',    emoji:'👧',ja:'こども'},      {en:'please',   emoji:'🤲',ja:'おねがいします'},
];
// Lv5: 中学卒業・高校入口
const W5: Word[] = [
  {en:'travel',   emoji:'🧳',ja:'たびをする'},  {en:'dream',    emoji:'💭',ja:'ゆめ'},
  {en:'problem',  emoji:'⚠️',ja:'もんだい'},    {en:'success',  emoji:'🏆',ja:'せいこう'},
  {en:'enjoy',    emoji:'😊',ja:'たのしむ'},    {en:'believe',  emoji:'🙏',ja:'しんじる'},
  {en:'remember', emoji:'🧠',ja:'おぼえる'},    {en:'forget',   emoji:'🤔',ja:'わすれる'},
  {en:'beautiful',emoji:'✨',ja:'うつくしい'},  {en:'exciting', emoji:'🎉',ja:'わくわくする'},
  {en:'difficult',emoji:'🤯',ja:'むずかしい'},  {en:'easy',     emoji:'😊',ja:'かんたんな'},
  {en:'busy',     emoji:'💼',ja:'いそがしい'},  {en:'popular',  emoji:'⭐',ja:'にんきのある'},
  {en:'special',  emoji:'🌟',ja:'とくべつな'},  {en:'answer',   emoji:'💡',ja:'こたえ'},
  {en:'question', emoji:'❓',ja:'しつもん'},    {en:'safe',     emoji:'🛡️',ja:'あんぜんな'},
  {en:'change',   emoji:'🔄',ja:'かえる・へんか'},{en:'plan',    emoji:'📋',ja:'けいかく'},
];
// Lv6: 高校基礎（Target 1900前半1）
const W6: Word[] = [
  {en:'achieve',  emoji:'🏆',ja:'たっせいする'},{en:'consider', emoji:'💭',ja:'かんがえる'},
  {en:'describe', emoji:'📝',ja:'せつめいする'},{en:'discuss',  emoji:'💬',ja:'ぎろんする'},
  {en:'expect',   emoji:'🤞',ja:'きたいする'},  {en:'explain',  emoji:'🗣️',ja:'せつめいする'},
  {en:'improve',  emoji:'📈',ja:'かいぜんする'},{en:'include',  emoji:'➕',ja:'ふくむ'},
  {en:'increase', emoji:'🔼',ja:'ふやす'},      {en:'prepare',  emoji:'📋',ja:'じゅんびする'},
  {en:'provide',  emoji:'🤝',ja:'ていきょうする'},{en:'require', emoji:'📌',ja:'ひつようとする'},
  {en:'suggest',  emoji:'💡',ja:'ていあんする'},{en:'create',   emoji:'🎨',ja:'つくりだす'},
  {en:'develop',  emoji:'📈',ja:'はったつさせる'},{en:'manage',  emoji:'📊',ja:'かんりする'},
  {en:'support',  emoji:'🤝',ja:'しえんする'},  {en:'choose',   emoji:'✅',ja:'えらぶ'},
  {en:'allow',    emoji:'✔️',ja:'きょかする'},  {en:'reduce',   emoji:'🔽',ja:'へらす'},
];
// Lv7: 高校基礎（Target 1900前半2）
const W7: Word[] = [
  {en:'benefit',  emoji:'✅',ja:'りえき'},      {en:'challenge',emoji:'💪',ja:'ちょうせん'},
  {en:'effort',   emoji:'🏋️',ja:'どりょく'},    {en:'factor',   emoji:'📊',ja:'ようそ'},
  {en:'focus',    emoji:'🎯',ja:'しゅうちゅうする'},{en:'maintain',emoji:'🔧',ja:'いじする'},
  {en:'obtain',   emoji:'📥',ja:'える'},        {en:'avoid',    emoji:'🚫',ja:'さける'},
  {en:'admit',    emoji:'🚪',ja:'みとめる'},    {en:'apply',    emoji:'📄',ja:'もうしこむ'},
  {en:'attract',  emoji:'🧲',ja:'ひきつける'},  {en:'cause',    emoji:'⚡',ja:'ひきおこす'},
  {en:'combine',  emoji:'🔗',ja:'くみあわせる'},{en:'connect',  emoji:'🔌',ja:'つなぐ'},
  {en:'continue', emoji:'▶️',ja:'つづける'},    {en:'control',  emoji:'🎛️',ja:'コントロールする'},
  {en:'limit',    emoji:'🚧',ja:'せいげんする'},{en:'attempt',  emoji:'🎯',ja:'こころみる'},
  {en:'relate',   emoji:'↔️',ja:'かんけいする'},{en:'involve',  emoji:'🔗',ja:'かかわる'},
];
// Lv8: 高校中盤
const W8: Word[] = [
  {en:'analyze',  emoji:'🔬',ja:'ぶんせきする'},{en:'approach', emoji:'🚶',ja:'アプローチ'},
  {en:'confirm',  emoji:'✅',ja:'かくにんする'},{en:'identify', emoji:'🔍',ja:'みわける'},
  {en:'indicate', emoji:'👉',ja:'しめす'},      {en:'influence',emoji:'💫',ja:'えいきょうする'},
  {en:'measure',  emoji:'📏',ja:'はかる'},      {en:'produce',  emoji:'🏭',ja:'せいさんする'},
  {en:'promote',  emoji:'📢',ja:'しょうしんさせる'},{en:'protect', emoji:'🛡️',ja:'まもる'},
  {en:'recognize',emoji:'💡',ja:'にんしきする'},{en:'replace',  emoji:'🔄',ja:'とりかえる'},
  {en:'respond',  emoji:'💬',ja:'はんのうする'},{en:'review',   emoji:'📋',ja:'みなおす'},
  {en:'seek',     emoji:'🔍',ja:'もとめる'},    {en:'select',   emoji:'☑️',ja:'えらびだす'},
  {en:'solve',    emoji:'🔧',ja:'かいけつする'},{en:'spread',   emoji:'📡',ja:'ひろがる'},
  {en:'remove',   emoji:'🗑️',ja:'とりのぞく'}, {en:'transfer', emoji:'🔀',ja:'うつす'},
];
// Lv9: 高校上級・大学受験入口
const W9: Word[] = [
  {en:'acquire',  emoji:'📥',ja:'しゅうとくする'},{en:'adapt',   emoji:'🔄',ja:'てきおうする'},
  {en:'assess',   emoji:'📊',ja:'ひょうかする'},{en:'assume',   emoji:'💭',ja:'かていする'},
  {en:'conclude', emoji:'✅',ja:'けつろんづける'},{en:'conduct', emoji:'🎯',ja:'おこなう'},
  {en:'define',   emoji:'📖',ja:'ていぎする'},  {en:'determine',emoji:'🔍',ja:'けっていする'},
  {en:'estimate', emoji:'📐',ja:'みつもる'},    {en:'evaluate', emoji:'⚖️',ja:'ひょうかする'},
  {en:'examine',  emoji:'🔬',ja:'しらべる'},    {en:'execute',  emoji:'▶️',ja:'じっこうする'},
  {en:'expand',   emoji:'📈',ja:'かくだいする'},{en:'generate', emoji:'⚡',ja:'うみだす'},
  {en:'illustrate',emoji:'🖼️',ja:'せつめいする'},{en:'implement',emoji:'🔧',ja:'じっしする'},
  {en:'interpret',emoji:'🌐',ja:'かいしゃくする'},{en:'justify', emoji:'⚖️',ja:'せいとうかする'},
  {en:'monitor',  emoji:'📺',ja:'かんしする'},  {en:'highlight',emoji:'✨',ja:'めだたせる'},
];
// Lv10: 大学受験・TOEIC 500
const W10: Word[] = [
  {en:'acquisition',emoji:'📥',ja:'しゅうとく'},{en:'argument', emoji:'💬',ja:'ぎろん・いけん'},
  {en:'assessment',emoji:'📊',ja:'ひょうか'},   {en:'concept',  emoji:'💡',ja:'がいねん'},
  {en:'consequence',emoji:'⚡',ja:'けっか'},    {en:'context',  emoji:'📖',ja:'もとにある状況'},
  {en:'evidence',  emoji:'🔍',ja:'しょうこ'},   {en:'feature',  emoji:'⭐',ja:'とくちょう'},
  {en:'function',  emoji:'⚙️',ja:'きのう'},     {en:'impact',   emoji:'💥',ja:'えいきょう'},
  {en:'issue',     emoji:'❗',ja:'もんだい・課題'},{en:'outcome', emoji:'🏁',ja:'けっか'},
  {en:'pattern',   emoji:'🔢',ja:'パターン'},   {en:'principle',emoji:'📜',ja:'げんり'},
  {en:'process',   emoji:'🔄',ja:'プロセス'},   {en:'purpose',  emoji:'🎯',ja:'もくてき'},
  {en:'resource',  emoji:'📦',ja:'しげん'},     {en:'structure',emoji:'🏗️',ja:'こうぞう'},
  {en:'category',  emoji:'📂',ja:'カテゴリ'},   {en:'role',     emoji:'🎭',ja:'やくわり'},
];
// Lv11: TOEIC 600・Target 1900中盤1
const W11: Word[] = [
  {en:'accommodate',emoji:'🏨',ja:'みたす・しゅくはくさせる'},{en:'adequate',emoji:'✅',ja:'じゅうぶんな'},
  {en:'allocate',  emoji:'📊',ja:'わりあてる'},  {en:'colleague',emoji:'👔',ja:'どうりょう'},
  {en:'competent', emoji:'💪',ja:'かいのうな'},  {en:'comply',   emoji:'✔️',ja:'したがう'},
  {en:'comprehensive',emoji:'📚',ja:'ほうかつてきな'},{en:'facilitate',emoji:'🤝',ja:'うながす'},
  {en:'incorporate',emoji:'🔗',ja:'とりいれる'},{en:'initiate', emoji:'🚀',ja:'はじめる'},
  {en:'integrate', emoji:'🔗',ja:'とうごうする'},{en:'negotiate',emoji:'🤝',ja:'こうしょうする'},
  {en:'objective', emoji:'🎯',ja:'もくてき・きゃっかんてき'},{en:'perceive',emoji:'👁️',ja:'ちかくする'},
  {en:'potential', emoji:'🌱',ja:'せんざいりょく'},{en:'relevant',emoji:'🔗',ja:'かんけいのある'},
  {en:'resolve',   emoji:'🔧',ja:'かいけつする'},{en:'retrieve', emoji:'📥',ja:'とりもどす'},
  {en:'significant',emoji:'❗',ja:'じゅうような'},{en:'strategic',emoji:'♟️',ja:'せんりゃくてきな'},
];
// Lv12: TOEIC 600・Target 1900中盤2
const W12: Word[] = [
  {en:'acknowledge',emoji:'🙏',ja:'みとめる'},   {en:'advocate', emoji:'📢',ja:'しじする'},
  {en:'anticipate',emoji:'🔮',ja:'よそくする'},  {en:'collaborate',emoji:'🤝',ja:'きょうどうする'},
  {en:'compensate',emoji:'💰',ja:'つぐなう'},    {en:'coordinate',emoji:'📅',ja:'ちょうせいする'},
  {en:'dedicate',  emoji:'💪',ja:'ささげる'},    {en:'delegate', emoji:'📋',ja:'いにんする'},
  {en:'demonstrate',emoji:'🎓',ja:'しょうめいする'},{en:'eligible',emoji:'✅',ja:'しかくのある'},
  {en:'encounter', emoji:'🤝',ja:'であう'},      {en:'fluctuate',emoji:'📈',ja:'へんどうする'},
  {en:'formulate', emoji:'📝',ja:'くみたてる'},  {en:'hierarchy',emoji:'🏛️',ja:'かいそうせい'},
  {en:'innovate',  emoji:'💡',ja:'こうしんする'},{en:'inventory',emoji:'📦',ja:'ざいこ'},
  {en:'leverage',  emoji:'⚖️',ja:'かつようする'},{en:'obligation',emoji:'📜',ja:'ぎむ'},
  {en:'optimize',  emoji:'⚙️',ja:'さいてきかする'},{en:'transparent',emoji:'🔍',ja:'とうめいな'},
];
// Lv13: TOEIC 700
const W13: Word[] = [
  {en:'perspective',emoji:'👁️',ja:'してん・みかた'},{en:'preliminary',emoji:'📋',ja:'よびの'},
  {en:'productive',emoji:'📈',ja:'せいさんてきな'},{en:'regulate', emoji:'📜',ja:'きせいする'},
  {en:'substantial',emoji:'⚖️',ja:'じつしつてきな'},{en:'coherent', emoji:'🔗',ja:'いっかんした'},
  {en:'commodity', emoji:'📦',ja:'しょうひん'},   {en:'consensus',emoji:'🤝',ja:'コンセンサス'},
  {en:'explicit',  emoji:'📢',ja:'めいじてきな'}, {en:'implicit', emoji:'🤫',ja:'あんもくの'},
  {en:'incentive', emoji:'💰',ja:'インセンティブ'},{en:'manifest', emoji:'📝',ja:'あきらかにする'},
  {en:'mitigate',  emoji:'🛡️',ja:'かるくする'},  {en:'persistent',emoji:'💪',ja:'ねばりづよい'},
  {en:'privilege', emoji:'🌟',ja:'とっけん'},     {en:'skeptical',emoji:'🤔',ja:'うたがいぶかい'},
  {en:'supplement',emoji:'➕',ja:'おぎなう'},     {en:'versatile',emoji:'🔄',ja:'たようなしすい'},
  {en:'dilemma',   emoji:'⚖️',ja:'ジレンマ'},    {en:'arbitrary',emoji:'🎲',ja:'にんいの'},
];
// Lv14: TOEIC 750
const W14: Word[] = [
  {en:'alleviate', emoji:'😌',ja:'かるくする・やわらげる'},{en:'articulate',emoji:'🗣️',ja:'はっきりと述べる'},
  {en:'autonomous',emoji:'🤖',ja:'じりつした'},  {en:'consolidate',emoji:'🔗',ja:'ごうへいする'},
  {en:'contemplate',emoji:'💭',ja:'じっくりかんがえる'},{en:'discrepancy',emoji:'⚠️',ja:'くいちがい'},
  {en:'eloquent',  emoji:'🗣️',ja:'ゆうべんな'},  {en:'empower',  emoji:'💪',ja:'ちからをあたえる'},
  {en:'feasible',  emoji:'✅',ja:'じつこうかのうな'},{en:'formidable',emoji:'🦁',ja:'おそるべき'},
  {en:'imminent',  emoji:'⏰',ja:'さしせまった'},{en:'inherent', emoji:'🧬',ja:'せいしつとしてもつ'},
  {en:'meticulous',emoji:'🔬',ja:'こまかいところまで'},{en:'pragmatic',emoji:'🔧',ja:'じつようてきな'},
  {en:'resilient', emoji:'🌱',ja:'だんりょくせいのある'},{en:'scrutinize',emoji:'🔍',ja:'精しくしらべる'},
  {en:'streamline',emoji:'⚡',ja:'ごうりかする'},{en:'profound', emoji:'🌊',ja:'しんさんな'},
  {en:'proactive', emoji:'🚀',ja:'せんこうてきな'},{en:'paradigm', emoji:'🔄',ja:'パラダイム'},
];
// Lv15: TOEIC 800入口
const W15: Word[] = [
  {en:'astute',    emoji:'🦅',ja:'めざとい'},    {en:'bolster',  emoji:'🛡️',ja:'しえんする'},
  {en:'catalyst',  emoji:'⚡',ja:'きっかけ・しょくばい'},{en:'cognizant',emoji:'🧠',ja:'じかくしている'},
  {en:'compelling',emoji:'🔥',ja:'せっとくりょくのある'},{en:'daunting',emoji:'😰',ja:'おじけを出させる'},
  {en:'empirical', emoji:'🔬',ja:'けいけんてきな'},{en:'lucrative',emoji:'💰',ja:'もうかる'},
  {en:'nuanced',   emoji:'🎨',ja:'微妙なニュアンスの'},{en:'pivotal', emoji:'🔑',ja:'かなめの'},
  {en:'prolific',  emoji:'📚',ja:'たさくの'},     {en:'tenacious',emoji:'💪',ja:'ねばりづよい'},
  {en:'ubiquitous',emoji:'🌍',ja:'どこにでもある'},{en:'unprecedented',emoji:'🆕',ja:'ぜんれいのない'},
  {en:'volatile',  emoji:'💥',ja:'はくはつしやすい'},{en:'scrutiny',emoji:'🔍',ja:'精密なちょうさ'},
  {en:'intrinsic', emoji:'💎',ja:'本質てきな'},   {en:'pervasive',emoji:'🌊',ja:'いきわたっている'},
  {en:'inception', emoji:'🌱',ja:'かいし・おこり'},{en:'novel',   emoji:'📖',ja:'あたらしい・小説'},
];
// Lv16: TOEIC 800
const W16: Word[] = [
  {en:'aberrant',  emoji:'⚠️',ja:'いじょうな'},  {en:'ameliorate',emoji:'📈',ja:'かいぜんする'},
  {en:'ambivalent',emoji:'⚖️',ja:'あいまいな感情'},{en:'burgeon',  emoji:'🌱',ja:'急成長する'},
  {en:'circumvent',emoji:'🔄',ja:'かいひする'},   {en:'convoluted',emoji:'🌀',ja:'ふくざつにからみあった'},
  {en:'dichotomy', emoji:'⚖️',ja:'にぶんほう'},   {en:'disparate',emoji:'↔️',ja:'まったくちがう'},
  {en:'enumerate', emoji:'🔢',ja:'列挙する'},     {en:'exacerbate',emoji:'📈',ja:'悪化させる'},
  {en:'exemplify', emoji:'📌',ja:'典型を示す'},   {en:'extrapolate',emoji:'📊',ja:'外挿する'},
  {en:'galvanize', emoji:'⚡',ja:'刺激して行動させる'},{en:'impede', emoji:'🚧',ja:'じゃまをする'},
  {en:'languish',  emoji:'😔',ja:'衰退する'},     {en:'negate',   emoji:'❌',ja:'否定する'},
  {en:'deliberate',emoji:'🎯',ja:'意図的な'},     {en:'fathom',   emoji:'🌊',ja:'理解する'},
  {en:'incite',    emoji:'🔥',ja:'こうふんさせる'},{en:'acrimonious',emoji:'🔥',ja:'しんらつな'},
];
// Lv17: TOEIC 830
const W17: Word[] = [
  {en:'obviate',   emoji:'🚫',ja:'あらかじめ防ぐ'},{en:'oscillate',emoji:'🔄',ja:'ゆれ動く'},
  {en:'paramount', emoji:'👑',ja:'最高の'},        {en:'parsimonious',emoji:'💰',ja:'けちな'},
  {en:'perfunctory',emoji:'😑',ja:'おざなりな'},  {en:'placate',  emoji:'🕊️',ja:'なだめる'},
  {en:'poignant',  emoji:'💔',ja:'心に刺さる'},    {en:'precipitate',emoji:'⬇️',ja:'引き起こす'},
  {en:'proclivity',emoji:'🎯',ja:'傾向'},          {en:'reconcile',emoji:'🤝',ja:'和解させる'},
  {en:'rectify',   emoji:'✅',ja:'修正する'},      {en:'relinquish',emoji:'🤲',ja:'手放す'},
  {en:'repudiate', emoji:'❌',ja:'否認する'},      {en:'reticent', emoji:'🤐',ja:'無口な'},
  {en:'rhetoric',  emoji:'🗣️',ja:'修辞'},         {en:'sanction', emoji:'⚖️',ja:'制裁・承認する'},
  {en:'squander',  emoji:'💸',ja:'むだにする'},    {en:'stymie',   emoji:'🚧',ja:'妨害する'},
  {en:'surmount',  emoji:'🏔️',ja:'のりこえる'},   {en:'truncate', emoji:'✂️',ja:'短縮する'},
];
// Lv18: TOEIC 860
const W18: Word[] = [
  {en:'abdicate',  emoji:'👑',ja:'退位する・放棄する'},{en:'abrogate',emoji:'📜',ja:'廃止する'},
  {en:'acumen',    emoji:'🦅',ja:'鋭敏な判断力'},  {en:'admonish', emoji:'☝️',ja:'いましめる'},
  {en:'affinity',  emoji:'💞',ja:'親和性'},        {en:'anathema', emoji:'🚫',ja:'忌み嫌われるもの'},
  {en:'antithesis',emoji:'⚖️',ja:'正反対'},        {en:'apocryphal',emoji:'❓',ja:'真偽不確かな'},
  {en:'approbation',emoji:'✅',ja:'是認'},         {en:'arcane',   emoji:'🔮',ja:'難解な'},
  {en:'austere',   emoji:'🏔️',ja:'質素な'},        {en:'avarice',  emoji:'💰',ja:'強欲'},
  {en:'belligerent',emoji:'⚔️',ja:'好戦的な'},    {en:'cajole',   emoji:'🤫',ja:'口ぐるまにのせる'},
  {en:'callous',   emoji:'🧊',ja:'冷淡な'},        {en:'capitulate',emoji:'🏳️',ja:'降伏する'},
  {en:'castigate', emoji:'⚡',ja:'きびしく罰する'},{en:'chicanery',emoji:'🎭',ja:'ごまかし'},
  {en:'coerce',    emoji:'💢',ja:'強制する'},      {en:'cogent',   emoji:'💡',ja:'説得力のある'},
];
// Lv19: TOEIC 900
const W19: Word[] = [
  {en:'commensurate',emoji:'⚖️',ja:'釣り合った'},{en:'compunction',emoji:'😔',ja:'良心の呵責'},
  {en:'contrite',  emoji:'🙏',ja:'悔い改めた'},    {en:'credulous',emoji:'😊',ja:'信じやすい'},
  {en:'culpable',  emoji:'⚠️',ja:'有罪の'},        {en:'cupidity', emoji:'💰',ja:'どんよく'},
  {en:'debilitate',emoji:'😴',ja:'弱体化させる'},  {en:'deference',emoji:'🙇',ja:'敬意'},
  {en:'delineate', emoji:'📐',ja:'描写する'},      {en:'deprecate',emoji:'👎',ja:'非難する'},
  {en:'despondent',emoji:'😞',ja:'意気消沈した'}, {en:'diffident',emoji:'😶',ja:'自信のない'},
  {en:'dissonance',emoji:'🎵',ja:'不協和音'},      {en:'duplicity',emoji:'🎭',ja:'不誠実'},
  {en:'ebullient', emoji:'🎉',ja:'はつらつとした'},{en:'efficacy', emoji:'⚡',ja:'有効性'},
  {en:'effrontery',emoji:'😤',ja:'厚かましさ'},    {en:'egregious',emoji:'😱',ja:'目に余る'},
  {en:'enervate',  emoji:'😩',ja:'気力を失わせる'},{en:'obsolete', emoji:'🏚️',ja:'時代遅れの'},
];
// Lv20: 最難関（難関大・TOEIC 900+）
const W20: Word[] = [
  {en:'enigmatic', emoji:'❓',ja:'謎めいた'},      {en:'equanimity',emoji:'😌',ja:'平静'},
  {en:'equivocate',emoji:'🎭',ja:'言葉を濁す'},    {en:'erudite',  emoji:'📚',ja:'博学な'},
  {en:'esoteric',  emoji:'🔮',ja:'難解な・秘伝的な'},{en:'euphemism',emoji:'🌸',ja:'婉曲表現'},
  {en:'exculpate', emoji:'✅',ja:'無罪を証明する'},{en:'extraneous',emoji:'❌',ja:'無関係な'},
  {en:'facetious', emoji:'😜',ja:'不まじめな'},    {en:'fallacious',emoji:'❌',ja:'誤った'},
  {en:'garrulous', emoji:'💬',ja:'おしゃべりな'},  {en:'hubris',   emoji:'😤',ja:'傲慢'},
  {en:'impugn',    emoji:'⚔️',ja:'非難する'},      {en:'inchoate', emoji:'🌱',ja:'まだ形になっていない'},
  {en:'inimical',  emoji:'⚔️',ja:'有害な・敵対的な'},{en:'grandiloquent',emoji:'👑',ja:'大げさな'},
  {en:'hapless',   emoji:'😢',ja:'不運な'},        {en:'fervid',   emoji:'🔥',ja:'熱烈な'},
  {en:'flagrant',  emoji:'🚨',ja:'目に余る'},      {en:'loquacious',emoji:'💬',ja:'多弁な'},
];

const WORD_LEVELS: Word[][] = [W1,W2,W3,W4,W5,W6,W7,W8,W9,W10,W11,W12,W13,W14,W15,W16,W17,W18,W19,W20];

// ─────────────────────────────────────────────────────────────────
// Q&A データ — Level 1〜20 各レベル独立ハードコード（各10問）
// ─────────────────────────────────────────────────────────────────
interface QAItem { question: string; answer: string; wrongs: [string,string]; hint?: string; }

// QA Lv1: 超基本挨拶
const QA1: QAItem[] = [
  {question:'Hello!',                 answer:'Hi there! How are you?',    wrongs:['Goodbye.','Thank you.']},
  {question:'Thank you!',             answer:"You're welcome!",            wrongs:['I am sad.','Please help.']},
  {question:'Goodbye!',               answer:'Bye! See you later!',        wrongs:['I am hungry.','It is hot.']},
  {question:'Good morning!',          answer:'Good morning! Did you sleep well?', wrongs:['Good night.','I am tired.']},
  {question:'Are you okay?',          answer:'Yes, I am fine. Thank you!', wrongs:['No, I am a cat.','It is raining.']},
  {question:'Sorry!',                 answer:"No worries, it's okay!",     wrongs:['I like fish.','The sun is big.']},
  {question:'Please!',                answer:'Of course, no problem!',     wrongs:['I am running.','It is cold.']},
  {question:'What is your name?',     answer:'My name is Yuki. Nice to meet you!', wrongs:['I like dogs.','It is sunny.']},
  {question:'How old are you?',       answer:'I am twelve years old.',     wrongs:['I like cats.','The moon is big.']},
  {question:'See you tomorrow!',      answer:'See you! Have a great day!', wrongs:['I am cold.','The sun is yellow.']},
];
// QA Lv2: 基本日常
const QA2: QAItem[] = [
  {question:'What do you want to eat?', answer:'I want some pizza, please.',wrongs:['I like trains.','The door is open.']},
  {question:'Where do you live?',       answer:'I live in Tokyo.',          wrongs:['I have a dog.','The tree is big.']},
  {question:'Do you like music?',       answer:'Yes, I love music a lot!',  wrongs:['I am a teacher.','The sky is green.']},
  {question:'What time is it?',         answer:"It's half past two.",       wrongs:['I like apples.','The bus is late.']},
  {question:'Is this your bag?',        answer:'Yes, it is mine. Thank you!',wrongs:['No, I am tired.','The door is red.']},
  {question:'Where is the bathroom?',   answer:"It's down the hall on the left.", wrongs:['I like cats.','The car is fast.']},
  {question:'Can I sit here?',          answer:'Sure, please go ahead!',    wrongs:['I am hungry.','The fish is small.']},
  {question:'What is that?',            answer:"It's a dictionary.",        wrongs:['I like rain.','The star is big.']},
  {question:'Do you have a pen?',       answer:'Yes, here you go!',         wrongs:['I need water.','The moon is round.']},
  {question:'How was your weekend?',    answer:'It was fantastic! I went hiking.', wrongs:['I like books.','The dog is small.']},
];
// QA Lv3: 食事・買い物基礎
const QA3: QAItem[] = [
  {question:'Can I see the menu?',         answer:'Of course! Here it is.',   wrongs:['I want coffee.','The park is open.']},
  {question:'What do you recommend?',      answer:"I'd recommend the curry.",  wrongs:['I am from Tokyo.','The bus is late.']},
  {question:'How much is this shirt?',     answer:"It's 2,000 yen.",          wrongs:['I like sushi.','The train is fast.']},
  {question:'Do you have this in blue?',   answer:"Let me check for you!",    wrongs:['I want fish.','The park is big.']},
  {question:'Can I try this on?',          answer:'Yes, the fitting room is over there.', wrongs:['I need a key.','The door is open.']},
  {question:'I am allergic to peanuts.',   answer:'No worries, this dish has none.', wrongs:['I want sushi.','The window is clean.']},
  {question:"I'll take this one.",         answer:'Great choice! That will be 3,500 yen.', wrongs:['I need a menu.','The bus is here.']},
  {question:'Could I get a receipt?',      answer:'Absolutely, here is your receipt.', wrongs:['I like this.','The sun is warm.']},
  {question:'Do you accept card?',         answer:'Yes, we take all major cards.', wrongs:['I need cash.','The shop is closed.']},
  {question:'Is there a vegetarian option?',answer:"Yes, our tofu salad is very popular!", wrongs:['I want meat.','The menu is small.']},
];
// QA Lv4: 交通・場所
const QA4: QAItem[] = [
  {question:'Where is the station?',         answer:"Go straight, then turn left.", wrongs:['I like trains.','The door is big.']},
  {question:'How do I get to the museum?',   answer:"Take the subway to Ueno station.", wrongs:['I need a bus.','The park is far.']},
  {question:'Is this the right bus for Shibuya?', answer:'Yes, this bus goes to Shibuya.', wrongs:['No, this is a taxi.','The station is near.']},
  {question:'How long does it take?',        answer:'About 20 minutes by train.',  wrongs:['I need a map.','The taxi is slow.']},
  {question:"Excuse me, I'm lost.",          answer:'No problem! Where are you going?', wrongs:['I like walking.','The road is long.']},
  {question:'Can I buy a train ticket here?',answer:'Yes, the ticket machine is right there.', wrongs:['I need a taxi.','The gate is open.']},
  {question:'Is there a bus stop nearby?',   answer:'Yes, it is just around the corner.', wrongs:['I want a taxi.','The road is wide.']},
  {question:'Do I need to change trains?',   answer:'Yes, change at Shinjuku station.', wrongs:['I need a map.','The bus is full.']},
  {question:'What is the next stop?',        answer:"The next stop is Omotesando.",  wrongs:['I need a seat.','The station is closed.']},
  {question:'Can you show me on the map?',   answer:"Sure! We are here, and the hotel is here.", wrongs:['I have a map.','The road is short.']},
];
// QA Lv5: 宿泊・基礎
const QA5: QAItem[] = [
  {question:'Do you have a room available?', answer:'Yes, we have a twin room free tonight.', wrongs:['I need a taxi.','The hotel is closed.']},
  {question:'How much is a room per night?', answer:"It's 8,000 yen including breakfast.", wrongs:['I want a suite.','The room is large.']},
  {question:'What time is check-in?',        answer:'Check-in is from 3 PM.',      wrongs:['I need a key.','The lobby is big.']},
  {question:'Is breakfast included?',        answer:'Yes, served from 7 to 9 in the morning.', wrongs:['I want coffee.','The room is cold.']},
  {question:'Can I have a wake-up call at 7?', answer:"Of course! We'll call you at 7 AM.", wrongs:['I need a taxi.','The phone is broken.']},
  {question:'Where can I park my car?',      answer:'There is a free parking lot behind the hotel.', wrongs:['I need a map.','The road is long.']},
  {question:'Is there free Wi-Fi?',          answer:'Yes, the password is on your room card.', wrongs:['I need a phone.','The internet is slow.']},
  {question:"I'd like a non-smoking room.",  answer:'Certainly, all our rooms are non-smoking.', wrongs:['I need a balcony.','The window is small.']},
  {question:'Can I leave my luggage here?',  answer:'Of course, we will keep it safe.', wrongs:['I need a taxi.','The luggage is heavy.']},
  {question:'What time is check-out?',       answer:'Check-out is by 11 AM.',      wrongs:['I need a key.','The lobby is busy.']},
];
// QA Lv6: 道案内・応用
const QA6: QAItem[] = [
  {question:'Could you tell me how to get to the post office?', answer:"It's a three-minute walk north of here.", wrongs:['I need a bus.','The park is far.'], hint:'道案内'},
  {question:'Is it within walking distance?',  answer:'Yes, about ten minutes on foot.',   wrongs:['I need a taxi.','The road is long.'], hint:'道案内'},
  {question:'Could you write it down for me?', answer:'Sure! Here is the address in Japanese.', wrongs:['I have a map.','The station is close.'], hint:'道案内'},
  {question:'Am I on the right road for the airport?', answer:"Yes, just keep going straight for two kilometers.", wrongs:['I need a map.','The taxi is near.'], hint:'交通'},
  {question:"I've missed the last train.",      answer:"I'm sorry to hear that. Shall I call you a taxi?", wrongs:['I need a hotel.','The bus is gone.'], hint:'交通'},
  {question:'Where can I rent a bicycle?',      answer:"There is a rental shop by the station entrance.", wrongs:['I need a map.','The road is steep.'], hint:'交通'},
  {question:'Can you recommend a good restaurant nearby?', answer:"Try Sakura Kitchen—their ramen is amazing!", wrongs:['I need a menu.','The park is quiet.'], hint:'観光'},
  {question:'What sights are worth visiting here?', answer:"Don't miss the old castle and the waterfall.", wrongs:['I need a taxi.','The museum is far.'], hint:'観光'},
  {question:'Is there a convenience store open now?', answer:"Yes, the FamilyMart on the corner is open 24 hours.", wrongs:['I need a pharmacy.','The shop is closed.'], hint:'ショッピング'},
  {question:'Could you help me find a pharmacy?', answer:"Certainly! There is one just two blocks away.", wrongs:['I need a doctor.','The hospital is near.'], hint:'ショッピング'},
];
// QA Lv7: レストラン・応用
const QA7: QAItem[] = [
  {question:'Could we have a table for four?',  answer:"Of course! Right this way, please.",  wrongs:['I need a menu.','The room is full.'], hint:'レストラン'},
  {question:'Do you have a reservation?',        answer:"Yes, under the name Suzuki at seven o'clock.", wrongs:["I don't need one.",'The table is ready.'], hint:'レストラン'},
  {question:'Could we sit near the window?',     answer:'Certainly, I will show you to a window seat.', wrongs:['I need a chair.','The view is nice.'], hint:'レストラン'},
  {question:"What's today's special?",           answer:"Grilled sea bream with yuzu butter sauce.", wrongs:['I want ramen.','The dessert is sweet.'], hint:'レストラン'},
  {question:'How spicy is the curry?',           answer:"It has a gentle warmth—not too hot at all.", wrongs:['I want mild.','The dish is cold.'], hint:'レストラン'},
  {question:'Could I have mine without onions?', answer:"Absolutely! I will let the kitchen know.", wrongs:['I need a menu.','The salad is fresh.'], hint:'レストラン'},
  {question:'Could we see the dessert menu?',    answer:"Of course! Our matcha parfait is very popular.", wrongs:['I want coffee.','The dessert is good.'], hint:'レストラン'},
  {question:'Could I have my steak well done?',  answer:"Certainly! It will be ready in about fifteen minutes.", wrongs:['I want it rare.','The steak is big.'], hint:'レストラン'},
  {question:'Could we split the bill?',          answer:"Of course! Let me divide it for you.", wrongs:['I need one bill.','The total is cheap.'], hint:'お会計'},
  {question:'Could I get the check, please?',    answer:"Right away! Here is your bill.",     wrongs:['I want more food.','The service was slow.'], hint:'お会計'},
];
// QA Lv8: ショッピング・応用
const QA8: QAItem[] = [
  {question:"I'm looking for a winter jacket.",    answer:"Our new arrivals are on the second floor.", wrongs:['I need shoes.','The jacket is red.'], hint:'ショッピング'},
  {question:'Do you have this in a larger size?',  answer:"Let me check the stockroom for you.",      wrongs:['I need a medium.','The shirt is blue.'], hint:'ショッピング'},
  {question:'Is this on sale?',                    answer:"Yes, it is 30 percent off this week.",     wrongs:['I need a receipt.','The price is high.'], hint:'ショッピング'},
  {question:'Can I exchange this if it does not fit?', answer:"Yes, you have 30 days to exchange with the receipt.", wrongs:['I need cash.','The policy is strict.'], hint:'ショッピング'},
  {question:'Do you do gift wrapping?',            answer:"Yes, it is a free service at our counter.", wrongs:['I need a bag.','The box is small.'], hint:'ショッピング'},
  {question:'Could I get a tax refund?',           answer:"Yes, please bring your passport to the tax refund counter.", wrongs:['I need a receipt.','The tax is low.'], hint:'ショッピング'},
  {question:'Is this brand available at other shops?', answer:"This is exclusive to our store.",      wrongs:['I need a map.','The brand is popular.'], hint:'ショッピング'},
  {question:"I'd like to return this item.",       answer:"Certainly! May I ask the reason for the return?", wrongs:['I need cash.','The item is nice.'], hint:'ショッピング'},
  {question:'Do you have a loyalty card?',         answer:"Yes! Signing up earns you points from today.", wrongs:['I need a coupon.','The card is free.'], hint:'ショッピング'},
  {question:'Could you ship this overseas?',       answer:"Yes, we offer international shipping to over 50 countries.", wrongs:['I need a box.','The shipping is fast.'], hint:'ショッピング'},
];
// QA Lv9: 医療・緊急
const QA9: QAItem[] = [
  {question:'I am not feeling well.',               answer:"I am sorry to hear that. Do you have a fever?", wrongs:['I need food.','The doctor is busy.'], hint:'医療'},
  {question:'Where is the nearest hospital?',       answer:"St. Luke's is about five minutes by taxi.",    wrongs:['I need a pharmacy.','The clinic is far.'], hint:'医療'},
  {question:'Do I need an appointment?',            answer:"Not for urgent care—please come straight in.",  wrongs:['I need insurance.','The doctor is in.'], hint:'医療'},
  {question:'I have a severe headache.',            answer:"Please take a seat and the nurse will see you shortly.", wrongs:['I need medicine.','The pain is mild.'], hint:'医療'},
  {question:'Do you have travel insurance?',        answer:"Yes, it is provided by my company.",            wrongs:['I need a form.','The insurance is good.'], hint:'医療'},
  {question:'I think I have food poisoning.',       answer:"Please go to the emergency room right away.",   wrongs:['I need water.','The food was bad.'], hint:'医療'},
  {question:'How do I call an ambulance?',          answer:"Dial 119. I can call for you if you like.",    wrongs:['I need a taxi.','The hospital is near.'], hint:'緊急'},
  {question:'I lost my passport.',                  answer:"Please report it to the police and contact your embassy.", wrongs:['I need a form.','The hotel can help.'], hint:'緊急'},
  {question:'My bag was stolen.',                   answer:"I am so sorry. Let me help you call the police.", wrongs:['I need insurance.','The bag is lost.'], hint:'緊急'},
  {question:"I've been in a minor accident.",       answer:"Are you injured? Shall I call the police?",    wrongs:['I need a map.','The car is fine.'], hint:'緊急'},
];
// QA Lv10: ビジネス基礎
const QA10: QAItem[] = [
  {question:'Could I speak to the manager?',         answer:"Of course. Please wait one moment.",          wrongs:['I need a form.','The manager is out.'], hint:'ビジネス'},
  {question:'May I have your business card?',        answer:"Certainly, here you are. This is mine as well.", wrongs:['I need a pen.','The card is ready.'], hint:'ビジネス'},
  {question:"I'd like to arrange a meeting.",        answer:"Of course. What date and time suit you?",     wrongs:['I need a form.','The schedule is full.'], hint:'ビジネス'},
  {question:'Could you send me a quotation?',        answer:"Certainly. I will email it by end of business today.", wrongs:['I need a contract.','The price is fixed.'], hint:'ビジネス'},
  {question:'We would like to place an order.',      answer:"Wonderful! How many units would you require?", wrongs:['I need a discount.','The order is ready.'], hint:'ビジネス'},
  {question:'Is there any flexibility on the price?',answer:"Let me discuss it with my team and get back to you.", wrongs:['I need a receipt.','The price is firm.'], hint:'ビジネス'},
  {question:"We'd like to extend our contract.",     answer:"That sounds great. Let's set up a call to discuss the terms.", wrongs:['I need a lawyer.','The contract is old.'], hint:'ビジネス'},
  {question:'Could I get an update on my order?',    answer:"Your order has shipped and will arrive Thursday.", wrongs:['I need a receipt.','The order is late.'], hint:'ビジネス'},
  {question:'We have a complaint about the delivery.',answer:"I sincerely apologize. Let me investigate right away.", wrongs:['I need a refund.','The package is small.'], hint:'ビジネス'},
  {question:'Shall we confirm the details in writing?',answer:"Absolutely. I will send a written summary this afternoon.", wrongs:['I need a stamp.','The details are clear.'], hint:'ビジネス'},
];
// QA Lv11: ホテル・中級
const QA11: QAItem[] = [
  {question:'May I have your name, please?',          answer:"Sure, I have a reservation under Johnson.",    wrongs:['I like sushi.','The weather is nice.'], hint:'ホテル'},
  {question:'How many nights will you be staying?',   answer:"I will be staying for three nights.",          wrongs:['I am very tired.','Yes, I like it.'], hint:'ホテル'},
  {question:'Would you prefer a smoking or non-smoking room?', answer:"Non-smoking, please.",               wrongs:['I need a balcony.','The view is great.'], hint:'ホテル'},
  {question:"I'm afraid your room isn't ready yet.",  answer:"No problem—may I leave my bags here?",        wrongs:['I need a refund.','The room is nice.'], hint:'ホテル'},
  {question:'Would you like a room with a city view?', answer:"Yes, that would be wonderful, thank you.",   wrongs:['I want a mountain view.','The floor is high.'], hint:'ホテル'},
  {question:'The elevator is just past the front desk.',answer:"Thank you very much.",                       wrongs:['I need stairs.','The lift is broken.'], hint:'ホテル'},
  {question:'Would you like a newspaper delivered in the morning?', answer:"Yes, an English paper would be great.", wrongs:['I need a phone.','The morning is early.'], hint:'ホテル'},
  {question:'Is room service available 24 hours?',    answer:"Yes, our menu is in your room.",              wrongs:['I need a kitchen.','The food is cold.'], hint:'ホテル'},
  {question:'Could I get an extra pillow?',           answer:"Of course, I will have that sent right away.", wrongs:['I need a blanket.','The bed is hard.'], hint:'ホテル'},
  {question:'May I have my room cleaned earlier today?', answer:"Certainly—housekeeping will attend to it by noon.", wrongs:['I need towels.','The room is dirty.'], hint:'ホテル'},
];
// QA Lv12: 空港・出張
const QA12: QAItem[] = [
  {question:'May I see your passport and boarding pass?', answer:"Certainly, here they are.",               wrongs:['I need a visa.','The gate is closed.'], hint:'空港'},
  {question:'Did you pack this bag yourself?',          answer:"Yes, I packed it myself this morning.",      wrongs:['My friend packed it.','The bag is light.'], hint:'空港'},
  {question:'Do you have any liquids over 100ml?',      answer:"No, all my liquids are in this small bag.", wrongs:['I have a bottle.','The liquid is water.'], hint:'空港'},
  {question:'Your flight is boarding at gate 32.',      answer:"Thank you! How long do I have?",            wrongs:['I need a seat.','The gate is far.'], hint:'空港'},
  {question:'Your flight has been delayed by one hour.', answer:"I see. Is there a lounge I can wait in?", wrongs:['I need a refund.','The delay is short.'], hint:'空港'},
  {question:'Could I check one more bag?',              answer:"Yes, but there is an additional charge of 3,000 yen.", wrongs:['I need a trolley.','The bag is small.'], hint:'空港'},
  {question:'Do you have any items to declare?',        answer:"Just this bottle of wine as a gift.",       wrongs:['I have nothing.','The bag is empty.'], hint:'税関'},
  {question:'What is the purpose of your visit?',       answer:"Tourism—I will be here for one week.",      wrongs:['I am working.','The visit is short.'], hint:'入国'},
  {question:'Where will you be staying?',               answer:"At the BrightonStar hotel in Gotemba.",     wrongs:['I need a hotel.','The address is long.'], hint:'入国'},
  {question:'Please collect your bags at carousel three.', answer:"Thank you very much!",                   wrongs:['I need a trolley.','The bags are late.'], hint:'空港'},
];
// QA Lv13: 複雑なリクエスト
const QA13: QAItem[] = [
  {question:'Could you arrange a rental car for tomorrow?', answer:"Certainly! What size vehicle do you need?", wrongs:['I need a taxi.','The car is reserved.'], hint:'手配'},
  {question:'I need a babysitter for this evening.',        answer:"I will check with our concierge desk for you.", wrongs:['I need a nanny.','The child is quiet.'], hint:'手配'},
  {question:"I'd like to send this package to Australia.",  answer:"We can ship it via EMS. It takes about a week.", wrongs:['I need a stamp.','The package is heavy.'], hint:'手配'},
  {question:'Could you translate this letter into Japanese?',answer:"I will be happy to help with a basic translation.", wrongs:['I need a lawyer.','The letter is short.'], hint:'手配'},
  {question:"I've left my jacket in the taxi.",             answer:"Let me call the taxi company and describe it for you.", wrongs:['I need a coat.','The jacket is old.'], hint:'紛失'},
  {question:'My laptop was taken from my room.',            answer:"I am so sorry. I will contact security immediately.", wrongs:['I need insurance.','The laptop is mine.'], hint:'紛失'},
  {question:'Could I borrow an umbrella?',                  answer:"Yes, we have complimentary umbrellas at the front desk.", wrongs:['I need a raincoat.','The umbrella is wet.'], hint:'手配'},
  {question:'Is there a laundry service available?',        answer:"Yes, drop your laundry off by 9 AM for same-day service.", wrongs:['I need a washing machine.','The service is free.'], hint:'手配'},
  {question:'Could you recommend a day trip from here?',    answer:"The Hakone area is stunning—about 45 minutes by bus.", wrongs:['I need a guide.','The trip is long.'], hint:'観光'},
  {question:"I've accidentally broken something in my room.", answer:"No worries—these things happen. Let me arrange a replacement.", wrongs:['I need to pay.','The item is old.'], hint:'ホテル'},
];
// QA Lv14: ビジネス・応用
const QA14: QAItem[] = [
  {question:"We've reviewed your proposal and have some questions.", answer:"Certainly! Please go ahead—I am happy to clarify.", wrongs:['I need a lawyer.','The proposal is final.'], hint:'ビジネス'},
  {question:'Could we arrange a site visit next week?',       answer:"Absolutely—Tuesday or Wednesday suits us best.", wrongs:['I need notice.','The factory is far.'], hint:'ビジネス'},
  {question:'The timeline seems tight. Can you expedite?',    answer:"I will do my best. We may need to add resources.", wrongs:['I need more time.','The timeline is clear.'], hint:'ビジネス'},
  {question:'We need the deliverables by end of month.',      answer:"Understood. I will prioritize accordingly.",    wrongs:['I need more budget.','The deadline is fine.'], hint:'ビジネス'},
  {question:"We'd like an exclusivity clause in the contract.", answer:"I will discuss that with our legal team and follow up.", wrongs:['I need a lawyer.','The clause is standard.'], hint:'ビジネス'},
  {question:'The invoice you sent appears to have an error.', answer:"I apologize for the confusion. Let me reissue it today.", wrongs:['I need a receipt.','The amount is correct.'], hint:'ビジネス'},
  {question:'Could you provide references from past clients?',  answer:"Of course—I will email you a list of three references.", wrongs:['I need time.','The clients are busy.'], hint:'ビジネス'},
  {question:'We are considering scaling up the partnership.',    answer:"That is exciting news! Let's schedule a call this week.", wrongs:['I need a contract.','The scale is big.'], hint:'ビジネス'},
  {question:'Could we add a performance-based bonus structure?', answer:"Interesting idea—let me take it back to our team.", wrongs:['I need more time.','The bonus is clear.'], hint:'ビジネス'},
  {question:"We'd prefer to conduct meetings via video call.",   answer:"No problem at all—I will set up a recurring invite.", wrongs:['I need a projector.','The meeting is short.'], hint:'ビジネス'},
];
// QA Lv15: 宿泊トラブル・上級
const QA15: QAItem[] = [
  {question:'The noise from the next room is unbearable.',     answer:"I sincerely apologize. I will ask them to keep it down immediately.", wrongs:['I need earplugs.','The noise is minor.'], hint:'ホテル'},
  {question:'The hot water in my shower stopped working.',     answer:"I am very sorry. I will send maintenance within five minutes.", wrongs:['I need towels.','The water is warm.'], hint:'ホテル'},
  {question:'There is a strange smell in my room.',            answer:"I apologize for this. Please let me move you to a fresh room.", wrongs:['I need a candle.','The smell is faint.'], hint:'ホテル'},
  {question:"I wasn't satisfied with the cleanliness.",        answer:"I am terribly sorry. We clearly fell short of our standards.", wrongs:['I need a refund.','The room was fine.'], hint:'ホテル'},
  {question:'The minibar was not restocked as requested.',     answer:"Please forgive the oversight. I will see to it right away.", wrongs:['I need a drink.','The bar is fine.'], hint:'ホテル'},
  {question:'The TV remote is not working.',                   answer:"Let me bring you a replacement immediately.",wrongs:['I need a manual.','The TV is broken.'], hint:'ホテル'},
  {question:'I ordered room service an hour ago.',             answer:"I deeply apologize for the wait. I will chase the order now.", wrongs:['I need a menu.','The food is cold.'], hint:'ホテル'},
  {question:'Could we extend our stay by one more night?',     answer:"Let me check availability. One moment, please.",wrongs:['I need a discount.','The room is booked.'], hint:'ホテル'},
  {question:'The air conditioning is far too cold.',           answer:"I am sorry about that. Let me adjust the thermostat setting for your room.", wrongs:['I need a blanket.','The room is warm.'], hint:'ホテル'},
  {question:'I found an unexpected charge on my bill.',        answer:"Please accept my apologies. Let me review and correct your bill now.", wrongs:['I need a receipt.','The charge is correct.'], hint:'ホテル'},
];
// QA Lv16: BrightonStar チェックイン・基礎対応
const QA16: QAItem[] = [
  {question:'Welcome to BrightonStar. Do you have a reservation?',
    answer:"Yes, I booked a Deluxe Mt. Fuji View Room under the name Brown.",
    wrongs:["I'd like a table for two.","I'm here for business."], hint:'BrightonStar'},
  {question:'May I see your passport for check-in, Mr. Brown?',
    answer:'Of course, here you are.',
    wrongs:["I only have my driver's license.",'I left it in the taxi.'], hint:'BrightonStar'},
  {question:'Your room is on the eighth floor with a direct view of Mt. Fuji.',
    answer:'That sounds absolutely wonderful!',
    wrongs:['I prefer the lower floor.','Is there a mountain nearby?'], hint:'BrightonStar'},
  {question:'Would you like a 6 AM wake-up call to see Mt. Fuji at sunrise?',
    answer:'Yes, please—I would love to catch the sunrise.',
    wrongs:['I will use my own alarm.','No, I sleep in late.'], hint:'BrightonStar'},
  {question:'Breakfast is served from 7 to 9:30 in our Fuji Dining restaurant.',
    answer:'Thank you. Is the Japanese breakfast option available?',
    wrongs:['I skip breakfast.','I will order room service.'], hint:'BrightonStar'},
  {question:'Your room includes complimentary access to our outdoor hot spring.',
    answer:'Wonderful! What are the bathing hours?',
    wrongs:['I prefer a regular bath.','I have my own towel.'], hint:'BrightonStar'},
  {question:'Shall I have your luggage sent up to your room?',
    answer:'Yes please, that would be very helpful.',
    wrongs:['I will carry it myself.','I have only one bag.'], hint:'BrightonStar'},
  {question:'Our concierge desk is open until 10 PM for any assistance.',
    answer:'Great—I may need help booking a local tour.',
    wrongs:['I do not need help.','I will use the internet.'], hint:'BrightonStar'},
  {question:'Would you like us to arrange transport to Gotemba outlet mall?',
    answer:'Yes, please! How far is it from the hotel?',
    wrongs:['I have a rental car.','I prefer to stay in.'], hint:'BrightonStar'},
  {question:'Your key card also grants access to our rooftop observatory deck.',
    answer:'Perfect—I will definitely visit at dusk.',
    wrongs:['I prefer the lobby.','I do not need access.'], hint:'BrightonStar'},
];
// QA Lv17: BrightonStar 富士山・観光案内
const QA17: QAItem[] = [
  {question:'The best spot to photograph Mt. Fuji from our property is the eastern garden.',
    answer:'Thank you! When is the lighting best for photos?',
    wrongs:['I have a camera.','The garden is beautiful.'], hint:'富士山'},
  {question:'Mt. Fuji is clear this morning—visibility is excellent!',
    answer:'Wonderful! I will head to the garden right after breakfast.',
    wrongs:['I prefer the city view.','I will sleep more.'], hint:'富士山'},
  {question:"Unfortunately Mt. Fuji is hidden by clouds today. It sometimes clears around 3 PM.",
    answer:'I see—I will keep an eye on it from my room.',
    wrongs:['That is disappointing.','I will go shopping instead.'], hint:'富士山'},
  {question:'We offer a guided Mt. Fuji 5th Station tour departing at 8 AM.',
    answer:"I'd love to join! How long is the tour?",
    wrongs:['I will go alone.','I need a bus pass.'], hint:'富士山'},
  {question:'The Fuji Visitor Centre is a 20-minute drive and has stunning exhibits.',
    answer:'Could you arrange transport for two people?',
    wrongs:['I have a car.','I prefer to walk.'], hint:'富士山'},
  {question:'The Chureito Pagoda offers the iconic Mt. Fuji and pagoda photograph.',
    answer:'Absolutely! Is it easy to reach from the hotel?',
    wrongs:['I have seen photos.','I prefer modern buildings.'], hint:'富士山'},
  {question:'Lake Kawaguchiko is 40 minutes away and provides beautiful lake reflections of the mountain.',
    answer:"That sounds perfect for a day trip—shall I book a taxi?",
    wrongs:['I prefer Lake Biwa.','I have a bicycle.'], hint:'富士山'},
  {question:'Climbing season for Mt. Fuji is July to early September.',
    answer:'I am here in August—is it still possible to climb?',
    wrongs:['I am afraid of heights.','I prefer easy trails.'], hint:'富士山'},
  {question:'On clear evenings, Mt. Fuji turns a magnificent shade of red at sunset.',
    answer:"Incredible! I will make sure to be on the terrace at that time.",
    wrongs:['I prefer sunrises.','The color depends on weather.'], hint:'富士山'},
  {question:'Our hotel partners with a local nature guide for private Fuji hike experiences.',
    answer:"That sounds amazing—what is included in the private tour?",
    wrongs:['I am fit enough alone.','The price is too high.'], hint:'富士山'},
];
// QA Lv18: BrightonStar 施設・特別サービス
const QA18: QAItem[] = [
  {question:'We can arrange a private kaiseki dinner in your room with a Fuji view.',
    answer:'That would be extraordinary. How far in advance should I book?',
    wrongs:['I prefer the buffet.','The price is high.'], hint:'BrightonStar'},
  {question:'Our onsen has separate indoor and outdoor baths. The outdoor bath faces Mt. Fuji.',
    answer:'How wonderful! Are towels and yukata provided?',
    wrongs:['I brought my own.','I prefer a shower.'], hint:'BrightonStar'},
  {question:'We notice it is your anniversary—shall we arrange a special room decoration?',
    answer:'That is so thoughtful! Yes, please—roses if possible.',
    wrongs:['No, keep it simple.','I did not mention that.'], hint:'BrightonStar'},
  {question:'BrightonStar offers a free shuttle to Gotemba Station every two hours.',
    answer:'That is very convenient. What time is the first shuttle?',
    wrongs:['I have a rental car.','I prefer a taxi.'], hint:'BrightonStar'},
  {question:'Our spa offers a 90-minute Mt. Fuji Mineral Therapy package.',
    answer:"I would love to try that! Is it available tomorrow morning?",
    wrongs:['I do not use spas.','The price is too high.'], hint:'BrightonStar'},
  {question:'For guests staying three or more nights, we offer a complimentary sake tasting session.',
    answer:'I am staying four nights, so I qualify—when is the session?',
    wrongs:['I do not drink alcohol.','I prefer wine.'], hint:'BrightonStar'},
  {question:'Our rooftop stargazing session runs on clear nights from 8 to 10 PM.',
    answer:'How magical! Is equipment provided?',
    wrongs:['I prefer the lobby.','I have a telescope.'], hint:'BrightonStar'},
  {question:'We can arrange a private cooking class with our head chef on Saturdays.',
    answer:'Excellent! Can two people join? My partner loves cooking.',
    wrongs:['I prefer watching.','The kitchen is small.'], hint:'BrightonStar'},
  {question:'Your suite includes a private outdoor Jacuzzi with an unobstructed Fuji view.',
    answer:'That is incredible! What are the operating hours?',
    wrongs:['I prefer an indoor bath.','I need a towel.'], hint:'BrightonStar'},
  {question:'We can deliver a traditional Japanese tea ceremony experience to your room.',
    answer:'That sounds delightful—can we schedule it for tomorrow afternoon?',
    wrongs:['I prefer coffee.','The ceremony is long.'], hint:'BrightonStar'},
];
// QA Lv19: BrightonStar クレーム・高度対応
const QA19: QAItem[] = [
  {question:"I'm quite dissatisfied with the service I received at check-in.",
    answer:'I sincerely apologize. Could you tell me what happened so I can address it personally?',
    wrongs:['I need a manager.','The staff was rude.'], hint:'BrightonStar'},
  {question:"The view from my room is completely blocked by a construction crane.",
    answer:'I am terribly sorry—that is not the experience we promised. Let me move you to a superior room at no charge.',
    wrongs:['I need a refund.','The crane will move soon.'], hint:'BrightonStar'},
  {question:"We found the outdoor onsen closed without any prior notice.",
    answer:'Please accept our sincere apologies. There was an urgent maintenance issue. We will offer a complimentary spa treatment as compensation.',
    wrongs:['The onsen was open.','I need a schedule.'], hint:'BrightonStar'},
  {question:"The food at tonight's dinner was not up to the standard I expected.",
    answer:'I am deeply sorry to hear this. Your feedback will be passed directly to our executive chef tonight.',
    wrongs:['I need a discount.','The menu is limited.'], hint:'BrightonStar'},
  {question:"We've been waiting over 40 minutes for our room service order.",
    answer:'I profoundly apologize for this wait. The meal is on us tonight—it will arrive within ten minutes.',
    wrongs:['I need a menu.','The food is coming.'], hint:'BrightonStar'},
  {question:"There seems to be a billing discrepancy on my final invoice.",
    answer:'I apologize for the inconvenience. Could you point out the item? I will correct it immediately and email you a revised invoice.',
    wrongs:['I need a receipt.','The price is correct.'], hint:'BrightonStar'},
  {question:"My personal items were not returned after room cleaning.",
    answer:'I am so sorry. I will contact housekeeping at once and ensure your belongings are returned.',
    wrongs:['I need insurance.','The items are mine.'], hint:'BrightonStar'},
  {question:"The level of noise from the events room last night was unacceptable.",
    answer:'You have my unreserved apology. I will ensure an appropriate noise policy is enforced tonight.',
    wrongs:['I need earplugs.','The event was nice.'], hint:'BrightonStar'},
  {question:"I specifically requested a hypoallergenic pillow and it was not provided.",
    answer:'I am truly sorry for overlooking your request. I will bring one to your room right now.',
    wrongs:['I need a blanket.','The pillow is fine.'], hint:'BrightonStar'},
  {question:"Overall, I feel the price does not match the quality of experience.",
    answer:'Your feedback is invaluable and I take full responsibility. I would like to offer you a 20% discount on your stay and a complimentary night for your next visit.',
    wrongs:['I need a refund.','The quality is high.'], hint:'BrightonStar'},
];
// QA Lv20: BrightonStar 最上位ホスピタリティ
const QA20: QAItem[] = [
  {question:"We are celebrating our 25th wedding anniversary. Could you arrange something truly memorable?",
    answer:'Congratulations! We will prepare a private candlelit dinner on the terrace with Mt. Fuji illuminated, plus rose petals in your suite.',
    wrongs:['We need a cake.','We prefer the restaurant.'], hint:'BrightonStar'},
  {question:"I am writing an article for a luxury travel magazine. Could I speak with the general manager?",
    answer:'Of course! Our GM, Mr. Takahashi, would be delighted. Shall I arrange a meeting at your convenience?',
    wrongs:['I need a press kit.','The manager is busy.'], hint:'BrightonStar'},
  {question:"We would like to host a private corporate incentive event for 30 guests.",
    answer:'Excellent! We have an exclusive garden pavilion with full A/V, and our events team can craft a bespoke Mt. Fuji viewing experience.',
    wrongs:['I need a meeting room.','The group is small.'], hint:'BrightonStar'},
  {question:"Could you arrange a helicopter tour over Mt. Fuji for tomorrow morning?",
    answer:'Absolutely. We partner with Fuji Air Excursions—I will confirm a 7 AM departure and arrange transfers from the hotel.',
    wrongs:['I need a tour bus.','The weather is bad.'], hint:'BrightonStar'},
  {question:"Our guest has severe mobility challenges. How can BrightonStar accommodate?",
    answer:'We are fully equipped. Our accessible suite on the ground floor has roll-in shower, wide doorways, and direct garden access with a Mt. Fuji view.',
    wrongs:['I need a wheelchair.','The room is on one floor.'], hint:'BrightonStar'},
  {question:"I noticed BrightonStar is featured in the new Michelin Guide. Which dishes do you recommend?",
    answer:'Our signature dish is the Shizuoka wagyu with Fuji mineral water broth—Michelin highlighted it specifically. The seasonal kaiseki menu is also superb.',
    wrongs:['I prefer Italian food.','The guide is outdated.'], hint:'BrightonStar'},
  {question:"Could we have our wedding ceremony here with a backdrop of Mt. Fuji?",
    answer:'What a beautiful vision! Our garden chapel seats up to 60 guests and frames Mt. Fuji perfectly at noon. Our wedding coordinator will walk you through all options.',
    wrongs:['I need a church.','The garden is private.'], hint:'BrightonStar'},
  {question:"We require butler service throughout our three-night stay.",
    answer:'Certainly. Your dedicated butler, Kenji, will be assigned from arrival. He will be available 24 hours via your in-room tablet.',
    wrongs:['I need room service.','The service is included.'], hint:'BrightonStar'},
  {question:"Could you source a specific vintage of wine unavailable in Japan?",
    answer:"Of course—our sommelier has strong import connections. Please share the label details and we will endeavour to source it within 48 hours.",
    wrongs:['I prefer sake.','The wine is common.'], hint:'BrightonStar'},
  {question:"We would like to depart at 3 AM for a Mt. Fuji sunrise climb. Can the hotel support this?",
    answer:'Absolutely. We will prepare a packed mountain breakfast, arrange a 2:45 AM shuttle to the 5th Station, and have warming drinks ready for your return.',
    wrongs:['I need a guide.','The climb is difficult.'], hint:'BrightonStar'},
];

const QA_LEVELS: QAItem[][] = [QA1,QA2,QA3,QA4,QA5,QA6,QA7,QA8,QA9,QA10,QA11,QA12,QA13,QA14,QA15,QA16,QA17,QA18,QA19,QA20];

// ─────────────────────────────────────────────────────────────────
// 称賛メッセージ
// ─────────────────────────────────────────────────────────────────
const PRAISES = [
  {text:'Excellent! 🌟',speech:'Excellent!'},{text:'Great! 🎉',speech:'Great!'},
  {text:'Perfect! ✨', speech:'Perfect!'}, {text:'Amazing! 🔥',speech:'Amazing!'},
  {text:'Super! 👏',   speech:'Super!'},   {text:'Wonderful! 🎊',speech:'Wonderful!'},
  {text:'Nice! 💪',   speech:'Nice!'},
];
function randomPraise() { return PRAISES[Math.floor(Math.random() * PRAISES.length)]; }

// ─────────────────────────────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function speakText(text: string, onEnd?: () => void, rate = 0.88): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return; }
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US'; utt.rate = rate; utt.pitch = 1.05; utt.volume = 1.0;
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

function popFromDeck<T>(deckRef: React.MutableRefObject<T[]>, pool: T[]): T {
  if (deckRef.current.length === 0) deckRef.current = shuffle([...pool]);
  return deckRef.current.pop() as T;
}

// ─────────────────────────────────────────────────────────────────
// 3択構築（正解位置シャッフル保証）
// ─────────────────────────────────────────────────────────────────
interface WordQuiz { correct: Word; choices: string[]; }
function buildWordQuiz(correct: Word, pool: Word[]): WordQuiz {
  const dist  = pool.filter(w => w.en !== correct.en && w.ja !== correct.ja);
  const wrongs = shuffle(dist).slice(0, 2).map(w => w.ja);
  const fb     = ['その他','わかりません','ちがう'];
  while (wrongs.length < 2) wrongs.push(fb[wrongs.length]);
  return { correct, choices: shuffle([correct.ja, ...wrongs]) };
}

interface QAQuiz extends QAItem { choices: string[]; }
function buildQAQuiz(item: QAItem): QAQuiz {
  return { ...item, choices: shuffle([item.answer, item.wrongs[0], item.wrongs[1]]) };
}

// ─────────────────────────────────────────────────────────────────
// BasicWordsMode — level state で useEffect([level]) を駆動
// ─────────────────────────────────────────────────────────────────
function BasicWordsMode({ onCorrect }: { onCorrect: () => void }) {
  const [combo,    setCombo]    = useState(0);
  const [level,    setLevel]    = useState(1);
  const [quiz,     setQuiz]     = useState<WordQuiz | null>(null);
  const [result,   setResult]   = useState<'correct'|'wrong'|null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [ready,    setReady]    = useState(false);
  const deckRef = useRef<Word[]>([]);

  // ① 初回のみ: localStorage 復元 → 初期デッキ構築
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_WORDS);
      const n    = raw ? (JSON.parse(raw) as number) : 0;
      const lv   = getLevel(n);
      const pool = WORD_LEVELS[lv - 1];
      deckRef.current = shuffle([...pool]);
      setCombo(n);
      setLevel(lv);
      setQuiz(buildWordQuiz(deckRef.current.pop()!, pool));
    } catch {
      deckRef.current = shuffle([...W1]);
      setQuiz(buildWordQuiz(deckRef.current.pop()!, W1));
    }
    setReady(true);
  }, []);

  // ② レベルが変わった時だけ新しいプールのデッキを生成し最初の1問を出す
  useEffect(() => {
    if (!ready) return;
    const pool      = WORD_LEVELS[level - 1];
    deckRef.current = shuffle([...pool]);
    setQuiz(buildWordQuiz(deckRef.current.pop()!, pool));
    setResult(null);
    setLocked(false);
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  const playWord = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speakText(quiz.correct.en, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => {
    if (quiz) { setShowText(false); playWord(); }
  }, [quiz?.correct.en]); // eslint-disable-line

  const handleTap = (ja: string) => {
    if (locked || !quiz) return;
    if (ja === quiz.correct.ja) {
      setResult('correct'); setLocked(true);
      const newCombo = combo + 1;
      setCombo(newCombo);
      try { localStorage.setItem(LS_WORDS, JSON.stringify(newCombo)); } catch { /**/ }
      onCorrect();

      const newLevel = getLevel(newCombo);
      if (newLevel !== level) {
        // レベルアップ → useEffect([level]) がデッキを作り直す
        setTimeout(() => setLevel(newLevel), CORRECT_DELAY);
      } else {
        // 同レベル → 現在のデッキから次の1枚
        setTimeout(() => {
          const pool = WORD_LEVELS[level - 1];
          setQuiz(buildWordQuiz(popFromDeck(deckRef, pool), pool));
          setResult(null); setLocked(false);
        }, CORRECT_DELAY);
      }
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  const handleSkip = () => {
    const pool = WORD_LEVELS[level - 1];
    setQuiz(buildWordQuiz(popFromDeck(deckRef, pool), pool));
    setResult(null); setLocked(false);
  };

  if (!ready || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const threshold = nextThreshold(combo);
  const lvStart   = LEVEL_THRESHOLDS[level - 1];
  const lvEnd     = threshold ?? lvStart + 1;
  const pct       = Math.min(100, ((combo - lvStart) / (lvEnd - lvStart)) * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* レベル表示 */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-black text-indigo-700">Level {level} / 20</span>
          <span className="text-xs font-bold text-indigo-400">
            {threshold ? `あと ${threshold - combo} 問でLevel ${level + 1}` : '🏆 MAX LEVEL'}
          </span>
        </div>
        <div className="w-full h-3 bg-indigo-100 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-indigo-400">正解 {combo} 問</span>
          <span className="text-[10px] text-indigo-300">山札残 {deckRef.current.length} 枚</span>
        </div>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">日本語の意味はどれ？</p>
        <button onClick={playWord}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-blue-400 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          <span className="text-2xl">🔊</span>
          <span className="text-sm">{speaking ? '再生中…' : 'もう一度聴く'}</span>
        </button>
        <button onClick={() => setShowText(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
            showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
          {showText ? '🙈 かくす' : '👁️ テキストを見る'}
        </button>
        {showText && (
          <div className="px-5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-2xl font-black text-amber-800">{quiz.correct.emoji}</p>
            <p className="text-xl font-black text-amber-700 mt-1">{quiz.correct.en}</p>
          </div>
        )}
        {result === 'wrong' && <p className="text-gray-500 font-bold text-sm">Try again 💪</p>}
      </div>

      {/* 3択 */}
      <div className="flex flex-col gap-3">
        {quiz.choices.map((ja, idx) => (
          <button key={idx} onPointerDown={() => handleTap(ja)} disabled={locked}
            className={`w-full px-5 py-4 rounded-2xl text-center font-black text-lg border transition-all active:scale-[0.98] shadow-sm select-none ${
              result === 'correct' && ja === quiz.correct.ja
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                : locked ? 'bg-gray-100 border-gray-200 text-gray-400'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300'}`}
            style={{ WebkitTapHighlightColor:'transparent', touchAction:'none' }}>
            {ja}
          </button>
        ))}
      </div>
      <button onClick={handleSkip}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm transition-all">
        スキップ →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// QAModeSimple — level state で useEffect([level]) を駆動
// ─────────────────────────────────────────────────────────────────
function QAModeSimple({ onCorrect }: { onCorrect: () => void }) {
  const [combo,    setCombo]    = useState(0);
  const [level,    setLevel]    = useState(1);
  const [quiz,     setQuiz]     = useState<QAQuiz | null>(null);
  const [result,   setResult]   = useState<'correct'|'wrong'|null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [ready,    setReady]    = useState(false);
  const deckRef = useRef<QAItem[]>([]);

  // ① 初回のみ
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_QA);
      const n    = raw ? (JSON.parse(raw) as number) : 0;
      const lv   = getLevel(n);
      const pool = QA_LEVELS[lv - 1];
      deckRef.current = shuffle([...pool]);
      setCombo(n);
      setLevel(lv);
      setQuiz(buildQAQuiz(deckRef.current.pop()!));
    } catch {
      deckRef.current = shuffle([...QA1]);
      setQuiz(buildQAQuiz(deckRef.current.pop()!));
    }
    setReady(true);
  }, []);

  // ② レベル変化時のみデッキを再構築
  useEffect(() => {
    if (!ready) return;
    const pool      = QA_LEVELS[level - 1];
    deckRef.current = shuffle([...pool]);
    setQuiz(buildQAQuiz(deckRef.current.pop()!));
    setResult(null);
    setLocked(false);
  }, [level]); // eslint-disable-line react-hooks/exhaustive-deps

  const playQuestion = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speakText(quiz.question, () => setSpeaking(false), 0.84);
  }, [quiz]);

  useEffect(() => {
    if (quiz) { setResult(null); setLocked(false); setShowText(false); playQuestion(); }
  }, [quiz?.question]); // eslint-disable-line

  const handleTap = (choice: string) => {
    if (locked || !quiz) return;
    if (choice === quiz.answer) {
      setResult('correct'); setLocked(true);
      const newCombo = combo + 1;
      setCombo(newCombo);
      try { localStorage.setItem(LS_QA, JSON.stringify(newCombo)); } catch { /**/ }
      onCorrect();

      const newLevel = getLevel(newCombo);
      if (newLevel !== level) {
        setTimeout(() => setLevel(newLevel), CORRECT_DELAY);
      } else {
        setTimeout(() => {
          const pool = QA_LEVELS[level - 1];
          setQuiz(buildQAQuiz(popFromDeck(deckRef, pool)));
          setResult(null); setLocked(false);
        }, CORRECT_DELAY);
      }
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  const handleSkip = () => {
    const pool = QA_LEVELS[level - 1];
    setQuiz(buildQAQuiz(popFromDeck(deckRef, pool)));
    setResult(null); setLocked(false);
  };

  if (!ready || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const threshold = nextThreshold(combo);
  const lvStart   = LEVEL_THRESHOLDS[level - 1];
  const lvEnd     = threshold ?? lvStart + 1;
  const pct       = Math.min(100, ((combo - lvStart) / (lvEnd - lvStart)) * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* レベル表示 */}
      <div className="bg-teal-50 border border-teal-100 rounded-2xl px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-black text-teal-700">Level {level} / 20</span>
          <span className="text-xs font-bold text-teal-400">
            {threshold ? `あと ${threshold - combo} 問でLevel ${level + 1}` : '🏆 MAX LEVEL'}
          </span>
        </div>
        <div className="w-full h-3 bg-teal-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-teal-400">正解 {combo} 問</span>
          <span className="text-[10px] text-teal-300">山札残 {deckRef.current.length} 枚</span>
        </div>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">正しい返答を選んでね</p>
        {quiz.hint && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">{quiz.hint}</span>
        )}
        <button onClick={playQuestion}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-teal-400 text-white animate-pulse' : 'bg-teal-600 hover:bg-teal-700 text-white'}`}>
          <span className="text-2xl">🔊</span>
          <span className="text-sm">{speaking ? '再生中…' : 'もう一度聴く'}</span>
        </button>
        <button onClick={() => setShowText(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
            showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
          {showText ? '🙈 かくす' : '👁️ 英文を見る'}
        </button>
        {showText && (
          <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800 text-center leading-relaxed">{quiz.question}</p>
          </div>
        )}
        {result === 'wrong' && <p className="text-gray-500 font-bold text-sm">Try again 💪</p>}
      </div>

      {/* 3択 */}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => (
          <button key={idx} onPointerDown={() => handleTap(choice)} disabled={locked}
            className={`w-full px-4 py-3.5 rounded-2xl text-left font-semibold text-sm leading-snug border transition-all active:scale-[0.98] shadow-sm select-none ${
              result === 'correct' && choice === quiz.answer
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                : locked ? 'bg-gray-100 border-gray-200 text-gray-400'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-teal-50 hover:border-teal-300'}`}
            style={{ WebkitTapHighlightColor:'transparent', touchAction:'none' }}>
            <span className="text-gray-400 font-black mr-2">{['A','B','C'][idx]}.</span>
            {choice}
          </button>
        ))}
      </div>
      <button onClick={handleSkip}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm transition-all">
        スキップ →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BabyImmersion — ルートコンポーネント
// ─────────────────────────────────────────────────────────────────
type ImMode = 'words' | 'qa';

export function BabyImmersion() {
  const [mode,      setMode]      = useState<ImMode>('words');
  const [celebText, setCelebText] = useState('');
  const [showCeleb, setShowCeleb] = useState(false);

  const celebrate = useCallback(() => {
    const p = randomPraise();
    setCelebText(p.text);
    setShowCeleb(true);
    speakText(p.speech, undefined, 1.0);
    setTimeout(() => setShowCeleb(false), 900);
  }, []);

  const switchMode = (m: ImMode) => {
    window.speechSynthesis?.cancel();
    setMode(m);
  };

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        {([
          ['words','📝','単語3択', 'Basic Words'],
          ['qa',   '💬','会話Q&A','Conversation'],
        ] as [ImMode,string,string,string][]).map(([m,icon,label,sub]) => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              mode === m
                ? m === 'words' ? 'bg-blue-600 text-white shadow-md' : 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'}`}>
            <span className="block">{icon} {label}</span>
            <span className={`block text-[9px] mt-0.5 ${mode === m ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {mode === 'words' ? <BasicWordsMode onCorrect={celebrate} /> : <QAModeSimple onCorrect={celebrate} />}

      {showCeleb && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-yellow-400 text-white font-black px-10 py-6 rounded-3xl shadow-2xl animate-bounce"
            style={{ fontSize:'clamp(1.8rem,8vw,2.8rem)' }}>
            {celebText}
          </div>
        </div>
      )}
    </div>
  );
}
