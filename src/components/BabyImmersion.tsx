'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────
const CORRECT_DELAY = 380; // 正解→次問 (ms)

// ─────────────────────────────────────────────────────────────────
// レベルアップ閾値（正解累計 → Level 1〜20）
// ─────────────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = [0,5,10,15,20,26,33,41,50,60,71,83,96,110,125,141,158,176,195,215];
// index 0 → Level 1 starts at 0 correct, index 19 → Level 20 starts at 215

function getLevel(combo: number): number {
  let lv = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (combo >= LEVEL_THRESHOLDS[i]) lv = i + 1;
    else break;
  }
  return lv;
}

function nextThreshold(combo: number): number | null {
  const lv = getLevel(combo);
  return lv < 20 ? LEVEL_THRESHOLDS[lv] : null;
}

// ─────────────────────────────────────────────────────────────────
// 単語データ — 20 Level × 21語 = 420語
// ─────────────────────────────────────────────────────────────────
interface Word { en: string; emoji: string; ja: string; }

// ── Level 1〜5: 超基礎（中学レベル）────────────────────────────
const L1: Word[] = [
  {en:'apple',    emoji:'🍎',ja:'りんご'},      {en:'dog',      emoji:'🐶',ja:'いぬ'},
  {en:'cat',      emoji:'🐱',ja:'ねこ'},        {en:'run',      emoji:'🏃',ja:'はしる'},
  {en:'big',      emoji:'🐘',ja:'おおきい'},    {en:'small',    emoji:'🐭',ja:'ちいさい'},
  {en:'eat',      emoji:'🍽️',ja:'たべる'},     {en:'drink',    emoji:'🥤',ja:'のむ'},
  {en:'go',       emoji:'➡️',ja:'いく'},        {en:'see',      emoji:'👁️',ja:'みる'},
  {en:'red',      emoji:'🔴',ja:'あか'},        {en:'blue',     emoji:'🔵',ja:'あお'},
  {en:'sun',      emoji:'☀️',ja:'たいよう'},    {en:'water',    emoji:'💧',ja:'みず'},
  {en:'book',     emoji:'📚',ja:'ほん'},        {en:'yes',      emoji:'✅',ja:'はい'},
  {en:'no',       emoji:'❌',ja:'いいえ'},      {en:'happy',    emoji:'😄',ja:'うれしい'},
  {en:'sad',      emoji:'😢',ja:'かなしい'},    {en:'day',      emoji:'📅',ja:'ひ'},
  {en:'night',    emoji:'🌙',ja:'よる'},
];
const L2: Word[] = [
  {en:'banana',   emoji:'🍌',ja:'バナナ'},      {en:'bird',     emoji:'🐦',ja:'とり'},
  {en:'car',      emoji:'🚗',ja:'くるま'},      {en:'fish',     emoji:'🐟',ja:'さかな'},
  {en:'moon',     emoji:'🌙',ja:'つき'},        {en:'star',     emoji:'⭐',ja:'ほし'},
  {en:'house',    emoji:'🏠',ja:'いえ'},        {en:'school',   emoji:'🏫',ja:'がっこう'},
  {en:'walk',     emoji:'🚶',ja:'あるく'},      {en:'sleep',    emoji:'😴',ja:'ねる'},
  {en:'play',     emoji:'🎮',ja:'あそぶ'},      {en:'read',     emoji:'📖',ja:'よむ'},
  {en:'write',    emoji:'✏️',ja:'かく'},        {en:'hot',      emoji:'🔥',ja:'あつい'},
  {en:'cold',     emoji:'🥶',ja:'さむい'},      {en:'good',     emoji:'👍',ja:'よい'},
  {en:'bad',      emoji:'👎',ja:'わるい'},      {en:'open',     emoji:'🔓',ja:'あける'},
  {en:'close',    emoji:'🔒',ja:'しめる'},      {en:'friend',   emoji:'🤝',ja:'ともだち'},
  {en:'name',     emoji:'🏷️',ja:'なまえ'},
];
const L3: Word[] = [
  {en:'bread',    emoji:'🍞',ja:'パン'},        {en:'rice',     emoji:'🍚',ja:'ごはん'},
  {en:'milk',     emoji:'🥛',ja:'ぎゅうにゅう'},{en:'tree',     emoji:'🌳',ja:'き'},
  {en:'flower',   emoji:'🌸',ja:'はな'},        {en:'rain',     emoji:'🌧️',ja:'あめ'},
  {en:'bus',      emoji:'🚌',ja:'バス'},        {en:'train',    emoji:'🚂',ja:'でんしゃ'},
  {en:'door',     emoji:'🚪',ja:'ドア'},        {en:'table',    emoji:'🪑',ja:'テーブル'},
  {en:'mother',   emoji:'👩',ja:'おかあさん'},  {en:'father',   emoji:'👨',ja:'おとうさん'},
  {en:'white',    emoji:'⬜',ja:'しろ'},        {en:'black',    emoji:'⬛',ja:'くろ'},
  {en:'fast',     emoji:'⚡',ja:'はやい'},      {en:'slow',     emoji:'🐢',ja:'おそい'},
  {en:'new',      emoji:'🆕',ja:'あたらしい'},  {en:'old',      emoji:'🏚️',ja:'ふるい'},
  {en:'money',    emoji:'💴',ja:'おかね'},      {en:'time',     emoji:'⏰',ja:'じかん'},
  {en:'music',    emoji:'🎵',ja:'おんがく'},
];
const L4: Word[] = [
  {en:'orange',   emoji:'🍊',ja:'オレンジ'},    {en:'coffee',   emoji:'☕',ja:'コーヒー'},
  {en:'hospital', emoji:'🏥',ja:'びょういん'},  {en:'airport',  emoji:'✈️',ja:'くうこう'},
  {en:'kitchen',  emoji:'🍳',ja:'だいどころ'},  {en:'city',     emoji:'🏙️',ja:'まち'},
  {en:'river',    emoji:'🌊',ja:'かわ'},        {en:'mountain', emoji:'⛰️',ja:'やま'},
  {en:'morning',  emoji:'🌅',ja:'あさ'},        {en:'evening',  emoji:'🌆',ja:'ゆうがた'},
  {en:'color',    emoji:'🎨',ja:'いろ'},        {en:'game',     emoji:'🎮',ja:'ゲーム'},
  {en:'story',    emoji:'📖',ja:'はなし'},      {en:'warm',     emoji:'🌡️',ja:'あたたかい'},
  {en:'clean',    emoji:'✨',ja:'きれいな'},    {en:'dirty',    emoji:'🗑️',ja:'きたない'},
  {en:'strong',   emoji:'💪',ja:'つよい'},      {en:'weak',     emoji:'😔',ja:'よわい'},
  {en:'near',     emoji:'📍',ja:'ちかい'},      {en:'far',      emoji:'🔭',ja:'とおい'},
  {en:'number',   emoji:'🔢',ja:'かず'},
];
const L5: Word[] = [
  {en:'travel',    emoji:'🧳',ja:'たびをする'},  {en:'dream',    emoji:'💭',ja:'ゆめ'},
  {en:'question',  emoji:'❓',ja:'しつもん'},    {en:'answer',   emoji:'💡',ja:'こたえ'},
  {en:'problem',   emoji:'⚠️',ja:'もんだい'},    {en:'success',  emoji:'🏆',ja:'せいこう'},
  {en:'enjoy',     emoji:'😊',ja:'たのしむ'},    {en:'believe',  emoji:'🙏',ja:'しんじる'},
  {en:'remember',  emoji:'🧠',ja:'おぼえる'},    {en:'forget',   emoji:'🤔',ja:'わすれる'},
  {en:'beautiful', emoji:'✨',ja:'うつくしい'},  {en:'exciting', emoji:'🎉',ja:'わくわくする'},
  {en:'boring',    emoji:'😑',ja:'たいくつな'},  {en:'difficult',emoji:'🤯',ja:'むずかしい'},
  {en:'easy',      emoji:'😊',ja:'かんたんな'},  {en:'busy',     emoji:'💼',ja:'いそがしい'},
  {en:'free',      emoji:'🕊️',ja:'じゆうな'},   {en:'safe',     emoji:'🛡️',ja:'あんぜんな'},
  {en:'dangerous', emoji:'⚡',ja:'きけんな'},    {en:'popular',  emoji:'⭐',ja:'にんきのある'},
  {en:'special',   emoji:'🌟',ja:'とくべつな'},
];

