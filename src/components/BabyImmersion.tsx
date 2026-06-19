'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// Growth Level definitions  (level-up every 20 correct answers)
// ─────────────────────────────────────────────────────────────────
interface GrowthLevel {
  level: number; title: string; emoji: string;
  color: string; badge: string; scoreReq: number;
}
const GROWTH_LEVELS: GrowthLevel[] = [
  { level:1, title:'Baby',    emoji:'👶',   color:'from-blue-400 to-cyan-400',     badge:'bg-blue-100 text-blue-700',    scoreReq:0   },
  { level:2, title:'Toddler', emoji:'🧒',   color:'from-green-400 to-emerald-500', badge:'bg-green-100 text-green-700',  scoreReq:20  },
  { level:3, title:'Child',   emoji:'🧑',   color:'from-yellow-400 to-amber-500',  badge:'bg-yellow-100 text-yellow-700',scoreReq:40  },
  { level:4, title:'Teen',    emoji:'🧑‍🎓', color:'from-orange-400 to-rose-500',   badge:'bg-orange-100 text-orange-700',scoreReq:60  },
  { level:5, title:'Adult',   emoji:'👔',   color:'from-violet-500 to-indigo-600', badge:'bg-violet-100 text-violet-700',scoreReq:80  },
  { level:6, title:'Pro',     emoji:'🌍',   color:'from-rose-500 to-pink-600',     badge:'bg-rose-100 text-rose-700',    scoreReq:110 },
];
function getGrowthLevel(n: number): GrowthLevel {
  for (let i = GROWTH_LEVELS.length - 1; i >= 0; i--)
    if (n >= GROWTH_LEVELS[i].scoreReq) return GROWTH_LEVELS[i];
  return GROWTH_LEVELS[0];
}

// ─────────────────────────────────────────────────────────────────
// QuizItem (sentence levels)
// ─────────────────────────────────────────────────────────────────
interface QuizItem {
  sentence: string;
  answer:   string;
  choices:  string[];
  hint?:    string;
}

// ─────────────────────────────────────────────────────────────────
// Level 1 — Baby: single words / simple phrases
// ─────────────────────────────────────────────────────────────────
const BABY_ITEMS: { word: string; emoji: string }[] = [
  // Food & drinks
  { word:'Apple',       emoji:'🍎' }, { word:'Banana',      emoji:'🍌' },
  { word:'Orange',      emoji:'🍊' }, { word:'Strawberry',  emoji:'🍓' },
  { word:'Grape',       emoji:'🍇' }, { word:'Bread',       emoji:'🍞' },
  { word:'Pizza',       emoji:'🍕' }, { word:'Egg',         emoji:'🥚' },
  { word:'Milk',        emoji:'🥛' }, { word:'Cake',        emoji:'🎂' },
  { word:'Cookie',      emoji:'🍪' }, { word:'Rice',        emoji:'🍚' },
  { word:'Soup',        emoji:'🍜' }, { word:'Cheese',      emoji:'🧀' },
  { word:'Butter',      emoji:'🧈' }, { word:'Juice',       emoji:'🧃' },
  { word:'Coffee',      emoji:'☕' }, { word:'Tea',         emoji:'🍵' },
  { word:'Ice cream',   emoji:'🍦' }, { word:'Chocolate',   emoji:'🍫' },
  { word:'Carrot',      emoji:'🥕' }, { word:'Potato',      emoji:'🥔' },
  { word:'Tomato',      emoji:'🍅' }, { word:'Corn',        emoji:'🌽' },
  // Animals
  { word:'Dog',         emoji:'🐶' }, { word:'Cat',         emoji:'🐱' },
  { word:'Bird',        emoji:'🐦' }, { word:'Fish',        emoji:'🐟' },
  { word:'Rabbit',      emoji:'🐰' }, { word:'Bear',        emoji:'🐻' },
  { word:'Lion',        emoji:'🦁' }, { word:'Monkey',      emoji:'🐵' },
  { word:'Elephant',    emoji:'🐘' }, { word:'Frog',        emoji:'🐸' },
  { word:'Penguin',     emoji:'🐧' }, { word:'Duck',        emoji:'🦆' },
  { word:'Horse',       emoji:'🐴' }, { word:'Pig',         emoji:'🐷' },
  { word:'Cow',         emoji:'🐮' }, { word:'Sheep',       emoji:'🐑' },
  { word:'Tiger',       emoji:'🐯' }, { word:'Wolf',        emoji:'🐺' },
  // Vehicles
  { word:'Car',         emoji:'🚗' }, { word:'Bus',         emoji:'🚌' },
  { word:'Train',       emoji:'🚂' }, { word:'Airplane',    emoji:'✈️' },
  { word:'Bicycle',     emoji:'🚲' }, { word:'Boat',        emoji:'⛵' },
  { word:'Truck',       emoji:'🚚' }, { word:'Ambulance',   emoji:'🚑' },
  { word:'Motorcycle',  emoji:'🏍️' }, { word:'Helicopter',  emoji:'🚁' },
  // Weather
  { word:'Sunny',       emoji:'☀️' }, { word:'Rainy',       emoji:'🌧️' },
  { word:'Cloudy',      emoji:'☁️' }, { word:'Snowy',       emoji:'❄️' },
  { word:'Windy',       emoji:'🌬️' }, { word:'Rainbow',     emoji:'🌈' },
  { word:'Thunder',     emoji:'⛈️' }, { word:'Foggy',       emoji:'🌫️' },
  // Colors
  { word:'Red',         emoji:'🔴' }, { word:'Blue',        emoji:'🔵' },
  { word:'Green',       emoji:'🟢' }, { word:'Yellow',      emoji:'🟡' },
  { word:'Orange',      emoji:'🟠' }, { word:'Purple',      emoji:'🟣' },
  { word:'Black',       emoji:'⚫' }, { word:'White',       emoji:'⚪' },
  // Places & things
  { word:'House',       emoji:'🏠' }, { word:'School',      emoji:'🏫' },
  { word:'Hospital',    emoji:'🏥' }, { word:'Park',        emoji:'🌳' },
  { word:'Beach',       emoji:'🏖️' }, { word:'Mountain',    emoji:'⛰️' },
  { word:'Book',        emoji:'📚' }, { word:'Ball',        emoji:'⚽' },
  { word:'Bed',         emoji:'🛏️' }, { word:'Chair',       emoji:'🪑' },
  { word:'Door',        emoji:'🚪' }, { word:'Window',      emoji:'🪟' },
  { word:'Clock',       emoji:'🕐' }, { word:'Phone',       emoji:'📱' },
  { word:'Star',        emoji:'⭐' }, { word:'Moon',        emoji:'🌙' },
  { word:'Sun',         emoji:'☀️' }, { word:'Tree',        emoji:'🌲' },
  { word:'Flower',      emoji:'🌸' }, { word:'Heart',       emoji:'❤️' },
];

