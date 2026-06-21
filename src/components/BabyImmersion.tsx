'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────
// 定数
// ─────────────────────────────────────────────────────────────────
const MASTERY_THRESHOLD = 3;   // この回数正解したら「習得済み」→ 次ティア解放判定
const CORRECT_DELAY     = 400; // 正解後 → 次問への遷移時間 (ms) ← 超スピード化
const LS_WORDS          = 'basic-words-v4';
const LS_QA             = 'qa-progress-v4';
const LS_QA_MASTERED    = 'qa-mastered-v4';

// ─────────────────────────────────────────────────────────────────
// 単語データ — 4ティア・合計 230 語以上
// ─────────────────────────────────────────────────────────────────
interface Word { en: string; emoji: string; ja: string; }

// ── Tier 1 ── 超・基礎（30 語）
const TIER1: Word[] = [
  { en:'apple',        emoji:'🍎', ja:'りんご'         },
  { en:'dog',          emoji:'🐶', ja:'いぬ'           },
  { en:'cat',          emoji:'🐱', ja:'ねこ'           },
  { en:'hello',        emoji:'👋', ja:'こんにちは'     },
  { en:'thank you',    emoji:'🙏', ja:'ありがとう'     },
  { en:'water',        emoji:'💧', ja:'みず'           },
  { en:'book',         emoji:'📚', ja:'ほん'           },
  { en:'sun',          emoji:'☀️', ja:'たいよう'       },
  { en:'yes',          emoji:'✅', ja:'はい'           },
  { en:'no',           emoji:'❌', ja:'いいえ'         },
  { en:'one',          emoji:'1️⃣', ja:'いち'          },
  { en:'two',          emoji:'2️⃣', ja:'に'            },
  { en:'three',        emoji:'3️⃣', ja:'さん'          },
  { en:'red',          emoji:'🔴', ja:'あか'           },
  { en:'blue',         emoji:'🔵', ja:'あお'           },
  { en:'white',        emoji:'⬜', ja:'しろ'           },
  { en:'black',        emoji:'⬛', ja:'くろ'           },
  { en:'big',          emoji:'🐘', ja:'おおきい'       },
  { en:'small',        emoji:'🐭', ja:'ちいさい'       },
  { en:'food',         emoji:'🍽️', ja:'たべもの'      },
  { en:'drink',        emoji:'🥤', ja:'のみもの'       },
  { en:'good',         emoji:'👍', ja:'よい'           },
  { en:'bad',          emoji:'👎', ja:'わるい'         },
  { en:'hot',          emoji:'🔥', ja:'あつい'         },
  { en:'cold',         emoji:'🥶', ja:'さむい'         },
  { en:'happy',        emoji:'😄', ja:'うれしい'       },
  { en:'sad',          emoji:'😢', ja:'かなしい'       },
  { en:'name',         emoji:'🏷️', ja:'なまえ'        },
  { en:'day',          emoji:'📅', ja:'にち・ひ'       },
  { en:'night',        emoji:'🌙', ja:'よる'           },
];

// ── Tier 2 ── 基礎（50 語）
const TIER2: Word[] = [
  { en:'banana',        emoji:'🍌', ja:'バナナ'              },
  { en:'orange',        emoji:'🍊', ja:'オレンジ'            },
  { en:'bread',         emoji:'🍞', ja:'パン'                },
  { en:'rice',          emoji:'🍚', ja:'ごはん'              },
  { en:'milk',          emoji:'🥛', ja:'ぎゅうにゅう'        },
  { en:'tea',           emoji:'🍵', ja:'おちゃ'              },
  { en:'coffee',        emoji:'☕', ja:'コーヒー'            },
  { en:'egg',           emoji:'🥚', ja:'たまご'              },
  { en:'fish',          emoji:'🐟', ja:'さかな'              },
  { en:'meat',          emoji:'🥩', ja:'にく'                },
  { en:'bird',          emoji:'🐦', ja:'とり'                },
  { en:'flower',        emoji:'🌸', ja:'はな'                },
  { en:'tree',          emoji:'🌳', ja:'き'                  },
  { en:'moon',          emoji:'🌙', ja:'つき'                },
  { en:'star',          emoji:'⭐', ja:'ほし'                },
  { en:'rain',          emoji:'🌧️', ja:'あめ'               },
  { en:'wind',          emoji:'💨', ja:'かぜ'                },
  { en:'car',           emoji:'🚗', ja:'くるま'              },
  { en:'train',         emoji:'🚂', ja:'でんしゃ'            },
  { en:'bus',           emoji:'🚌', ja:'バス'                },
  { en:'plane',         emoji:'✈️', ja:'ひこうき'            },
  { en:'house',         emoji:'🏠', ja:'いえ'                },
  { en:'school',        emoji:'🏫', ja:'がっこう'            },
  { en:'hospital',      emoji:'🏥', ja:'びょういん'          },
  { en:'shop',          emoji:'🏪', ja:'おみせ'              },
  { en:'door',          emoji:'🚪', ja:'ドア'                },
  { en:'window',        emoji:'🪟', ja:'まど'                },
  { en:'table',         emoji:'🪑', ja:'テーブル'            },
  { en:'chair',         emoji:'🪑', ja:'いす'                },
  { en:'pen',           emoji:'🖊️', ja:'ペン'               },
  { en:'phone',         emoji:'📱', ja:'でんわ'              },
  { en:'money',         emoji:'💴', ja:'おかね'              },
  { en:'time',          emoji:'⏰', ja:'じかん'              },
  { en:'year',          emoji:'📅', ja:'とし'                },
  { en:'month',         emoji:'📅', ja:'つき（月）'          },
  { en:'week',          emoji:'📅', ja:'しゅう'              },
  { en:'morning',       emoji:'🌅', ja:'あさ'                },
  { en:'evening',       emoji:'🌆', ja:'ゆうがた'            },
  { en:'friend',        emoji:'🤝', ja:'ともだち'            },
  { en:'family',        emoji:'👨‍👩‍👧', ja:'かぞく'        },
  { en:'mother',        emoji:'👩', ja:'おかあさん'          },
  { en:'father',        emoji:'👨', ja:'おとうさん'          },
  { en:'child',         emoji:'👧', ja:'こども'              },
  { en:'green',         emoji:'🟢', ja:'みどり'              },
  { en:'yellow',        emoji:'🟡', ja:'きいろ'              },
  { en:'new',           emoji:'🆕', ja:'あたらしい'          },
  { en:'old',           emoji:'🏚️', ja:'ふるい'             },
  { en:'fast',          emoji:'⚡', ja:'はやい'              },
  { en:'slow',          emoji:'🐢', ja:'おそい'              },
  { en:'please',        emoji:'🤲', ja:'おねがいします'      },
];

