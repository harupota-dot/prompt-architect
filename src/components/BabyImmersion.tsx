'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────
const CORRECT_DELAY = 420;
const LEVEL_THRESHOLDS = [0,5,10,15,20,26,33,41,50,60,71,83,96,110,125,141,158,176,195,215];
const LS_QA = 'qa-combo-v6';

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
// ストーリーアーク
// ─────────────────────────────────────────────────────────────────
const ARCS = [
  { label: '📞 Phone Booking',   sub: 'Levels 1–4',  bg:'bg-sky-50',    border:'border-sky-100',    text:'text-sky-700',    bar:'bg-sky-500',    soft:'text-sky-400'    },
  { label: '✈️ Pre-arrival Info', sub: 'Levels 5–8',  bg:'bg-violet-50', border:'border-violet-100', text:'text-violet-700', bar:'bg-violet-500', soft:'text-violet-400' },
  { label: '🚗 Airport Pickup',  sub: 'Levels 9–12', bg:'bg-emerald-50',border:'border-emerald-100',text:'text-emerald-700',bar:'bg-emerald-500',soft:'text-emerald-400'},
  { label: '🏡 Check-in',        sub: 'Levels 13–16',bg:'bg-amber-50',  border:'border-amber-100',  text:'text-amber-700',  bar:'bg-amber-500',  soft:'text-amber-400'  },
  { label: '🗺️ Local Guide',     sub: 'Levels 17–20',bg:'bg-rose-50',   border:'border-rose-100',   text:'text-rose-700',   bar:'bg-rose-500',   soft:'text-rose-400'   },
];
function getArc(level: number) { return ARCS[Math.min(4, Math.floor((level - 1) / 4))]; }

// ─────────────────────────────────────────────────────────────────
// Q&A データ — 5ストーリーアーク × 4レベル（各10問）
// ─────────────────────────────────────────────────────────────────
interface QAItem { question: string; answer: string; wrongs: [string,string]; hint?: string; }

// ── Arc 1: Phone Booking ──────────────────────────────────────────
const QA1: QAItem[] = [
  {question:'Good afternoon, BrightonStar. How may I help you?',         answer:"Hello! I'd like to make a reservation, please.",          wrongs:["I'd like a table for two.","Is the restaurant open?"]},
  {question:'What date would you like to check in?',                      answer:'From the tenth of July, please.',                         wrongs:['I am not sure yet.','Any date is fine.']},
  {question:'How many nights will you be staying?',                       answer:'Three nights, please.',                                   wrongs:['I have not decided.','Just one night.']},
  {question:'How many guests will be staying?',                           answer:'Two adults and one child.',                               wrongs:['Only me.','Maybe three or four.']},
  {question:'Would you like a single or double room?',                    answer:'A double room, please.',                                  wrongs:['I need a kitchen.','Any room will do.']},
  {question:'May I have your name, please?',                              answer:'My name is Brown. B-R-O-W-N.',                            wrongs:['It is a long name.','Please check your records.']},
  {question:'And your phone number?',                                     answer:"Sure, it's 080-1234-5678.",                               wrongs:["I don't have a phone.",'Call me later.']},
  {question:'We have availability. Shall I confirm the booking?',         answer:'Yes, please! That would be great.',                       wrongs:['I need to think about it.','Can I cancel easily?']},
  {question:'Your booking is confirmed for July 10th.',                   answer:'Wonderful! Thank you so much.',                           wrongs:['Are you sure that is correct?','I need a written copy.']},
  {question:'Is there anything else I can help you with?',                answer:"No, that's everything. Thank you!",                       wrongs:['Yes, I am hungry.','I need directions.']},
];

const QA2: QAItem[] = [
  {question:'Do you have any room preferences?',                          answer:'We would love a room with a view of Mt. Fuji.',           wrongs:['Any room is fine.','I need a parking space.']},
  {question:'Would you like breakfast included?',                         answer:'Yes, please—breakfast for two.',                          wrongs:['I will eat outside.','No food is needed.']},
  {question:'We offer Japanese or Western breakfast. Which do you prefer?',answer:'Japanese style, please—that sounds wonderful.',          wrongs:['I want a sandwich.','I skip breakfast.']},
  {question:'Could you give me your email for the booking confirmation?', answer:'Of course. It is smith at gmail dot com.',                wrongs:["I don't use email.",'Please call me instead.']},
  {question:'Will you be arriving by car or by train?',                   answer:'By train to Gotemba Station.',                            wrongs:['I have a bicycle.','We will walk.']},
  {question:'Is this your first time staying with us?',                   answer:'Yes, it is! We are very excited.',                        wrongs:['I have been before.','I prefer larger hotels.']},
  {question:'We require a credit card to hold the reservation.',          answer:'Of course. Shall I give you the number now?',             wrongs:['I only use cash.','Can I pay on arrival?']},
  {question:'Is there a special occasion for your visit?',                answer:"Yes, it's our wedding anniversary!",                      wrongs:['Nothing in particular.','We are on a business trip.']},
  {question:'We will send a confirmation email within the hour.',         answer:'Thank you! I will look out for it.',                      wrongs:["I don't need it.",'Please call instead.']},
  {question:'We look forward to welcoming you on July 10th.',             answer:"Thank you so much! We can't wait.",                       wrongs:['We might cancel.','The date may change.']},
];