// ─────────────────────────────────────────────────────────────────
// Level 2 — Toddler: simple daily actions
// ─────────────────────────────────────────────────────────────────
const TODDLER_ITEMS: QuizItem[] = [
  { sentence:'The dog is sleeping.',           answer:'🐶💤', choices:['🐶💤','🐶🏃','🐱💤','🐶🍎'] },
  { sentence:'I am eating an apple.',          answer:'😋🍎', choices:['😋🍎','😋🍌','😴🍎','🍎🚗'] },
  { sentence:'The cat is running.',            answer:'🐱🏃', choices:['🐱🏃','🐱💤','🐶🏃','🐱🍎'] },
  { sentence:'She is drinking milk.',          answer:'😊🥛', choices:['😊🥛','😊🍎','😴🥛','🥛🐶'] },
  { sentence:'The bird is flying.',            answer:'🐦✈️', choices:['🐦✈️','🐦💤','🐶✈️','🐦🍎'] },
  { sentence:'I am reading a book.',           answer:'😊📚', choices:['😊📚','😊🎵','😴📚','📚🐶'] },
  { sentence:'The baby is crying.',            answer:'👶😭', choices:['👶😭','👶😊','👶💤','🐶😭'] },
  { sentence:'The lion is eating.',            answer:'🦁😋', choices:['🦁😋','🦁💤','🐶😋','🦁🚗'] },
  { sentence:'The sun is shining.',            answer:'☀️😊', choices:['☀️😊','🌙😊','☀️💤','⭐😊'] },
  { sentence:'It is raining.',                 answer:'🌧️💧', choices:['🌧️💧','☀️💧','🌧️😊','💧🐶'] },
  { sentence:'I love you.',                    answer:'😊❤️', choices:['😊❤️','😴❤️','😊⭐','❤️🐶'] },
  { sentence:'The rabbit is jumping.',         answer:'🐰⬆️', choices:['🐰⬆️','🐰💤','🐶⬆️','🐰🍎'] },
  { sentence:'I am drinking water.',           answer:'💧👄', choices:['💧👄','🥛👄','💧😴','💧🐶'] },
  { sentence:'The duck is swimming.',          answer:'🦆💧', choices:['🦆💧','🐟💧','🦆💤','🦆🍎'] },
  { sentence:'She is washing her hands.',      answer:'👐🧼', choices:['👐🧼','👐😊','🧼🐶','👐💧'] },
  { sentence:'The boy is playing with a ball.',answer:'🧒⚽', choices:['🧒⚽','🧒📚','⚽😊','🧒💤'] },
  { sentence:'I need to sleep now.',           answer:'😴🛏️', choices:['😴🛏️','😊🛏️','😴📚','🐶🛏️'] },
  { sentence:'The dog is barking.',            answer:'🐶💬', choices:['🐶💬','🐱💬','🐶💤','🐶🍎'] },
  { sentence:'She is brushing her teeth.',     answer:'😁🪥', choices:['😁🪥','😁😊','🪥💧','😁🧼'] },
  { sentence:'I am putting on my shoes.',      answer:'👟🙌', choices:['👟🙌','👟💤','🧢🙌','👟😊'] },
  { sentence:'The horse is running fast.',     answer:'🐴🏃', choices:['🐴🏃','🐴💤','🐶🏃','🐴🍎'] },
  { sentence:'It is snowing outside.',         answer:'❄️🌳', choices:['❄️🌳','☀️🌳','❄️🌊','❄️🐶'] },
  { sentence:'The cat is drinking milk.',      answer:'🐱🥛', choices:['🐱🥛','🐶🥛','🐱💧','🐱💤'] },
  { sentence:'I am drawing a picture.',        answer:'✏️🎨', choices:['✏️🎨','📚🎨','✏️😊','✏️📱'] },
  { sentence:'The baby is smiling.',           answer:'👶😊', choices:['👶😊','👶😭','🧒😊','👶💤'] },
  { sentence:'I want some cookies.',           answer:'🍪😊', choices:['🍪😊','🍎😊','🍪😴','🍪🐶'] },
  { sentence:'The pig is eating.',             answer:'🐷😋', choices:['🐷😋','🐷💤','🐶😋','🐷🏃'] },
  { sentence:'I am taking a bath.',            answer:'🛁😊', choices:['🛁😊','🛁💤','🧼😊','🛁🐶'] },
  { sentence:'The flowers are blooming.',      answer:'🌸☀️', choices:['🌸☀️','🌸💧','🌲☀️','🌸😊'] },
  { sentence:'I am going to bed.',             answer:'😴🌙', choices:['😴🌙','😊🌙','😴☀️','🛏️🌙'] },
];

// ─────────────────────────────────────────────────────────────────
// Level 3 — Child
// ─────────────────────────────────────────────────────────────────
const CHILD_ITEMS: QuizItem[] = [
  { sentence:'I want to go to the park.',            answer:'🌳🏃', choices:['🌳🏃','🏠🏃','🌳😴','🌳🚗'] },
  { sentence:'Can I have some water, please?',       answer:'💧🙏', choices:['💧🙏','🥛🙏','💧😊','🍎🙏'] },
  { sentence:'Let\'s play outside together.',        answer:'⚽🌳', choices:['⚽🌳','⚽🏠','📚🌳','⚽💤'] },
  { sentence:'I am very hungry right now.',          answer:'😩🍽️', choices:['😩🍽️','😩💤','😊🍽️','😩📚'] },
  { sentence:'The stars are beautiful tonight.',     answer:'⭐🌙', choices:['⭐🌙','⭐☀️','🌸🌙','⭐💧'] },
  { sentence:'My dog loves to run in the garden.',   answer:'🐶🌳', choices:['🐶🌳','🐱🌳','🐶🏠','🐶💤'] },
  { sentence:'She is drawing a beautiful picture.',  answer:'🎨😊', choices:['🎨😊','📚😊','🎨😴','🎨🐶'] },
  { sentence:'I am going to school by bus.',         answer:'🚌🎒', choices:['🚌🎒','🚗🎒','🚌🏠','🚌📚'] },
  { sentence:'We are having a birthday party.',      answer:'🎂🎉', choices:['🎂🎉','🍎🎉','🎂😴','🎂🐶'] },
  { sentence:'It is cold outside today.',            answer:'🥶❄️', choices:['🥶❄️','😊❄️','🥶☀️','🌧️❄️'] },
  { sentence:'My mom is cooking dinner.',            answer:'👩‍🍳🍳', choices:['👩‍🍳🍳','👩‍🍳📚','🍳😊','👩‍🍳💤'] },
  { sentence:'I found a beautiful shell on the beach.',answer:'🐚🏖️',choices:['🐚🏖️','🐚🌳','🐟🏖️','🐚😊'] },
  { sentence:'The rainbow appeared after the rain.',  answer:'🌈🌧️', choices:['🌈🌧️','🌈☀️','🌈😊','🌈🌳'] },
  { sentence:'I brush my teeth every morning.',       answer:'🪥🌅', choices:['🪥🌅','🪥🌙','🧼🌅','🪥😊'] },
  { sentence:'She has a pet goldfish.',               answer:'🐟❤️', choices:['🐟❤️','🐱❤️','🐟😊','🐟🏠'] },
  { sentence:'We planted a tree in the garden.',      answer:'🌱🌳', choices:['🌱🌳','🌱💧','🌸🌳','🌱😊'] },
  { sentence:'I love playing in the snow.',           answer:'❄️😆', choices:['❄️😆','☀️😆','❄️😴','❄️🐶'] },
  { sentence:'The moon looks so big tonight.',        answer:'🌕🌙', choices:['🌕🌙','⭐🌙','🌕☀️','🌕😊'] },
  { sentence:'I made a sandwich for lunch.',          answer:'🥪😊', choices:['🥪😊','🥪😴','🍎😊','🥪🐶'] },
  { sentence:'The kite is flying very high.',         answer:'🪁☁️', choices:['🪁☁️','🐦☁️','🪁😊','🪁🌳'] },
];