// ── Level 6〜10: 高校基礎（Target 1900 前半）──────────────────
const L6: Word[] = [
  {en:'achieve',   emoji:'🏆',ja:'たっせいする'},  {en:'consider', emoji:'💭',ja:'かんがえる'},
  {en:'describe',  emoji:'📝',ja:'せつめいする'},  {en:'discuss',  emoji:'💬',ja:'ぎろんする'},
  {en:'explain',   emoji:'🗣️',ja:'せつめいする'}, {en:'expect',   emoji:'🤞',ja:'きたいする'},
  {en:'imagine',   emoji:'💭',ja:'そうぞうする'},  {en:'improve',  emoji:'📈',ja:'かいぜんする'},
  {en:'include',   emoji:'➕',ja:'ふくむ'},        {en:'increase', emoji:'🔼',ja:'ふやす'},
  {en:'reduce',    emoji:'🔽',ja:'へらす'},        {en:'prepare',  emoji:'📋',ja:'じゅんびする'},
  {en:'provide',   emoji:'🤝',ja:'ていきょうする'},{en:'require',  emoji:'📌',ja:'ひつようとする'},
  {en:'compare',   emoji:'⚖️',ja:'くらべる'},      {en:'create',   emoji:'🎨',ja:'つくる'},
  {en:'develop',   emoji:'📈',ja:'はったつさせる'},{en:'manage',   emoji:'📊',ja:'かんりする'},
  {en:'support',   emoji:'🤝',ja:'しえんする'},    {en:'choose',   emoji:'✅',ja:'えらぶ'},
  {en:'suggest',   emoji:'💡',ja:'ていあんする'},
];
const L7: Word[] = [
  {en:'benefit',   emoji:'✅',ja:'りえき・メリット'},{en:'challenge',emoji:'💪',ja:'ちょうせん'},
  {en:'effort',    emoji:'🏋️',ja:'どりょく'},      {en:'factor',   emoji:'📊',ja:'ようそ'},
  {en:'focus',     emoji:'🎯',ja:'しゅうちゅうする'},{en:'maintain', emoji:'🔧',ja:'いじする'},
  {en:'involve',   emoji:'🔗',ja:'ふくむ・かかわる'},{en:'obtain',   emoji:'📥',ja:'える'},
  {en:'limit',     emoji:'🚧',ja:'せいげんする'},   {en:'avoid',    emoji:'🚫',ja:'さける'},
  {en:'admit',     emoji:'🚪',ja:'みとめる'},       {en:'allow',    emoji:'✔️',ja:'きょかする'},
  {en:'apply',     emoji:'📄',ja:'もうしこむ'},     {en:'attempt',  emoji:'🎯',ja:'こころみる'},
  {en:'attract',   emoji:'🧲',ja:'ひきつける'},     {en:'cause',    emoji:'⚡',ja:'ひきおこす'},
  {en:'combine',   emoji:'🔗',ja:'くみあわせる'},   {en:'connect',  emoji:'🔌',ja:'つなぐ'},
  {en:'continue',  emoji:'▶️',ja:'つづける'},       {en:'control',  emoji:'🎛️',ja:'コントロールする'},
  {en:'relate',    emoji:'↔️',ja:'かんけいする'},
];
const L8: Word[] = [
  {en:'analyze',   emoji:'🔬',ja:'ぶんせきする'},  {en:'approach', emoji:'🚶',ja:'アプローチ'},
  {en:'confirm',   emoji:'✅',ja:'かくにんする'},   {en:'identify', emoji:'🔍',ja:'みわける'},
  {en:'indicate',  emoji:'👉',ja:'しめす'},         {en:'influence',emoji:'💫',ja:'えいきょうする'},
  {en:'measure',   emoji:'📏',ja:'はかる'},          {en:'produce',  emoji:'🏭',ja:'せいさんする'},
  {en:'promote',   emoji:'📢',ja:'しょうしんさせる'},{en:'protect',  emoji:'🛡️',ja:'まもる'},
  {en:'recognize', emoji:'💡',ja:'みとめる・にんしきする'},{en:'remove',   emoji:'🗑️',ja:'とりのぞく'},
  {en:'replace',   emoji:'🔄',ja:'とりかえる'},     {en:'respond',  emoji:'💬',ja:'はんのうする'},
  {en:'review',    emoji:'📋',ja:'みなおす'},        {en:'seek',     emoji:'🔍',ja:'もとめる'},
  {en:'select',    emoji:'☑️',ja:'えらびだす'},     {en:'separate', emoji:'↔️',ja:'わける'},
  {en:'solve',     emoji:'🔧',ja:'といて解決する'}, {en:'spread',   emoji:'📡',ja:'ひろがる'},
  {en:'transfer',  emoji:'🔀',ja:'うつす'},
];
const L9: Word[] = [
  {en:'acquire',   emoji:'📥',ja:'しゅうとくする'}, {en:'adapt',    emoji:'🔄',ja:'てきおうする'},
  {en:'assess',    emoji:'📊',ja:'ひょうかする'},   {en:'assume',   emoji:'💭',ja:'かていする'},
  {en:'conclude',  emoji:'✅',ja:'けつろんづける'},  {en:'conduct',  emoji:'🎯',ja:'おこなう'},
  {en:'define',    emoji:'📖',ja:'ていぎする'},     {en:'determine',emoji:'🔍',ja:'けっていする'},
  {en:'estimate',  emoji:'📐',ja:'みつもる'},        {en:'evaluate', emoji:'⚖️',ja:'ひょうかする'},
  {en:'examine',   emoji:'🔬',ja:'しらべる'},        {en:'execute',  emoji:'▶️',ja:'じっこうする'},
  {en:'expand',    emoji:'📈',ja:'かくだいする'},    {en:'express',  emoji:'🗣️',ja:'ひょうげんする'},
  {en:'generate',  emoji:'⚡',ja:'うみだす'},        {en:'highlight',emoji:'✨',ja:'めだたせる'},
  {en:'illustrate',emoji:'🖼️',ja:'せつめいする'},   {en:'implement',emoji:'🔧',ja:'じっしする'},
  {en:'interpret', emoji:'🌐',ja:'かいしゃくする'}, {en:'justify',  emoji:'⚖️',ja:'せいとうかする'},
  {en:'monitor',   emoji:'📺',ja:'かんしする'},
];
const L10: Word[] = [
  {en:'acquisition',emoji:'📥',ja:'しゅうとく'},   {en:'argument',  emoji:'💬',ja:'ぎろん・いけん'},
  {en:'assessment', emoji:'📊',ja:'ひょうか'},      {en:'category',  emoji:'📂',ja:'カテゴリ'},
  {en:'concept',    emoji:'💡',ja:'がいねん'},      {en:'consequence',emoji:'⚡',ja:'けっか'},
  {en:'context',    emoji:'📖',ja:'もとにある状況'},{en:'evidence',  emoji:'🔍',ja:'しょうこ'},
  {en:'feature',    emoji:'⭐',ja:'とくちょう'},    {en:'function',  emoji:'⚙️',ja:'きのう'},
  {en:'impact',     emoji:'💥',ja:'えいきょう'},    {en:'instance',  emoji:'📌',ja:'れい'},
  {en:'issue',      emoji:'❗',ja:'もんだい・課題'},{en:'outcome',   emoji:'🏁',ja:'けっか'},
  {en:'pattern',    emoji:'🔢',ja:'パターン'},      {en:'principle', emoji:'📜',ja:'げんり'},
  {en:'process',    emoji:'🔄',ja:'プロセス'},       {en:'purpose',   emoji:'🎯',ja:'もくてき'},
  {en:'resource',   emoji:'📦',ja:'しげん'},         {en:'role',      emoji:'🎭',ja:'やくわり'},
  {en:'structure',  emoji:'🏗️',ja:'こうぞう'},
];