const QA3: QAItem[] = [
  {question:'We have a Fuji View Deluxe plan and a Garden Standard plan. Do you have a preference?',
    answer:"The Fuji View Deluxe sounds perfect—we'll take that.",        wrongs:['I need the cheapest option.','Do you have a pool view?']},
  {question:'The Fuji View plan includes dinner as well. Would that suit you?',
    answer:"That's ideal—dinner included would be wonderful.",            wrongs:['We prefer to eat out.','Is there a surcharge?']},
  {question:'Do any of your party have dietary requirements?',
    answer:'Yes, one person is vegetarian, please.',                      wrongs:['We eat everything.','We have no requirements.']},
  {question:'We can arrange airport pickup from Haneda. Would you like that?',
    answer:"Yes, please! What time do you recommend we arrange it?",      wrongs:['We will take a taxi.','I prefer the train.']},
  {question:'Our shuttle from Haneda takes approximately 90 minutes.',
    answer:"That's fine. Our flight lands at noon, so 1 PM pickup would be perfect.",
    wrongs:['We arrive at midnight.','90 minutes is too long.']},
  {question:'May I confirm: two adults, check-in July 10th, Fuji View Deluxe with dinner?',
    answer:"That's correct—everything looks perfect.",                    wrongs:['I need to change the date.','Can I add one more guest?']},
  {question:'The total for three nights including dinner and pickup is 75,000 yen.',
    answer:"That's great value. Please go ahead and book it.",            wrongs:['That seems very expensive.','I need a discount.']},
  {question:'We ask for a 10,000 yen deposit to confirm the reservation.',
    answer:'Of course. I will pay by credit card now.',                   wrongs:['I will pay on arrival.','Can I skip the deposit?']},
  {question:'Your booking reference number is BS-2024-0710.',
    answer:'Thank you! I will make a note of that.',                      wrongs:["I don't need the number.",'Please email it instead.']},
  {question:'Please feel free to call us any time if you have questions before your arrival.',
    answer:"Thank you—you've been very helpful!",                         wrongs:["I won't call again.",'Your line is always busy.']},
];

const QA4: QAItem[] = [
  {question:"I see from our records that you stayed with us last autumn. Welcome back!",
    answer:'Yes, we loved it so much we had to return!',                  wrongs:['I think you have the wrong person.',"I don't remember my last stay."]},
  {question:'Free cancellation is available up to five days before arrival. After that, there is a charge.',
    answer:'Understood—what is the charge within three days?',            wrongs:["We won't be cancelling.",'I need to cancel right now.']},
  {question:'There is a 50 percent charge for cancellations within three days of arrival.',
    answer:"That's quite reasonable. We'll keep the booking.",            wrongs:['That seems very strict.','I want to pay the full amount now.']},
  {question:'Would you be interested in adding a couples spa treatment to your package?',
    answer:"That sounds lovely—what does it include?",                    wrongs:["We don't use spas.",'We are tired of package deals.']},
  {question:'The spa package includes a 60-minute facial and a traditional onsen ritual.',
    answer:"That's wonderful—please add it to our booking.",              wrongs:['I prefer a massage.','No extras, thank you.']},
  {question:'I should mention that Mt. Fuji visibility depends on the weather and season.',
    answer:'Of course—we understand and will hope for clear skies!',      wrongs:['Is there a guarantee?','I want a refund if it is cloudy.']},
  {question:'We can arrange a private dining experience if you prefer.',
    answer:'That would be incredible! Please add it for the first evening.',
    wrongs:['The restaurant is fine.','We prefer casual dining.']},
  {question:'Shall I send a pre-arrival information package by email?',
    answer:"Yes, please—that would be very helpful for our planning.",    wrongs:['No, we know the area.',"We'll figure it out ourselves."]},
  {question:'Is there anything specific you would like us to prepare for your arrival?',
    answer:'Perhaps some local flowers in the room—we love Japanese nature.',
    wrongs:['Nothing in particular.','I will let you know later.']},
  {question:'On behalf of the entire BrightonStar team, we look forward to making your stay unforgettable.',
    answer:'Thank you! We are already counting down the days.',           wrongs:['Just do your best.','I hope it will be okay.']},
];

// ── Arc 2: Pre-arrival Info ───────────────────────────────────────
const QA5: QAItem[] = [
  {question:'Hello, this is BrightonStar confirming your stay from July 10th.',
    answer:"Yes, hello! We're very excited about our trip.",              wrongs:['I think you have the wrong number.','Please call back later.']},
  {question:'Could you confirm your arrival time?',
    answer:'We expect to arrive at around 3 PM.',                         wrongs:['We will come whenever.','Time does not matter.']},
  {question:'Will you be requiring the airport pickup service?',
    answer:'Yes, please—from Haneda Terminal 3.',                         wrongs:['We have a rental car.','We will take the train.']},
  {question:'What time does your flight land?',
    answer:'We land at 12:45 PM.',                                        wrongs:['The schedule is flexible.','It depends on the weather.']},
  {question:'Our driver will meet you in the arrivals hall holding a BrightonStar sign.',
    answer:"Perfect—we'll look out for the sign.",                        wrongs:["We'll find you somehow.",'What does the driver look like?']},
  {question:'The journey from Haneda to our property takes approximately 90 minutes.',
    answer:"That's fine—we're looking forward to the scenic drive!",      wrongs:['That seems very long.','Can you make it faster?']},
  {question:'Please feel free to contact us if your flight is delayed.',
    answer:"Will do—what's the best number to call?",                     wrongs:["We'll manage on our own.",'Delays never happen to us.']},
  {question:'The nearest convenience store is a three-minute walk from BrightonStar.',
    answer:"Good to know—thank you for the tip!",                         wrongs:["We don't need stores.",'Is there a supermarket nearby?']},
  {question:'Gotemba can be quite cool in the evenings, even in summer.',
    answer:"Thanks for the warning—we'll pack a light jacket.",           wrongs:['We love the heat.','It is always warm in Japan.']},
  {question:"We look forward to seeing you on the 10th. Safe travels!",
    answer:"Thank you! We can't wait to arrive.",                         wrongs:['We may be running late.','I will call when I am close.']},
];