// ─────────────────────────────────────────────────────────────────
// Level 4 — Teen: everyday situations
// ─────────────────────────────────────────────────────────────────
const TEEN_ITEMS: QuizItem[] = [
  { sentence:'I missed the last train home.',              answer:'🚂😱', choices:['🚂😱','🚌😱','🚂😊','🚂💤'] },
  { sentence:'Can you turn up the music a bit?',          answer:'🎵🔊', choices:['🎵🔊','🎵📉','📚🔊','🎵💤'] },
  { sentence:'I have a big test tomorrow morning.',        answer:'📚😰', choices:['📚😰','📚😊','🎵😰','📚🎉'] },
  { sentence:'Let\'s grab some food after this.',         answer:'🍔🙌', choices:['🍔🙌','🍎🙌','🍔😴','🍔📚'] },
  { sentence:'My phone battery is almost dead.',          answer:'📱🔋', choices:['📱🔋','💻🔋','📱😊','📱🎵'] },
  { sentence:'She posted a new photo on social media.',   answer:'📸📱', choices:['📸📱','📸📚','📱💤','📸🎵'] },
  { sentence:'I stayed up all night studying.',           answer:'🌙📚', choices:['🌙📚','☀️📚','🌙🎵','🌙💤'] },
  { sentence:'We won the game in the final minute.',      answer:'⚽🏆', choices:['⚽🏆','⚽😱','🏀🏆','⚽💤'] },
  { sentence:'I\'m saving money to buy a new guitar.',   answer:'💰🎸', choices:['💰🎸','💰📚','💰🎵','💸🎸'] },
  { sentence:'The concert last night was amazing.',       answer:'🎤🔥', choices:['🎤🔥','🎤😴','🎵🔥','🎤📚'] },
  { sentence:'I need to call my parents.',                answer:'📞👨‍👩‍👦', choices:['📞👨‍👩‍👦','📞😊','📱👨‍👩‍👦','📞💤'] },
  { sentence:'We are going on a road trip this weekend.', answer:'🚗🗺️', choices:['🚗🗺️','🚗😴','✈️🗺️','🚗🏠'] },
  { sentence:'My favorite subject is science.',           answer:'🔬😊', choices:['🔬😊','📚😊','🔬💤','🎵😊'] },
  { sentence:'I overslept and was late for class.',       answer:'⏰😱', choices:['⏰😱','⏰😊','🌙😱','⏰🏃'] },
  { sentence:'Can you help me with my homework?',         answer:'📝🙏', choices:['📝🙏','📝😊','📚🙏','📝💤'] },
];