// ── Level 11〜15: 大学受験・TOEIC 600（Target 1900 中盤）────
const L11: Word[] = [
  {en:'accommodate',emoji:'🏨',ja:'しゅくはくさせる・みたす'},{en:'adequate',   emoji:'✅',ja:'じゅうぶんな'},
  {en:'allocate',   emoji:'📊',ja:'わりあてる'},    {en:'colleague',  emoji:'👔',ja:'どうりょう'},
  {en:'competent',  emoji:'💪',ja:'かいのうな'},    {en:'comply',     emoji:'✔️',ja:'したがう'},
  {en:'comprehensive',emoji:'📚',ja:'ほうかつてきな'},{en:'facilitate', emoji:'🤝',ja:'うながす'},
  {en:'incorporate',emoji:'🔗',ja:'とりいれる'},    {en:'indicate',   emoji:'👉',ja:'しめす'},
  {en:'initiate',   emoji:'🚀',ja:'はじめる'},      {en:'integrate',  emoji:'🔗',ja:'とうごうする'},
  {en:'negotiate',  emoji:'🤝',ja:'こうしょうする'},{en:'objective',  emoji:'🎯',ja:'もくてき・きゃっかんてき'},
  {en:'perceive',   emoji:'👁️',ja:'ちかくする'},    {en:'potential',  emoji:'🌱',ja:'せんざいりょく'},
  {en:'relevant',   emoji:'🔗',ja:'かんけいのある'},{en:'resolve',    emoji:'🔧',ja:'かいけつする'},
  {en:'retrieve',   emoji:'📥',ja:'とりもどす'},    {en:'significant',emoji:'❗',ja:'じゅうような'},
  {en:'strategic',  emoji:'♟️',ja:'せんりゃくてきな'},
];
const L12: Word[] = [
  {en:'acknowledge',emoji:'🙏',ja:'みとめる'},      {en:'advocate',   emoji:'📢',ja:'しじする・すいしょうする'},
  {en:'anticipate', emoji:'🔮',ja:'よそくする'},    {en:'collaborate',emoji:'🤝',ja:'きょうどうする'},
  {en:'compensate', emoji:'💰',ja:'つぐなう'},      {en:'coordinate', emoji:'📅',ja:'ちょうせいする'},
  {en:'dedicate',   emoji:'💪',ja:'ささげる'},      {en:'delegate',   emoji:'📋',ja:'いにんする'},
  {en:'demonstrate',emoji:'🎓',ja:'みせる・しょうめいする'},{en:'eligible',   emoji:'✅',ja:'しかくのある'},
  {en:'encounter',  emoji:'🤝',ja:'であう'},         {en:'fluctuate',  emoji:'📈',ja:'へんどうする'},
  {en:'formulate',  emoji:'📝',ja:'くみたてる'},    {en:'grant',      emoji:'🎁',ja:'あたえる'},
  {en:'hierarchy',  emoji:'🏛️',ja:'かいそうせい'},  {en:'innovate',   emoji:'💡',ja:'こうしんする'},
  {en:'inventory',  emoji:'📦',ja:'ざいこ'},         {en:'leverage',   emoji:'⚖️',ja:'てこのはたらき・かつようする'},
  {en:'obligation', emoji:'📜',ja:'ぎむ'},           {en:'optimize',   emoji:'⚙️',ja:'さいてきかする'},
  {en:'transparent',emoji:'🔍',ja:'とうめいな'},
];
const L13: Word[] = [
  {en:'perspective',emoji:'👁️',ja:'してん・みかた'},  {en:'preliminary',emoji:'📋',ja:'よびの・じゅんびの'},
  {en:'productive', emoji:'📈',ja:'せいさんてきな'},  {en:'propose',    emoji:'💡',ja:'ていあんする'},
  {en:'regulate',   emoji:'📜',ja:'きせいする'},       {en:'substantial',emoji:'⚖️',ja:'じつしつてきな・おおきな'},
  {en:'arbitrary',  emoji:'🎲',ja:'かってきな・にんいの'},{en:'coherent',   emoji:'🔗',ja:'いっかんした'},
  {en:'commodity',  emoji:'📦',ja:'しょうひん・にちようひん'},{en:'consensus',  emoji:'🤝',ja:'コンセンサス'},
  {en:'dilemma',    emoji:'⚖️',ja:'ジレンマ'},         {en:'explicit',   emoji:'📢',ja:'めいじてきな'},
  {en:'implicit',   emoji:'🤫',ja:'あんもくの'},       {en:'incentive',  emoji:'💰',ja:'インセンティブ'},
  {en:'manifest',   emoji:'📝',ja:'あきらかにする'},   {en:'mitigate',   emoji:'🛡️',ja:'かるくする'},
  {en:'persistent', emoji:'💪',ja:'ねばりづよい'},     {en:'privilege',  emoji:'🌟',ja:'とっけん'},
  {en:'skeptical',  emoji:'🤔',ja:'うたがいぶかい'},   {en:'supplement', emoji:'➕',ja:'おぎなう'},
  {en:'versatile',  emoji:'🔄',ja:'たようなしすい'},
];
const L14: Word[] = [
  {en:'alleviate',  emoji:'😌',ja:'かるくする・やわらげる'},{en:'articulate', emoji:'🗣️',ja:'はっきりと述べる'},
  {en:'autonomous', emoji:'🤖',ja:'じりつした'},       {en:'consolidate',emoji:'🔗',ja:'ごうへいする・かたまりにする'},
  {en:'contemplate',emoji:'💭',ja:'じっくりかんがえる'},{en:'discrepancy',emoji:'⚠️',ja:'くいちがい'},
  {en:'eloquent',   emoji:'🗣️',ja:'ゆうべんな'},       {en:'empower',    emoji:'💪',ja:'ちからをあたえる'},
  {en:'feasible',   emoji:'✅',ja:'じつこうかのうな'},  {en:'formidable', emoji:'🦁',ja:'おそるべき'},
  {en:'imminent',   emoji:'⏰',ja:'さしせまった'},      {en:'inherent',   emoji:'🧬',ja:'せいしつとしてもつ'},
  {en:'meticulous', emoji:'🔬',ja:'めいさいにわたって'},{en:'pragmatic',  emoji:'🔧',ja:'じつようてきな'},
  {en:'resilient',  emoji:'🌱',ja:'だんりょくせいのある'},{en:'scrutinize', emoji:'🔍',ja:'精しくしらべる'},
  {en:'streamline', emoji:'⚡',ja:'ごうりかする'},       {en:'profound',   emoji:'🌊',ja:'しんさんな'},
  {en:'proactive',  emoji:'🚀',ja:'せんこうてきな'},    {en:'novel',      emoji:'📖',ja:'あたらしい・小説'},
  {en:'paradigm',   emoji:'🔄',ja:'パラダイム'},
];
const L15: Word[] = [
  {en:'astute',     emoji:'🦅',ja:'めざとい'},          {en:'bolster',    emoji:'🛡️',ja:'しえんする・ほきょうする'},
  {en:'catalyst',   emoji:'⚡',ja:'しょくばい・きっかけ'},{en:'cognizant',  emoji:'🧠',ja:'じかくしている'},
  {en:'compelling', emoji:'🔥',ja:'せっとくりょくのある'},{en:'daunting',   emoji:'😰',ja:'おじけを出させる'},
  {en:'empirical',  emoji:'🔬',ja:'けいけんてきな'},     {en:'lucrative',  emoji:'💰',ja:'もうかる'},
  {en:'nuanced',    emoji:'🎨',ja:'微妙なニュアンスのある'},{en:'pivotal',    emoji:'🔑',ja:'かなめの'},
  {en:'prolific',   emoji:'📚',ja:'たさくの・たいりょうにうみだす'},{en:'tenacious',  emoji:'💪',ja:'ねばりづよい'},
  {en:'ubiquitous', emoji:'🌍',ja:'どこにでもある'},     {en:'unprecedented',emoji:'🆕',ja:'ぜんれいのない'},
  {en:'volatile',   emoji:'💥',ja:'はくはつしやすい'},   {en:'yield',      emoji:'🌾',ja:'うみだす・けっか'},
  {en:'scrutiny',   emoji:'🔍',ja:'精密なちょうさ'},     {en:'inception',  emoji:'🌱',ja:'かいし・おこり'},
  {en:'intrinsic',  emoji:'💎',ja:'本質てきな'},          {en:'pervasive',  emoji:'🌊',ja:'いきわたっている'},
  {en:'substantiate',emoji:'📋',ja:'実証する'},
];