const QA6: QAItem[] = [
  {question:"Have you had a chance to review the information pack we sent?",
    answer:"Yes! The house rules and map were very helpful.",             wrongs:["I didn't receive it.",'I have not read it yet.']},
  {question:'Do you have any questions about the route from Gotemba Station?',
    answer:'Yes—is it walkable, or should we take a taxi?',              wrongs:['We have a GPS navigation.',"We know the area well."]},
  {question:'We recommend a taxi as the walk is about 25 minutes uphill.',
    answer:"Good advice—we'll take a taxi then.",                         wrongs:['We enjoy long uphill walks.','25 minutes is nothing.']},
  {question:'We can arrange a taxi for you in advance. Would you like that?',
    answer:"Yes, please! That would be very convenient.",                 wrongs:["We'll sort it ourselves.",'There must be a bus.']},
  {question:'Can you confirm how many bags you will be bringing?',
    answer:'Two large suitcases and one carry-on.',                       wrongs:['Just one small bag.','I always travel light.']},
  {question:'Our driver can assist with your luggage at the airport.',
    answer:"That's very kind—it will be a great help.",                   wrongs:['We can manage by ourselves.','Please do not touch our bags.']},
  {question:'Shall we prepare a welcome drink in your room for your arrival?',
    answer:'Oh, how thoughtful! Yes, please.',                            wrongs:["We'll get our own drinks.",'No need for extras.']},
  {question:'The outdoor hot spring opens at 6 AM and closes at 11 PM.',
    answer:"Wonderful—we'll definitely try it in the evening.",           wrongs:['We prefer a regular bath.','We will not use the onsen.']},
  {question:'Mt. Fuji is typically clearest in the early morning or late afternoon.',
    answer:"Thank you—we'll set an early alarm!",                         wrongs:["We're not morning people.",'We prefer the evening light.']},
  {question:'Please note that our property is a no-shoe zone—slippers will be provided.',
    answer:"Understood! We'll remember to take off our shoes.",           wrongs:['We prefer to wear shoes indoors.','Is there an exception?']},
];

const QA7: QAItem[] = [
  {question:'We noticed you enquired about the Gotemba Premium Outlets. It is just 15 minutes from us.',
    answer:"Excellent! Could you arrange transport for us one afternoon?", wrongs:["We'll walk there.",'Shopping is not really for us.']},
  {question:'We offer a complimentary shuttle to the Outlets twice daily.',
    answer:"That's perfect—we'll take the afternoon one.",                wrongs:['We prefer taxis.','We will rent a car.']},
  {question:'For the Mt. Fuji 5th Station visit, we recommend going on a weekday to avoid crowds.',
    answer:"Good tip—we happen to be there on a Tuesday.",               wrongs:['Crowds do not bother us.','We will go at the weekend.']},
  {question:'Would you like to pre-book a bento box for your Mt. Fuji excursion?',
    answer:"What a great idea—yes, please!",                              wrongs:["We'll buy food there.",'We skip lunch on excursions.']},
  {question:'We have a local restaurant guide featuring Gotemba\'s best dining spots in your room.',
    answer:"That sounds wonderful—we love exploring local food.",          wrongs:["We'll use our phones.",'We always eat at the hotel.']},
  {question:'Sawayaka restaurant is very popular locally—would you like a reservation?',
    answer:"Yes! We've heard great things about their hamburg steak.",    wrongs:['We prefer sushi restaurants.','We eat at the hotel.']},
  {question:'Please note that Sawayaka can be very busy with waits exceeding an hour.',
    answer:"No problem—we'll enjoy the wait! Is early booking possible?", wrongs:['An hour is far too long.','We will choose somewhere quieter.']},
  {question:'Shall I arrange a Mt. Fuji photography tour for your stay?',
    answer:"That sounds amazing—what does the tour include?",             wrongs:['We have our own camera.','We will manage on our own.']},
  {question:'The Fuji Photography Tour departs at 5 AM to capture the sunrise light.',
    answer:"We're definitely up for that—please book it for us.",         wrongs:['5 AM is far too early.','We prefer sunset photos.']},
  {question:'Is there anything you would like us to arrange before your arrival?',
    answer:'Perhaps some local Shizuoka tea waiting in the room?',        wrongs:['Everything is already perfect.','We will take care of ourselves.']},
];

const QA8: QAItem[] = [
  {question:'We have reviewed your dietary preferences and briefed our kitchen accordingly.',
    answer:"We really appreciate that thoughtful attention to detail.",   wrongs:["I didn't mention any preferences.",'The kitchen need not know.']},
  {question:'Our head chef suggests the seasonal Shizuoka tea-smoked duck as a dinner highlight.',
    answer:"That sounds exquisite—we'll look forward to it greatly.",     wrongs:['We prefer something simpler.','We do not eat duck.']},
  {question:'Mobile signal can be weak around Mt. Fuji—we recommend downloading maps offline.',
    answer:"Great advice—I'll do that before we depart.",                 wrongs:['We will rely on our connection.','We know the area well.']},
  {question:'For the airport pickup, our driver will contact you 30 minutes before your flight lands.',
    answer:"Perfect—we'll keep our phones on after landing.",             wrongs:['We will find the driver.','Please call the hotel instead.']},
  {question:'We will place a welcome card, seasonal flowers, and local sweets in your room.',
    answer:"How wonderfully thoughtful—we truly appreciate it.",          wrongs:['Please keep the room simple.','Flowers may cause allergies.']},
  {question:'If you experience any issues, please contact our 24-hour concierge directly.',
    answer:"Good to know—could you provide the concierge number?",        wrongs:['We will manage on our own.','We will come to the front desk.']},
  {question:'The area around BrightonStar is perfect for evening strolls with mountain views.',
    answer:"That sounds idyllic—we'll definitely take an evening walk.",  wrongs:['We stay indoors at night.','We prefer the city.']},
  {question:'We can arrange a private tea ceremony in our Japanese garden on request.',
    answer:"I'd love that—could we schedule it for our second afternoon?",wrongs:['We prefer coffee.','Tea ceremonies seem too formal.']},
  {question:'Our property has a strict quiet hours policy from 10 PM to 7 AM.',
    answer:"Of course—we respect that and appreciate the peaceful environment.",
    wrongs:['That seems very strict.','We often stay up quite late.']},
  {question:'We look forward to offering you an authentic Japanese mountain hospitality experience.',
    answer:"We are incredibly excited. Thank you for your exceptional pre-arrival care.",
    wrongs:["We'll see when we get there.",'Please just keep it simple.']},
];