// ─────────────────────────────────────────────────────────────────
// Level 5 — Adult: café / travel / hotel / emotions
// ─────────────────────────────────────────────────────────────────
const ADULT_ITEMS: QuizItem[] = [
  // Café
  { sentence:"I'd like a hot coffee, please.",                     answer:'☕🤲', choices:['☕🤲','🧃🤲','☕😴','🍵🤲'],    hint:'Café' },
  { sentence:"Could I get this to go?",                            answer:'☕🛍️', choices:['☕🛍️','☕😊','🍵🛍️','☕📚'],   hint:'Café' },
  { sentence:"Do you have any dairy-free options?",                answer:'🥛❌', choices:['🥛❌','🥛😊','☕❌','🍰❌'],    hint:'Café' },
  { sentence:"I'll have the avocado toast, please.",               answer:'🥑🍞', choices:['🥑🍞','🍳🍞','🥑😊','🥑☕'],   hint:'Café' },
  { sentence:"Can I get a large iced latte?",                      answer:'🧊☕', choices:['🧊☕','☕😊','🧊🍵','🧊🥛'],    hint:'Café' },
  { sentence:"Is there free Wi-Fi here?",                          answer:'📶❓', choices:['📶❓','📶😊','📱❓','📶☕'],     hint:'Café' },
  { sentence:"Could I have the menu, please?",                     answer:'📋🙏', choices:['📋🙏','📋😊','🍽️🙏','📋☕'],   hint:'Café' },
  { sentence:"I'd like a table for two.",                          answer:'🪑2️⃣', choices:['🪑2️⃣','🪑😊','🍽️2️⃣','🪑☕'], hint:'Café' },
  { sentence:"Can we split the bill?",                             answer:'💳✂️', choices:['💳✂️','💳😊','💰✂️','💳☕'],   hint:'Café' },
  { sentence:"Everything was delicious, thank you!",               answer:'😋🙏', choices:['😋🙏','😋😊','🍽️🙏','😋☕'],   hint:'Café' },
  // Travel & Airport
  { sentence:"Where is the restroom?",                             answer:'🚹❓', choices:['🚹❓','🚪❓','🚹😊','✈️❓'],    hint:'Travel' },
  { sentence:"My flight has been delayed.",                        answer:'✈️⏰', choices:['✈️⏰','✈️😊','🚂⏰','✈️❌'],   hint:'Travel' },
  { sentence:"Can I have a window seat, please?",                  answer:'💺🪟', choices:['💺🪟','💺😊','🪟❓','💺✈️'],   hint:'Travel' },
  { sentence:"I need to exchange some currency.",                   answer:'💱💵', choices:['💱💵','💰💵','💱😊','💵📚'],   hint:'Travel' },
  { sentence:"Is there a pharmacy nearby?",                        answer:'💊📍', choices:['💊📍','🏥📍','💊😊','💊❓'],   hint:'Travel' },
  { sentence:"Where is the nearest train station?",                answer:'🚉❓', choices:['🚉❓','🚌❓','🚉😊','🚉🚶'],    hint:'Travel' },
  { sentence:"How long does it take to get there?",                answer:'⏱️❓', choices:['⏱️❓','⏱️😊','🗺️❓','⏱️🚗'],  hint:'Travel' },
  { sentence:"Can you call me a taxi, please?",                    answer:'🚕🙏', choices:['🚕🙏','🚌🙏','🚕😊','🚕❓'],   hint:'Travel' },
  { sentence:"I lost my passport.",                                 answer:'🛂😱', choices:['🛂😱','🛂😊','📄😱','🛂❓'],   hint:'Travel' },
  { sentence:"How much does the bus ticket cost?",                 answer:'🚌💵', choices:['🚌💵','🚌😊','✈️💵','🚌❓'],   hint:'Travel' },
  // Hotel & Inn
  { sentence:"Welcome to our inn! Did you have a good trip?",      answer:'🏨🤝😊', choices:['🏨🤝😊','🏨💤😊','🏡🤝😊','🏨😊❓'],  hint:'Hotel' },
  { sentence:"Here is the key to your room. Enjoy your stay.",     answer:'🔑🚪✨', choices:['🔑🚪✨','🔑😊✨','🔑🚪💤','🏨🔑✨'],  hint:'Hotel' },
  { sentence:"You can see a beautiful mountain from this window.",  answer:'🏔️🪟👀', choices:['🏔️🪟👀','🌊🪟👀','🏔️🪟😊','🏔️😊👀'], hint:'Hotel' },
  { sentence:"Would you like some Japanese green tea?",             answer:'🍵🤲🇯🇵', choices:['🍵🤲🇯🇵','☕🤲🇯🇵','🍵😊🇯🇵','🍵🤲😊'],hint:'Hotel' },
  { sentence:"Check-out time is at 10 AM tomorrow.",               answer:'🕙🚪👋', choices:['🕙🚪👋','🕙😊👋','🕙🏨👋','🕙🚪😊'], hint:'Hotel' },
  { sentence:"Breakfast is served from 7 to 9 AM.",                answer:'🍳🕖😊', choices:['🍳🕖😊','🍳🕙😊','🥐🕖😊','🍳🕖💤'], hint:'Hotel' },
  { sentence:"The hot spring bath is open until midnight.",         answer:'♨️🌙✅', choices:['♨️🌙✅','♨️☀️✅','♨️🌙❌','🛁🌙✅'],  hint:'Hotel' },
  { sentence:"Can I have an extra pillow, please?",                 answer:'🛏️🙏✨', choices:['🛏️🙏✨','🛏️😊✨','💤🙏✨','🛏️🙏❓'],hint:'Hotel' },
  { sentence:"Do you need help with your luggage?",                 answer:'🧳🤝😊', choices:['🧳🤝😊','🧳😊❓','👜🤝😊','🧳🤝❓'],  hint:'Hotel' },
  { sentence:"Please enjoy your dinner at our restaurant.",         answer:'🍽️😊🏨', choices:['🍽️😊🏨','🍽️😊☕','🥢😊🏨','🍽️💤🏨'],hint:'Hotel' },
  // Emotions & Greetings
  { sentence:"I'm so excited for today!",                          answer:'🔥😆', choices:['🔥😆','😴😆','🔥😊','🎉😆'],   hint:'Feelings' },
  { sentence:"I'm feeling a bit under the weather.",               answer:'🤒😔', choices:['🤒😔','😊😔','🤒💪','🤒💤'],   hint:'Feelings' },
  { sentence:"Long time no see! How have you been?",               answer:'👋😊', choices:['👋😊','👋😴','👋📚','🤝😊'],   hint:'Greetings' },
  { sentence:"I'm really proud of you!",                           answer:'💪🏆', choices:['💪🏆','💪😊','🏆😊','💪📚'],   hint:'Feelings' },
  { sentence:"Don't worry, everything will be fine.",              answer:'🤗😊', choices:['🤗😊','🤗😢','🤝😊','🤗💤'],   hint:'Feelings' },
];

// ─────────────────────────────────────────────────────────────────
// Level 6 — Pro: business / advanced
// ─────────────────────────────────────────────────────────────────
const PRO_ITEMS: QuizItem[] = [
  { sentence:"Let's circle back on this after the meeting.",       answer:'🔄💼', choices:['🔄💼','🔄😊','💼📅','🔄📚'],  hint:'Business' },
  { sentence:"Could you send me the report by end of day?",        answer:'📊📨', choices:['📊📨','📊💤','📧📊','📊🎉'],   hint:'Business' },
  { sentence:"We need to align on the project timeline.",          answer:'📅✅', choices:['📅✅','📅😊','✅💼','📅❌'],   hint:'Business' },
  { sentence:"I appreciate your feedback on this proposal.",       answer:'🙏📄', choices:['🙏📄','🙏😊','📄💼','🙏🎉'],   hint:'Business' },
  { sentence:"The quarterly results exceeded our expectations.",   answer:'📈🎉', choices:['📈🎉','📉🎉','📈😊','📈💼'],   hint:'Business' },
  { sentence:"Could we schedule a call for next week?",            answer:'📞📅', choices:['📞📅','📞😊','📅💼','📞❓'],   hint:'Business' },
  { sentence:"I'd like to negotiate the terms of this contract.",  answer:'🤝📄', choices:['🤝📄','🤝😊','📄💼','🤝❌'],   hint:'Business' },
  { sentence:"We're launching the new product next quarter.",      answer:'🚀📦', choices:['🚀📦','🚀😊','📦💼','🚀📅'],   hint:'Business' },
  { sentence:"Please keep this information confidential.",         answer:'🔒🤫', choices:['🔒🤫','🔒😊','🤫💼','🔒📄'],   hint:'Business' },
  { sentence:"The team delivered an outstanding performance.",     answer:'🏆👏', choices:['🏆👏','🏆😊','👏💼','🏆📊'],   hint:'Business' },
  { sentence:"I'd like to present our Q3 strategy.",              answer:'📊🎤', choices:['📊🎤','📊😊','🎤💼','📊📅'],   hint:'Business' },
  { sentence:"Please review the attached documents.",              answer:'📎📋', choices:['📎📋','📎😊','📋💼','📎📧'],   hint:'Business' },
  { sentence:"We are on track to meet our deadline.",              answer:'📅✅', choices:['📅✅','📅😊','📅❌','⏰✅'],   hint:'Business' },
  { sentence:"Let's set up a brainstorming session.",              answer:'💡🤝', choices:['💡🤝','💡😊','🤝💼','💡📅'],   hint:'Business' },
  { sentence:"Our client approved the final design.",              answer:'✅🎨', choices:['✅🎨','✅😊','🎨💼','✅📄'],   hint:'Business' },
];