// ── Level 16〜20: TOEIC 800-900・難関 ───────────────────────
const L16: Word[] = [
  {en:'aberrant',   emoji:'⚠️',ja:'いじょうな'},        {en:'acrimonious',emoji:'🔥',ja:'しんらつな'},
  {en:'ameliorate', emoji:'📈',ja:'かいぜんする'},       {en:'ambivalent', emoji:'⚖️',ja:'あいまいな感情を持つ'},
  {en:'burgeon',    emoji:'🌱',ja:'急成長する'},          {en:'circumvent', emoji:'🔄',ja:'かいひする'},
  {en:'convoluted', emoji:'🌀',ja:'ふくざつに絡み合った'},{en:'deliberate', emoji:'🎯',ja:'意図的な'},
  {en:'dichotomy',  emoji:'⚖️',ja:'にぶんほう'},         {en:'disparate',  emoji:'↔️',ja:'まったくちがう'},
  {en:'enumerate',  emoji:'🔢',ja:'列挙する'},            {en:'exacerbate', emoji:'📈',ja:'悪化させる'},
  {en:'exemplify',  emoji:'📌',ja:'典型を示す'},          {en:'extrapolate',emoji:'📊',ja:'外挿する'},
  {en:'fathom',     emoji:'🌊',ja:'理解する'},            {en:'galvanize',  emoji:'⚡',ja:'刺激して行動させる'},
  {en:'impede',     emoji:'🚧',ja:'じゃまをする'},        {en:'incite',     emoji:'🔥',ja:'こうふんさせる'},
  {en:'languish',   emoji:'😔',ja:'衰退する'},            {en:'mitigate',   emoji:'🛡️',ja:'軽減する'},
  {en:'negate',     emoji:'❌',ja:'否定する'},
];
const L17: Word[] = [
  {en:'obviate',    emoji:'🚫',ja:'あらかじめ防ぐ'},     {en:'oscillate',  emoji:'🔄',ja:'ゆれ動く'},
  {en:'paramount',  emoji:'👑',ja:'最高の'},              {en:'parsimonious',emoji:'💰',ja:'けちな'},
  {en:'perfunctory',emoji:'😑',ja:'おざなりな'},          {en:'placate',    emoji:'🕊️',ja:'なだめる'},
  {en:'poignant',   emoji:'💔',ja:'心に刺さる'},          {en:'precipitate',emoji:'⬇️',ja:'引き起こす'},
  {en:'proclivity', emoji:'🎯',ja:'傾向'},                {en:'reconcile',  emoji:'🤝',ja:'和解させる'},
  {en:'rectify',    emoji:'✅',ja:'修正する'},             {en:'relinquish', emoji:'🤲',ja:'手放す'},
  {en:'repudiate',  emoji:'❌',ja:'否認する'},            {en:'reticent',   emoji:'🤐',ja:'無口な'},
  {en:'rhetoric',   emoji:'🗣️',ja:'修辞'},               {en:'sanction',   emoji:'⚖️',ja:'制裁・承認する'},
  {en:'squander',   emoji:'💸',ja:'むだにする'},           {en:'stigmatize', emoji:'🏷️',ja:'非難のらく印を押す'},
  {en:'stymie',     emoji:'🚧',ja:'妨害する'},             {en:'surmount',   emoji:'🏔️',ja:'のりこえる'},
  {en:'truncate',   emoji:'✂️',ja:'短縮する'},
];
const L18: Word[] = [
  {en:'abdicate',   emoji:'👑',ja:'退位する・放棄する'},  {en:'abrogate',   emoji:'📜',ja:'廃止する'},
  {en:'acumen',     emoji:'🦅',ja:'鋭敏な判断力'},        {en:'admonish',   emoji:'☝️',ja:'いましめる'},
  {en:'affinity',   emoji:'💞',ja:'親和性'},              {en:'aggrandize', emoji:'📈',ja:'誇大にする'},
  {en:'anathema',   emoji:'🚫',ja:'忌み嫌われるもの'},   {en:'antithesis', emoji:'⚖️',ja:'正反対'},
  {en:'apocryphal', emoji:'❓',ja:'真偽不確かな'},        {en:'approbation',emoji:'✅',ja:'是認'},
  {en:'arcane',     emoji:'🔮',ja:'難解な'},              {en:'austere',    emoji:'🏔️',ja:'質素な'},
  {en:'avarice',    emoji:'💰',ja:'強欲'},                {en:'belligerent',emoji:'⚔️',ja:'好戦的な'},
  {en:'cajole',     emoji:'🤫',ja:'口ぐるまにのせる'},    {en:'callous',    emoji:'🧊',ja:'冷淡な'},
  {en:'capitulate', emoji:'🏳️',ja:'降伏する'},           {en:'castigate',  emoji:'⚡',ja:'きびしく罰する'},
  {en:'chicanery',  emoji:'🎭',ja:'ごまかし'},            {en:'coerce',     emoji:'💢',ja:'強制する'},
  {en:'cogent',     emoji:'💡',ja:'説得力のある'},
];
const L19: Word[] = [
  {en:'commensurate',emoji:'⚖️',ja:'釣り合った'},        {en:'compunction',emoji:'😔',ja:'良心の呵責'},
  {en:'contrite',   emoji:'🙏',ja:'悔い改めた'},          {en:'credulous',  emoji:'😊',ja:'信じやすい'},
  {en:'culpable',   emoji:'⚠️',ja:'有罪の'},              {en:'cupidity',   emoji:'💰',ja:'どんよく'},
  {en:'debilitate', emoji:'😴',ja:'弱体化させる'},        {en:'deference',  emoji:'🙇',ja:'敬意'},
  {en:'delineate',  emoji:'📐',ja:'描写する'},            {en:'demagogue',  emoji:'📢',ja:'扇動政治家'},
  {en:'deprecate',  emoji:'👎',ja:'非難する'},             {en:'despondent', emoji:'😞',ja:'意気消沈した'},
  {en:'diffident',  emoji:'😶',ja:'自信のない'},           {en:'dilettante', emoji:'🎨',ja:'道楽者'},
  {en:'dissonance', emoji:'🎵',ja:'不協和音'},            {en:'duplicity',  emoji:'🎭',ja:'二重性・不誠実'},
  {en:'ebullient',  emoji:'🎉',ja:'はつらつとした'},      {en:'efficacy',   emoji:'⚡',ja:'有効性'},
  {en:'effrontery', emoji:'😤',ja:'厚かましさ'},           {en:'egregious',  emoji:'😱',ja:'目に余る'},
  {en:'enervate',   emoji:'😩',ja:'気力を失わせる'},
];
const L20: Word[] = [
  {en:'enigmatic',  emoji:'❓',ja:'謎めいた'},            {en:'equanimity', emoji:'😌',ja:'平静'},
  {en:'equivocate', emoji:'🎭',ja:'言葉を濁す'},          {en:'erudite',    emoji:'📚',ja:'博学な'},
  {en:'esoteric',   emoji:'🔮',ja:'難解な・秘伝的な'},    {en:'euphemism',  emoji:'🌸',ja:'婉曲表現'},
  {en:'exculpate',  emoji:'✅',ja:'無罪を証明する'},      {en:'expedient',  emoji:'⚙️',ja:'便宜的な'},
  {en:'extraneous', emoji:'❌',ja:'無関係な'},             {en:'facetious',  emoji:'😜',ja:'不まじめな'},
  {en:'fallacious', emoji:'❌',ja:'誤った'},               {en:'fatuous',    emoji:'🤡',ja:'愚かな'},
  {en:'fervid',     emoji:'🔥',ja:'熱烈な'},              {en:'flagrant',   emoji:'🚨',ja:'目に余る'},
  {en:'garrulous',  emoji:'💬',ja:'おしゃべりな'},        {en:'grandiloquent',emoji:'👑',ja:'大げさな'},
  {en:'hapless',    emoji:'😢',ja:'不運な'},               {en:'hubris',     emoji:'😤',ja:'傲慢'},
  {en:'impugn',     emoji:'⚔️',ja:'非難する'},            {en:'inchoate',   emoji:'🌱',ja:'まだ形になっていない'},
  {en:'inimical',   emoji:'⚔️',ja:'有害な・敵対的な'},
];