// ── Arc 3: Airport Pickup ─────────────────────────────────────────
const QA9: QAItem[] = [
  {question:"Excuse me, are you the Brown family? I'm Kenji from BrightonStar.",
    answer:'Yes! Hello, Kenji! Wonderful to meet you.',                   wrongs:['No, I am someone else.','We were expecting someone else.']},
  {question:'Welcome to Japan! How was your flight?',
    answer:'It was very comfortable, thank you!',                         wrongs:['I am too tired to talk.','The flight was quite terrible.']},
  {question:'Did you sleep well on the flight?',
    answer:"A little—we're a bit tired but very excited!",               wrongs:['I never sleep on planes.','I am completely exhausted.']},
  {question:'Please follow me—the car is just outside.',
    answer:'Of course! Lead the way.',                                    wrongs:['We need to find our bags first.','Where exactly is the car?']},
  {question:'May I take your luggage for you?',
    answer:'Yes, please—thank you very much!',                            wrongs:['No, I prefer to carry it.','We have too many bags.']},
  {question:'We have water and snacks ready for you in the car.',
    answer:'Oh, how thoughtful! Thank you.',                              wrongs:['We already ate.','We do not need anything.']},
  {question:'The drive to Gotemba takes about 90 minutes. Please make yourself comfortable.',
    answer:"Wonderful! We're excited to see the countryside.",            wrongs:['90 minutes is very long.','Can we stop on the way?']},
  {question:'Please feel free to sleep in the car if you are tired.',
    answer:"Thank you—we might take a little nap.",                       wrongs:["We'll stay awake.",'I cannot sleep in cars.']},
  {question:'The seat belt is just to your right. Please buckle up.',
    answer:'Of course, safety first! Thank you.',                         wrongs:["I'll be fine without it.",'I cannot find it.']},
  {question:"We'll be leaving Haneda Airport now. Enjoy the journey!",
    answer:"We're ready! Let's go to BrightonStar.",                     wrongs:['Can we stop for shopping first?','One moment—I need to call someone.']},
];

const QA10: QAItem[] = [
  {question:'Is this your first time visiting the Gotemba area?',
    answer:"Yes, it is! We've been looking forward to this for months.",  wrongs:['We come here every year.','We know Japan very well.']},
  {question:'The highway will take us past the foot of Mt. Fuji.',
    answer:'How exciting! Will we be able to see it from the car?',       wrongs:['I prefer the countryside view.','We have seen it in photos.']},
  {question:'On a clear day, Mt. Fuji is visible from this very spot on the highway.',
    answer:"Please let us know when—we don't want to miss it!",           wrongs:["We'll look later.",'We have already seen it.']},
  {question:'There it is! Mt. Fuji at eleven o\'clock on your left.',
    answer:'Oh, it is magnificent! Absolutely breathtaking.',             wrongs:['I cannot see it.','It is smaller than I imagined.']},
  {question:"The mountain is 3,776 metres tall—Japan's highest peak.",
    answer:'Incredible! It looks even more impressive in person.',         wrongs:['I prefer smaller mountains.','We are not interested in facts.']},
  {question:'The area around Gotemba is known for green tea farms and fresh mountain air.',
    answer:"We can already sense how different it feels from Tokyo!",     wrongs:['We prefer the city.','The countryside feels boring.']},
  {question:'BrightonStar is situated at 600 metres elevation with panoramic Fuji views.',
    answer:"That sounds absolutely spectacular—we can't wait to arrive.", wrongs:['Is there a lift to get there?','We prefer lower-altitude stays.']},
  {question:'Gotemba is also home to one of Japan\'s largest premium outlet malls.',
    answer:"Wonderful! We plan to visit for some shopping.",              wrongs:["We're not shoppers.",'We will skip the Outlets.']},
  {question:"The local specialty is Shizuoka green tea—the finest in Japan.",
    answer:"We love green tea! We'll try as much as possible.",           wrongs:['We prefer coffee.','Tea is not our thing.']},
  {question:'We are almost there—just another 10 minutes.',
    answer:"Perfect! We're getting very excited now.",                    wrongs:['Can we stop somewhere?','We are not in a hurry.']},
];

const QA11: QAItem[] = [
  {question:'If you have any questions about the local area during the drive, please feel free to ask.',
    answer:"Actually, what's the best restaurant you'd recommend in Gotemba?",
    wrongs:["We'll use a guidebook.",'We do not eat out.']},
  {question:"For local food, I'd highly recommend Sawayaka for their famous hamburg steak.",
    answer:"Oh, we've read about that! Is it easy to get a table?",      wrongs:['We prefer sushi restaurants.','We eat at the hotel.']},
  {question:'Sawayaka can be popular, but we can arrange a booking through the concierge.',
    answer:"Excellent—we'll ask at check-in.",                            wrongs:["We'll just walk in.",'We have a booking already.']},
  {question:'We will also pass the Gotemba Premium Outlets shortly. Shall I slow down for a look?',
    answer:"Yes please! We'd love to see it from the road.",              wrongs:["We'll visit tomorrow.",'Keep driving, please.']},
  {question:'The Outlets have over 200 stores, many with tax-free shopping for overseas visitors.',
    answer:"That's amazing—we'll definitely set aside a half day.",       wrongs:['Shopping does not interest us.','We will go online instead.']},
  {question:'We are now entering Gotemba city. The air here is noticeably cooler and cleaner.',
    answer:"You're right—it already feels refreshing compared to Tokyo.", wrongs:['It feels the same to me.','I prefer city air.']},
  {question:'The area to your right is a popular spot for cycling and running.',
    answer:"What a beautiful setting! Do guests at BrightonStar use it?", wrongs:['We prefer the gym.','We do not exercise on holiday.']},
  {question:'We offer complimentary bicycles to guests who wish to explore the area.',
    answer:"Wonderful! We'll definitely take advantage of that.",          wrongs:["We can't ride bikes.",'We would rather walk.']},
  {question:"And here we are—welcome to BrightonStar! I hope the journey was comfortable.",
    answer:'It was perfect—thank you so much, Kenji, for a wonderful drive.',
    wrongs:['Finally! That took forever.','I need to use the restroom.']},
  {question:"Please wait one moment—I'll have your bags carried to reception.",
    answer:"Thank you. You've been absolutely wonderful.",                 wrongs:['We can carry our own.','I will go straight to the room.']},
];