// ─────────────────────────────────────────────────────────────────
// Q&A Mode dataset
// ─────────────────────────────────────────────────────────────────
interface QAItem {
  question: string;
  answer:   string;   // correct response
  wrongs:   [string, string]; // two distractors
  hint?:    string;
}

// Level 1 — Baby: very short, simple responses
const QA_LEVEL1: QAItem[] = [
  {
    question: 'Hello!',
    answer:   'Hi there!',
    wrongs:   ['Goodbye.', 'Thank you.'],
  },
  {
    question: "What's your name?",
    answer:   'My name is Tom.',
    wrongs:   ['It is red.', 'Yes, it is.'],
  },
  {
    question: 'How old are you?',
    answer:   'I am seven years old.',
    wrongs:   ['I like dogs.', 'It is sunny.'],
  },
  {
    question: 'Do you like apples?',
    answer:   'Yes, I love apples!',
    wrongs:   ['No, I am a bird.', 'It is big.'],
  },
  {
    question: 'What color is the sky?',
    answer:   'The sky is blue.',
    wrongs:   ['It is a dog.', 'I am happy.'],
  },
  {
    question: 'Is this a dog?',
    answer:   'Yes, it is a dog!',
    wrongs:   ['No, it is raining.', 'I like cake.'],
  },
  {
    question: 'Goodbye!',
    answer:   'Goodbye! See you later!',
    wrongs:   ['I am hungry.', 'It is a cat.'],
  },
  {
    question: 'Are you happy?',
    answer:   'Yes, I am very happy!',
    wrongs:   ['No, it is blue.', 'I like trains.'],
  },
  {
    question: 'What is this?',
    answer:   'This is an apple.',
    wrongs:   ['I am fine.', 'Yes, please.'],
  },
  {
    question: 'Thank you!',
    answer:   "You're welcome!",
    wrongs:   ['It is cold.', 'I like fish.'],
  },
];

// Level 2 — Toddler/Child: short daily conversation
const QA_LEVEL2: QAItem[] = [
  {
    question: 'How are you today?',
    answer:   'I am fine, thank you.',
    wrongs:   ['I am a cat.', 'It is raining.'],
  },
  {
    question: 'What is your name?',
    answer:   'My name is Alex.',
    wrongs:   ['I like apples.', 'It is Monday.'],
  },
  {
    question: 'Where are you from?',
    answer:   'I am from Australia.',
    wrongs:   ['I like apples.', 'It is five o\'clock.'],
  },
  {
    question: 'What do you do for a living?',
    answer:   'I am a teacher.',
    wrongs:   ['I am hungry.', 'The sky is blue.'],
  },
  {
    question: 'How was your weekend?',
    answer:   'It was wonderful, thank you!',
    wrongs:   ['I have two cats.', 'Please turn left.'],
  },
  {
    question: 'Do you speak Japanese?',
    answer:   'Just a little, but I am learning.',
    wrongs:   ['I want some coffee.', 'The train is late.'],
  },
  {
    question: 'Nice to meet you!',
    answer:   'Nice to meet you too!',
    wrongs:   ['I am going home.', 'Where is the bus?'],
  },
];

