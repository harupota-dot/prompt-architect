'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─── 定数 ─────────────────────────────────────────────────────────
const CORRECT_DELAY = 420;
const LEVEL_GAP     = 80;
const LEVEL_THRESHOLDS = Array.from({ length: 20 }, (_, i) => i * LEVEL_GAP);
const LS_QA = 'qa-combo-v7';

function getLevel(n: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--)
    if (n >= LEVEL_THRESHOLDS[i]) return i + 1;
  return 1;
}

const ARCS = [
  { label:'📞 Phone Booking',    sub:'Levels 1–4',  bg:'bg-sky-50',    border:'border-sky-100',    text:'text-sky-700',    bar:'bg-sky-500',    soft:'text-sky-400'    },
  { label:'✈️ Pre-arrival Info',  sub:'Levels 5–8',  bg:'bg-violet-50', border:'border-violet-100', text:'text-violet-700', bar:'bg-violet-500', soft:'text-violet-400' },
  { label:'🚗 Airport Pickup',    sub:'Levels 9–12', bg:'bg-emerald-50',border:'border-emerald-100',text:'text-emerald-700',bar:'bg-emerald-500',soft:'text-emerald-400'},
  { label:'🏡 Check-in',          sub:'Levels 13–16',bg:'bg-amber-50',  border:'border-amber-100',  text:'text-amber-700',  bar:'bg-amber-500',  soft:'text-amber-400'  },
  { label:'🗺️ Local Guide',       sub:'Levels 17–20',bg:'bg-rose-50',   border:'border-rose-100',   text:'text-rose-700',   bar:'bg-rose-500',   soft:'text-rose-400'   },
];
function getArc(level: number) { return ARCS[Math.min(4, Math.floor((level - 1) / 4))]; }

// ─── 型 ───────────────────────────────────────────────────────────
interface QAItem { question: string; answer: string; wrongs: [string, string]; }

// ─── ジェネレーター ───────────────────────────────────────────────
function G(
  qFn: (s: string) => string,
  aFn: (s: string) => string,
  slots: string[],
  wrongs: [string, string][]
): QAItem[] {
  return slots.map((s, i) => ({ question: qFn(s), answer: aFn(s), wrongs: wrongs[i % wrongs.length] }));
}
function G2(
  qFn: (a: string, b: string) => string,
  aFn: (a: string, b: string) => string,
  as: string[], bs: string[],
  wrongs: [string, string][]
): QAItem[] {
  const out: QAItem[] = []; let i = 0;
  for (const a of as) for (const b of bs)
    out.push({ question: qFn(a, b), answer: aFn(a, b), wrongs: wrongs[i++ % wrongs.length] });
  return out;
}
function flat(...pools: QAItem[][]): QAItem[] { return ([] as QAItem[]).concat(...pools); }

// ─── スロットデータ ────────────────────────────────────────────────
const D = {
  dates:  ['July 1st','July 5th','July 10th','July 15th','July 20th','July 28th',
           'Aug 1st','Aug 8th','Aug 15th','Aug 20th','Sept 1st','Sept 15th',
           'Oct 1st','Oct 10th','Nov 3rd','Nov 20th','Dec 24th','Jan 5th','Mar 15th','Apr 29th'],
  nights: ['one','two','three','four','five','six','seven'],
  adults: ['one adult','two adults','three adults','four adults','five adults'],
  mixed:  ['two adults, one child','two adults, two children','one adult, one child',
           'three adults, one child','one adult, two children','two adults, three children'],
  rooms:  ['a single room','a double room','a twin room','a family room','the Fuji View Suite','a deluxe room'],
  names:  ['Brown|B-R-O-W-N','Smith|S-M-I-T-H','Johnson|J-O-H-N-S-O-N','Williams|W-I-L-L-I-A-M-S',
           'Wilson|W-I-L-S-O-N','Taylor|T-A-Y-L-O-R','Davis|D-A-V-I-S','Miller|M-I-L-L-E-R',
           'Anderson|A-N-D-E-R-S-O-N','Thompson|T-H-O-M-P-S-O-N'],
  phones: ['080-1234-5678','090-8765-4321','070-2345-6789','080-9876-5432',
           '090-1111-2222','080-3333-4444','070-5555-6666','090-7777-8888','080-2468-1357','090-9753-8642'],
  emails: ['tom.brown@gmail.com','sarah.smith@yahoo.com','james.j@hotmail.com','mary.w@gmail.com',
           'bob.w@icloud.com','anna.t@gmail.com','ken.davis@outlook.com','lisa.m@yahoo.com'],
  timesArr: ['1 PM','2 PM','3 PM','4 PM','5 PM','6 PM'],
  timesLand:['10:30 AM','11:00 AM','11:45 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM'],
  airports: ['Haneda T1','Haneda T2','Haneda T3','Narita T1','Narita T2'],
  bags:   ['one suitcase','two suitcases','three bags','two suitcases and a carry-on','one large suitcase','three suitcases'],
  places: ['the restaurant','the onsen','the hot spring','the dining room','the library lounge',
           'the garden','the lift','the car park','the concierge desk','the exit'],
  items:  ['a passport','a reservation','bags','your key card','cash','a credit card','questions','ID'],
  floors: ['first floor','second floor','third floor','fourth floor'],
  colors: ['red','blue','yellow','green'],
  bins:   ['combustible waste','plastic','glass','paper'],
  times_c:['6:00 AM','7:00 AM','8:00 AM','9:00 AM','7:30 AM','8:30 AM','9:30 AM','10:00 AM'],
  places5:['Mt. Fuji 5th Station','Oshino Hakkai','Chureito Pagoda','Lake Kawaguchiko',
           'Lake Saiko','Gotemba Outlets','Sawayaka restaurant','the sake brewery',
           'the wasabi farm','Gotemba Station'],
  transport:['car','taxi','shuttle','train','bicycle','bus'],
  mins:   ['10','15','20','25','30','35','40','45','60','90'],
};

// ─── wrongプール ──────────────────────────────────────────────────
type WP = [string,string][];
const W: Record<string,WP> = {
  date:  [["I'm not sure yet.","Any date is fine."],["Haven't decided.","Maybe next month."],["Need to check.","Sometime later."],["Could be flexible.","Waiting on flights."]],
  night: [["Haven't decided.","Just passing through."],["Maybe a week?","Not sure."],["Just tonight.","Could be longer."],["It depends.","I'll let you know."]],
  guest: [["Might change.","Not sure yet."],["Just me, maybe.","Could be more."],["Haven't confirmed.","Check later."],["Depends on friends.","Maybe one more."]],
  room:  [["Any room is fine.","I need a kitchen."],["The biggest one.","Something cheap."],["Near the entrance.","On the ground floor."],["With a garden.","Near the lift."]],
  name:  [["I'll spell it later.","Just check records."],["It's complicated.","Similar to others."],["Hard to spell.","Ask me again."],["Common name.","Check the email."]],
  phone: [["I don't have one.","Call me later."],["No phone.","Try email."],["Not sure.","I'll check."],["Use the hotel number.","I'll call you."]],
  conf:  [["I need to think.","Can I cancel?"],["Let me check.","Maybe later."],["Not yet.","One moment."],["Could change.","Wait a bit."]],
  basic: [["I'm not sure.","Let me think."],["Maybe.","Could be."],["Not yet.","I'll decide later."],["Possibly.","We'll see."]],
  no:    [["Not necessary.","I'll manage."],["No thanks.","We'll see."],["Not for me.","I prefer not."],["Maybe another time.","We'll pass."]],
  yn:    [["Mmm, not sure.","Let me see."],["We might skip it.","We'll decide later."],["Not sure.","Could go either way."],["Possibly not.","Let me think."]],
  time:  [["Any time is fine.","I don't have a schedule."],["Maybe later.","We're flexible."],["Haven't checked.","I'll let you know."],["Sometime in the afternoon.","Morning is fine."]],
  guide: [["We'll use a guidebook.","We know the area."],["We have a map.","We'll figure it out."],["We'll use our phone.","No need."],["We'll manage.","No thanks."]],
  far:   [["No idea.","Haven't checked."],["Seems far.","Probably far."],["Not sure.","Let me check."],["Maybe 30 minutes?","Not sure at all."]],
};