// ── Tier 3 ── 初級 / TOEIC 頻出基礎（70 語）
const TIER3: Word[] = [
  { en:'meeting',       emoji:'📋', ja:'かいぎ'              },
  { en:'office',        emoji:'🏢', ja:'オフィス'            },
  { en:'company',       emoji:'🏭', ja:'かいしゃ'            },
  { en:'manager',       emoji:'👔', ja:'マネージャー'        },
  { en:'employee',      emoji:'👷', ja:'じゅうぎょういん'    },
  { en:'customer',      emoji:'🧑‍💼', ja:'おきゃくさま'    },
  { en:'product',       emoji:'📦', ja:'せいひん'            },
  { en:'service',       emoji:'🛎️', ja:'サービス'           },
  { en:'price',         emoji:'💰', ja:'ねだん'              },
  { en:'discount',      emoji:'🏷️', ja:'わりびき'           },
  { en:'invoice',       emoji:'🧾', ja:'せいきゅうしょ'      },
  { en:'schedule',      emoji:'📅', ja:'スケジュール'        },
  { en:'deadline',      emoji:'⏳', ja:'しめきり'            },
  { en:'report',        emoji:'📝', ja:'ほうこくしょ'        },
  { en:'email',         emoji:'📧', ja:'メール'              },
  { en:'contract',      emoji:'📄', ja:'けいやくしょ'        },
  { en:'budget',        emoji:'💹', ja:'よさん'              },
  { en:'project',       emoji:'🗂️', ja:'プロジェクト'       },
  { en:'presentation',  emoji:'📊', ja:'プレゼン'            },
  { en:'conference',    emoji:'🎤', ja:'かんファレンス'      },
  { en:'reservation',   emoji:'📋', ja:'よやく'              },
  { en:'check-in',      emoji:'🏨', ja:'チェックイン'        },
  { en:'check-out',     emoji:'🚪', ja:'チェックアウト'      },
  { en:'reception',     emoji:'🛎️', ja:'フロント'           },
  { en:'lobby',         emoji:'🏛️', ja:'ロビー'             },
  { en:'elevator',      emoji:'🛗', ja:'エレベーター'        },
  { en:'floor',         emoji:'🏢', ja:'かい（フロア）'      },
  { en:'room',          emoji:'🛏️', ja:'へや'               },
  { en:'key',           emoji:'🔑', ja:'かぎ'                },
  { en:'passport',      emoji:'🛂', ja:'パスポート'          },
  { en:'luggage',       emoji:'🧳', ja:'にもつ'              },
  { en:'ticket',        emoji:'🎫', ja:'チケット'            },
  { en:'gate',          emoji:'🚧', ja:'ゲート'              },
  { en:'terminal',      emoji:'🛫', ja:'ターミナル'          },
  { en:'departure',     emoji:'🛫', ja:'しゅっぱつ'          },
  { en:'arrival',       emoji:'🛬', ja:'とうちゃく'          },
  { en:'platform',      emoji:'🚉', ja:'プラットフォーム'    },
  { en:'station',       emoji:'🚉', ja:'えき'                },
  { en:'direction',     emoji:'🧭', ja:'ほうこう'            },
  { en:'map',           emoji:'🗺️', ja:'ちず'               },
  { en:'corner',        emoji:'↩️', ja:'かど'               },
  { en:'straight',      emoji:'⬆️', ja:'まっすぐ'           },
  { en:'right',         emoji:'➡️', ja:'みぎ'               },
  { en:'left',          emoji:'⬅️', ja:'ひだり'             },
  { en:'near',          emoji:'📍', ja:'ちかい'              },
  { en:'far',           emoji:'🔭', ja:'とおい'              },
  { en:'problem',       emoji:'❓', ja:'もんだい'            },
  { en:'answer',        emoji:'💡', ja:'こたえ'              },
  { en:'question',      emoji:'❓', ja:'しつもん'            },
  { en:'important',     emoji:'❗', ja:'たいせつ'            },
  { en:'difficult',     emoji:'🤔', ja:'むずかしい'          },
  { en:'easy',          emoji:'😊', ja:'かんたん'            },
  { en:'understand',    emoji:'💭', ja:'りかいする'          },
  { en:'explain',       emoji:'🗣️', ja:'せつめいする'        },
  { en:'confirm',       emoji:'✅', ja:'かくにんする'        },
  { en:'cancel',        emoji:'🚫', ja:'キャンセルする'      },
  { en:'change',        emoji:'🔄', ja:'かえる'              },
  { en:'help',          emoji:'🆘', ja:'たすけ'              },
  { en:'thank',         emoji:'🙏', ja:'かんしゃする'        },
  { en:'sorry',         emoji:'😔', ja:'もうしわけない'      },
  { en:'excuse',        emoji:'🙋', ja:'しつれいする'        },
  { en:'welcome',       emoji:'🤗', ja:'ようこそ'            },
  { en:'enjoy',         emoji:'😊', ja:'たのしむ'            },
  { en:'recommend',     emoji:'👍', ja:'すすめる'            },
  { en:'available',     emoji:'🟢', ja:'りようかのう'        },
  { en:'require',       emoji:'📋', ja:'ひつようとする'      },
  { en:'include',       emoji:'➕', ja:'ふくむ'              },
  { en:'receive',       emoji:'📥', ja:'うけとる'            },
  { en:'send',          emoji:'📤', ja:'おくる'              },
  { en:'open',          emoji:'🔓', ja:'あける・あいている'  },
];