// Level 3 — Adult/Pro: hotel hospitality, travel, business
const QA_LEVEL3: QAItem[] = [
  // ── Hotel / Inn check-in & welcome ──────────────────────────
  {
    question: "Welcome to Brighton Star Inn! Did you find the place okay?",
    answer:   "Yes, your directions were perfect!",
    wrongs:   ["I want a hamburger.", "Good morning."],
    hint:     'Hotel check-in',
  },
  {
    question: 'Welcome to Brighton Star Inn! How was your trip?',
    answer:   'It was great, thank you.',
    wrongs:   ['My name is John.', 'I want to sleep.'],
    hint:     'Hotel check-in',
  },
  {
    question: 'May I have your name, please?',
    answer:   'Sure, it\'s Taylor. I have a reservation.',
    wrongs:   ['I like sushi.', 'The weather is nice.'],
    hint:     'Hotel check-in',
  },
  {
    question: 'How many nights will you be staying?',
    answer:   'I will be staying for three nights.',
    wrongs:   ['I am very tired.', 'Yes, I like it.'],
    hint:     'Hotel check-in',
  },
  {
    question: 'Would you prefer a smoking or non-smoking room?',
    answer:   'Non-smoking, please.',
    wrongs:   ['I want to eat dinner.', 'The sea is beautiful.'],
    hint:     'Hotel room',
  },
  {
    question: 'What time is check-out?',
    answer:   'Check-out is at 10 AM.',
    wrongs:   ['I like coffee.', 'Yes, please.'],
    hint:     'Hotel check-out',
  },
  {
    question: 'Is breakfast included?',
    answer:   'Yes, breakfast is served from 7 to 9 AM.',
    wrongs:   ['The room is on the left.', 'I need a taxi.'],
    hint:     'Hotel breakfast',
  },
  {
    question: 'Would you like some Japanese green tea?',
    answer:   'Yes, please. That sounds lovely.',
    wrongs:   ['I need a map.', 'It is very cloudy today.'],
    hint:     'Hotel hospitality',
  },
  {
    question: "Can we see Mt. Fuji clearly from this area?",
    answer:   "Yes, you can get a stunning view from here.",
    wrongs:   ["No, I don't speak English.", "It's twelve o'clock."],
    hint:     'Sightseeing',
  },
  {
    question: 'Can I see Mt. Fuji from here?',
    answer:   'Yes, you can see it clearly from the window.',
    wrongs:   ['No, it is a train.', 'I am eating breakfast.'],
    hint:     'Sightseeing from hotel',
  },
  {
    question: 'Is the hot spring bath open now?',
    answer:   'Yes, it is open until midnight.',
    wrongs:   ['I need more towels.', 'The bus stop is near.'],
    hint:     'Hotel facilities',
  },
  {
    question: 'Do you need help with your luggage?',
    answer:   'Yes, please. Thank you so much.',
    wrongs:   ['I am from Canada.', 'The soup is hot.'],
    hint:     'Hotel service',
  },
  // ── Travel & Sightseeing ─────────────────────────────────────
  {
    question: 'Excuse me, where is the nearest train station?',
    answer:   'It is about a five-minute walk from here.',
    wrongs:   ['I like pizza.', 'The dog is sleeping.'],
    hint:     'Directions',
  },
  {
    question: 'How do I get to the city center?',
    answer:   'Take the number 3 bus and get off at City Hall.',
    wrongs:   ['I am not hungry.', 'Please wait here.'],
    hint:     'Directions',
  },
  {
    question: 'What time does the museum open?',
    answer:   'It opens at 9 AM and closes at 5 PM.',
    wrongs:   ['It is very delicious.', 'My name is Sara.'],
    hint:     'Sightseeing',
  },
  {
    question: 'Is there a pharmacy nearby?',
    answer:   'Yes, there is one just around the corner.',
    wrongs:   ['I prefer tea.', 'The flower is beautiful.'],
    hint:     'Travel help',
  },
  {
    question: 'Can I pay by credit card?',
    answer:   'Yes, we accept all major credit cards.',
    wrongs:   ['The park is lovely.', 'I am from Tokyo.'],
    hint:     'Shopping / Payment',
  },
  // ── Café ────────────────────────────────────────────────────
  {
    question: 'What can I get you?',
    answer:   'I\'d like a hot latte and a croissant, please.',
    wrongs:   ['Where is the restroom?', 'I am going by train.'],
    hint:     'Café order',
  },
  {
    question: 'Would you like that to go or to stay?',
    answer:   'To stay, please.',
    wrongs:   ['Yes, I am fine.', 'The bus is coming.'],
    hint:     'Café order',
  },
  {
    question: 'Can I take your order?',
    answer:   'Yes, I\'ll have the chicken sandwich and a sparkling water.',
    wrongs:   ['I live near the park.', 'It is raining today.'],
    hint:     'Café order',
  },
  // ── Daily Situations ────────────────────────────────────────
  {
    question: 'Are you ready to order?',
    answer:   'Yes, I\'ll have the pasta, please.',
    wrongs:   ['I am from France.', 'The concert was amazing.'],
    hint:     'Restaurant',
  },
  {
    question: 'Can you recommend a good local restaurant?',
    answer:   'Sure! The sushi place on Main Street is excellent.',
    wrongs:   ['I need to charge my phone.', 'The sun is setting.'],
    hint:     'Recommendation',
  },
  {
    question: 'Do you have any dietary restrictions?',
    answer:   'I am vegetarian, so no meat please.',
    wrongs:   ['The mountain is tall.', 'I will call you later.'],
    hint:     'Restaurant',
  },
  {
    question: 'Could you speak more slowly, please?',
    answer:   'Of course, I\'m sorry about that.',
    wrongs:   ['Yes, I have a dog.', 'The flowers are pink.'],
    hint:     'Communication',
  },
  {
    question: 'What\'s the weather like tomorrow?',
    answer:   'It should be sunny and warm.',
    wrongs:   ['I have two tickets.', 'Please open the window.'],
    hint:     'Weather',
  },
  {
    question: "Would you mind if I check in a bit earlier?",
    answer:   "Sure, let me check if your room is ready.",
    wrongs:   ["I like green tea.", "Goodbye."],
    hint:     'Hotel check-in',
  },
  {
    question: 'Did you enjoy your stay?',
    answer:   'It was absolutely wonderful. Thank you for everything.',
    wrongs:   ['I need a new phone.', 'The train is fast.'],
    hint:     'Hotel check-out',
  },
  {
    question: "Is there anything else I can help you with?",
    answer:   "Could you call a taxi for us, please?",
    wrongs:   ["I'm from Australia.", "Yes, it is snowing."],
    hint:     'Hotel service',
  },
  {
    question: "I'd like to extend my stay by one night.",
    answer:   "Of course! Let me check availability right away.",
    wrongs:   ["The museum opens at nine.", "I prefer window seats."],
    hint:     'Hotel extension',
  },
];

// ─────────────────────────────────────────────────────────────────
// Q&A Mode component
// ─────────────────────────────────────────────────────────────────
function qaPoolForLevel(lv: number): QAItem[] {
  if (lv <= 1) return QA_LEVEL1;
  if (lv <= 3) return QA_LEVEL2;
  return QA_LEVEL3;
}

function buildQAQuiz(lv: number, prevQ?: string): QAItem & { choices: string[] } {
  const pool = qaPoolForLevel(lv).filter(q => q.question !== prevQ);
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { ...item, choices: shuffleArr([item.answer, ...item.wrongs]) };
}