// 全 Level 配列
const WORD_LEVELS: Word[][] = [L1,L2,L3,L4,L5,L6,L7,L8,L9,L10,L11,L12,L13,L14,L15,L16,L17,L18,L19,L20];

// ─────────────────────────────────────────────────────────────────
// Q&A データ — 4バンド（各20問）= 80問
// Band 1-2 → Level 1-5 / Band 3 → Level 6-15 / Band 4 → Level 16-20
// ─────────────────────────────────────────────────────────────────
interface QAItem { question: string; answer: string; wrongs: [string,string]; hint?: string; }

// ── Band 1 ── 入門（20問）
const QA_B1: QAItem[] = [
  {question:'Hello!',                     answer:'Hi there!',                   wrongs:['Goodbye.','Thank you.']},
  {question:"What's your name?",          answer:'My name is Sara.',            wrongs:['It is red.','Yes, it is.']},
  {question:'How old are you?',           answer:'I am ten years old.',         wrongs:['I like dogs.','It is sunny.']},
  {question:'Do you like cats?',          answer:'Yes, I love cats!',           wrongs:['No, I am a bird.','It is big.']},
  {question:'What color is the sky?',     answer:'The sky is blue.',            wrongs:['It is a dog.','I am happy.']},
  {question:'Goodbye!',                   answer:'Goodbye! See you later!',     wrongs:['I am hungry.','It is a cat.']},
  {question:'Thank you!',                 answer:"You're welcome!",             wrongs:['It is cold.','I like fish.']},
  {question:'What do you want?',          answer:'I want some water, please.',  wrongs:['I am a teacher.','The sun is big.']},
  {question:'Is this your book?',         answer:'Yes, it is mine.',            wrongs:['No, I am cold.','The sky is red.']},
  {question:'How are you?',               answer:"I'm doing great!",            wrongs:['The sun is hot.','I have a cat.']},
  {question:"What's that?",               answer:"It's a pencil.",              wrongs:['I am tired.','The door is open.']},
  {question:'Can you help me?',           answer:'Of course! What do you need?',wrongs:['The sky is blue.','I am a student.']},
  {question:'I am hungry.',               answer:"Let's get some food!",        wrongs:['The moon is big.','I like fish.']},
  {question:'What time is it?',           answer:"It's three o'clock.",         wrongs:['I have a dog.','The tree is tall.']},
  {question:'See you tomorrow!',          answer:'See you! Have a good day!',   wrongs:['I am cold.','The sun is yellow.']},
  {question:'Sorry!',                     answer:"No worries! It's okay.",      wrongs:['I like trains.','The water is cold.']},
  {question:'Is it raining?',             answer:'Yes, bring an umbrella.',     wrongs:['I am happy.','The car is fast.']},
  {question:'Where is the dog?',          answer:'The dog is over there.',      wrongs:['I like apples.','It is Monday.']},
  {question:'Do you speak English?',      answer:'A little bit, yes.',          wrongs:['I eat rice.','The bird is small.']},
  {question:'I love you!',                answer:'I love you too!',             wrongs:['The moon is full.','I want tea.']},
];