// ── Tier 4 ── 中級 / TOEIC 実践・接客（80 語）
const TIER4: Word[] = [
  { en:'accommodate',   emoji:'🏨', ja:'しゅくはくさせる'    },
  { en:'amenity',       emoji:'🧴', ja:'アメニティ'          },
  { en:'complimentary', emoji:'🎁', ja:'むりょうの'          },
  { en:'housekeeping',  emoji:'🧹', ja:'ハウスキーピング'    },
  { en:'concierge',     emoji:'🛎️', ja:'コンシェルジュ'     },
  { en:'suite',         emoji:'🛏️', ja:'スイートルーム'     },
  { en:'vacancy',       emoji:'🚪', ja:'空き部屋'            },
  { en:'occupancy',     emoji:'🛏️', ja:'使用中'             },
  { en:'valet',         emoji:'🚗', ja:'バレットパーキング'  },
  { en:'buffet',        emoji:'🍽️', ja:'バイキング'         },
  { en:'cuisine',       emoji:'🍳', ja:'りょうり（スタイル）'},
  { en:'reservation',   emoji:'📋', ja:'よやく（レストラン）'},
  { en:'menu',          emoji:'📜', ja:'メニュー'            },
  { en:'appetizer',     emoji:'🥗', ja:'ぜんさい'            },
  { en:'main course',   emoji:'🥩', ja:'メインディッシュ'    },
  { en:'dessert',       emoji:'🍮', ja:'デザート'            },
  { en:'beverage',      emoji:'🥂', ja:'飲み物（正式）'      },
  { en:'allergy',       emoji:'⚠️', ja:'アレルギー'         },
  { en:'vegetarian',    emoji:'🥦', ja:'ベジタリアン'        },
  { en:'portion',       emoji:'🍽️', ja:'ひとり分の量'       },
  { en:'receipt',       emoji:'🧾', ja:'レシート'            },
  { en:'tip',           emoji:'💵', ja:'チップ'              },
  { en:'cash',          emoji:'💴', ja:'げんきん'            },
  { en:'credit card',   emoji:'💳', ja:'クレジットカード'    },
  { en:'currency',      emoji:'💱', ja:'通貨'                },
  { en:'exchange',      emoji:'🔄', ja:'両替'                },
  { en:'refund',        emoji:'💰', ja:'かんきん'            },
  { en:'charge',        emoji:'💳', ja:'りょうきん'          },
  { en:'fee',           emoji:'💲', ja:'てすうりょう'        },
  { en:'tax',           emoji:'🧮', ja:'ぜいきん'            },
  { en:'insurance',     emoji:'🛡️', ja:'ほけん'             },
  { en:'appointment',   emoji:'📅', ja:'よやく（面会）'      },
  { en:'itinerary',     emoji:'🗺️', ja:'りょていひょう'     },
  { en:'transit',       emoji:'🔄', ja:'けいゆ'              },
  { en:'transfer',      emoji:'🚌', ja:'のりかえ'            },
  { en:'boarding',      emoji:'🛫', ja:'とうじょう'          },
  { en:'customs',       emoji:'🛃', ja:'ぜいかん'            },
  { en:'immigration',   emoji:'🛂', ja:'にゅうこくしんさ'    },
  { en:'declare',       emoji:'📝', ja:'しんこくする'        },
  { en:'prohibited',    emoji:'🚫', ja:'きんしされた'        },
  { en:'emergency',     emoji:'🚨', ja:'きんきゅう'          },
  { en:'assistance',    emoji:'🤝', ja:'えんじょ'            },
  { en:'complaint',     emoji:'😤', ja:'クレーム'            },
  { en:'feedback',      emoji:'💬', ja:'フィードバック'      },
  { en:'satisfaction',  emoji:'😊', ja:'まんぞく'            },
  { en:'experience',    emoji:'⭐', ja:'けいけん'            },
  { en:'appreciate',    emoji:'🙏', ja:'かんしゃする'        },
  { en:'apologize',     emoji:'😔', ja:'あやまる'            },
  { en:'inconvenience', emoji:'😣', ja:'ご不便'              },
  { en:'arrangement',   emoji:'📋', ja:'てはいする'          },
  { en:'alternative',   emoji:'🔀', ja:'だいあん'            },
  { en:'priority',      emoji:'🥇', ja:'ゆうせん'            },
  { en:'policy',        emoji:'📜', ja:'ポリシー'            },
  { en:'procedure',     emoji:'📋', ja:'てつづき'            },
  { en:'document',      emoji:'📄', ja:'しょるい'            },
  { en:'signature',     emoji:'✍️', ja:'サイン'              },
  { en:'approve',       emoji:'✅', ja:'しょうにんする'      },
  { en:'negotiate',     emoji:'🤝', ja:'こうしょうする'      },
  { en:'proposal',      emoji:'💡', ja:'ていあん'            },
  { en:'solution',      emoji:'🔧', ja:'かいけつさく'        },
  { en:'efficient',     emoji:'⚡', ja:'こうりつてきな'      },
  { en:'professional',  emoji:'👔', ja:'プロフェッショナル'  },
  { en:'reliable',      emoji:'🛡️', ja:'しんらいできる'     },
  { en:'flexible',      emoji:'🌀', ja:'フレキシブルな'      },
  { en:'outstanding',   emoji:'🌟', ja:'すばらしい'          },
  { en:'opportunity',   emoji:'🚀', ja:'きかい'              },
  { en:'challenge',     emoji:'💪', ja:'ちょうせん'          },
  { en:'achievement',   emoji:'🏆', ja:'たっせい'            },
  { en:'responsibility',emoji:'⚖️', ja:'せきにん'           },
  { en:'cooperation',   emoji:'🤝', ja:'きょうりょく'        },
  { en:'negotiate',     emoji:'💬', ja:'ねごしえーとする'    },
  { en:'fluent',        emoji:'🗣️', ja:'りゅうちょうな'     },
  { en:'vocabulary',    emoji:'📚', ja:'ごい'                },
  { en:'pronunciation', emoji:'🔊', ja:'はつおん'            },
  { en:'grammar',       emoji:'✏️', ja:'ぶんぽう'           },
  { en:'translate',     emoji:'🌐', ja:'ほんやくする'        },
  { en:'interpret',     emoji:'🔁', ja:'つうやくする'        },
  { en:'fluency',       emoji:'💬', ja:'りゅうちょうさ'      },
];