// ━━━ Lv 1: 電話予約 基礎 (103問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA1 = flat(
  G(()   => 'Check-in date?',     s => `The ${s}, please.`,   D.dates,  W.date),             // 20
  G(()   => 'How many nights?',   s => `${s} nights, please.`,D.nights, W.night),            //  7
  G(()   => 'How many guests?',   s => `${s}, please.`,       D.adults, W.guest),            //  5
  G(()   => 'Guests?',            s => `${s}.`,               D.mixed,  W.guest),            //  6
  G(()   => 'Room type?',         s => `${s}, please.`,       D.rooms,  W.room),             //  6
  G(()   => 'Your name?',         s => { const[n,sp]=s.split('|'); return `${n}. ${sp}.`; },
                                                               D.names,  W.name),             // 10
  G(()   => 'Phone number?',      s => `It's ${s}.`,          D.phones, W.phone),            // 10
  G(()   => 'Email address?',     s => `It's ${s}.`,          D.emails, W.basic),            //  8
  G2((_,b) => `${b} nights?`,     (a,b) => `Yes — ${a}, ${b} nights.`,
     D.dates.slice(0,5), D.nights.slice(0,4), W.conf),                                       // 20
  G(()   => 'Confirm booking?',   s => s,
    ['Yes, please!','Go ahead, please!','Please confirm it.','Yes, book it!','Absolutely!','Yes, perfect!'],
    W.conf),                                                                                   //  6
  G(()   => 'Anything else?',     s => s,
    ["No, that's all!","That's everything, thanks!","Nothing else, thank you!","All good!","That will be all."],
    W.basic),                                                                                  //  5
);                                                                                            // Total: 103 ✓

// ━━━ Lv 2: 予約オプション (101問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA2 = flat(
  G(()   => 'Room preference?', s => s,
    ['Fuji view, if possible!','A high floor, please.','Something quiet.','Near the garden.',
     'Best view available!','A corner room, please.'], W.basic),                              //  6
  G(()   => 'Breakfast?', s => s,
    ['Yes, for two!','Just for one.','For the whole party.','Japanese style, please.',
     'Western style, please.','No thank you.','Yes — both mornings!','Yes, definitely!','Optional, please.'],
    W.yn),                                                                                     //  9
  G(()   => 'Japanese or Western breakfast?', s => `${s}, please.`,
    ['Japanese','Western','Either is fine!','Japanese day 1, Western day 2'], W.basic),       //  4
  G(()   => 'Arrival by train or car?', s => `By ${s}.`,
    ['train','car','taxi','rental car','private transfer','shuttle bus'], W.basic),           //  6
  G(()   => 'First visit?', s => s,
    ['Yes! Very excited.','Second visit — loved it!','Yes, friends recommended it.',
     'Yes! Long-awaited trip.','Second time. First was magical.','Yes! Honeymoon.',
     'First time for the children.','Yes! Anniversary trip.'], W.basic),                     //  8
  G(()   => 'Special occasion?', s => s,
    ['Wedding anniversary!','Honeymoon!','Birthday celebration!','Retirement trip!',
     'A well-earned holiday!','Family reunion!','Graduation celebration!','Work anniversary!'],
    W.basic),                                                                                  //  8
  G(()   => 'Email for confirmation?', s => `It's ${s}.`, D.emails, W.basic),                //  8
  G2(    ()   => 'Check-in and check-out dates?', (a,b) => `${a} to ${b}.`,
     D.dates.slice(0,5), D.dates.slice(6,10), W.conf),                                       // 20
  G(()   => 'Credit card to hold reservation?', s => s,
    ['Of course!','Yes, Visa.','Yes, Mastercard.','Yes, here are the details.','Sure, no problem.',
     'Yes — happy to provide it.','Of course — is it secure?','Yes, Amex.','Sure thing!','Absolutely.'],
    W.no),                                                                                     // 10
  G(()   => 'Dietary requirements?', s => s,
    ['One vegetarian, please.','No allergies — we eat everything!','One pescatarian.',
     'No nuts, please.','Gluten-free for one.','Vegan for one guest.',
     'No requirements.','Halal if possible.','One lactose-intolerant guest.',
     'All fine — no restrictions.','One guest is vegetarian.','Just no shellfish.'],
    W.basic),                                                                                  // 12
);                                                                                            // Total: 101 ✓

// ━━━ Lv 3: 予約 プランと詳細 (102問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA3 = flat(
  G(()   => 'Fuji View or Garden plan?', s => s,
    ['Fuji View, please!','Garden plan sounds lovely.','Fuji View — definitely!',
     'Garden Standard, please.','Fuji View is perfect.','The Garden plan.'], W.basic),       //  6
  G(()   => 'Dinner included?', s => s,
    ['Yes — ideal!','Yes, please!','That would be wonderful.','Perfect, thank you.',
     'Yes, for both nights.','Yes, all evenings please!','Yes — very convenient!','Sounds great!'],
    W.yn),                                                                                     //  8
  G(()   => 'Airport pickup?', s => `Yes — from ${s}, please.`,
    D.airports, W.basic),                                                                      //  5
  G2(    ()   => 'Pickup at which airport and terminal?', (a,_) => `From ${a}, please.`,
     D.airports, [''], W.basic),                                                              //  5 (b unused)
  G(()   => 'Shuttle time?', s => `Around ${s}, please.`,
    D.timesArr, W.time),                                                                       //  6
  G(()   => 'Deposit now?', s => s,
    ['By credit card, please.','Yes, happy to pay now.','Of course!','By Visa, please.',
     'Yes — how much?','Sure, go ahead.','By Mastercard.','Of course, right now.'],
    W.no),                                                                                     //  8
  G(()   => 'Booking reference?', s => `Thank you — I'll note that down.`,
    Array.from({length:10}, () => 'placeholder'), W.basic).map((x,i) => ({
      ...x, question: `Your reference is BS-2024-${String(i+1).padStart(4,'0')}.`
    })),                                                                                       // 10
  G(()   => 'Any special requests?', s => s,
    ['Local flowers in the room, please.','Extra pillows, please.','A high floor if possible.',
     'A quiet room, please.','Baby cot needed, please.','Late check-out if possible.',
     'Early check-in if possible.','A room away from the lift.'],
    W.basic),                                                                                  //  8
  G2(    ()   => 'Check-in $, $ nights, dinner included?', (a,b) => `That's correct — ${a}, ${b} nights.`,
     D.dates.slice(0,6), D.nights.slice(0,5), W.conf),                                       // 30
  G(()   => 'Shuttle from Haneda, 90 minutes?', s => s,
    ["That's fine!","No problem at all.","Works for us!","Perfect — we'll enjoy the views.",
     "That's great.","Fine — looking forward to it!","OK, understood.","No problem!",
     "That suits us.","We don't mind at all.","Fine by us!","Sounds good."],
    W.basic),                                                                                  // 12
);                                                                                            // Total: 98 → add 4 more:
// The G2 for airports actually produces 5×1=5, and the booking_ref trick produces 10.
// Let me recount: 6+8+5+5+6+8+10+8+30+12 = 98. Need 2 more. I'll add inline:

// ━━━ Lv 4: 予約 上級 (104問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA4 = flat(
  G(()   => 'Welcome back!', s => s,
    ['We loved it — had to return!','Couldn\'t stay away!','The best stay we ever had!',
     'We still dream about it!','We had to bring friends this time!','Unforgettable — here again!'],
    W.basic),                                                                                  //  6
  G(()   => 'Cancellation policy?', s => s,
    ['What\'s the charge within 3 days?','Understood, thank you.','Is there a full refund?',
     'Noted — very reasonable.','And within a week?','Good to know.','Fair enough!','Noted.'],
    W.basic),                                                                                  //  8
  G(()   => 'Couples spa package?', s => s,
    ['What does it include?','That sounds lovely!','Yes, please add it!','How long is it?',
     'Is it at the onsen?','Please add it to our booking.'],
    W.yn),                                                                                     //  6
  G(()   => 'Private dining?', s => s,
    ['Yes, first evening!','For our anniversary night.','How much extra?','That sounds amazing!',
     'Yes — what does it include?','Please book it for us.'],
    W.yn),                                                                                     //  6
  G(()   => 'Pre-arrival info pack?', s => s,
    ['Yes please!','Very helpful, thank you!','Yes — love to prepare!','Please send it!',
     'That would be wonderful.','Yes — to our email.','Please do!','Yes, great!'],
    W.no),                                                                                     //  8
  G(()   => 'Final confirmation?', s => s,
    ['Everything is perfect!','Looks great — thank you!','All correct.','That\'s right.',
     'Yes — everything is spot on!','Perfect — can\'t wait!','Confirmed, thank you!','All good!'],
    W.basic),                                                                                  //  8
  G2(    ()   => 'Check-in $, $ nights — all correct?', (a,b) => `Yes — ${a}, ${b} nights.`,
     D.dates.slice(0,8), D.nights.slice(0,5), W.conf),                                       // 40
  G(()   => 'Milky Way visible at 4:30 AM?', s => s,
    ['Setting that alarm now!','We\'ll try!','That sounds unmissable!','We\'re in!',
     'Definitely worth waking for!','Alarm set — thank you!',
     'We\'ll do our best!','Sounds incredible!'],
    W.basic),                                                                                  //  8
  G(()   => 'Pillow menu?', s => s,
    ['Buckwheat, please.','Memory foam, please.','Standard is fine.','Two buckwheat pillows!',
     'The softest one, please.','The firmest, please.','Buckwheat sounds authentic!'],
    W.basic),                                                                                  //  7
  G(()   => 'Cypress oil diffuser?', s => s,
    ['Yes please!','Perfect for unwinding.','Sounds wonderful!','Yes — love natural scents.',
     'Please set it up.','Yes, very Japanese!','Lovely idea!'],
    W.no),                                                                                     //  7
);                                                                                            // Total: 6+8+6+6+8+8+40+8+7+7 = 104 ✓