const QA12: QAItem[] = [
  {question:'During the drive, you may notice the landscape changes dramatically as we leave the urban sprawl behind.',
    answer:"Indeed—it feels as though we're entering a completely different world.",
    wrongs:['I am reading a book.','I will look when we stop.']},
  {question:"This stretch of the Tomei Expressway is considered one of Japan's most scenic drives on a clear day.",
    answer:"I can absolutely see why—the scale of this landscape is extraordinary.",
    wrongs:['The highway looks ordinary.','We prefer coastal drives.']},
  {question:'Mt. Fuji is an active volcano, last erupting in 1707—a fact that surprises many first-time visitors.',
    answer:'Fascinating! I had no idea—that makes it feel even more majestic.',
    wrongs:['I knew that already.','That sounds rather dangerous.']},
  {question:"The spiritual significance of the mountain to the Japanese people is profound—it has inspired art for centuries.",
    answer:"We can completely understand why—there is something truly otherworldly about it.",
    wrongs:["It's just a mountain.",'I am more interested in the shopping.']},
  {question:'Gotemba has long been a retreat destination for discerning travellers seeking nature and tranquility.',
    answer:"That's exactly what drew us here—we needed to escape the pace of the city.",
    wrongs:['We prefer the beach.','We like busy destinations.']},
  {question:'BrightonStar was designed specifically to frame Mt. Fuji in every principal room and public space.',
    answer:"What a beautiful concept—the architecture must be remarkable.",
    wrongs:['We just need somewhere to sleep.','We are not interested in design.']},
  {question:'Our property sources ingredients locally—Shizuoka wagyu, fresh wasabi, and seasonal vegetables.',
    answer:"We appreciate that commitment to local produce—it will make the meals all the more meaningful.",
    wrongs:['We prefer international cuisine.','Local food is not always reliable.']},
  {question:'If you have any interest in traditional crafts, our concierge can arrange a lacquerware studio visit.',
    answer:"That sounds fascinating—we'd love to learn about Japanese artisanship.",
    wrongs:['We are not into crafts.','We will buy souvenirs at the Outlets.']},
  {question:"We're now ascending into the foothills—you may notice the temperature has dropped a few degrees.",
    answer:"Yes—it feels wonderful. Like stepping into a natural air conditioner.",
    wrongs:['It feels too cold.','We prefer warmer climates.']},
  {question:'Your room will be ready upon arrival, and our staff are very much looking forward to welcoming you properly.',
    answer:"After such an exceptional journey, we have the highest expectations for the stay ahead.",
    wrongs:['I hope the room is clean.','Just make sure the bed is comfortable.']},
];

// ── Arc 4: Check-in & House Rules ────────────────────────────────
const QA13: QAItem[] = [
  {question:'Welcome to BrightonStar! You must be the Brown family.',
    answer:"Yes! We're so excited to finally be here.",                   wrongs:['Actually, we are the Smiths.','We have no reservation.']},
  {question:'Please come inside and take off your shoes here. Slippers are provided.',
    answer:'Of course—thank you for the slippers!',                       wrongs:['We prefer to keep our shoes on.','Where should I put them?']},
  {question:'Your room is the Fuji View Suite on the third floor.',
    answer:"Wonderful! How do we get to the third floor?",               wrongs:['We requested the first floor.','Is there a lift?']},
  {question:'The lift is just to your left, and your room number is 301.',
    answer:'Perfect—thank you so much.',                                  wrongs:["We'll take the stairs.",'Where is the front desk?']},
  {question:'Here is your key card. Please keep it with you at all times.',
    answer:'Understood. Does it open the main entrance too?',             wrongs:["I'll leave it in the room.",'I prefer a traditional key.']},
  {question:'Yes, the key card opens all doors, including the hot spring entrance.',
    answer:'Excellent—very convenient!',                                  wrongs:["We won't use the hot spring.",'Can I have two cards?']},
  {question:'Breakfast is served in the dining room from 7 to 9:30 AM.',
    answer:"Great—we'll definitely be there. Which floor is the dining room?",
    wrongs:["We'll skip breakfast.",'We prefer room service.']},
  {question:'The dining room is on the first floor, just past the front desk.',
    answer:"Thank you—we'll see you in the morning!",                     wrongs:['We might be late.','Is the food good?']},
  {question:'Please enjoy your stay and feel free to contact us anytime.',
    answer:"Thank you! We're looking forward to a wonderful time.",       wrongs:["We'll try not to bother you.",'We know how to manage.']},
  {question:'If you need anything, press the concierge button on your room phone.',
    answer:'Perfect—we will keep that in mind.',                          wrongs:["We'll come downstairs.",'We prefer not to be disturbed.']},
];

const QA14: QAItem[] = [
  {question:'Before you head up, let me explain a few house rules.',
    answer:'Of course—please go ahead.',                                  wrongs:["We've read the info pack.",'We will figure it out.']},
  {question:'Please sort your rubbish into the four colour-coded bins provided in your room.',
    answer:"We'll make sure to do that—thank you for explaining.",        wrongs:["There's only one bin back home.",'That seems very complicated.']},
  {question:'The combustible waste goes in the red bin, and plastic in the blue one.',
    answer:'Understood—red for combustible, blue for plastic.',           wrongs:["We'll put it all together.",'Can the staff handle it?']},
  {question:'Smoking is strictly prohibited inside the building. There is a designated smoking area in the garden.',
    answer:'No problem at all—neither of us smoke.',                      wrongs:['Can we smoke in the bathroom?','I thought balconies were okay.']},
  {question:'Quiet hours are from 10 PM to 7 AM. We ask that noise is kept to a minimum.',
    answer:"Absolutely—we're usually asleep well before then!",           wrongs:['We tend to stay up late.','Can we have an exception?']},
  {question:'Pets are not permitted anywhere on the property, including the garden.',
    answer:'We understand. We did not bring any.',                        wrongs:['We have a small dog with us.','What about a fish?']},
  {question:"Please use the provided laundry bags if you would like your clothes washed.",
    answer:'Thank you—how do we arrange collection?',                     wrongs:['We brought our own detergent.','We will handwash everything.']},
  {question:'Simply hang the bag on your door handle before 9 AM and it will be collected.',
    answer:'How convenient! Thank you.',                                  wrongs:["We'll bring it to reception.",'Is there an extra charge?']},
  {question:'The hot spring is a shared facility—please shower thoroughly before entering the bath.',
    answer:'Of course—we are familiar with onsen etiquette.',             wrongs:['We did not know that rule.','We will skip the hot spring then.']},
  {question:'Tattoos are permitted in our hot spring—please just ensure you have rinsed off beforehand.',
    answer:'Good to know—thank you for mentioning it.',                   wrongs:['We have no tattoos.','That policy seems unusual.']},
];