const ALL_TIERS = [TIER1, TIER2, TIER3, TIER4];
const TIER_NAMES = ['超・基礎', '基礎', '初級', '中級'];

// ─────────────────────────────────────────────────────────────────
// Q&A データ — 3段階・合計 75 問以上
// ─────────────────────────────────────────────────────────────────
interface QAItem { question: string; answer: string; wrongs: [string, string]; hint?: string; }

// ── QA Tier 1 ── 入門（20 問）
const QA_T1: QAItem[] = [
  { question:'Hello!',                      answer:'Hi there!',                    wrongs:['Goodbye.','Thank you.'] },
  { question:"What's your name?",           answer:'My name is Tom.',              wrongs:['It is red.','Yes, it is.'] },
  { question:'How old are you?',            answer:'I am seven years old.',        wrongs:['I like dogs.','It is sunny.'] },
  { question:'Do you like cats?',           answer:'Yes, I love cats!',            wrongs:['No, I am a bird.','It is big.'] },
  { question:'What color is the sky?',      answer:'The sky is blue.',             wrongs:['It is a dog.','I am happy.'] },
  { question:'Goodbye!',                    answer:'Goodbye! See you later!',      wrongs:['I am hungry.','It is a cat.'] },
  { question:'Are you happy?',              answer:'Yes, I am very happy!',        wrongs:['No, it is blue.','I like trains.'] },
  { question:'Thank you!',                  answer:"You're welcome!",              wrongs:['It is cold.','I like fish.'] },
  { question:'What do you want?',           answer:'I want some water, please.',   wrongs:['I am a teacher.','The sun is big.'] },
  { question:'Is this your book?',          answer:'Yes, it is mine.',             wrongs:['No, I am cold.','The sky is red.'] },
  { question:'Where is the dog?',           answer:'The dog is over there.',       wrongs:['I like apples.','It is Monday.'] },
  { question:'Do you speak English?',       answer:'A little bit, yes.',           wrongs:['I eat rice.','The bird is small.'] },
  { question:'How are you?',                answer:"I'm doing great!",             wrongs:['The sun is hot.','I have a cat.'] },
  { question:"What's that?",                answer:"It's a book.",                 wrongs:['I am tired.','The door is open.'] },
  { question:'Can you help me?',            answer:'Of course! What do you need?', wrongs:['The sky is blue.','I am a student.'] },
  { question:'I am hungry.',                answer:"Let's get some food!",         wrongs:['The moon is big.','I like fish.'] },
  { question:'Is it raining?',              answer:'Yes, bring an umbrella.',      wrongs:['I am happy.','The car is fast.'] },
  { question:'What time is it?',            answer:"It's three o'clock.",          wrongs:['I have a dog.','The tree is tall.'] },
  { question:'See you tomorrow!',           answer:'See you! Have a good day!',    wrongs:['I am cold.','The sun is yellow.'] },
  { question:'Sorry!',                      answer:"No worries! It's okay.",       wrongs:['I like trains.','The water is cold.'] },
];