// temp named export to avoid hoisting conflict with shuffle below
function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QAMode({ growthLv }: { growthLv: number }) {
  type QAQuiz = QAItem & { choices: string[] };
  const [quiz,     setQuiz]     = useState<QAQuiz>(() => buildQAQuiz(growthLv));
  const [result,   setResult]   = useState<'correct' | 'wrong' | null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [correct,  setCorrect]  = useState(0);
  const [total,    setTotal]    = useState(0);
  const prevRef   = useRef<string | undefined>(undefined);
  const prevLvRef = useRef(growthLv);

  // Reset quiz pool when level changes
  useEffect(() => {
    if (growthLv !== prevLvRef.current) {
      prevLvRef.current = growthLv;
      prevRef.current   = undefined;
      setQuiz(buildQAQuiz(growthLv));
    }
  }, [growthLv]);

  const playQuestion = useCallback(() => {
    setSpeaking(true);
    speakText(quiz.question, () => setSpeaking(false), 0.84);
  }, [quiz]);

  useEffect(() => {
    setResult(null); setLocked(false); setShowText(false);
    playQuestion();
  }, [quiz.question]); // eslint-disable-line

  const next = () => {
    prevRef.current = quiz.question;
    setQuiz(buildQAQuiz(growthLv, prevRef.current));
  };

  const handleTap = (choice: string) => {
    if (locked) return;
    const ok = choice === quiz.answer;
    setTotal(t => t + 1);
    if (ok) {
      setCorrect(c => c + 1);
      setResult('correct');
      setLocked(true);
      // Read the correct answer aloud, then advance
      speakText(quiz.answer, () => setTimeout(next, 600), 0.86);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 900);
    }
  };

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">
          Choose the best response
        </p>
        {quiz.hint && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
            {quiz.hint}
          </span>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={playQuestion}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
              speaking
                ? 'bg-teal-400 text-white animate-pulse'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}>
            <span className="text-lg">🔊</span>
            <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
          </button>
          <button onClick={() => setShowText(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 border ${
              showText
                ? 'bg-amber-100 border-amber-300 text-amber-700'
                : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
            }`}>
            <span>{showText ? '🙈' : '👁️'}</span>
            <span className="text-xs">{showText ? 'Hide Text' : 'Show Text'}</span>
          </button>
        </div>

        {/* Revealed question */}
        {showText && (
          <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800 text-center leading-relaxed">
              {quiz.question}
            </p>
          </div>
        )}

        {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
        {result === 'wrong'   && <p className="text-red-500 font-black">Try again!</p>}
      </div>

      {/* 3 answer choices */}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => {
          const isCorrectAndShowing = result === 'correct' && choice === quiz.answer;
          return (
            <button key={idx} onClick={() => handleTap(choice)}
              disabled={result === 'correct'}
              className={`w-full px-4 py-3.5 rounded-2xl text-left font-semibold text-sm leading-snug border transition-all active:scale-[0.98] shadow-sm ${
                isCorrectAndShowing
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                  : 'bg-white border-gray-200 text-gray-800 hover:bg-teal-50 hover:border-teal-300'
              }`}>
              <span className="text-gray-400 font-black mr-2">{['A', 'B', 'C'][idx]}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      <button onClick={next}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all">
        Skip →
      </button>

      {/* Score */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Accuracy</span>
          <span className="text-base font-black text-teal-600">{accuracy}%</span>
        </div>
        <span className="text-xs text-gray-400">{correct} / {total} correct</span>
        <button onClick={() => { setCorrect(0); setTotal(0); }}
          className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
          Reset
        </button>
      </div>
    </div>
  );
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

function speakText(text: string, onEnd?: () => void, rate = 0.88): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd?.(); return; }
  try {
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = 'en-US'; utt.rate = rate; utt.pitch = 1.05; utt.volume = 1.0;
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

function getItemsForLevel(lv: number): QuizItem[] | null {
  if (lv === 1) return null;
  if (lv === 2) return TODDLER_ITEMS;
  if (lv === 3) return CHILD_ITEMS;
  if (lv === 4) return TEEN_ITEMS;
  if (lv === 5) return ADULT_ITEMS;
  return PRO_ITEMS;
}

// ─────────────────────────────────────────────────────────────────
// Level 1 — Word Quiz
// ─────────────────────────────────────────────────────────────────
interface WordQuiz { correct: { word: string; emoji: string }; choices: { word: string; emoji: string }[] }

function buildWordQuiz(prevWord?: string): WordQuiz {
  const pool    = BABY_ITEMS.filter(v => v.word !== prevWord);
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const others  = shuffle(BABY_ITEMS.filter(v => v.word !== correct.word)).slice(0, 3);
  return { correct, choices: shuffle([correct, ...others]) };
}

function WordQuizView({ onCorrect }: { onCorrect: () => void }) {
  const [quiz,     setQuiz]     = useState<WordQuiz>(() => buildWordQuiz());
  const [result,   setResult]   = useState<'correct' | 'wrong' | null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const prevRef = useRef<string | undefined>(undefined);

  const playWord = useCallback(() => {
    setSpeaking(true);
    speakText(quiz.correct.word, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => { setShowText(false); playWord(); }, [quiz.correct.word]); // eslint-disable-line

  const next = useCallback(() => {
    prevRef.current = quiz.correct.word;
    setQuiz(buildWordQuiz(prevRef.current));
    setResult(null); setLocked(false);
  }, [quiz]);

  const handleTap = (item: { word: string; emoji: string }) => {
    if (locked) return;
    if (item.word === quiz.correct.word) {
      setResult('correct'); setLocked(true); onCorrect();
      setTimeout(next, 1100);
    } else {
      setResult('wrong'); setTimeout(() => setResult(null), 700);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">Which one is it?</p>
        <div className="flex gap-2">
          <button onClick={playWord}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-base transition-all active:scale-95 ${
              speaking ? 'bg-blue-400 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}>
            <span className="text-xl">🔊</span>
            <span className="text-sm">{speaking ? 'Playing…' : 'Listen Again'}</span>
          </button>
          <button onClick={() => setShowText(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 border ${
              showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
            }`}>
            <span>{showText ? '🙈' : '👁️'}</span>
            <span className="text-xs">{showText ? 'Hide' : 'Show Text'}</span>
          </button>
        </div>
        {showText && (
          <div className="px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-lg font-black text-amber-800">{quiz.correct.word}</p>
          </div>
        )}
        {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
        {result === 'wrong'   && <p className="text-red-500 font-black">Try again!</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quiz.choices.map(item => (
          <button key={item.word} onClick={() => handleTap(item)}
            className={`py-6 rounded-2xl text-5xl flex items-center justify-center border transition-all active:scale-95 shadow-sm ${
              result === 'correct' && item.word === quiz.correct.word
                ? 'bg-emerald-100 border-emerald-400 scale-[1.04]'
                : 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-300'
            }`}>
            {item.emoji}
          </button>
        ))}
      </div>
      <button onClick={next}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all">
        Skip →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Sentence Quiz (Levels 2-6)
// ─────────────────────────────────────────────────────────────────
function buildSentenceQuiz(items: QuizItem[], prevSentence?: string): QuizItem {
  const pool = items.filter(s => s.sentence !== prevSentence);
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { ...item, choices: shuffle(item.choices) };
}

function SentenceQuizView({
  items, accentColor, onCorrect,
}: {
  items: QuizItem[];
  accentColor: string;
  onCorrect: () => void;
}) {
  const [quiz,     setQuiz]     = useState<QuizItem>(() => buildSentenceQuiz(items));
  const [result,   setResult]   = useState<'correct' | 'wrong' | null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const prevRef = useRef<string | undefined>(undefined);

  const playSentence = useCallback(() => {
    setSpeaking(true);
    speakText(quiz.sentence, () => setSpeaking(false), 0.82);
  }, [quiz]);

  useEffect(() => {
    setResult(null); setLocked(false); setShowText(false);
    playSentence();
  }, [quiz.sentence]); // eslint-disable-line

  useEffect(() => {
    prevRef.current = undefined;
    setQuiz(buildSentenceQuiz(items));
  }, [items]);

  const next = useCallback(() => {
    prevRef.current = quiz.sentence;
    setQuiz(buildSentenceQuiz(items, prevRef.current));
  }, [quiz, items]);

  const handleTap = (choice: string) => {
    if (locked) return;
    if (choice === quiz.answer) {
      setResult('correct'); setLocked(true); onCorrect();
      setTimeout(next, 1200);
    } else {
      setResult('wrong'); setTimeout(() => setResult(null), 700);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">Which picture matches?</p>
          {quiz.hint && (
            <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{quiz.hint}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-center">
          <button onClick={playSentence}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
              speaking ? `${accentColor} opacity-80 text-white animate-pulse` : `${accentColor} text-white hover:opacity-90`
            }`}>
            <span className="text-lg">🔊</span>
            <span>{speaking ? 'Playing…' : 'Listen Again'}</span>
          </button>
          <button onClick={() => setShowText(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-2xl font-black text-sm transition-all active:scale-95 border ${
              showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
            }`}>
            <span>{showText ? '🙈' : '👁️'}</span>
            <span className="text-xs">{showText ? 'Hide Text' : 'Show Text'}</span>
          </button>
        </div>

        {/* Revealed sentence */}
        {showText && (
          <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800 text-center leading-relaxed">{quiz.sentence}</p>
          </div>
        )}

        {result === 'correct' && <p className="text-emerald-600 font-black animate-bounce">✓ Correct!</p>}
        {result === 'wrong'   && <p className="text-red-500 font-black">Try again!</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {quiz.choices.map(choice => (
          <button key={choice} onClick={() => handleTap(choice)}
            className={`py-5 rounded-2xl text-3xl flex items-center justify-center gap-1 border transition-all active:scale-95 shadow-sm ${
              result === 'correct' && choice === quiz.answer
                ? 'bg-emerald-100 border-emerald-400 scale-[1.04]'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-400'
            }`}>
            {choice}
          </button>
        ))}
      </div>

      <button onClick={next}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm transition-all">
        Skip →
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// BabyImmersion — root component
// ─────────────────────────────────────────────────────────────────
const LS_KEY = 'immersion-progress-v1';
function loadProgress(): { totalCorrect: number; total: number } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { totalCorrect: 0, total: 0 };
}
function saveProgress(totalCorrect: number, total: number) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ totalCorrect, total })); } catch { /* ignore */ }
}