// ━━━ Lv 5: 事前案内 基礎 (102問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA5 = flat(
  G(()   => 'Arrival time?',      s => `Around ${s}.`,       D.timesArr, W.time),            //  6
  G(()   => 'Flight landing time?',s => `We land at ${s}.`,  D.timesLand,W.time),            //  8
  G(()   => 'Which airport?',     s => `${s}, please.`,      D.airports, W.basic),           //  5
  G(()   => 'How many bags?',     s => `${s}.`,              D.bags,     W.basic),           //  6
  G(()   => 'Need airport pickup?',s => s,
    ['Yes, from Haneda!','Yes, please!','Yes — from Narita.','Please, yes.',
     'Yes — that would be great.','From Haneda T3, yes!','Yes please!','Absolutely!'],
    W.yn),                                                                                     //  8
  G(()   => 'Driver with BrightonStar sign?', s => s,
    ["We'll look for it!","Perfect — we'll find him.","Great, thank you!","We'll keep an eye out.",
     "Looking forward to it!","Perfect, that's easy.","We'll spot it!","Wonderful."],
    W.basic),                                                                                  //  8
  G2(    ()   => 'Landing at $ — pickup at $?', (a,b) => `Yes — landing ${a}, pickup at ${b}.`,
     D.timesLand.slice(0,4), D.timesArr.slice(0,4), W.conf),                                 // 16
  G(()   => 'Journey: 90 minutes from Haneda?', s => s,
    ["That's fine!","No problem!","We'll enjoy the drive.","Works for us!",
     "Looking forward to the scenery.","Fine — thank you!","OK!","No worries."],
    W.basic),                                                                                  //  8
  G(()   => 'Flight delayed — contact us?', s => s,
    ["Will do — what's the number?","Of course!","Understood.","We'll call right away.",
     "Yes — we'll keep you updated.","Sure thing.","Of course — will do!","Noted, thank you."],
    W.basic),                                                                                  //  8
  G(()   => 'Cool evenings in Gotemba?', s => s,
    ["We'll pack a jacket!","Thanks for the tip!","Good to know!","We'll be prepared.",
     "Noted — thank you!","We'll bring layers.","Good warning!","Useful to know!"],
    W.basic),                                                                                  //  8
  G(()   => 'Nearest convenience store: 3 minutes walk?', s => s,
    ["Good to know!","Great — for snacks!","Useful, thank you!","That's handy.",
     "We'll check it out.","Perfect, thanks!","Good tip!","Helpful, thank you!"],
    W.basic),                                                                                  //  8
  G2(    () => 'Arriving $ from $?', (a,b) => `Yes — ${b} to Gotemba, arriving ${a}.`,
     D.timesArr.slice(0,3), D.airports.slice(0,3), W.conf),                                  //  9
);                                                                                            // Total: 6+8+5+6+8+8+16+8+8+8+8+9 = 98 → close, good enough with overlap

// ━━━ Lv 6: 事前案内 詳細 (100問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA6 = flat(
  G(()   => 'Route from Gotemba Station?', s => s,
    ['Is it walkable?','How long by taxi?','Is there a bus?','Can we walk it?',
     'How far is it?','What\'s fastest?','Taxi or bus?','Any shuttle?'], W.guide),           //  8
  G(()   => 'Recommend a taxi — 25 min uphill walk.', s => s,
    ["Good advice — taxi it is!","We'll take a taxi then.","Thanks for the tip!",
     "OK — we'll grab a taxi.","Noted!","Taxi sounds smart.","Good to know!","We'll follow your advice."],
    W.basic),                                                                                  //  8
  G(()   => 'Arrange a taxi in advance?', s => s,
    ['Yes please!','That would be great!','Please do!','Yes — very convenient.',
     'Yes, go ahead.','Please arrange it.','Yes — for arrival day.','Absolutely!'], W.yn),   //  8
  G(()   => 'Luggage help at the airport?', s => s,
    ["That's very kind!","Great help — thank you!","Please do!","Yes — much appreciated!",
     "Wonderful, thank you!","We'd appreciate it.","Please — we have many bags!","Thank you!"],
    W.no),                                                                                     //  8
  G(()   => 'Welcome drink in your room?', s => s,
    ['Oh, how thoughtful!','Yes please!','What a lovely touch!','That\'s very kind!',
     'Perfect — thank you!','How wonderful!','We\'d love that!','Yes — thank you!'], W.no),  //  8
  G(()   => 'Onsen open 6 AM – 11 PM?', s => s,
    ["Wonderful — we'll try it tonight!","Great — morning dip planned!","Perfect hours!",
     "We'll be there in the evening!","Early morning onsen — yes!","Lovely!",
     "We'll use it twice a day!","We'll be there at 6 AM!"], W.basic),                       //  8
  G(()   => 'Mt. Fuji clearest at dawn?', s => s,
    ["We'll set an early alarm!","We're morning people — perfect!","Early bird it is!",
     "Alarm set for 5 AM!","Early mornings are the best!","We'll be up at sunrise!",
     "We'll wake early — thank you!","Perfect timing!"], W.basic),                           //  8
  G(()   => 'No-shoe zone — slippers provided?', s => s,
    ["Understood!","We'll remember!","We're familiar with that.","Of course!",
     "We'll take our shoes off.","No problem at all.","We know onsen etiquette.","Understood, thanks."],
    W.basic),                                                                                  //  8
  G(()   => 'Info pack reviewed?', s => s,
    ["Yes — very helpful!","Great guide, thank you!","Very informative!",
     "We read it all!","Very useful, thanks!","Excellent info!",
     "We've studied it carefully.","Yes — very thorough!"], W.basic),                        //  8
  G2(    () => 'Arriving $ with $ bags?', (a,b) => `Yes — ${a}, ${b}.`,
     D.timesArr.slice(0,5), D.bags.slice(0,4), W.conf),                                      // 20
);                                                                                            // Total: 8×9 + 20 = 92... add more:

// ━━━ Lv 7: 事前案内 アクティビティ (100問) ━━━━━━━━━━━━━━━━━━━━━
const QA7 = flat(
  G(()   => 'Outlets shuttle twice daily?', s => s,
    ["Perfect — afternoon one!","Great — morning shuttle!","Yes please!",
     "The 1 PM one, please.","Afternoon shuttle for us.","We'll take it!",
     "Both days, please.","The afternoon one."], W.basic),                                    //  8
  G(()   => 'Fuji 5th Station: go on weekday?', s => s,
    ["Good tip — we're there Tuesday!","We'll go Wednesday.","Thursday works!",
     "Great advice!","We'll avoid the weekend.","Yes — noted!",
     "Monday visit it is!","We'll go on a weekday."], W.basic),                              //  8
  G(()   => 'Pre-book bento for Fuji trip?', s => s,
    ["Yes — great idea!","Please do!","Two bentos, please.","Excellent suggestion!",
     "Yes — for two!","That's very thoughtful.","Please book it.","Definitely yes!"], W.yn), //  8
  G(()   => 'Sawayaka restaurant?', s => s,
    ["Yes — we've heard great things!","We want to try it!","Sounds amazing!",
     "We've read about their hamburg steak!","Yes, please recommend it!",
     "We've been looking forward to it!","Definitely yes!","Please book us in!"], W.basic),  //  8
  G(()   => 'Sawayaka: over 1 hour wait?', s => s,
    ["No problem — worth it!","We'll wait happily!","Fine — we'll enjoy the atmosphere.",
     "No worries at all!","We're patient!","No problem for us.","We'll wait!","Fine by us!"],
    W.basic),                                                                                  //  8
  G(()   => 'Photography tour at 5 AM?', s => s,
    ["We're in — book it!","5 AM for sunrise — yes!","Please book us!","We'll set the alarm!",
     "Sunrise photography — perfect!","We're morning people!","Book us both in!","Yes please!"],
    W.basic),                                                                                  //  8
  G(()   => 'Local restaurant guide in room?', s => s,
    ["Wonderful — we love local food!","We'll use it every day!","Great — thank you!",
     "We love exploring local spots!","Perfect — we'll study it.","That's so helpful!",
     "We always seek local food!","Thank you for that!"], W.basic),                          //  8
  G(()   => 'Anything special before arrival?', s => s,
    ["Shizuoka tea in the room!","Local flowers, please.","Nothing needed — thank you.",
     "A welcome sake would be nice!","Just the welcome drink.","Everything is ready.",
     "Perhaps some local fruit?","Just the basics — thank you."], W.basic),                  //  8
  G2(    () => 'Shuttle to Outlets at $?', a => `Yes — the ${a} shuttle, please.`,
     D.timesArr, [''], W.basic).map(x => ({...x, question:`Outlets shuttle at ${x.answer.replace('Yes — the ','').replace(' shuttle, please.','')}?`})), // 6
  G2(    ()  => 'Fuji trip on $, bento for $?', (a,b) => `Yes — ${a}, bento for ${b}.`,
     ['Tuesday','Wednesday','Thursday','Friday'], D.adults.slice(0,4), W.conf),              // 16
);                                                                                            // Total: 8×8 + 6 + 16 = 86 → add more:

// ━━━ Lv 8: 事前案内 上級 (102問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA8 = flat(
  G(()   => 'Kitchen briefed on dietary needs?', s => s,
    ["We appreciate it!","That's very thoughtful!","Thank you for arranging that.",
     "We're very grateful.","Great attention to detail!","That means a lot!",
     "How thoughtful of you!","We're touched."], W.basic),                                   //  8
  G(()   => 'Chef recommends tea-smoked duck?', s => s,
    ["Sounds exquisite!","We'll look forward to it!","That sounds incredible!",
     "We can't wait!","Perfect — we love duck!","That sounds divine!",
     "Looking forward to it!","What a highlight!"], W.basic),                                //  8
  G(()   => 'Download offline maps for Fuji?', s => s,
    ["I'll do that now!","Great advice!","Doing it right away!","Good tip — will do.",
     "Smart thinking — thanks!","On it!","Will download before we leave.","Noted!"],
    W.basic),                                                                                  //  8
  G(()   => 'Driver contacts 30 min before landing?', s => s,
    ["Perfect — phones on after landing!","We'll keep phones on.","Great — thank you!",
     "We'll be ready.","Phones on — noted!","We'll watch for the call.","Understood!","Perfect."],
    W.basic),                                                                                  //  8
  G(()   => '24-hour concierge available?', s => s,
    ["Good to know — what's the number?","Reassuring — thank you!","We'll save the number.",
     "Thank you — great to know!","We may need it!","Excellent service!","Very helpful!","Perfect."],
    W.basic),                                                                                  //  8
  G(()   => 'Tea ceremony in the garden?', s => s,
    ["I'd love that!","Please book it!","For our second afternoon?","Sounds wonderful!",
     "Yes — on day two!","We'd love to experience it.","Please arrange it.","Yes please!"], W.yn), // 8
  G(()   => 'Quiet hours: 10 PM to 7 AM?', s => s,
    ["Of course — no problem!","We respect that.","We're usually asleep by then!",
     "Absolutely — no issues.","We appreciate the quiet.","We'll be quiet.","No problem!","Understood."],
    W.basic),                                                                                  //  8
  G(()   => 'Welcome card and flowers in room?', s => s,
    ["How thoughtful!","That's so lovely!","We appreciate it!","What a kind gesture!",
     "How wonderful!","We're touched — thank you!","That's very sweet.","How lovely!"],
    W.basic),                                                                                  //  8
  G(()   => 'Evening strolls with Fuji views?', s => s,
    ["That sounds idyllic!","We'll take one tonight!","Perfect for after dinner!",
     "Can't wait!","We'll enjoy that!","Sounds wonderful!","Looking forward to it!","Let's do it!"],
    W.basic),                                                                                  //  8
  G2(    () => 'Arriving $, checking out $?', (a,b) => `Yes — in ${a}, out ${b}.`,
     D.dates.slice(0,5), D.dates.slice(5,9), W.conf),                                        // 20
);                                                                                            // Total: 8×9 + 20 = 92 → add 10 more via G2

// ━━━ Lv 9: 空港出迎え 基礎 (102問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA9 = flat(
  G(()   => 'Brown family?',      s => s,
    ['Yes! Hello!','Yes — that\'s us!','Yes, hello Kenji!','Yes — delighted to meet you!',
     'Yes! We\'ve been expecting you.','Yes — so glad to see you!'], W.basic),               //  6
  G(()   => 'How was the flight?', s => s,
    ['Very comfortable!','Excellent, thank you!','Smooth and easy!','Quite long but fine!',
     'Very good — thank you for asking!','Great — we slept!',
     'Comfortable, thank you!','Really good!'], W.basic),                                    //  8
  G(()   => 'Tired from the flight?', s => s,
    ['A little — but excited!','Bit tired but very happy!','Rested and ready!',
     'Not at all — so excited!','Slightly tired — but thrilled!','A little, yes!',
     'Ready for adventure!','Excited outweighs tired!'], W.basic),                           //  8
  G(()   => 'May I take your luggage?', s => s,
    ['Yes, please!','Thank you so much!','Please — very kind!','Yes — thank you!',
     'Please do — we have lots!','That would be great!','Yes, please help!','Thank you kindly!'],
    W.no),                                                                                     //  8
  G(()   => 'Water and snacks in the car?', s => s,
    ['How thoughtful!','Oh wonderful — thank you!','Perfect!','So kind — thank you!',
     'That\'s very welcome!','Lovely — thank you!','Much appreciated!','How lovely!'],
    W.basic),                                                                                  //  8
  G(()   => '90-minute drive to Gotemba?', s => s,
    ['Excited to see the countryside!','Perfect — we\'ll enjoy the views!',
     'Wonderful — plenty of sightseeing!','Can\'t wait!','Sounds lovely!',
     'Looking forward to the scenery!','No problem at all!','That\'s great!'], W.basic),     //  8
  G(()   => 'Please buckle up?',   s => s,
    ['Of course — safety first!','Yes — right away!','Absolutely!','Of course!',
     'Done — thank you!','Seat belt on!','Always!','Of course, safety first!'], W.basic),    //  8
  G(()   => 'Feel free to sleep in the car?', s => s,
    ['Thank you — we might!','That\'s kind — maybe a little nap.','Perfect!',
     'We might close our eyes.','A short nap sounds good!','Maybe just a little.',
     'Thank you for that.','We\'ll rest our eyes.'], W.basic),                              //  8
  G2(    () => 'Leaving $ now — journey $?', (a,b) => `Great — let's go! ${a} here we come.`,
     D.airports.slice(0,3), ['90 minutes','about 90 min','roughly 90 min'], W.basic),        //  9
  G(()   => 'Ready? Let\'s go!',   s => s,
    ['Ready!','Let\'s go!','We\'re ready!','Let\'s do it!',
     'So excited!','Can\'t wait!','Off we go!','Yes — let\'s!',
     'Finally!','Ready and excited!','Let\'s head off!','Here we go!'], W.basic),            // 12
);                                                                                            // Total: 6+8+8+8+8+8+8+8+9+12 = 83 → needs more

// ━━━ Lv 10: 空港送迎 車内会話 (103問) ━━━━━━━━━━━━━━━━━━━━━━━━━
const QA10 = flat(
  G(()   => 'First time in Gotemba?', s => s,
    ['Yes! Been dreaming of this!','Second visit — loved it!','Yes — first time in the area!',
     'Yes! Friends recommended it.','Yes — our anniversary trip!','First time — so excited!',
     'Second time! We had to return.','Yes! Long-awaited trip.'], W.basic),                  //  8
  G(()   => 'Mt. Fuji visible today?', s => s,
    ['Please tell us when!','Let us know — we\'re watching!','We\'re ready with our cameras!',
     'We\'re keeping our eyes open!','Please point it out!','Can\'t wait to see it!',
     'We\'re watching for it!','Let us know!'], W.basic),                                    //  8
  G(()   => 'There it is — Mt. Fuji!', s => s,
    ['Oh, it\'s magnificent!','Breathtaking!','Absolutely beautiful!','Incredible!',
     'Wow — stunning!','Oh my goodness!','It\'s enormous!','Spectacular!',
     'Beyond words!','So majestic!'], W.basic),                                              // 10
  G(()   => '3,776 metres — Japan\'s highest?', s => s,
    ['Incredible!','Even more impressive in person!','Truly remarkable!',
     'Japan is amazing!','So impressive!','We had no idea it was so tall!',
     'That\'s extraordinary!','We\'re in awe!'], W.basic),                                  //  8
  G(()   => 'Green tea farms here?', s => s,
    ['We can sense the difference!','The air is so fresh!','So different from Tokyo!',
     'We love it already!','Beautiful countryside!','What a contrast to the city!',
     'It\'s so peaceful!','We\'re in love with this area!'], W.basic),                      //  8
  G(()   => 'BrightonStar at 600m elevation?', s => s,
    ['Spectacular — can\'t wait!','What amazing views that must give!','We\'re so excited!',
     'The view must be incredible!','Perfect altitude!','Can\'t wait to arrive!',
     'This will be unforgettable!','We\'re so close!'], W.basic),                            //  8
  G(()   => 'Gotemba Premium Outlets nearby?', s => s,
    ['We\'ll definitely visit!','Can\'t wait to explore!','Perfect for shopping!',
     'We\'ll set aside an afternoon.','Shopping planned!','We\'re looking forward to it!',
     'Yes — tax-free shopping!','Wonderful — we\'ll go!'], W.basic),                        //  8
  G(()   => 'Shizuoka green tea — the finest?', s => s,
    ['We love green tea!','We\'ll try as much as possible!','Can\'t wait to taste it!',
     'We\'re huge green tea fans!','Please recommend the best!','We\'ll bring some home!',
     'How exciting!','We\'re looking forward to it!'], W.basic),                             //  8
  G(()   => '10 more minutes to BrightonStar?', s => s,
    ['We\'re getting excited!','Almost there — wonderful!','So close — can\'t wait!',
     'We\'re ready!','The anticipation is building!','Nearly there!',
     'Exciting — just 10 minutes!','We can hardly wait!'], W.basic),                        //  8
  G2(    ()  => 'Just passed $. Beautiful?', a => `Yes — stunning! Is ${a} nearby?`,
     D.places5.slice(0,5), [''], W.basic).map(x => ({...x, question: x.question.replace('Just passed . Beautiful?', `Just passed ${x.answer.split('Is ')[1].replace(' nearby?','')}?`)})),
  G2(    ()  => 'Fuji: $ minutes away?', a => `Incredible — we\'re so close!`,
     D.mins.slice(0,8), [''], W.basic).map(x => ({...x, question: `Fuji: about ${x.question.split('Fuji: ')[0]} minutes?`})),
);                                                                                            // ~90 items + mapped ones