// ── QA Tier 2 ── 初級（25 問）
const QA_T2: QAItem[] = [
  { question:'How are you today?',          answer:'I am fine, thank you.',              wrongs:['I am a cat.','It is raining.'] },
  { question:"Where are you from?",         answer:'I am from Japan.',                   wrongs:['I like apples.','It is five o\'clock.'] },
  { question:'Nice to meet you!',           answer:'Nice to meet you too!',              wrongs:['I am going home.','Where is the bus?'] },
  { question:'How was your day?',           answer:'It was great, thank you!',           wrongs:['I have two cats.','Please turn left.'] },
  { question:'What do you do?',             answer:'I am a student.',                    wrongs:['I am hungry.','The sky is blue.'] },
  { question:'Do you like sushi?',          answer:'Yes! It is delicious!',              wrongs:['No, I am a bird.','It is Monday.'] },
  { question:'Can I have the menu?',        answer:"Sure, here you go!",                 wrongs:['The park is big.','I want a dog.'] },
  { question:"Where is the restroom?",      answer:"It's down the hall on the right.",   wrongs:['I like coffee.','The train is coming.'] },
  { question:'Is this seat taken?',         answer:'No, please go ahead.',               wrongs:['Yes, I am tired.','The menu is big.'] },
  { question:'What would you recommend?',   answer:"The ramen here is excellent!",       wrongs:['I am from Tokyo.','The bus is late.'] },
  { question:'How much is this?',           answer:"It's 1,500 yen.",                    wrongs:['I like sushi.','The train is fast.'] },
  { question:'Do you accept credit cards?', answer:"Yes, we do.",                        wrongs:['I want fish.','The park is lovely.'] },
  { question:'Can I have a bag, please?',   answer:"Of course, here you are.",           wrongs:['I am hungry.','The bus is slow.'] },
  { question:'I am looking for a pharmacy.',answer:"There's one just around the corner.",wrongs:['I want coffee.','The room is cold.'] },
  { question:'Is the museum open today?',   answer:"Yes, it opens at 9 AM.",             wrongs:['I need a taxi.','The train is big.'] },
  { question:'Can you repeat that, please?',answer:"Sure! I said, turn right.",          wrongs:['I am a student.','The sky is blue.'] },
  { question:'Do you have WiFi?',           answer:"Yes, the password is on the card.",  wrongs:['I want water.','The moon is full.'] },
  { question:'What is the Wi-Fi password?', answer:"It's printed on your key card.",     wrongs:['I like ramen.','The bus is here.'] },
  { question:"I'd like to order, please.",  answer:"Of course! What would you like?",    wrongs:['The station is far.','I am from Japan.'] },
  { question:'Can I change my order?',      answer:"No problem, what would you like?",   wrongs:['I am tired.','The park is near.'] },
  { question:'Is this spicy?',              answer:"It's a little spicy, yes.",          wrongs:['I like dogs.','The room is nice.'] },
  { question:'Do you have vegetarian options?', answer:"Yes, we have a few dishes.",     wrongs:['I need a key.','The elevator is here.'] },
  { question:'Could I get the check?',      answer:"Right away! Here's your bill.",      wrongs:['I like the view.','The station is busy.'] },
  { question:'Is service included?',        answer:"Yes, a 10% service charge applies.", wrongs:['I want tea.','The bus stop is nearby.'] },
  { question:'Where can I exchange money?', answer:"There's a currency exchange nearby.", wrongs:['I need a map.','The hotel is big.'] },
];