const QA15: QAItem[] = [
  {question:'Allow me to give you a brief tour of the facilities before you settle in.',
    answer:'That would be wonderful—please lead the way.',                wrongs:['We can explore by ourselves.','We are quite tired, actually.']},
  {question:'This is our Fuji Dining restaurant. Every table faces the mountain.',
    answer:"The view is breathtaking—we'll definitely dine here tonight.", wrongs:['The restaurant looks small.','We prefer casual dining.']},
  {question:'Through those doors is the onsen wing. Separate baths and a mixed outdoor bath for couples.',
    answer:"Perfect—we'll try the outdoor couple's bath this evening.",   wrongs:['We prefer separate baths.','We will skip the onsen.']},
  {question:'The outdoor bath is particularly spectacular at dusk when the mountain turns pink.',
    answer:"We'll make sure to time our visit for sunset then!",          wrongs:['We usually bathe in the morning.','It is too cold at dusk.']},
  {question:'This is our library lounge—please help yourself to guidebooks, board games, and complimentary herbal teas.',
    answer:"How lovely! This is the perfect place to relax between activities.",
    wrongs:['We brought our own books.','We prefer our phones.']},
  {question:'In case of emergency, the nearest hospital is 10 minutes by taxi. Details are in the room directory.',
    answer:"Thank you—hopefully we won't need it, but good to know.",     wrongs:['We have travel insurance.','I hope nothing goes wrong.']},
  {question:'The nearest convenience store is a five-minute walk to the north.',
    answer:"Perfect—we might pick up some local snacks.",                 wrongs:['We brought everything we need.','We prefer to order online.']},
  {question:'Local buses run hourly to Gotemba Station. The timetable is by the entrance.',
    answer:"Thank you—we may use the bus one afternoon.",                 wrongs:["We'll use our phones for routes.",'We will take taxis only.']},
  {question:'The mountain road outside can be quite dark at night—we recommend reflective gear for evening walks.',
    answer:"That's a safety tip we would never have thought of! Thank you.",
    wrongs:["We'll be careful.",'We do not walk at night.']},
  {question:"And finally, here is your room. I hope you find it absolutely everything you had imagined.",
    answer:"It's magnificent—the view of Mt. Fuji is beyond anything we expected.",
    wrongs:["It's smaller than the photos.",'Where is the minibar?']},
];

const QA16: QAItem[] = [
  {question:"I'd like to share some aspects of the property that guests often find unexpectedly delightful.",
    answer:"We're all ears—please do share your favourites.",             wrongs:["We'll discover them ourselves.",'Is there a printed guide?']},
  {question:'The eastern garden is our secret gem—perfectly framed for Mt. Fuji sunrise photography.',
    answer:"We'll make a note to be there tomorrow morning with our camera.",
    wrongs:['We do not take photos.','Is the path lit at night?']},
  {question:'We deliberately keep the garden lanterns dim to preserve natural darkness for stargazing.',
    answer:"What a thoughtful approach—we'll definitely look up at the night sky.",
    wrongs:['It seems too dark.','Can we have more lighting?']},
  {question:'Our sommelier has curated a Shizuoka sake selection that pairs beautifully with the dinner menu.',
    answer:"How exciting! Could you recommend a sake to accompany the wagyu?",
    wrongs:['We prefer wine.','We do not drink alcohol.']},
  {question:'The Junmai Daiginjo from a local Gotemba brewery is light, floral, and exceptionally smooth.',
    answer:"That sounds extraordinary—please reserve a bottle for our dinner tonight.",
    wrongs:["We'll choose on the night.",'We do not like floral flavours.']},
  {question:'If you wake at 4:30 AM on a clear morning, the sky above the mountain displays the Milky Way in remarkable clarity.',
    answer:"We're setting that alarm right now—that sounds absolutely unmissable.",
    wrongs:['We need our sleep.','We have seen the Milky Way before.']},
  {question:'Our pillow menu offers five options from buckwheat to memory foam.',
    answer:"Could we try the buckwheat pillow? It sounds authentically Japanese.",
    wrongs:['The standard one is fine.','We brought our own pillows.']},
  {question:'We also offer a bedside aromatherapy diffuser with hinoki cypress oil—a quintessentially Japanese mountain scent.',
    answer:"Yes, please! That sounds like a perfect way to unwind after the journey.",
    wrongs:['We are sensitive to strong scents.','We prefer no fragrance.']},
  {question:'The private terrace in your suite faces precisely west-southwest—optimal for both sunset and Mt. Fuji silhouettes.',
    answer:"We'll spend considerable time on that terrace—thank you for this extraordinary attention to detail.",
    wrongs:['Any terrace is fine.','We prefer indoor spaces.']},
  {question:'We truly hope that your stay at BrightonStar exceeds every expectation.',
    answer:"From everything we've seen so far, we're utterly certain it will. Thank you so much.",
    wrongs:["We'll see how it goes.",'It had better, at these prices!']},
];