// ── Band 2 ── 初級（20問）
const QA_B2: QAItem[] = [
  {question:'How are you today?',         answer:'I am fine, thank you.',             wrongs:['I am a cat.','It is raining.']},
  {question:"Where are you from?",        answer:'I am from Japan.',                  wrongs:['I like apples.','It is five o\'clock.']},
  {question:'Nice to meet you!',          answer:'Nice to meet you too!',             wrongs:['I am going home.','Where is the bus?']},
  {question:'How was your day?',          answer:'It was great, thank you!',          wrongs:['I have two cats.','Please turn left.']},
  {question:'What do you do?',            answer:'I am a student.',                   wrongs:['I am hungry.','The sky is blue.']},
  {question:'Do you like sushi?',         answer:'Yes! It is delicious!',             wrongs:['No, I am a bird.','It is Monday.']},
  {question:'Can I have the menu?',       answer:"Sure, here you go!",                wrongs:['The park is big.','I want a dog.']},
  {question:"Where is the restroom?",     answer:"It's down the hall on the right.",  wrongs:['I like coffee.','The train is coming.']},
  {question:'Is this seat taken?',        answer:'No, please go ahead.',              wrongs:['Yes, I am tired.','The menu is big.']},
  {question:'What would you recommend?',  answer:"The ramen here is excellent!",      wrongs:['I am from Tokyo.','The bus is late.']},
  {question:'How much is this?',          answer:"It's 1,500 yen.",                   wrongs:['I like sushi.','The train is fast.']},
  {question:'Do you accept credit cards?',answer:"Yes, we do.",                       wrongs:['I want fish.','The park is lovely.']},
  {question:'I am looking for a pharmacy.',answer:"There's one just around the corner.",wrongs:['I want coffee.','The room is cold.']},
  {question:'Can you repeat that, please?',answer:"Sure! Turn right at the corner.",  wrongs:['I am a student.','The sky is blue.']},
  {question:'Do you have WiFi?',          answer:"Yes, the password is on the card.", wrongs:['I want water.','The moon is full.']},
  {question:"I'd like to order, please.", answer:"Of course! What would you like?",   wrongs:['The station is far.','I am from Japan.']},
  {question:'Could I get the check?',     answer:"Right away! Here's your bill.",     wrongs:['I like the view.','The station is busy.']},
  {question:'Is service included?',       answer:"Yes, a 10% service charge applies.",wrongs:['I want tea.','The bus stop is nearby.']},
  {question:'Where can I exchange money?',answer:"There's a currency exchange nearby.",wrongs:['I need a map.','The hotel is big.']},
  {question:'Do you have vegetarian options?',answer:"Yes, we have a few dishes.",    wrongs:['I need a key.','The elevator is here.']},
];

// ── Band 3 ── 中級（20問）
const QA_B3: QAItem[] = [
  {question:'Welcome! How was your trip?',          answer:'It was great, thank you.',                wrongs:['My name is John.','I want to sleep.'],        hint:'ホテル'},
  {question:'How many nights will you be staying?', answer:'I will be staying for two nights.',       wrongs:['I am very tired.','Yes, I like it.'],          hint:'ホテル'},
  {question:'What time is check-out?',              answer:'Check-out is at 10 AM.',                  wrongs:['I like coffee.','Yes, please.'],               hint:'ホテル'},
  {question:'Is breakfast included?',               answer:'Yes, served from 7 to 9 AM.',             wrongs:['The room is on the left.','I need a taxi.'],   hint:'ホテル'},
  {question:'Excuse me, where is the station?',     answer:"It's a five-minute walk from here.",      wrongs:['I like pizza.','The dog is sleeping.'],        hint:'道案内'},
  {question:'Can I pay by credit card?',            answer:'Yes, we accept all major cards.',         wrongs:['The park is lovely.','I am from Tokyo.'],      hint:'お会計'},
  {question:'What can I get you?',                  answer:"I'd like a latte, please.",               wrongs:['Where is the restroom?','The bus is coming.'], hint:'カフェ'},
  {question:'Would you like that to go?',           answer:'To stay, please.',                        wrongs:['Yes, I am fine.','The bus is coming.'],        hint:'カフェ'},
  {question:'Do you have any allergies?',           answer:"Yes, I'm allergic to shellfish.",         wrongs:['I want the window seat.','The menu is big.'],  hint:'レストラン'},
  {question:'How would you like your steak?',       answer:"Medium rare, please.",                    wrongs:['I want dessert.','The bill is ready.'],        hint:'レストラン'},
  {question:'I seem to have missed my flight.',     answer:'Let me check the next available one.',    wrongs:['I need coffee.','My luggage is lost.'],        hint:'空港'},
  {question:'Where can I pick up my luggage?',      answer:"At baggage claim, level one.",            wrongs:['I need a taxi.','The gate is closed.'],        hint:'空港'},
  {question:'Do I need to declare anything?',       answer:'Just this camera and some gifts.',        wrongs:['I want a window seat.','The hotel is full.'],  hint:'税関'},
  {question:'Could you recommend a local dish?',   answer:"Try the tempura — it's fantastic!",       wrongs:['I want a map.','The bus stops here.'],         hint:'観光'},
  {question:"I'd like to report a lost item.",      answer:'Please fill out this form for us.',       wrongs:['I want to check in.','The menu is in English.'],hint:'ホテル'},
  {question:'Can I get a late check-out?',          answer:'Yes, until noon for an extra charge.',    wrongs:['I need the WiFi password.','The restaurant is open.'],hint:'ホテル'},
  {question:'The air conditioning is not working.', answer:"I'll send maintenance right away.",       wrongs:['I want more towels.','The elevator is slow.'],  hint:'ホテル'},
  {question:'Could I have some extra towels?',      answer:"Of course, I'll bring them shortly.",     wrongs:['I want to cancel.','The room is cold.'],        hint:'ホテル'},
  {question:'How long does it take by subway?',     answer:"About 20 minutes to the city center.",    wrongs:['I want a window seat.','The taxi is expensive.'],hint:'交通'},
  {question:'Is the last train at midnight?',       answer:"Yes, the last one is at 12:15 AM.",       wrongs:['I need a map.','The hotel is nearby.'],         hint:'交通'},
];