// ── QA Tier 3 ── 中級 / 実践（30 問）
const QA_T3: QAItem[] = [
  { question:'Welcome! How was your trip?',              answer:'It was great, thank you.',             wrongs:['My name is John.','I want to sleep.'],           hint:'ホテル' },
  { question:'May I have your name, please?',            answer:"Sure, I have a reservation.",          wrongs:['I like sushi.','The weather is nice.'],          hint:'ホテル' },
  { question:'How many nights will you be staying?',    answer:'I will be staying for two nights.',    wrongs:['I am very tired.','Yes, I like it.'],            hint:'ホテル' },
  { question:'What time is check-out?',                 answer:'Check-out is at 10 AM.',               wrongs:['I like coffee.','Yes, please.'],                 hint:'ホテル' },
  { question:'Is breakfast included?',                  answer:'Yes, served from 7 to 9 AM.',          wrongs:['The room is on the left.','I need a taxi.'],     hint:'ホテル' },
  { question:'Excuse me, where is the station?',        answer:"It's a five-minute walk.",             wrongs:['I like pizza.','The dog is sleeping.'],          hint:'道案内' },
  { question:'Can I pay by credit card?',               answer:'Yes, we accept all major cards.',      wrongs:['The park is lovely.','I am from Tokyo.'],        hint:'お会計' },
  { question:'What can I get you?',                     answer:"I'd like a latte, please.",            wrongs:['Where is the restroom?','The bus is coming.'],   hint:'カフェ' },
  { question:'Would you like that to go?',              answer:'To stay, please.',                     wrongs:['Yes, I am fine.','The bus is coming.'],          hint:'カフェ' },
  { question:'Did you enjoy your stay?',                answer:'It was absolutely wonderful!',         wrongs:['I need a new phone.','The train is fast.'],      hint:'ホテル' },
  { question:'Do you have any allergies?',              answer:"Yes, I'm allergic to shellfish.",      wrongs:['I want the window seat.','The menu is big.'],    hint:'レストラン' },
  { question:'How would you like your steak?',          answer:"Medium rare, please.",                 wrongs:['I want dessert.','The bill is ready.'],          hint:'レストラン' },
  { question:'I seem to have missed my flight.',        answer:'Let me check the next available one.', wrongs:['I need coffee.','My luggage is lost.'],          hint:'空港' },
  { question:'Where can I pick up my luggage?',         answer:"At baggage claim, level one.",         wrongs:['I need a taxi.','The gate is closed.'],          hint:'空港' },
  { question:'Do I need to declare anything?',          answer:'Just this camera and some gifts.',     wrongs:['I want a window seat.','The hotel is full.'],    hint:'税関' },
  { question:'Could you recommend a local dish?',       answer:"Try the yakitori — it's fantastic!",  wrongs:['I want a map.','The bus stops here.'],           hint:'観光' },
  { question:'Is there a tour guide available?',        answer:'Yes, tours start every hour.',         wrongs:['I have a reservation.','The park is closed.'],   hint:'観光' },
  { question:"I'd like to report a lost item.",         answer:'Please fill out this form for us.',    wrongs:['I want to check in.','The menu is in English.'], hint:'ホテル' },
  { question:'Can I get a late check-out?',             answer:'Yes, until noon for an extra charge.', wrongs:['I need the WiFi password.','The restaurant is open.'], hint:'ホテル' },
  { question:'The air conditioning is not working.',    answer:"I'll send maintenance right away.",    wrongs:['I want more towels.','The elevator is slow.'],   hint:'ホテル' },
  { question:'Could I have some extra towels?',         answer:"Of course, I'll bring them shortly.",  wrongs:['I want to cancel.','The room is cold.'],         hint:'ホテル' },
  { question:'I have a meeting at 9 AM tomorrow.',      answer:'Shall I arrange a wake-up call?',      wrongs:['I need a taxi tonight.','The pool is open.'],    hint:'ホテル' },
  { question:'Where is the nearest convenience store?', answer:"Just two minutes on foot, to the left.",wrongs:['I like sushi.','The park is quiet.'],          hint:'道案内' },
  { question:'How long does it take by subway?',        answer:"About 20 minutes to the city center.", wrongs:['I want a window seat.','The taxi is expensive.'],hint:'交通' },
  { question:'Is the last train at midnight?',          answer:"Yes, the last one is at 12:15 AM.",    wrongs:['I need a map.','The hotel is nearby.'],          hint:'交通' },
  { question:'Can you make a reservation for two?',     answer:"Certainly! What time suits you?",      wrongs:['I want dessert.','The concert is sold out.'],   hint:'レストラン' },
  { question:'I have a complaint about the noise.',     answer:'I sincerely apologize for that.',      wrongs:['I want a new room.','The lobby is noisy.'],      hint:'ホテル' },
  { question:"What's today's special?",                 answer:"Grilled salmon with lemon butter.",    wrongs:['I want the check.','The dessert is sweet.'],     hint:'レストラン' },
  { question:'Do you have a non-smoking room?',         answer:"Yes, all our rooms are non-smoking.",  wrongs:['I need a key.','The breakfast starts at 7.'],   hint:'ホテル' },
  { question:"Is there a dress code?",                  answer:"Smart casual is recommended.",         wrongs:['I want a table for four.','The bar is downstairs.'], hint:'レストラン' },
];