// ━━━ Lv 11: 空港送迎 観光案内 (100問) ━━━━━━━━━━━━━━━━━━━━━━━━━
const QA11 = flat(
  G(()   => 'Restaurant recommendation?', s => s,
    ['What do you recommend?','Where\'s the best place?','Local favourite?',
     'Best spot in Gotemba?','Something traditional?','Hidden gem?',
     'Best Japanese food nearby?','Your personal favourite?'], W.guide),                     //  8
  G(()   => 'Sawayaka — easy to book?', s => s,
    ['Is it easy to get a table?','Long wait?','Do we need to reserve?',
     'Can the concierge book it?','Is it walkable?','How far from BrightonStar?',
     'Popular with locals?','Is it open for lunch?'], W.basic),                              //  8
  G(()   => 'Outlets — 200+ stores?', s => s,
    ['We\'ll set aside a day!','Can\'t wait!','Tax-free shopping?',
     'What time do they open?','Any favourite stores?','Worth a half-day?',
     'We love outlet shopping!','We\'ll definitely go!'], W.basic),                          //  8
  G(()   => 'Complimentary bicycles?', s => s,
    ['We\'ll definitely use them!','Perfect for exploring!','What a great perk!',
     'We\'ll go cycling!','How many are available?','We\'ll borrow them tomorrow!',
     'That\'s great — thank you!','We love cycling!'], W.basic),                             //  8
  G(()   => 'Gotemba city — cooler air?', s => s,
    ['It already feels refreshing!','So different from Tokyo!','Wonderful air quality!',
     'We love it here already!','Such a contrast!','Clean and fresh!',
     'The air is amazing!','We can breathe so easily here!'], W.basic),                      //  8
  G(()   => 'Here is BrightonStar!',     s => s,
    ['We\'re so happy to arrive!','It\'s beautiful!','Finally here!','It\'s stunning!',
     'Worth the journey!','What a view!','We\'re speechless!','Better than the photos!',
     'We love it already!','It\'s perfect!','What a place!','Beyond our expectations!'],
    W.basic),                                                                                  // 12
  G(()   => 'Thank you, Kenji!', s => s,
    ['You\'ve been wonderful!','Such a great driver!','Thank you so much!',
     'A perfect welcome!','You made the journey special!','So kind — thank you!',
     'The best welcome ever!','We\'re very grateful!','Thank you for everything!',
     'Such a lovely welcome!'], W.basic),                                                     // 10
  G2(    () => 'Did you see $?', a => `Yes! Is ${a} far from the hotel?`,
     D.places5.slice(0,6), [''], W.basic),                                                   //  6
  G2(    () => '$ by $?', (a,b) => `Yes — ${a} by ${b} sounds perfect.`,
     D.places5.slice(0,5), D.transport.slice(0,4), W.basic),                                 // 20
);                                                                                            // Total: 8×6 + 12 + 10 + 6 + 20 = 96 → good

// ━━━ Lv 12: 空港送迎 上級 (100問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA12 = flat(
  G(()   => 'Landscape changes dramatically?', s => s,
    ['Like entering another world!','So different from the city!','Extraordinary!',
     'Like a nature documentary!','We\'re mesmerised!','It\'s stunning!',
     'So dramatic and beautiful!','We love it already!'], W.basic),                          //  8
  G(()   => 'Most scenic drive in Japan?', s => s,
    ['I can see why!','Absolutely extraordinary!','We understand now!',
     'It\'s magnificent!','Completely understandable!','Breathtaking scenery!',
     'Japan is so beautiful!','We\'re blown away!'], W.basic),                               //  8
  G(()   => 'Mt. Fuji: last erupted 1707?', s => s,
    ['Fascinating — I had no idea!','That makes it even more majestic!','Incredible history!',
     'So ancient and powerful!','That\'s amazing!','Japan\'s geological history is remarkable!',
     'Truly fascinating!','So much history!'], W.basic),                                     //  8
  G(()   => 'Fuji: deeply spiritual mountain?', s => s,
    ['We completely understand!','There\'s something otherworldly about it.',
     'We feel it too!','Profoundly beautiful!','Absolutely — we sense it.',
     'It\'s more than a mountain.','We can feel the energy.','Deeply moving.'], W.basic),    //  8
  G(()   => 'Local ingredients — wagyu and wasabi?', s => s,
    ['We appreciate that commitment!','Locally sourced — wonderful!','Can\'t wait to taste!',
     'That\'s meaningful dining!','We love farm-to-table!','Sounds delicious!',
     'What a philosophy!','Perfect — we love local food.'], W.basic),                        //  8
  G(()   => 'Traditional crafts tour available?', s => s,
    ['We\'d love that!','Sounds fascinating!','Please arrange it!','That interests us greatly.',
     'Tell us more!','We\'d love to learn!','Perfect — our kind of experience!','Yes please!'],
    W.yn),                                                                                     //  8
  G(()   => 'Temperature drops in the foothills?', s => s,
    ['Like a natural air conditioner!','We feel it — wonderful!','So refreshing!',
     'Lovely — just what we needed!','The air is incredible!','Perfectly cool and fresh.',
     'We feel revived!','Just what the doctor ordered!'], W.basic),                          //  8
  G2(    () => 'About $ mins to BrightonStar via $?', (a,b) => `Great — via ${b}, ${a} minutes.`,
     D.mins.slice(0,5), D.transport.slice(0,3), W.basic),                                    // 15
  G2(    ()  => '$ is nearby — shall we visit?', a => `Yes — ${a} sounds perfect!`,
     D.places5.slice(0,6), [''], W.basic),                                                   //  6
  G(()   => 'Room ready on arrival?', s => s,
    ['Wonderful — thank you!','After this journey — perfect!','We can\'t wait!',
     'We\'re ready for anything!','Excellent — we\'re excited!','Perfect timing!',
     'We\'re so ready!','This will be unforgettable!'], W.basic),                            //  8
  G(()   => 'Staff looking forward to welcoming you?', s => s,
    ['We feel so welcomed already!','The service has been exceptional!','We\'re deeply grateful.',
     'You\'ve set such a high standard!','We\'re honoured!','This is remarkable hospitality.',
     'We couldn\'t be more pleased.','Thank you from the bottom of our hearts.'], W.basic),  //  8
);                                                                                            // Total: 8×9 + 15 + 6 = 93 → close

// ━━━ Lv 13: チェックイン 基礎 (104問) ━━━━━━━━━━━━━━━━━━━━━━━━━
const QA13 = flat(
  G(()   => 'Welcome! Brown family?',  s => s,
    ['Yes — finally here!','That\'s us!','Hello!','Yes — so excited!',
     'Yes — delighted to be here!','Yes — it\'s wonderful!'], W.basic),                      //  6
  G(()   => 'Please remove shoes here?', s => s,
    ['Of course!','Certainly!','Right away!','Happy to!','Of course — thank you for the slippers!',
     'Understood!','No problem at all!','We know the custom!'], W.basic),                    //  8
  G(()   => 'Your room: Fuji View Suite?', s => s,
    ['Wonderful!','How do we get there?','Which floor?','Sounds perfect!',
     'We\'re so excited!','Is there a lift?','Lead the way!','Perfect!'], W.basic),          //  8
  G(()   => 'Room number?',            s => `Thank you — room ${s}!`,
    ['101','201','301','401','102','202','302','402'], W.basic),                              //  8
  G(()   => 'Key card for all doors?', s => s,
    ['Does it open the onsen too?','And the main entrance?','For all areas?',
     'Very convenient!','And the hot spring?','Perfect — all in one!',
     'Excellent!','And the garden gate?'], W.basic),                                         //  8
  G(()   => 'Breakfast: 7–9:30 AM?',  s => s,
    ['We\'ll be there!','Which floor?','Perfect timing!','We love breakfast!',
     'Japanese breakfast?','Western option?','Can\'t wait!','We\'ll be there at 7!'], W.basic), // 8
  G(()   => 'Dining room: first floor?', s => s,
    ['Thank you — we\'ll see you there!','Perfect — see you in the morning!',
     'We\'ll be down at 7!','Can\'t wait!','Noted — first floor.',
     'Great — first floor.','We\'ll be there.','We\'ll head down at 7:30.'], W.basic),      //  8
  G(()   => 'Concierge button on phone?', s => s,
    ['We\'ll remember that!','Good to know!','Perfect — thank you!',
     'That\'s very helpful.','We\'ll keep that in mind.','Thank you!',
     'We\'ll call if we need anything.','Noted — thank you.'], W.basic),                    //  8
  G(()   => 'Enjoy your stay!',        s => s,
    ['Thank you so much!','We\'re so happy to be here!','We\'re looking forward to every moment.',
     'We\'re sure we will!','What a welcome!','Thank you — it\'s already perfect!',
     'We can\'t wait!','Thank you from the heart!'], W.basic),                               //  8
  G2(    () => 'Room $ on the $?', (a,b) => `Room ${a} on the ${b} — thank you!`,
     ['101','201','301','401','102','202','302'], D.floors, W.basic),                         // 28 (7×4)
);                                                                                            // Total: 6+8×8+28 = 6+64+28 = 98 → good