// ── Band 4 ── 上級・BrightonStar ホスピタリティ（20問）
const QA_B4: QAItem[] = [
  {question:'Welcome to BrightonStar. Do you have a reservation?',
    answer:"Yes, I booked a Deluxe Mt. Fuji View Room.",
    wrongs:["I'd like a table for two.","I'm here for the conference."], hint:'BrightonStar'},
  {question:'May I see your passport for check-in?',
    answer:'Of course, here it is.',
    wrongs:['I left it at the airport.','I only have a driver\'s license.'], hint:'BrightonStar'},
  {question:'Your room offers a stunning view of Mt. Fuji. May I show you the best viewing time?',
    answer:'Please do! I would love that.',
    wrongs:['I prefer the city side.','I need to sleep first.'], hint:'富士山'},
  {question:'The clearest view of Mt. Fuji is typically at dawn. Shall I arrange a wake-up call?',
    answer:'Yes, please call me at 5 AM.',
    wrongs:['I will use my phone alarm.','No thanks, I know already.'], hint:'富士山'},
  {question:'Unfortunately, Mt. Fuji may be hidden by clouds today. Would you like cloud updates?',
    answer:'Yes, please notify me if it clears.',
    wrongs:['I will check from my window.','Just forget about it.'], hint:'富士山'},
  {question:'Our breakfast features locally sourced ingredients. Would you like a Japanese or Western set?',
    answer:'Japanese set, please. When is it served?',
    wrongs:['I will skip breakfast.','Any type is fine, thank you.'], hint:'BrightonStar'},
  {question:'Your room includes a private hot spring bath with a Mt. Fuji view. Shall I explain the usage?',
    answer:'Yes, please tell me how to use it.',
    wrongs:['I prefer the shared bath.','I will figure it out myself.'], hint:'BrightonStar'},
  {question:'Is there anything I can assist you with during your stay, Mr. Johnson?',
    answer:'Could you arrange a taxi to Hakone for tomorrow morning?',
    wrongs:['No, everything is perfect.','Can you bring more pillows?'], hint:'BrightonStar'},
  {question:'We noticed it is your anniversary. Shall we prepare a special room decoration?',
    answer:'That would be wonderful, thank you!',
    wrongs:['No, please keep it simple.','I did not mention that.'], hint:'BrightonStar'},
  {question:'I have a complaint — the noise from the corridor last night was unacceptable.',
    answer:'I sincerely apologize. We will ensure it does not happen again.',
    wrongs:['I will check with the other guests.','That is outside our control.'], hint:'BrightonStar'},
  {question:'Could I extend my stay by one more night?',
    answer:'Let me check availability right away. One moment, please.',
    wrongs:['I am afraid we are fully booked.','You should have booked in advance.'], hint:'BrightonStar'},
  {question:'Do you have a shuttle service to the Shinkansen station?',
    answer:'Yes, our complimentary shuttle runs every hour.',
    wrongs:['You will need to take a taxi.','The bus stop is nearby.'], hint:'BrightonStar'},
  {question:'What time is check-out, and is a late check-out possible?',
    answer:'Standard check-out is at 11 AM. Late check-out until 2 PM is available for a fee.',
    wrongs:['Check-out is at noon sharp.','We do not offer late check-out.'], hint:'BrightonStar'},
  {question:'Can you recommend a traditional Kaiseki restaurant near the hotel?',
    answer:'Certainly! I recommend Yama-no-Chaya, a five-minute walk from here.',
    wrongs:['We only have our in-house restaurant.','There are no restaurants nearby.'], hint:'BrightonStar'},
  {question:'I forgot my charger in the room. Has it been found?',
    answer:'Let me check with our housekeeping team right away.',
    wrongs:['You should have checked before leaving.','We cannot access rooms after check-out.'], hint:'BrightonStar'},
  {question:'We would love a room with a balcony overlooking Mt. Fuji. Is that available?',
    answer:'Absolutely! Our Premium Suite on the top floor has a private balcony with a full view.',
    wrongs:['Unfortunately all Mt. Fuji rooms are taken.','We do not have balcony rooms.'], hint:'富士山'},
  {question:'Could the concierge arrange a private guided tour to Mt. Fuji\'s fifth station?',
    answer:'Of course. I will arrange a private car and licensed guide for tomorrow morning.',
    wrongs:['You should book that yourself online.','We only arrange local tours.'], hint:'富士山'},
  {question:'Is there a dress code for the in-house restaurant?',
    answer:'Smart casual is recommended. We ask that guests avoid shorts and sandals.',
    wrongs:['There is no dress code whatsoever.','Formal attire is required.'], hint:'BrightonStar'},
  {question:'The room temperature seems difficult to control. Could someone assist?',
    answer:'Certainly, I will send our maintenance team up within ten minutes.',
    wrongs:['Please try the thermostat again.','That is a known issue in this building.'], hint:'BrightonStar'},
  {question:'We are celebrating my wife\'s birthday. Is there anything special you can do?',
    answer:'Congratulations! We will arrange a complimentary cake and flowers in your room.',
    wrongs:['You should have told us earlier.','We do not offer birthday services.'], hint:'BrightonStar'},
];

// Q&A レベル別バンド割り当て
function getQABand(level: number): QAItem[] {
  if (level <= 5)  return QA_B1;
  if (level <= 10) return QA_B2;
  if (level <= 15) return QA_B3;
  return QA_B4;
}

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

// ─────────────────────────────────────────────────────────────────
// 山札ユーティリティ（シンプル版）
// ─────────────────────────────────────────────────────────────────
function popFromDeck<T>(deckRef: React.MutableRefObject<T[]>, pool: T[]): T {
  if (deckRef.current.length === 0) deckRef.current = shuffle([...pool]);
  return deckRef.current.pop() as T;
}

// ─────────────────────────────────────────────────────────────────
// 3択構築（ダミーの ja が正解と同じにならないことを保証）
// ─────────────────────────────────────────────────────────────────
interface WordQuiz { correct: Word; choices: string[]; }

function buildWordQuiz(correct: Word, pool: Word[]): WordQuiz {
  const distPool = pool.filter(w => w.en !== correct.en && w.ja !== correct.ja);
  const wrongs   = shuffle(distPool).slice(0, 2).map(w => w.ja);
  const fallbacks = ['その他', 'わかりません', 'ちがう'];
  while (wrongs.length < 2) wrongs.push(fallbacks[wrongs.length]);
  return { correct, choices: shuffle([correct.ja, ...wrongs]) };
}

interface QAQuiz extends QAItem { choices: string[]; }
function buildQAQuiz(item: QAItem): QAQuiz {
  return { ...item, choices: shuffle([item.answer, item.wrongs[0], item.wrongs[1]]) };
}

// ─────────────────────────────────────────────────────────────────
// BasicWordsMode（単語 3 択）
// ─────────────────────────────────────────────────────────────────
const LS_WORDS = 'words-combo-v4';