type ImmersionMode = 'picture' | 'qa';

export function BabyImmersion() {
  const [mode,         setMode]         = useState<ImmersionMode>('picture');
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [total,        setTotal]        = useState(0);
  const [justLevelUp,  setJustLevelUp]  = useState(false);
  const [hydrated,     setHydrated]     = useState(false);
  const prevLevelRef = useRef(1);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    const saved = loadProgress();
    setTotalCorrect(saved.totalCorrect);
    setTotal(saved.total);
    prevLevelRef.current = getGrowthLevel(saved.totalCorrect).level;
    setHydrated(true);
  }, []);

  const switchMode = (m: ImmersionMode) => {
    window.speechSynthesis?.cancel();
    setMode(m);
  };

  const growthLevel = getGrowthLevel(totalCorrect);
  const nextLevel   = GROWTH_LEVELS.find(l => l.scoreReq > totalCorrect);
  const toNext      = nextLevel ? nextLevel.scoreReq - totalCorrect : null;
  const progressPct = nextLevel
    ? Math.round(((totalCorrect - growthLevel.scoreReq) / (nextLevel.scoreReq - growthLevel.scoreReq)) * 100)
    : 100;

  const onCorrect = () => {
    setTotalCorrect(c => {
      const next = c + 1;
      const newLv = getGrowthLevel(next);
      if (newLv.level > prevLevelRef.current) {
        prevLevelRef.current = newLv.level;
        setJustLevelUp(true);
        setTimeout(() => setJustLevelUp(false), 2500);
      }
      saveProgress(next, total + 1);
      return next;
    });
    setTotal(t => t + 1);
  };

  const items    = getItemsForLevel(growthLevel.level);
  const accuracy = total > 0 ? Math.round((totalCorrect / total) * 100) : 0;

  const accentColors: Record<number, string> = {
    2: 'bg-green-600', 3: 'bg-yellow-500', 4: 'bg-orange-500',
    5: 'bg-violet-600', 6: 'bg-rose-600',
  };
  const accent = accentColors[growthLevel.level] ?? 'bg-blue-600';

  if (!hydrated) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">

      {/* Level Banner */}
      <div className={`rounded-2xl bg-gradient-to-r ${growthLevel.color} px-5 py-4 text-white shadow-md`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Current Level</p>
            <p className="text-2xl font-black leading-tight mt-0.5">
              {growthLevel.emoji} Level {growthLevel.level}: {growthLevel.title}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{totalCorrect}</p>
            <p className="text-[10px] opacity-70">correct</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[10px] opacity-70 mb-1">
            <span>Progress</span>
            {toNext !== null ? <span>{toNext} more to level up!</span> : <span>🏆 Max Level!</span>}
          </div>
          <div className="h-2 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width:`${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Mode toggle ── */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl">
        {([
          ['picture', '🖼️', 'Picture Mode',  'Emoji quiz'],
          ['qa',      '💬', 'Q&A Mode',      'Conversation'],
        ] as [ImmersionMode, string, string, string][]).map(([m, icon, label, sub]) => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              mode === m
                ? m === 'picture'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{icon} {label}</span>
            <span className={`block text-[9px] mt-0.5 ${mode === m ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {/* Level-up banner */}
      {justLevelUp && (
        <div className="flex items-center gap-3 px-4 py-3 bg-yellow-50 border border-yellow-300 rounded-2xl animate-bounce shadow">
          <span className="text-3xl">🎉</span>
          <div>
            <p className="text-sm font-black text-yellow-800">Level Up! {growthLevel.emoji}</p>
            <p className="text-xs text-yellow-600">Welcome to {growthLevel.title} level!</p>
          </div>
        </div>
      )}

      {/* Quiz — Picture Mode */}
      {mode === 'picture' && (
        <>
          {items === null
            ? <WordQuizView    onCorrect={onCorrect} />
            : <SentenceQuizView items={items} accentColor={accent} onCorrect={onCorrect} />
          }
          {/* Picture Mode score */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-white rounded-xl border border-gray-200">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Accuracy</span>
              <span className="text-base font-black text-blue-600">{accuracy}%</span>
            </div>
            <span className="text-xs text-gray-400">{totalCorrect} / {total} correct</span>
            <button
              onClick={() => { setTotalCorrect(0); setTotal(0); prevLevelRef.current = 1; saveProgress(0, 0); }}
              className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-2 py-1 transition-colors">
              Reset
            </button>
          </div>
        </>
      )}

      {/* Quiz — Q&A Mode (has its own score inside) */}
      {mode === 'qa' && <QAMode growthLv={growthLevel.level} />}

    </div>
  );
}