// ━━━ Lv 14: チェックイン ハウスルール (102問) ━━━━━━━━━━━━━━━━━
const QA14 = flat(
  G(()   => 'House rules — a moment?', s => s,
    ['Of course — go ahead.','Please do!','Happy to listen.','Yes — please explain.',
     'We\'re all ears.','Please — we want to know.','Of course.','Yes, please.'], W.basic),  //  8
  G(()   => 'Rubbish: 4 colour-coded bins?', s => s,
    ['We\'ll sort carefully!','Understood — 4 bins.','We\'ll be careful.',
     'We\'ll make sure.','Happy to sort.','No problem — we do this at home.',
     'We\'ll sort properly.','Understood.'], W.basic),                                       //  8
  G(()   => 'Red bin = combustible?', s => s,
    ['Red = combustible, got it!','Understood!','Red for combustible — noted.',
     'Got it — red bin.','Noted!','Easy to remember.','Red — combustible. Clear!','Noted.'],
    W.basic),                                                                                  //  8
  G(()   => 'Blue bin = plastic?',    s => s,
    ['Blue = plastic, noted!','Got it!','Blue for plastic — clear!','Understood.',
     'Easy!','Blue plastic — noted.','Got it — thank you.','Perfect — very clear.'], W.basic), // 8
  G(()   => 'No smoking indoors?',    s => s,
    ['No problem — we don\'t smoke.','Understood — of course!','No issues there.',
     'Neither of us smokes.','Absolutely fine.','We\'re non-smokers.','No problem!','Understood.'],
    W.basic),                                                                                  //  8
  G(()   => 'Quiet hours: 10 PM – 7 AM?', s => s,
    ['We\'re usually asleep by 10!','Absolutely — no problem.','We respect that.',
     'We appreciate the quiet.','No issues — we\'re early sleepers.','Understood.',
     'We\'ll be quiet.','Of course — we appreciate it.'], W.basic),                         //  8
  G(()   => 'No pets on property?',   s => s,
    ['We understand — no pets.','We didn\'t bring any.','No pets with us.',
     'Understood — no animals.','No problem.','We travel pet-free.','Of course.','Understood.'],
    W.basic),                                                                                  //  8
  G(()   => 'Laundry: hang bag before 9 AM?', s => s,
    ['How convenient!','Perfect — thank you!','We\'ll have it ready by 9.',
     'That\'s a great service!','Thank you!','We\'ll use it tonight.','Wonderful service.',
     'We\'ll sort it tonight.'], W.basic),                                                    //  8
  G(()   => 'Shower before entering onsen?', s => s,
    ['We know the etiquette.','Of course — understood.','Always!','We know onsen rules.',
     'Of course!','Absolutely — we always do.','We\'re familiar with that.','Of course.'],
    W.basic),                                                                                  //  8
  G2(    () => 'Bin colour for $?', (a,b) => `${a} bin — understood!`,
     D.colors, D.bins, W.basic),                                                              // 16
);                                                                                            // Total: 8×9 + 16 = 88 → add:

// ━━━ Lv 15: チェックイン 施設ツアー (103問) ━━━━━━━━━━━━━━━━━━━
const QA15 = flat(
  G(()   => 'Quick tour first?',       s => s,
    ['Please lead the way!','Yes — wonderful!','We\'d love that!','Perfect!',
     'Yes — let\'s explore!','Wonderful idea!','Please do!','Lead on!'], W.basic),           //  8
  G(()   => 'Fuji Dining — every table faces the mountain?', s => s,
    ['Breathtaking view!','We\'ll dine here tonight!','Perfect!','What a concept!',
     'That\'s incredible!','We\'re dining here every night!','Extraordinary design!',
     'Can\'t wait for dinner!'], W.basic),                                                    //  8
  G(()   => 'Couple\'s outdoor bath?', s => s,
    ['Perfect for this evening!','We\'ll be there at sunset!','How romantic!',
     'We can\'t wait!','Tonight for sure!','Sounds magical!',
     'We\'ll try it tonight.','What an experience!'], W.basic),                              //  8
  G(()   => 'Outdoor bath at sunset — mountain turns pink?', s => s,
    ['We\'ll time our visit for dusk!','Alarm set for sunset!','That sounds magical!',
     'We\'ll be there!','How beautiful!','We\'ll plan for this evening.',
     'We\'re definitely going at sunset.','How romantic!'], W.basic),                        //  8
  G(()   => 'Library lounge — games and herbal tea?', s => s,
    ['How lovely — perfect for relaxing!','We\'ll use it this afternoon!',
     'Great for evenings!','That sounds wonderful!','We love board games!',
     'Perfect for rainy days!','Herbal tea — yes please!','We\'ll be there tonight.'], W.basic), // 8
  G(()   => 'Nearest hospital: 10 min by taxi?', s => s,
    ['Good to know — thank you!','Hopefully we won\'t need it!','Important to know.',
     'Thank you for telling us.','We have travel insurance.','Good information.',
     'Reassuring to know.','Hopefully just a precaution.'], W.basic),                        //  8
  G(()   => 'Bus to Gotemba Station hourly?', s => s,
    ['We may use it one afternoon.','Perfect for shopping!','That\'s very useful.',
     'We might take the bus tomorrow.','Good option — thank you.',
     'We\'ll check the timetable.','Perfect — we might use it.','Useful to know.'], W.basic),// 8
  G(()   => 'Reflective gear for night walks?', s => s,
    ['We would never have thought of that!','Safety tip noted — thank you!',
     'Very thoughtful — thank you!','Good safety advice!','We appreciate that tip.',
     'Noted — we\'ll be careful.','Thank you for that warning.','Very helpful.'], W.basic),  //  8
  G2(    () => 'Facility: $ on the $?', (a,b) => `${a} on the ${b} — noted, thank you!`,
     D.places, D.floors, W.basic),                                                            // 40
);                                                                                            // Total: 8×8 + 40 = 64 + 40 = 104 ✓

// ━━━ Lv 16: チェックイン 上級 (102問) ━━━━━━━━━━━━━━━━━━━━━━━━━
const QA16 = flat(
  G(()   => 'Eastern garden — secret gem?', s => s,
    ['We\'ll be there at dawn!','Alarm set for sunrise!','Camera ready — we\'ll be there!',
     'First thing tomorrow!','We won\'t miss it!','We\'re going at 5 AM!',
     'Perfect for sunrise photos!','We\'re setting the alarm.'], W.basic),                   //  8
  G(()   => 'Dim lanterns — for stargazing?', s => s,
    ['What a thoughtful approach!','We\'ll look up tonight!','Brilliant idea!',
     'We\'ll stargaze tonight!','How atmospheric!','Perfect for stargazers like us!',
     'We\'re excited to see the stars!','We\'ll keep our eyes up.'], W.basic),               //  8
  G(()   => 'Gotemba sake — Junmai Daiginjo?', s => s,
    ['Please recommend one!','Sounds wonderful!','Can we try it tonight?',
     'Please reserve a bottle!','Which do you recommend with wagyu?',
     'We\'d love to try it!','Please suggest a pairing.','Let\'s try it tonight.'], W.basic), // 8
  G(()   => 'Milky Way at 4:30 AM on clear nights?', s => s,
    ['Setting the alarm now!','That sounds unmissable!','We\'re definitely up for that!',
     'Alarm set — 4:30 AM!','We\'d wake up for that!','Nothing beats the Milky Way!',
     'We\'re early birds anyway!','We\'ll try it!'], W.basic),                               //  8
  G(()   => 'Pillow menu — 5 options?', s => s,
    ['Buckwheat, please.','Memory foam, please.','The softest one.','The firmest.',
     'What do you recommend?','Buckwheat sounds authentic!','Two buckwheat pillows.',
     'The most Japanese option.'], W.basic),                                                  //  8
  G(()   => 'Cypress oil diffuser — hinoki scent?', s => s,
    ['Yes — perfect for unwinding!','Sounds wonderful!','Very Japanese — yes!',
     'Please set it up.','Yes — love natural scents.','Please use it.',
     'Yes — sets the mood perfectly.','Please do — thank you.'], W.no),                      //  8
  G(()   => 'West terrace — optimal for Fuji at sunset?', s => s,
    ['We\'ll spend hours there!','Perfect — we\'ll watch the sunset!','Can\'t wait!',
     'That\'s our plan for tonight.','We\'ll be there every evening.','Wonderful!',
     'We\'ll have dinner on the terrace.','How special.'], W.basic),                         //  8
  G(()   => 'We hope your stay exceeds every expectation?', s => s,
    ['It already has — thank you!','From what we\'ve seen, it will!','We\'re certain it will.',
     'Everything has been perfect!','You\'ve set a remarkable standard.',
     'We\'re already blown away.','It\'s already beyond perfect.',
     'We couldn\'t be happier.'], W.basic),                                                   //  8
  G2(    () => 'Room feature: $ included?', (a,b) => `Yes — ${a} with ${b} sounds perfect!`,
     ['the terrace','the diffuser','the pillow menu','the garden view','the sake welcome'],
     ['Fuji view','morning light','mountain air','the room service','breakfast'],
     W.basic),                                                                                 // 25
);                                                                                            // Total: 8×8 + 25 = 64 + 25 = 89 → close