// ─────────────────────────────────────────────────────────────────
// 称賛メッセージ
// ─────────────────────────────────────────────────────────────────
const PRAISES = [
  { text:'Excellent! 🌟', speech:'Excellent!' },
  { text:'Great! 🎉',     speech:'Great!'     },
  { text:'Perfect! ✨',   speech:'Perfect!'   },
  { text:'Amazing! 🔥',   speech:'Amazing!'   },
  { text:'Super! 👏',     speech:'Super!'     },
  { text:'Wonderful! 🎊', speech:'Wonderful!' },
  { text:'Nice! 💪',      speech:'Nice!'      },
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
// 習得マップからアクティブプールを計算
// ─────────────────────────────────────────────────────────────────
function getActivePool(masteryMap: Record<string, number>): { pool: Word[]; tierIdx: number } {
  let tierIdx = 0;
  const pool: Word[] = [...TIER1];

  for (let t = 0; t < ALL_TIERS.length - 1; t++) {
    const allMastered = ALL_TIERS[t].every(w => (masteryMap[w.en] ?? 0) >= MASTERY_THRESHOLD);
    if (allMastered) {
      pool.push(...ALL_TIERS[t + 1]);
      tierIdx = t + 1;
    } else {
      break;
    }
  }
  return { pool, tierIdx };
}

function countMastered(masteryMap: Record<string, number>, pool: Word[]): number {
  return pool.filter(w => (masteryMap[w.en] ?? 0) >= MASTERY_THRESHOLD).length;
}

// ─────────────────────────────────────────────────────────────────
// 山札（Deck）管理
// ─────────────────────────────────────────────────────────────────
// deckRef が空になったら pool をシャッフルして補充 → pop() で 1 枚引く
function drawFromDeck<T>(deckRef: React.MutableRefObject<T[]>, pool: T[]): T {
  if (deckRef.current.length === 0) {
    deckRef.current = shuffle([...pool]);
  }
  // pop() は末尾から取り出す（シャッフル済みなので順序保証は不要）
  return deckRef.current.pop() as T;
}

// ─────────────────────────────────────────────────────────────────
// 3択クイズ構築（重複バグ防止：ダミーの ja が correct.ja と一致しないことを保証）
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
// BasicWordsMode（単語 3 択・山札方式）
// ─────────────────────────────────────────────────────────────────
function BasicWordsMode({ onCorrect }: { onCorrect: () => void }) {
  const [masteryMap, setMasteryMap] = useState<Record<string, number>>({});
  const [quiz,       setQuiz]       = useState<WordQuiz | null>(null);
  const [result,     setResult]     = useState<'correct' | 'wrong' | null>(null);
  const [locked,     setLocked]     = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [showText,   setShowText]   = useState(false);
  const [hydrated,   setHydrated]   = useState(false);
  const deckRef = useRef<Word[]>([]); // 山札

  // localStorage からロード
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_WORDS);
      if (raw) setMasteryMap(JSON.parse(raw));
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // 最初の1問
  useEffect(() => {
    if (!hydrated) return;
    const { pool } = getActivePool(masteryMap);
    const card = drawFromDeck(deckRef, pool);
    setQuiz(buildWordQuiz(card, pool));
  }, [hydrated]); // eslint-disable-line

  const playWord = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speakText(quiz.correct.en, () => setSpeaking(false));
  }, [quiz]);

  useEffect(() => {
    if (quiz) { setShowText(false); playWord(); }
  }, [quiz?.correct.en]); // eslint-disable-line

  const next = useCallback((currentMastery?: Record<string, number>) => {
    const mastery = currentMastery ?? masteryMap;
    const { pool } = getActivePool(mastery);
    // 山札のプールが切り替わった場合はリセット
    if (deckRef.current.length > 0 && !pool.some(w => w.en === deckRef.current[0]?.en)) {
      deckRef.current = [];
    }
    const card = drawFromDeck(deckRef, pool);
    setQuiz(buildWordQuiz(card, pool));
    setResult(null); setLocked(false);
  }, [masteryMap]);

  const handleTap = (ja: string) => {
    if (locked || !quiz) return;
    if (ja === quiz.correct.ja) {
      setResult('correct'); setLocked(true);
      const updated = { ...masteryMap, [quiz.correct.en]: (masteryMap[quiz.correct.en] ?? 0) + 1 };
      setMasteryMap(updated);
      try { localStorage.setItem(LS_WORDS, JSON.stringify(updated)); } catch { /* ignore */ }
      onCorrect();
      setTimeout(() => next(updated), CORRECT_DELAY);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  if (!hydrated || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const { pool, tierIdx } = getActivePool(masteryMap);
  const mastered = countMastered(masteryMap, pool);
  // 残り枚数（山札）
  const remaining = deckRef.current.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ティア進捗 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-indigo-600">
          📖 {TIER_NAMES[tierIdx]} — 習得 {mastered}/{pool.length}語
        </span>
        <div className="flex-1 mx-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${pool.length ? (mastered / pool.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-400">残{remaining}枚</span>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">日本語の意味はどれ？</p>

        <button onClick={playWord}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-blue-400 text-white animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}>
          <span className="text-2xl">🔊</span>
          <span className="text-sm">{speaking ? '再生中…' : 'もう一度聴く'}</span>
        </button>

        <button onClick={() => setShowText(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
            showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}>
          {showText ? '🙈 かくす' : '👁️ テキストを見る'}
        </button>

        {showText && (
          <div className="px-5 py-2 bg-amber-50 border border-amber-200 rounded-xl text-center">
            <p className="text-2xl font-black text-amber-800">{quiz.correct.emoji}</p>
            <p className="text-xl font-black text-amber-700 mt-1">{quiz.correct.en}</p>
          </div>
        )}

        {result === 'wrong' && (
          <p className="text-gray-500 font-bold text-sm">Try again 💪</p>
        )}
      </div>

      {/* 3択ボタン */}
      <div className="flex flex-col gap-3">
        {quiz.choices.map((ja, idx) => (
          <button key={idx}
            onPointerDown={() => handleTap(ja)}
            disabled={locked}
            className={`w-full px-5 py-4 rounded-2xl text-center font-black text-lg border transition-all active:scale-[0.98] shadow-sm select-none ${
              result === 'correct' && ja === quiz.correct.ja
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                : locked
                ? 'bg-gray-100 border-gray-200 text-gray-400'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-blue-50 hover:border-blue-300'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
            {ja}
          </button>
        ))}
      </div>

      <button onClick={() => next()}
        className="w-full py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-sm transition-all">
        スキップ →
      </button>

      {tierIdx < ALL_TIERS.length - 1 && (() => {
        const needed = ALL_TIERS[tierIdx].filter(w => (masteryMap[w.en] ?? 0) < MASTERY_THRESHOLD).length;
        return needed > 0 ? (
          <p className="text-center text-[10px] text-gray-400">
            あと {needed} 語習得で「{TIER_NAMES[tierIdx + 1]}」解放！
          </p>
        ) : null;
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// QAModeSimple（会話 Q&A 3択・山札方式）
// ─────────────────────────────────────────────────────────────────
function QAModeSimple({ onCorrect }: { onCorrect: () => void }) {
  const [qaCorrect,  setQaCorrect]  = useState(0);
  const [quiz,       setQuiz]       = useState<QAQuiz | null>(null);
  const [result,     setResult]     = useState<'correct' | 'wrong' | null>(null);
  const [locked,     setLocked]     = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [showText,   setShowText]   = useState(false);
  const [hydrated,   setHydrated]   = useState(false);
  const deckRef = useRef<QAItem[]>([]); // 山札

  function getQAPool(correct: number): QAItem[] {
    if (correct < 20) return QA_T1;
    if (correct < 60) return [...QA_T1, ...QA_T2];
    return [...QA_T1, ...QA_T2, ...QA_T3];
  }
  function qaTierLabel(n: number) {
    if (n < 20) return '入門';
    if (n < 60) return '初級';
    return '中級';
  }
  function nextThreshold(n: number) {
    if (n < 20) return 20;
    if (n < 60) return 60;
    return null;
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_QA);
      const n   = raw ? (JSON.parse(raw).correct ?? 0) : 0;
      setQaCorrect(n);
      const item = drawFromDeck(deckRef, getQAPool(n));
      setQuiz(buildQAQuiz(item));
    } catch {
      const item = drawFromDeck(deckRef, QA_T1);
      setQuiz(buildQAQuiz(item));
    }
    setHydrated(true);
  }, []);

  const playQuestion = useCallback(() => {
    if (!quiz) return;
    setSpeaking(true);
    speakText(quiz.question, () => setSpeaking(false), 0.84);
  }, [quiz]);

  useEffect(() => {
    if (quiz) { setResult(null); setLocked(false); setShowText(false); playQuestion(); }
  }, [quiz?.question]); // eslint-disable-line

  const next = useCallback((currentCorrect?: number) => {
    const n = currentCorrect ?? qaCorrect;
    const pool = getQAPool(n);
    // ティアが変わったら山札リセット
    if (deckRef.current.length > 0 && !pool.some(q => q.question === deckRef.current[0]?.question)) {
      deckRef.current = [];
    }
    const item = drawFromDeck(deckRef, pool);
    setQuiz(buildQAQuiz(item));
  }, [qaCorrect]);

  const handleTap = (choice: string) => {
    if (locked || !quiz) return;
    if (choice === quiz.answer) {
      setResult('correct'); setLocked(true);
      const next_n = qaCorrect + 1;
      setQaCorrect(next_n);
      try { localStorage.setItem(LS_QA, JSON.stringify({ correct: next_n })); } catch { /* ignore */ }
      onCorrect();
      setTimeout(() => next(next_n), CORRECT_DELAY);
    } else {
      setResult('wrong');
      setTimeout(() => setResult(null), 700);
    }
  };

  if (!hydrated || !quiz) return (
    <div className="flex items-center justify-center py-12 text-gray-400 text-sm">Loading…</div>
  );

  const threshold = nextThreshold(qaCorrect);
  const remaining = deckRef.current.length;

  return (
    <div className="flex flex-col gap-4">
      {/* ティア表示 */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-teal-600">
          💬 会話 ({qaTierLabel(qaCorrect)}) — 正解 {qaCorrect} 問
        </span>
        <span className="text-[10px] text-gray-400">
          {threshold ? `あと ${threshold - qaCorrect} 問で次のステージ` : `残${remaining}枚`}
        </span>
      </div>

      {/* 問題カード */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex flex-col items-center gap-3">
        <p className="text-[11px] text-gray-400 font-semibold tracking-wide uppercase">正しい返答を選んでね</p>
        {quiz.hint && (
          <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
            {quiz.hint}
          </span>
        )}

        <button onClick={playQuestion}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-base transition-all active:scale-95 ${
            speaking ? 'bg-teal-400 text-white animate-pulse' : 'bg-teal-600 hover:bg-teal-700 text-white'
          }`}>
          <span className="text-2xl">🔊</span>
          <span className="text-sm">{speaking ? '再生中…' : 'もう一度聴く'}</span>
        </button>

        <button onClick={() => setShowText(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
            showText ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-gray-100 border-gray-200 text-gray-500'
          }`}>
          {showText ? '🙈 かくす' : '👁️ 英文を見る'}
        </button>

        {showText && (
          <div className="w-full px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800 text-center leading-relaxed">{quiz.question}</p>
          </div>
        )}

        {result === 'wrong' && (
          <p className="text-gray-500 font-bold text-sm">Try again 💪</p>
        )}
      </div>

      {/* 3択ボタン */}
      <div className="flex flex-col gap-2.5">
        {quiz.choices.map((choice, idx) => (
          <button key={idx}
            onPointerDown={() => handleTap(choice)}
            disabled={locked}
            className={`w-full px-4 py-3.5 rounded-2xl text-left font-semibold text-sm leading-snug border transition-all active:scale-[0.98] shadow-sm select-none ${
              result === 'correct' && choice === quiz.answer
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800 scale-[1.02]'
                : locked
                ? 'bg-gray-100 border-gray-200 text-gray-400'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-teal-50 hover:border-teal-300'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'none' }}>
            <span className="text-gray-400 font-black mr-2">{['A', 'B', 'C'][idx]}.</span>
            {choice}
          </button>
        ))}
      </div>

      <button onClick={() => next()}
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
          ['words', '📝', '単語3択',  'Basic Words'],
          ['qa',    '💬', '会話Q&A',  'Conversation'],
        ] as [ImMode, string, string, string][]).map(([m, icon, label, sub]) => (
          <button key={m} onClick={() => switchMode(m)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
              mode === m
                ? m === 'words' ? 'bg-blue-600 text-white shadow-md' : 'bg-teal-600 text-white shadow-md'
                : 'text-gray-500 hover:text-gray-700'
            }`}>
            <span className="block">{icon} {label}</span>
            <span className={`block text-[9px] mt-0.5 ${mode === m ? 'text-white/70' : 'text-gray-400'}`}>{sub}</span>
          </button>
        ))}
      </div>

      {mode === 'words'
        ? <BasicWordsMode onCorrect={celebrate} />
        : <QAModeSimple   onCorrect={celebrate} />
      }

      {/* 「Excellent!」ポップアップ */}
      {showCeleb && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div
            className="bg-yellow-400 text-white font-black px-10 py-6 rounded-3xl shadow-2xl animate-bounce"
            style={{ fontSize: 'clamp(1.8rem, 8vw, 2.8rem)' }}
          >
            {celebText}
          </div>
        </div>
      )}
    </div>
  );
}