// ── Arc 5: Gotemba Local Guide ────────────────────────────────────
const QA17: QAItem[] = [
  {question:"I understand you're interested in visiting Mt. Fuji. May I offer some suggestions?",
    answer:"Yes, please! We'd love your local knowledge.",                wrongs:['We have a guidebook.','We will figure it out online.']},
  {question:'The most popular starting point for visitors is the 5th Station at 2,300 metres.',
    answer:'How long does it take to reach from here?',                   wrongs:['We are experienced climbers.','We do not want to go too high.']},
  {question:'Our complimentary shuttle reaches the 5th Station in about 40 minutes.',
    answer:"That's very convenient! What's the best time to go?",         wrongs:['We will drive ourselves.','We have a tour already booked.']},
  {question:'Early morning is ideal—the crowds are thin and the light is magical.',
    answer:"We'll plan for tomorrow morning—what time does the shuttle depart?",
    wrongs:['We prefer afternoons.','Crowds do not bother us.']},
  {question:'The first shuttle departs at 6 AM. I recommend the 5:30 AM breakfast box to take with you.',
    answer:"Perfect! Please arrange the bento box and two shuttle seats.",wrongs:["We'll skip breakfast.",'6 AM is too early for us.']},
  {question:'The viewing platform at the 5th Station offers an unobstructed panorama on clear days.',
    answer:"That sounds absolutely extraordinary!",                        wrongs:['We prefer valley views.','Panoramas are not our thing.']},
  {question:'If you prefer a gentler experience, the Oshino Hakkai springs offer stunning Fuji reflections at low altitude.',
    answer:"That sounds perfect for the afternoon—how far is it?",        wrongs:['We prefer the summit view.','We will stay at the hotel.']},
  {question:'Oshino Hakkai is about 35 minutes by car, and our concierge can arrange a private transfer.',
    answer:'Yes please—could we book it for tomorrow afternoon?',         wrongs:["We'll take the public bus.",'We have a rental car.']},
  {question:"The Chureito Pagoda is often described as one of Japan's most photographed spots.",
    answer:"Oh, we've seen it in photos! Is it as beautiful in person?",  wrongs:['We prefer modern architecture.','We are not into temples.']},
  {question:'It is even more spectacular—especially when Mt. Fuji frames perfectly behind the five-storey pagoda.',
    answer:"We absolutely must go! Could you add it to our itinerary?",   wrongs:["We'll see it another time.",'We are not sure we have time.']},
];

const QA18: QAItem[] = [
  {question:'For shopping, the Gotemba Premium Outlets are 15 minutes from the hotel and exceptional value.',
    answer:"We've been looking forward to it! Do they offer tax-free shopping?",
    wrongs:["We're not big shoppers.",'We will use online stores.']},
  {question:'Most stores offer immediate tax refunds for overseas visitors upon presentation of a passport.',
    answer:"Wonderful—we'll bring our passports along.",                  wrongs:["We don't have much cash.",'We forgot our passports at home.']},
  {question:'The Outlets open at 10 AM and close at 8 PM. Our afternoon shuttle departs at 1 PM.',
    answer:"The 1 PM shuttle is ideal—could we reserve two seats?",      wrongs:['We prefer the morning shuttle.','We will take a taxi.']},
  {question:'The Outlets also have an excellent food hall featuring local delicacies from across the Fuji Five Lakes region.',
    answer:"We'll definitely explore the food hall—thank you for the tip.",
    wrongs:["We'll eat at the hotel.",'We do not like food halls.']},
  {question:'For dinner tonight, I would strongly recommend Gyukatsu Kyoto Katsugyu for their premium beef cutlet.',
    answer:"That sounds incredible—is it within walking distance?",       wrongs:["We're vegetarian today.",'We prefer fish.']},
  {question:'It is about a 10-minute taxi ride, and reservations are recommended for evenings.',
    answer:'Please book a table for two at 7 PM if possible.',            wrongs:["We'll try our luck.",'7 PM is too late for us.']},
  {question:"Sawayaka restaurant is a Gotemba institution—their hamburg steak is genuinely unlike anything else in Japan.",
    answer:"We've seen it mentioned everywhere! How does it differ from a regular hamburger?",
    wrongs:["We've tried it already.",'Hamburgers are all the same.']},
  {question:'The chef carves it open tableside and adds special sauce—quite theatrical and utterly delicious.',
    answer:"That sounds like a wonderful experience! Please book us in for lunch tomorrow.",
    wrongs:['We prefer simple presentations.','Theatrical dining is not for us.']},
  {question:'For artisanal souvenirs, the Komorebi craft market runs on Saturday mornings in the town centre.',
    answer:"How perfect—we arrive on Friday! Could you arrange transport on Saturday morning?",
    wrongs:["We'll buy at the airport.",'We prefer known brands.']},
  {question:'The Gotemba Kogen sake brewery offers distillery tours on weekdays.',
    answer:"We would love that—please reserve two spots on any available tour.",
    wrongs:["We don't drink sake.",'We prefer wine tasting.']},
];

const QA19: QAItem[] = [
  {question:"I'd like to share some lesser-known local experiences that our most discerning guests have particularly loved.",
    answer:"We are always drawn to the authentic over the touristic—please do tell.",
    wrongs:['We prefer the standard itinerary.','We will look it up ourselves.']},
  {question:'There is a small, family-owned wasabi farm in the foothills that has operated for six generations.',
    answer:"That sounds remarkable! Is it open to visitors?",             wrongs:['We do not like wasabi.','We prefer commercial tours.']},
  {question:'The Abe family welcomes guests for a private tasting and a brief history of wasabi cultivation.',
    answer:"What an extraordinary experience—could you arrange a visit for us?",
    wrongs:["We'll see it on a food show.",'A private visit seems intrusive.']},
  {question:'In September, the trails around the third and fourth stations are stunning with alpine wildflowers.',
    answer:"We had no idea—could you recommend a specific trail for our fitness level?",
    wrongs:['We prefer flat walks.','We will go to the summit.']},
  {question:'The Hoei Crater Trail at the 5th Station offers spectacular views without mountaineering experience.',
    answer:"That sounds perfectly suited to us—can the concierge arrange a guide?",
    wrongs:['We prefer to go alone.','The crater sounds dangerous.']},
  {question:'Our recommended guide is Tanaka-san, who has led guests on this trail for over 25 years.',
    answer:"With that level of experience, we'd feel entirely safe—please book him.",
    wrongs:['We prefer a younger guide.','We do not need a guide.']},
  {question:"The Fuji Five Lakes—Kawaguchiko, Saiko, Yamanakako, Shojiko, and Motosuko—each offer distinct perspectives.",
    answer:"How fascinating—each lake has its own unique character, I imagine.",
    wrongs:["We'll just see one.",'Lakes all look the same.']},
  {question:'Lake Saiko is considered by connoisseurs to offer the most serene and unspoiled reflection of Mt. Fuji.',
    answer:"Then Saiko is where we must go. Could you build it into our itinerary?",
    wrongs:['We prefer Lake Kawaguchiko.','We have seen lake reflections before.']},
  {question:"For an authentic farming experience, a local soba noodle workshop runs on Tuesday and Thursday mornings.",
    answer:"We are here on a Wednesday—is there any chance of a special session?",
    wrongs:['We prefer restaurant dining.','We are not into cooking classes.']},
  {question:'I hope these suggestions help craft an experience truly rooted in the character of this extraordinary region.',
    answer:"They have been invaluable—you've transformed what could have been a standard visit into something deeply meaningful.",
    wrongs:["We'll use the guidebook.",'We prefer to leave it to chance.']},
];