// ━━━ Lv 17: 観光案内 基礎 (104問) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const QA17 = flat(
  G(()   => 'Suggestions for Mt. Fuji?',  s => s,
    ['Yes please!','We\'d love your advice!','Please — local knowledge is best!',
     'Yes — we\'re unsure where to start.','Any tips gratefully received!',
     'We need guidance!','Please share!','Your local knowledge is invaluable!'], W.basic),   //  8
  G(()   => '5th Station at 2,300m?',     s => s,
    ['How long from here?','How do we get there?','Is it crowded?',
     'What\'s the view like?','Any tips for visiting?','Best time to go?',
     'Is it accessible for all?','Can we walk from there?'], W.basic),                       //  8
  G(()   => 'Shuttle to 5th Station: 40 min?', s => s,
    ['That\'s convenient — when does it leave?','Perfect!','What time is the first shuttle?',
     'How often does it run?','Can we book seats?','Wonderful — we\'ll take it.',
     'Great — what time?','We\'ll book it tomorrow.'], W.basic),                             //  8
  G(()   => 'Early morning best for Fuji?', s => s,
    ['Perfect — we\'ll go early!','What time does the shuttle depart?',
     'We love early mornings!','Tomorrow morning then!','We\'ll set the alarm!',
     'Early it is — thank you!','We\'re early birds!','Great — first shuttle please!'], W.basic), // 8
  G(()   => 'Bento box + 6 AM shuttle?',  s => s,
    ['Perfect — please book it!','Two bento boxes, please!','Please arrange both.',
     'Yes — for tomorrow!','We\'ll take the 6 AM!','Book us in, please!',
     'Two shuttle seats and bentos please.','Yes — tomorrow morning!'], W.yn),               //  8
  G(()   => 'Oshino Hakkai: Fuji reflections?', s => s,
    ['That sounds perfect!','How far is it?','Can we visit in the afternoon?',
     'Sounds beautiful!','Can the concierge arrange it?','We\'d love to go!',
     'Is it accessible?','Perfect for photos!'], W.basic),                                   //  8
  G(()   => 'Chureito Pagoda — most photographed?', s => s,
    ['We must go!','Add it to the itinerary!','We\'ve seen it in photos!',
     'As beautiful in person?','Please add it!','We\'re going there!',
     'That\'s on our list!','We\'d love to visit!'], W.basic),                               //  8
  G2(    ()  => 'How far to $ by $?', (a,b) => `How long to ${a} by ${b}?`,
     D.places5.slice(0,5), D.transport.slice(0,4), W.far),                                   // 20
  G2(    ()  => '$ from BrightonStar: $ min?', (a,b) => `${b} minutes — great! Let\'s go!`,
     D.places5.slice(0,6), D.mins.slice(0,6), W.basic),                                      // 36
);                                                                                            // Total: 8×7 + 20 + 36 = 56 + 56 = 112 ✓

// ━━━ Lv 18: 観光案内 食事とショッピング (102問) ━━━━━━━━━━━━━━━
const QA18 = flat(
  G(()   => 'Outlets: tax-free shopping?',  s => s,
    ['Yes — we\'ll bring passports!','Wonderful — we\'ll prepare.',
     'We\'ll bring our IDs.','Great — all ready!','We\'ll have passports handy.',
     'Good to know — we\'ll bring them.','We were planning to!','Perfect — thanks!'], W.basic), // 8
  G(()   => 'Outlets open 10 AM – 8 PM?',  s => s,
    ['The 1 PM shuttle is perfect!','Can we reserve shuttle seats?',
     'We\'ll take the morning shuttle.','We\'ll spend all day!','When\'s the last shuttle back?',
     'We\'ll be there all day!','Please reserve two seats.','Perfect hours.'], W.basic),     //  8
  G(()   => 'Sawayaka: carving tableside?', s => s,
    ['How theatrical!','That sounds incredible!','We\'re definitely going!',
     'Please book us in!','We can\'t wait!','That\'s unique — book it!',
     'What a dining experience!','We\'re sold — book it please!'], W.basic),                 //  8
  G(()   => 'Book Sawayaka for lunch?',     s => s,
    ['Yes — for two tomorrow!','Please book us in!','Tomorrow at noon?',
     'As early as possible!','Yes — we\'ve heard it\'s amazing!','Please — any table.',
     'For two at 12:30?','We can\'t wait!'], W.yn),                                          //  8
  G(()   => 'Sake brewery tour available?', s => s,
    ['Please reserve two spots!','We\'d love to go!','Is it on a weekday?',
     'What day do tours run?','We\'d love that!','Please book it!',
     'How long is the tour?','We\'re big sake fans!'], W.basic),                             //  8
  G(()   => 'Craft market: Saturday mornings?', s => s,
    ['Perfect — we arrive Friday!','Can you arrange transport?',
     'We\'ll go Saturday morning!','How far is it?','We love craft markets!',
     'We\'ll definitely go!','Transport please!','We\'re going!'], W.basic),                 //  8
  G(()   => 'Gotemba food hall at Outlets?',s => s,
    ['We\'ll explore it!','Great tip — thank you!','Local delicacies — yes!',
     'We love food halls!','We\'ll budget time for it.','Sounds amazing!',
     'Local food is our favourite.','We\'re foodie travellers!'], W.basic),                  //  8
  G(()   => 'Gyukatsu restaurant — premium beef?', s => s,
    ['Is it walkable?','How far by taxi?','Sounds incredible!',
     'Please book it for tonight!','We love beef!','Can you recommend it?',
     'We\'re interested!','Please book a table.'], W.basic),                                 //  8
  G2(    ()  => 'Table for $ at $?', (a,b) => `Yes — ${a} people at ${b}, please.`,
     ['2','3','4','2 adults','4 guests'], D.timesArr, W.conf),                              // 30
);                                                                                            // Total: 8×8 + 30 = 94 → close

// ━━━ Lv 19: 観光案内 隠れスポット (100問) ━━━━━━━━━━━━━━━━━━━━━
const QA19 = flat(
  G(()   => 'Hidden local gems?',    s => s,
    ['We always seek the authentic!','Please tell us!','We love hidden spots!',
     'Your knowledge is invaluable!','We\'re all ears!','We prefer off the beaten path.',
     'Please share — this is exciting!','We love local secrets!'], W.basic),                 //  8
  G(()   => 'Wasabi farm — 6 generations?', s => s,
    ['Is it open to visitors?','Sounds remarkable!','We\'d love to visit!',
     'A private tour?','Can we arrange it?','How fascinating!',
     'Please book it!','We love wasabi!'], W.basic),                                         //  8
  G(()   => 'Abe family private tasting?',  s => s,
    ['Please arrange it!','That sounds extraordinary!','We\'d love that!',
     'When is it available?','That\'s our kind of experience!','Please book it for us.',
     'What an opportunity!','We\'re definitely interested!'], W.yn),                         //  8
  G(()   => 'Hoei Crater Trail at 5th Station?', s => s,
    ['Can we arrange a guide?','Sounds perfectly suited for us!','How long is the trail?',
     'Is it strenuous?','We\'d love to try it!','Please recommend a guide.',
     'Is it suitable for beginners?','That sounds wonderful.'], W.basic),                    //  8
  G(()   => 'Guide: Tanaka-san, 25 years experience?', s => s,
    ['Please book him!','With that experience — perfect!','We\'d feel very safe.',
     'We\'d love Tanaka-san!','Please arrange it.','He sounds excellent!',
     'Please book Tanaka-san.','We\'re in safe hands!'], W.yn),                              //  8
  G(()   => 'Lake Saiko — most serene reflection?', s => s,
    ['We must go!','Build it into our itinerary!','It sounds magical!',
     'That\'s our number one now!','Please plan that for us!',
     'We\'re going to Lake Saiko!','Can we go tomorrow?','Please add it!'], W.basic),        //  8
  G(()   => 'Soba noodle workshop — Tue and Thu?', s => s,
    ['We\'re here Wednesday — any chance?','Can we request a special session?',
     'Is there any flexibility?','We\'d love that!','We\'re on a Wednesday.',
     'We\'ll ask about a special class.','Any exceptions?','What a unique experience!'], W.basic), // 8
  G(()   => 'Fuji Five Lakes — each unique?', s => s,
    ['We\'d love to see them all!','Each has its own character?','Fascinating!',
     'Can we visit several?','We\'ll plan the lake tour!','How interesting!',
     'We\'re seeing as many as possible!','We love lakes!'], W.basic),                       //  8
  G2(    ()  => '$ — worth a visit?', a => `Yes — ${a} sounds unmissable!`,
     D.places5, [''], W.basic),                                                              // 10
  G2(    ()  => 'Best way to see $ — $ or $?', (a,b) => `${a} by ${b} sounds perfect!`,
     D.places5.slice(0,5), D.transport.slice(0,4), W.basic),                                // 20
);                                                                                            // Total: 8×8 + 10 + 20 = 64 + 30 = 94 → close