function BasicWordsMode({ onCorrect }: { onCorrect: () => void }) {
  const [combo,    setCombo]    = useState(0);
  // ★ level を独立した state として管理 — これが変化した時だけデッキを再構築
  const [level,    setLevel]    = useState(1);
  const [quiz,     setQuiz]     = useState<WordQuiz | null>(null);
  const [result,   setResult]   = useState<'correct'|'wrong'|null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  // ready=true になるまで useEffect([level]) をスキップする（初回二重実行防止）
  const [ready,    setReady]    = useState(false);
  const deckRef = useRef<Word[]>([]);

  // ① 初回のみ: localStorage からコンボ・レベルを復元し、デッキと最初の問題を準備
  useEffect(() => {
    try {
      const raw      = localStorage.getItem(LS_WORDS);
      const n        = raw ? (JSON.parse(raw) as number) : 0;
      const lv       = getLevel(n);
      const pool     = WORD_LEVELS[lv - 1];
      deckRef.current = shuffle([...pool]);
      const card     = deckRef.current.pop()!;
      setCombo(n);
      setLevel(lv);   // level state を保存（ready=false なので useEffect[level] はまだ動かない）
      setQuiz(buildWordQuiz(card, pool));
    } catch {
      deckRef.current = shuffle([...L1]);
      setQuiz(buildWordQuiz(deckRef.current.pop()!, L1));
    }
    setReady(true);   // ここで ready=true にして以降の useEffect[level] を有効化
  }, []);

  // ② ★ レベルが変わった時だけ新しいデッキを生成して最初の1問を出す
  //    ready=false の間（初回 setLevel 時）はスキップ
  useEffect(() => {
    if (!ready) return;
    const pool      = WORD_LEVELS[level - 1];
    deckRef.current = shuffle([...pool]);
    const card      = deckRef.current.pop()!;
    setQuiz(buildWordQuiz(card, pool));
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
      setResult('correct');
      setLocked(true);
      const newCombo = combo + 1;
      setCombo(newCombo);
      try { localStorage.setItem(LS_WORDS, JSON.stringify(newCombo)); } catch { /**/ }
      onCorrect();

      const newLevel = getLevel(newCombo);
      if (newLevel !== level) {
        // ── レベルアップ: setTimeout 後に setLevel → useEffect[level] がデッキを作り直す
        setTimeout(() => setLevel(newLevel), CORRECT_DELAY);
      } else {
        // ── 同レベル継続: 現在のデッキから次の1枚を引く
        setTimeout(() => {
          const pool = WORD_LEVELS[level - 1];
          const card = popFromDeck(deckRef, pool);
          setQuiz(buildWordQuiz(card, pool));
          setResult(null);
          setLocked(false);
        }, CORRECT_DELAY);
      }
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  const handleSkip = () => {
    const pool = WORD_LEVELS[level - 1];
    const card = popFromDeck(deckRef, pool);
    setQuiz(buildWordQuiz(card, pool));
    setResult(null);
    setLocked(false);
  };

  if (!ready || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const threshold = nextThreshold(combo);
  const lvStart   = LEVEL_THRESHOLDS[level - 1];
  const lvEnd     = threshold ?? lvStart + 1;
  const pct       = Math.min(100, ((combo - lvStart) / (lvEnd - lvStart)) * 100);
  const remaining = deckRef.current.length;

  return (
    <div className="flex flex-col gap-3">
      {/* ── レベル表示（大きく・視認性重視）── */}
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
          <span className="text-[10px] text-indigo-300">山札残 {remaining} 枚</span>
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

      {/* 3択ボタン */}
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
// QAModeSimple（会話 Q&A 3択）
// ─────────────────────────────────────────────────────────────────
const LS_QA = 'qa-combo-v4';

function QAModeSimple({ onCorrect }: { onCorrect: () => void }) {
  const [combo,    setCombo]    = useState(0);
  // ★ level を独立した state として管理
  const [level,    setLevel]    = useState(1);
  const [quiz,     setQuiz]     = useState<QAQuiz | null>(null);
  const [result,   setResult]   = useState<'correct'|'wrong'|null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [ready,    setReady]    = useState(false);
  const deckRef = useRef<QAItem[]>([]);

  // ① 初回のみ: localStorage から復元
  useEffect(() => {
    try {
      const raw  = localStorage.getItem(LS_QA);
      const n    = raw ? (JSON.parse(raw) as number) : 0;
      const lv   = getLevel(n);
      const pool = getQABand(lv);
      deckRef.current = shuffle([...pool]);
      const item = deckRef.current.pop()!;
      setCombo(n);
      setLevel(lv);
      setQuiz(buildQAQuiz(item));
    } catch {
      deckRef.current = shuffle([...QA_B1]);
      setQuiz(buildQAQuiz(deckRef.current.pop()!));
    }
    setReady(true);
  }, []);

  // ② ★ レベルが変わった時だけ新しいデッキを生成
  useEffect(() => {
    if (!ready) return;
    const pool      = getQABand(level);
    deckRef.current = shuffle([...pool]);
    const item      = deckRef.current.pop()!;
    setQuiz(buildQAQuiz(item));
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
      setResult('correct');
      setLocked(true);
      const newCombo = combo + 1;
      setCombo(newCombo);
      try { localStorage.setItem(LS_QA, JSON.stringify(newCombo)); } catch { /**/ }
      onCorrect();

      const newLevel = getLevel(newCombo);
      if (newLevel !== level) {
        setTimeout(() => setLevel(newLevel), CORRECT_DELAY);
      } else {
        setTimeout(() => {
          const pool = getQABand(level);
          const item = popFromDeck(deckRef, pool);
          setQuiz(buildQAQuiz(item));
          setResult(null);
          setLocked(false);
        }, CORRECT_DELAY);
      }
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  const handleSkip = () => {
    const pool = getQABand(level);
    const item = popFromDeck(deckRef, pool);
    setQuiz(buildQAQuiz(item));
    setResult(null);
    setLocked(false);
  };

  if (!ready || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const threshold = nextThreshold(combo);
  const lvStart   = LEVEL_THRESHOLDS[level - 1];
  const lvEnd     = threshold ?? lvStart + 1;
  const pct       = Math.min(100, ((combo - lvStart) / (lvEnd - lvStart)) * 100);
  const remaining = deckRef.current.length;

  return (
    <div className="flex flex-col gap-3">
      {/* ── レベル表示 ── */}
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
          <span className="text-[10px] text-teal-300">山札残 {remaining} 枚</span>
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

      {/* 3択ボタン */}
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
    const praise = randomPraise();
    setCelebText(praise.text);
    setShowCeleb(true);
    speakText(praise.speech, undefined, 1.0);
    setTimeout(() => setShowCeleb(false), 900);
  }, []);

  const switchMode = (m: ImMode) => {
    window.speechSynthesis?.cancel();
    setMode(m);
  };

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">
      {/* モードタブ */}
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

      {/* Excellent! ポップアップ */}
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