const QA20: QAItem[] = [
  {question:"As you plan your final day, I'd like to suggest a route that captures the full essence of the Fuji Five Lakes region.",
    answer:"We trust your expertise entirely—a curated final day would be the perfect conclusion to a remarkable stay.",
    wrongs:["We'll decide in the morning.",'We prefer to relax on our last day.']},
  {question:"Begin at Motosu Lake at dawn—it offers the view immortalised on the one-thousand-yen note.",
    answer:"How extraordinary—the literal image on Japanese currency! We must see it in person.",
    wrongs:["We've seen enough lakes.",'The yen note does not interest us.']},
  {question:'From Motosu, we recommend the Narusawa Ice Cave—a lava tube formed during the 864 eruption of Mt. Fuji.',
    answer:"A lava tube from the ninth century? The geological history here is as captivating as the scenery.",
    wrongs:['Caves are not our preference.','The eruption history sounds alarming.']},
  {question:'The cave maintains a constant temperature of three degrees Celsius—a refreshing contrast to the summer heat.',
    answer:"We'll pack a light layer then. Is there anything particularly remarkable inside?",
    wrongs:['Three degrees sounds too cold.','We will skip the cave.']},
  {question:'Ancient ice formations have persisted inside since the Edo period—a genuinely rare natural phenomenon.',
    answer:"Ice from the Edo period, within sight of an active volcano—Japan's contrasts are endlessly captivating.",
    wrongs:['We prefer warm destinations.','Ice is just ice.']},
  {question:'For lunch, I would suggest the Michelin-recommended Hoto Fudo restaurant, where the regional hoto noodle dish is served in traditional earthenware.',
    answer:"Hoto noodles in a lakeside setting—that sounds like a perfect midday experience.",
    wrongs:["We'll find somewhere ourselves.",'We are not noodle enthusiasts.']},
  {question:"The afternoon offers a contemplative walk along Lake Kawaguchiko, where the mountain's reflection creates near-perfect symmetry on calm days.",
    answer:"A mountain reflected upon water—I can already imagine how meditative and profoundly beautiful that will be.",
    wrongs:["We've walked enough.",'We prefer to spend the afternoon shopping.']},
  {question:"For your final evening, our kitchen team has prepared a farewell kaiseki menu inspired entirely by the ingredients you encountered throughout your stay.",
    answer:"How extraordinarily thoughtful—a menu that narrates the entire journey through flavour. We are deeply moved.",
    wrongs:['We prefer the regular menu.','We will eat simply on our last night.']},
  {question:"A complimentary bottle of Gotemba Kogen premium junmai daiginjo will be chilled and waiting on your terrace at sunset.",
    answer:"You have anticipated our every wish. BrightonStar has set a standard of hospitality we shall measure all future travel against.",
    wrongs:['We prefer wine at sunset.','Please do not go to any trouble.']},
  {question:"It has been our profound honour to host you, and we sincerely hope some part of Mt. Fuji's quiet majesty has found its way into your hearts.",
    answer:"It most certainly has—and so has the warmth of every single member of the BrightonStar family. Until we meet again.",
    wrongs:['Thank you. Goodbye.','We will book again if we are in the area.']},
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

interface QAQuiz extends QAItem { choices: string[]; }
function buildQAQuiz(item: QAItem): QAQuiz {
  return { ...item, choices: shuffle([item.answer, item.wrongs[0], item.wrongs[1]]) };
}

// ─────────────────────────────────────────────────────────────────
// HospitalityQAMode
// ─────────────────────────────────────────────────────────────────
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

  const arc       = getArc(level);
  const threshold = nextThreshold(combo);
  const lvStart   = LEVEL_THRESHOLDS[level - 1];
  const lvEnd     = threshold ?? lvStart + 1;
  const pct       = Math.min(100, ((combo - lvStart) / (lvEnd - lvStart)) * 100);

  return (
    <div className="flex flex-col gap-3">
      {/* ストーリーアーク＋レベルバー */}
      <div className={`${arc.bg} border ${arc.border} rounded-2xl px-4 py-3`}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className={`text-xs font-black ${arc.text} tracking-wide`}>{arc.label}</span>
            <span className={`ml-2 text-[10px] font-bold ${arc.soft}`}>{arc.sub}</span>
          </div>
          <span className={`text-lg font-black ${arc.text}`}>Lv {level}</span>
        </div>
        <div className="w-full h-2.5 bg-white/60 rounded-full overflow-hidden">
          <div className={`h-full ${arc.bar} rounded-full transition-all duration-500`}
            style={{ width: `${pct}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className={`text-[10px] ${arc.soft}`}>正解 {combo} 問</span>
          <span className={`text-[10px] ${arc.soft}`}>
            {threshold ? `あと ${threshold - combo} 問でLv ${level + 1}` : '🏆 MAX LEVEL'}
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

// ─────────────────────────────────────────────────────────────────
// BabyImmersion — ルートコンポーネント
// ─────────────────────────────────────────────────────────────────
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
      {/* ヘッダー */}
      <div className="text-center pt-2">
        <h2 className="text-base font-black text-gray-700">🏨 Hospitality English</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">BrightonStar × Gotemba — 20 Levels</p>
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