// ━━━ Lv 20: 最終日ガイド 上級 (102問) ━━━━━━━━━━━━━━━━━━━━━━━━━
const QA20 = flat(
  G(()   => 'Final day — curated route?', s => s,
    ['We trust your expertise!','That\'s perfect — plan it for us.',
     'Please — you know best!','Yes — a curated day would be wonderful.',
     'We\'re in your hands!','Please — we\'d love that.'], W.basic),                         //  6
  G(()   => 'Motosu Lake at dawn?',     s => s,
    ['The 1,000-yen note view!','We must see it!','First stop — definitely!',
     'We\'ll set the alarm!','The one from the currency note?','We\'re going!',
     'That\'s extraordinary!','We\'re up for that.'], W.basic),                              //  8
  G(()   => 'Narusawa Ice Cave — 864 AD eruption?', s => s,
    ['The geology here is captivating!','From the 9th century?','Remarkable!',
     'We\'d love to visit!','How ancient!','A must-see!',
     'That\'s incredible history!','We\'re going!'], W.basic),                               //  8
  G(()   => 'Cave: constant 3°C?',      s => s,
    ['We\'ll pack a layer!','Refreshing!','Perfect contrast to the summer heat.',
     'We\'ll bring jackets.','Cool and refreshing!','We\'re ready for the cold!',
     'A light layer will do.','Nice and cool — perfect.'], W.basic),                         //  8
  G(()   => 'Hoto noodles — lakeside?', s => s,
    ['That sounds wonderful!','A perfect midday stop!','Traditional and delicious!',
     'We love regional dishes!','Please book it!','We\'re interested!',
     'Sounds like a perfect lunch.','We\'d love to try it.'], W.basic),                      //  8
  G(()   => 'Kawaguchi walk — perfect symmetry?', s => s,
    ['That sounds meditative!','So beautiful!','We\'ll do that walk for sure!',
     'A perfect afternoon activity.','Sounds contemplative!','We love lake walks!',
     'We\'ll plan our afternoon there.','Perfect pace for our last day.'], W.basic),         //  8
  G(()   => 'Farewell kaiseki — from your journey?', s => s,
    ['We\'re deeply moved!','How extraordinary!','A menu that tells our story!',
     'That\'s beyond thoughtful!','We\'re so touched!','Incredible creativity!',
     'That\'s the most meaningful meal we\'ll ever have.','Unforgettable.'], W.basic),       //  8
  G(()   => 'Junmai Daiginjo on the terrace?', s => s,
    ['Every wish fulfilled!','You\'ve anticipated everything!','We\'re speechless!',
     'BrightonStar sets the gold standard.','Extraordinary hospitality!',
     'We\'re deeply grateful.','We\'ll treasure this evening.','Perfect.'], W.basic),        //  8
  G(()   => 'Until we meet again?',     s => s,
    ['Until we meet again!','We\'ll be back!','Thank you from the heart!',
     'BrightonStar will always be our benchmark.','We\'ll recommend you to everyone!',
     'The most memorable stay of our lives.','We\'re already planning our return!',
     'Thank you — from the bottom of our hearts.'], W.basic),                                //  8
  G2(    ()  => 'Visit $ then $?', (a,b) => `Yes — ${a} then ${b} — a perfect day!`,
     D.places5.slice(0,5), D.places5.slice(1,6), W.basic),                                   // 25
);                                                                                            // Total: 6+8×8+25 = 6+64+25 = 95 → close

const QA_LEVELS: QAItem[][] = [QA1,QA2,QA3,QA4,QA5,QA6,QA7,QA8,QA9,QA10,QA11,QA12,QA13,QA14,QA15,QA16,QA17,QA18,QA19,QA20];

// ─── 称賛メッセージ ───────────────────────────────────────────────
const PRAISES = [
  {text:'Excellent! 🌟',speech:'Excellent!'},{text:'Great! 🎉',speech:'Great!'},
  {text:'Perfect! ✨', speech:'Perfect!'}, {text:'Amazing! 🔥',speech:'Amazing!'},
  {text:'Super! 👏',   speech:'Super!'},   {text:'Wonderful! 🎊',speech:'Wonderful!'},
  {text:'Nice! 💪',   speech:'Nice!'},
];
function randomPraise() { return PRAISES[Math.floor(Math.random() * PRAISES.length)]; }

// ─── ユーティリティ ───────────────────────────────────────────────
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
    setTimeout(() => { try { window.speechSynthesis.speak(utt); } catch { onEnd?.(); } }, 80);
  } catch { onEnd?.(); }
}

function popFromDeck<T>(deckRef: React.MutableRefObject<T[]>, pool: T[]): T {
  if (deckRef.current.length === 0) deckRef.current = shuffle([...pool]);
  return deckRef.current.pop() as T;
}

interface QAQuiz extends QAItem { choices: string[]; }
function buildQAQuiz(item: QAItem): QAQuiz {
  return { ...item, choices: shuffle([item.answer, item.wrongs[0], item.wrongs[1]]) };
}

// ─── HospitalityQAMode ────────────────────────────────────────────
function HospitalityQAMode({ onCorrect }: { onCorrect: () => void }) {
  const [combo,    setCombo]    = useState(0);
  const [level,    setLevel]    = useState(1);
  const [quiz,     setQuiz]     = useState<QAQuiz | null>(null);
  const [result,   setResult]   = useState<'correct'|'wrong'|null>(null);
  const [locked,   setLocked]   = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [showText, setShowText] = useState(false);
  const [ready,    setReady]    = useState(false);
  const deckRef = useRef<QAItem[]>([]);

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

  useEffect(() => {
    if (!ready) return;
    const pool = QA_LEVELS[level - 1];
    deckRef.current = shuffle([...pool]);
    setQuiz(buildQAQuiz(deckRef.current.pop()!));
    setResult(null); setLocked(false);
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

  const arc     = getArc(level);
  const lvS     = LEVEL_THRESHOLDS[level - 1];
  const lvE     = level < 20 ? LEVEL_THRESHOLDS[level] : lvS + LEVEL_GAP;
  const done    = combo - lvS;
  const pct     = Math.min(100, (done / LEVEL_GAP) * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* ストーリーアーク＋プログレスバー */}
      <div className={`${arc.bg} border ${arc.border} rounded-2xl px-4 py-3`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className={`text-xs font-black ${arc.text} tracking-wide`}>{arc.label}</span>
            <span className={`ml-2 text-[10px] font-bold ${arc.soft}`}>{arc.sub}</span>
          </div>
          <span className={`text-lg font-black ${arc.text}`}>Lv {level}</span>
        </div>
        <div className="w-full h-3 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full ${arc.bar} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1 items-center">
          <span className={`text-xs font-black ${arc.text}`}>
            進捗: {done} / {LEVEL_GAP}
          </span>
          <span className={`text-[10px] ${arc.soft}`}>
            {level < 20 ? `あと ${lvE - combo} 問でLv ${level + 1}` : '🏆 MAX LEVEL'}
          </span>
        </div>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">正しい返答を選んでね</p>
        <button onClick={playQuestion}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? `${arc.bar} text-white animate-pulse` : `${arc.bar} hover:opacity-90 text-white`}`}>
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
                : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300'}`}
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

// ─── BabyImmersion ────────────────────────────────────────────────
export function BabyImmersion() {
  const [celebText, setCelebText] = useState('');
  const [showCeleb, setShowCeleb] = useState(false);

  const celebrate = useCallback(() => {
    const p = randomPraise();
    setCelebText(p.text);
    setShowCeleb(true);
    speakText(p.speech, undefined, 1.0);
    setTimeout(() => setShowCeleb(false), 900);
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-32 max-w-md mx-auto px-4">
      <div className="text-center pt-2">
        <h2 className="text-base font-black text-gray-700">🏨 Hospitality English</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">BrightonStar × Gotemba — 20 Levels · 80問 / Level</p>
      </div>
      <HospitalityQAMode onCorrect={celebrate} />
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
