'use client';

import { useState, useEffect, useCallback } from 'react';

// ── 型定義 ──────────────────────────────────────────────────────
interface QuizOption {
  text:    string;   // 英文
  trans:   string;   // 日本語訳
  correct: boolean;
}
interface Exchange {
  aiLine:  string;  // AIの英文セリフ
  aiTrans: string;  // 日本語訳
  options: QuizOption[];
}
interface Scenario {
  id:        string;
  title:     string;
  situation: string;
  emoji:     string;
  exchanges: Exchange[];
}

// ── スパルタあおりメッセージ（基礎徹底） ─────────────────────────
const TAUNT_MSGS = [
  'そんな基礎英語でつまずいてどうする！中学英語から叩き直せ！',
  'A1レベルの英語も怪しいぞ！基礎こそが最強の武器だ！やり直せ！',
  '海外に出る前に基本フレーズを完璧にしろ！もう一度考えて答えろ！',
  'こんな基礎的な表現を間違えていては話にならない！しっかり覚えて出直せ！',
  '旅行英語の基本だぞ！正しい文を選ぶまで何度でもやり直しだ！',
];

// ── 12シナリオ × 10往復（初級〜中級 CEFR A1-B1） ─────────────────
const SCENARIOS: Scenario[] = [

  // ─────────────────────────────────────────────────────────────
  // 1. ☕ Coffee Shop
  // ─────────────────────────────────────────────────────────────
  {
    id: 'coffee', title: 'Coffee Shop Order', situation: 'アメリカのカフェでコーヒーを注文する', emoji: '☕',
    exchanges: [
      { aiLine: "Hi! What can I get for you today?", aiTrans: "いらっしゃいませ！ご注文はお決まりですか？",
        options: [
          { text: "I'd like a latte, please.",     trans: "ラテをひとつお願いします。",       correct: true  },
          { text: "I want latte, please.",          trans: "ラテが欲しいです。",               correct: false },
          { text: "Give me a latte.",               trans: "ラテをくれ。",                    correct: false },
        ]},
      { aiLine: "Hot or iced?", aiTrans: "ホットにしますか？アイスにしますか？",
        options: [
          { text: "Hot, please.",                  trans: "ホットでお願いします。",           correct: true  },
          { text: "I want it hot.",                trans: "ホットにしたいです。",             correct: false },
          { text: "Please hot.",                   trans: "ホットにしてください。",           correct: false },
        ]},
      { aiLine: "What size? Small, medium, or large?", aiTrans: "サイズはスモール・ミディアム・ラージのどれですか？",
        options: [
          { text: "A medium, please.",             trans: "ミディアムをお願いします。",       correct: true  },
          { text: "Medium, please.",               trans: "ミディアムをください。",           correct: false },
          { text: "I choose medium size.",         trans: "ミディアムサイズを選びます。",     correct: false },
        ]},
      { aiLine: "Anything to eat with that?", aiTrans: "何か食べ物もご一緒にいかがですか？",
        options: [
          { text: "No, thank you. Just the drink.", trans: "いいえ、結構です。飲み物だけで。", correct: true },
          { text: "No, I don't want food.",        trans: "いいえ、食べ物は要りません。",     correct: false },
          { text: "Only drink is OK.",             trans: "飲み物だけで大丈夫です。",         correct: false },
        ]},
      { aiLine: "Can I get a name for the order?", aiTrans: "お名前をいただけますか？",
        options: [
          { text: "It's Yuki!",                   trans: "ユキです！",                       correct: true  },
          { text: "My name is Yuki.",              trans: "私の名前はユキです。",             correct: false },
          { text: "I am called Yuki.",             trans: "私はユキと呼ばれています。",       correct: false },
        ]},
      { aiLine: "That'll be $5.50. Cash or card?", aiTrans: "5ドル50セントです。現金ですかカードですか？",
        options: [
          { text: "Card, please.",                 trans: "カードでお願いします。",           correct: true  },
          { text: "I pay by card.",                trans: "カードで払います。",               correct: false },
          { text: "I will use card.",              trans: "カードを使います。",               correct: false },
        ]},
      { aiLine: "Just tap your card here.", aiTrans: "カードをこちらにタップしてください。",
        options: [
          { text: "Sure! All done.",               trans: "はい！できました。",               correct: true  },
          { text: "OK, I tap it now.",             trans: "はい、今タップします。",           correct: false },
          { text: "I am tapping now.",             trans: "今タップしています。",             correct: false },
        ]},
      { aiLine: "Your order will be ready in about 3 minutes.", aiTrans: "ご注文は約3分でできます。",
        options: [
          { text: "No problem. I'll wait here.",   trans: "大丈夫です。ここで待ちます。",     correct: true  },
          { text: "OK, I wait here.",              trans: "はい、ここで待ちます。",           correct: false },
          { text: "3 minutes, I am waiting.",      trans: "3分、待っています。",             correct: false },
        ]},
      { aiLine: "Yuki! Your latte is ready!", aiTrans: "ユキさん！ラテができました！",
        options: [
          { text: "That's me! Thank you so much.", trans: "はい私です！ありがとうございます！", correct: true },
          { text: "Yes, this is for me.",          trans: "はい、これは私のものです。",       correct: false },
          { text: "I am Yuki. Give me please.",    trans: "ユキです。ください。",             correct: false },
        ]},
      { aiLine: "Enjoy your drink! Have a great day!", aiTrans: "お飲み物をお楽しみください！良い一日を！",
        options: [
          { text: "Thanks! You too!",              trans: "ありがとう！あなたも！",           correct: true  },
          { text: "Thank you very much.",          trans: "どうもありがとうございます。",     correct: false },
          { text: "Yes, same to you also.",        trans: "はい、あなたも同じく。",           correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. ✈️ Airport Check-in
  // ─────────────────────────────────────────────────────────────
  {
    id: 'airport', title: 'Airport Check-in', situation: '空港でフライトのチェックインをする', emoji: '✈️',
    exchanges: [
      { aiLine: "Good morning! Where are you flying today?", aiTrans: "おはようございます！本日はどちらへ？",
        options: [
          { text: "I'm flying to Tokyo.",          trans: "東京に飛びます。",                 correct: true  },
          { text: "I go to Tokyo.",                trans: "東京に行きます。",                 correct: false },
          { text: "Tokyo is my destination.",      trans: "東京が目的地です。",               correct: false },
        ]},
      { aiLine: "Can I see your passport, please?", aiTrans: "パスポートを見せていただけますか？",
        options: [
          { text: "Of course. Here you go.",       trans: "もちろんです。どうぞ。",           correct: true  },
          { text: "Yes, I have my passport.",      trans: "はい、パスポートを持っています。", correct: false },
          { text: "Please look my passport.",      trans: "私のパスポートを見てください。",   correct: false },
        ]},
      { aiLine: "Are you checking any bags today?", aiTrans: "本日お荷物はお預けになりますか？",
        options: [
          { text: "Yes, just one bag.",            trans: "はい、スーツケース一つだけです。", correct: true  },
          { text: "Yes, I have one bag.",          trans: "はい、バッグが一つあります。",     correct: false },
          { text: "My bags are one.",              trans: "バッグは一つです。",               correct: false },
        ]},
      { aiLine: "Did you pack this bag yourself?", aiTrans: "このバッグはご自分で荷造りされましたか？",
        options: [
          { text: "Yes, I packed it myself.",      trans: "はい、自分で荷造りしました。",     correct: true  },
          { text: "Yes, I pack it.",               trans: "はい、荷造りします。",             correct: false },
          { text: "Yes, I am packed it.",          trans: "はい、荷造りしています。",         correct: false },
        ]},
      { aiLine: "Window or aisle seat?", aiTrans: "窓側と通路側どちらがよろしいですか？",
        options: [
          { text: "A window seat, please.",        trans: "窓側の席をお願いします。",         correct: true  },
          { text: "I want window side.",           trans: "窓側が欲しいです。",               correct: false },
          { text: "Window is my choice.",          trans: "窓が私の選択です。",               correct: false },
        ]},
      { aiLine: "Your gate is B12. Boarding starts at 10:45.", aiTrans: "ゲートはB12です。搭乗は10時45分からです。",
        options: [
          { text: "Got it. Thank you!",            trans: "わかりました。ありがとうございます！", correct: true },
          { text: "I understand, gate B12.",       trans: "わかりました、ゲートB12。",         correct: false },
          { text: "OK I go to gate now.",          trans: "はい、今ゲートに行きます。",       correct: false },
        ]},
      { aiLine: "Your bag is 2 kilos over. There's a $30 fee.", aiTrans: "バッグが2キロ超過です。30ドルの料金がかかります。",
        options: [
          { text: "OK. I'll pay by card, please.", trans: "わかりました。カードで払います。", correct: true  },
          { text: "OK, card payment.",             trans: "はい、カード支払いで。",           correct: false },
          { text: "I use card for pay.",           trans: "支払いにカードを使います。",       correct: false },
        ]},
      { aiLine: "Is this your first time flying internationally?", aiTrans: "国際線のフライトは初めてですか？",
        options: [
          { text: "No, I fly a few times a year.", trans: "いいえ、年に数回飛んでいます。",   correct: true  },
          { text: "No, I fly some times in year.", trans: "いいえ、年に数回飛びます。",       correct: false },
          { text: "No, I am flying often.",        trans: "いいえ、よく飛んでいます。",       correct: false },
        ]},
      { aiLine: "Here's your boarding pass. Have everything?", aiTrans: "搭乗券です。お忘れ物はありませんか？",
        options: [
          { text: "Yes, I think so. Thank you!",   trans: "はい、大丈夫だと思います。ありがとう！", correct: true },
          { text: "Yes, I have all things.",       trans: "はい、全部持っています。",         correct: false },
          { text: "Yes, everything is there.",     trans: "はい、全部ありますね。",           correct: false },
        ]},
      { aiLine: "Enjoy your flight! Safe travels!", aiTrans: "フライトをお楽しみください！良いご旅行を！",
        options: [
          { text: "Thank you! Have a great day!",  trans: "ありがとうございます！良い一日を！", correct: true },
          { text: "Thank you. Bye bye.",           trans: "ありがとう。さようなら。",         correct: false },
          { text: "Yes, goodbye for now.",         trans: "はい、今のところさようなら。",     correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. 🏨 Hotel Check-in
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hotel', title: 'Hotel Check-in', situation: 'アメリカのホテルでチェックインする', emoji: '🏨',
    exchanges: [
      { aiLine: "Welcome! Do you have a reservation?", aiTrans: "いらっしゃいませ！ご予約はございますか？",
        options: [
          { text: "Yes, I do. My name is Yuki.",   trans: "はい、あります。ユキと申します。", correct: true  },
          { text: "Yes, I have reservation.",      trans: "はい、予約があります。",           correct: false },
          { text: "Yes, I reserved room.",         trans: "はい、部屋を予約しました。",       correct: false },
        ]},
      { aiLine: "Can I have your ID, please?", aiTrans: "身分証明書を見せていただけますか？",
        options: [
          { text: "Sure, here you are.",           trans: "もちろんです。どうぞ。",           correct: true  },
          { text: "Yes, I have my ID.",            trans: "はい、IDを持っています。",         correct: false },
          { text: "Please see my ID card.",        trans: "私のIDを見てください。",           correct: false },
        ]},
      { aiLine: "How many nights are you staying?", aiTrans: "何泊のご予定ですか？",
        options: [
          { text: "Three nights, please.",         trans: "3泊お願いします。",               correct: true  },
          { text: "I stay three nights.",          trans: "3泊します。",                     correct: false },
          { text: "My stay is three night.",       trans: "私の滞在は3泊です。",             correct: false },
        ]},
      { aiLine: "I have a double room for you on the 5th floor.", aiTrans: "5階のダブルルームをご用意しています。",
        options: [
          { text: "That sounds perfect. Thank you!", trans: "完璧ですね。ありがとうございます！", correct: true },
          { text: "OK, 5th floor is good.",        trans: "はい、5階で大丈夫です。",         correct: false },
          { text: "Yes, I take that room.",        trans: "はい、その部屋にします。",         correct: false },
        ]},
      { aiLine: "Would you like a non-smoking room?", aiTrans: "禁煙室がよろしいですか？",
        options: [
          { text: "Yes, please. Non-smoking is great.", trans: "はい、お願いします。禁煙がいいです。", correct: true },
          { text: "Yes, I don't smoke.",           trans: "はい、タバコを吸いません。",       correct: false },
          { text: "Non-smoking please for me.",    trans: "私のために禁煙室をお願いします。", correct: false },
        ]},
      { aiLine: "Breakfast is served from 7 to 10 AM in the restaurant.", aiTrans: "朝食はレストランで7時から10時まで提供しています。",
        options: [
          { text: "Good to know. Is it included?", trans: "わかりました。朝食は含まれていますか？", correct: true },
          { text: "OK, 7 to 10. I understand.",    trans: "はい、7時から10時。わかりました。", correct: false },
          { text: "I eat breakfast at 8.",         trans: "朝食は8時に食べます。",           correct: false },
        ]},
      { aiLine: "There's free Wi-Fi. The password is on your key card.", aiTrans: "無料Wi-Fiがあります。パスワードはキーカードに書いてあります。",
        options: [
          { text: "Great, thank you for letting me know!", trans: "ありがとうございます！教えていただいて助かります！", correct: true },
          { text: "OK, I understand the Wi-Fi.",   trans: "はい、Wi-Fiを理解しました。",     correct: false },
          { text: "Good. I need the internet.",    trans: "良いです。インターネットが必要です。", correct: false },
        ]},
      { aiLine: "Do you need help with your luggage?", aiTrans: "お荷物のお手伝いはご必要ですか？",
        options: [
          { text: "No, thank you. I can manage.",  trans: "いいえ、結構です。自分で大丈夫です。", correct: true },
          { text: "No, I am fine.",                trans: "いいえ、大丈夫です。",             correct: false },
          { text: "No, I carry by myself.",        trans: "いいえ、自分で運びます。",         correct: false },
        ]},
      { aiLine: "Check-out is at 11 AM. Is that OK?", aiTrans: "チェックアウトは午前11時です。よろしいですか？",
        options: [
          { text: "That's fine. Thank you.",       trans: "大丈夫です。ありがとうございます。", correct: true },
          { text: "11 AM is OK.",                  trans: "11時で大丈夫です。",               correct: false },
          { text: "I check out at 11.",            trans: "11時にチェックアウトします。",     correct: false },
        ]},
      { aiLine: "Here's your key card. Enjoy your stay!", aiTrans: "こちらがキーカードです。ごゆっくりお過ごしください！",
        options: [
          { text: "Thank you! I'm sure I will.",   trans: "ありがとうございます！楽しみます！", correct: true },
          { text: "Thank you. Goodbye.",           trans: "ありがとう。さようなら。",         correct: false },
          { text: "Yes, I enjoy my room.",         trans: "はい、部屋を楽しみます。",         correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. 🍽️ Restaurant
  // ─────────────────────────────────────────────────────────────
  {
    id: 'restaurant', title: 'Restaurant Dining', situation: 'アメリカのレストランで夕食を食べる', emoji: '🍽️',
    exchanges: [
      { aiLine: "Good evening! Do you have a reservation?", aiTrans: "こんばんは！ご予約はございますか？",
        options: [
          { text: "Yes, for two people. My name is Yuki.", trans: "はい、2人です。ユキと申します。", correct: true },
          { text: "Yes, two peoples.",             trans: "はい、2人です。",                 correct: false },
          { text: "Yes, I reserved for 2 person.", trans: "はい、2人で予約しました。",       correct: false },
        ]},
      { aiLine: "Can I get you something to drink?", aiTrans: "お飲み物はいかがですか？",
        options: [
          { text: "Water for me, please.",         trans: "お水をお願いします。",             correct: true  },
          { text: "I want water.",                 trans: "水が欲しいです。",                 correct: false },
          { text: "Please bring water.",           trans: "水を持ってきてください。",         correct: false },
        ]},
      { aiLine: "Are you ready to order?", aiTrans: "ご注文はお決まりですか？",
        options: [
          { text: "Yes! I'd like the pasta, please.", trans: "はい！パスタをお願いします。", correct: true  },
          { text: "Yes, I want pasta.",            trans: "はい、パスタが欲しいです。",       correct: false },
          { text: "I order pasta.",                trans: "パスタを注文します。",             correct: false },
        ]},
      { aiLine: "How would you like your steak? Rare, medium, or well-done?", aiTrans: "ステーキの焼き加減はいかがですか？レア・ミディアム・ウェルダン？",
        options: [
          { text: "Medium, please.",               trans: "ミディアムでお願いします。",       correct: true  },
          { text: "I want medium steak.",          trans: "ミディアムのステーキが欲しいです。", correct: false },
          { text: "Please cook medium for me.",    trans: "ミディアムで焼いてください。",     correct: false },
        ]},
      { aiLine: "Do you have any food allergies?", aiTrans: "食物アレルギーはございますか？",
        options: [
          { text: "No, I don't. I can eat everything.", trans: "いいえ、ありません。何でも食べられます。", correct: true },
          { text: "No, I have no allergy.",        trans: "いいえ、アレルギーはないです。",   correct: false },
          { text: "I don't have food problem.",    trans: "食べ物の問題はありません。",       correct: false },
        ]},
      { aiLine: "How is everything? Is the food OK?", aiTrans: "いかがですか？お食事はよろしいですか？",
        options: [
          { text: "It's delicious! I love it.",   trans: "最高においしいです！大好きです！", correct: true  },
          { text: "Very delicious. I like it.",   trans: "とても美味しいです。好きです。",   correct: false },
          { text: "Food is very good taste.",     trans: "食べ物がとても良い味です。",       correct: false },
        ]},
      { aiLine: "Would you like some dessert?", aiTrans: "デザートはいかがですか？",
        options: [
          { text: "Yes, please! What do you recommend?", trans: "はい、お願いします！おすすめは何ですか？", correct: true },
          { text: "Yes, I want dessert.",         trans: "はい、デザートが欲しいです。",     correct: false },
          { text: "Yes. What desserts do you have?", trans: "はい。どんなデザートがありますか？", correct: false },
        ]},
      { aiLine: "Our chocolate cake is very popular.", aiTrans: "チョコレートケーキがとても人気です。",
        options: [
          { text: "That sounds great. I'll have that!", trans: "それは良さそう！それにします！", correct: true },
          { text: "OK, chocolate cake please.",   trans: "はい、チョコレートケーキをください。", correct: false },
          { text: "I take chocolate cake.",       trans: "チョコレートケーキにします。",     correct: false },
        ]},
      { aiLine: "Can I bring you the check?", aiTrans: "お会計をお持ちしましょうか？",
        options: [
          { text: "Yes, please. Can we split it?", trans: "はい、お願いします。割り勘にできますか？", correct: true },
          { text: "Yes please. We pay separately.", trans: "はい。別々に払います。",         correct: false },
          { text: "Yes. We each pay own money.",   trans: "はい。それぞれ自分で払います。",  correct: false },
        ]},
      { aiLine: "Thank you for coming. Have a great night!", aiTrans: "ご来店ありがとうございました。良い夜を！",
        options: [
          { text: "Thank you! The food was wonderful.", trans: "ありがとうございます！料理が最高でした！", correct: true },
          { text: "Thank you. Food was good.",    trans: "ありがとう。食べ物は良かった。",   correct: false },
          { text: "Yes, very thanks. Good food.", trans: "はい、大変ありがとう。良い食べ物。", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 5. 🛒 Shopping
  // ─────────────────────────────────────────────────────────────
  {
    id: 'shopping', title: 'Clothes Shopping', situation: 'アメリカのショップで服を買う', emoji: '🛒',
    exchanges: [
      { aiLine: "Hi! Can I help you find something today?", aiTrans: "いらっしゃいませ！何かお探しですか？",
        options: [
          { text: "Yes! I'm looking for a T-shirt.", trans: "はい！Tシャツを探しています。",  correct: true  },
          { text: "Yes, I look for T-shirt.",       trans: "はい、Tシャツを探します。",       correct: false },
          { text: "Yes. I want to buy T-shirt.",    trans: "はい。Tシャツを買いたいです。",   correct: false },
        ]},
      { aiLine: "What size are you looking for?", aiTrans: "サイズは何をお探しですか？",
        options: [
          { text: "I'm a medium, I think.",         trans: "たぶんミディアムだと思います。",   correct: true  },
          { text: "I am size medium.",              trans: "私はサイズミディアムです。",       correct: false },
          { text: "My size is medium usually.",     trans: "私のサイズはたいていミディアムです。", correct: false },
        ]},
      { aiLine: "We have this one in blue, black, and white.", aiTrans: "これはブルー・ブラック・ホワイトがあります。",
        options: [
          { text: "The blue one looks nice. Can I try it on?", trans: "ブルーが良さそうです。試着できますか？", correct: true },
          { text: "I want blue. Can I try?",        trans: "ブルーが欲しいです。試せますか？", correct: false },
          { text: "Blue is good. Fitting room OK?", trans: "ブルーがいいです。試着室OK?",    correct: false },
        ]},
      { aiLine: "The fitting rooms are over there on the right.", aiTrans: "試着室はあちら右側にございます。",
        options: [
          { text: "Thank you! I'll go try it on.",  trans: "ありがとうございます！試着してきます。", correct: true },
          { text: "OK, I go try now.",              trans: "はい、今試しに行きます。",         correct: false },
          { text: "I understand. I try it.",        trans: "わかりました。試します。",         correct: false },
        ]},
      { aiLine: "How does it fit?", aiTrans: "サイズはいかがでしたか？",
        options: [
          { text: "It fits well, but do you have a large?", trans: "よく合いますが、ラージはありますか？", correct: true },
          { text: "It is fit, but I want large.",  trans: "合ってますが、ラージが欲しいです。", correct: false },
          { text: "Good fit. But large size, please.", trans: "フィットします。でもラージをください。", correct: false },
        ]},
      { aiLine: "Sure! Here's a large. Take your time.", aiTrans: "はい！ラージです。ごゆっくりどうぞ。",
        options: [
          { text: "Thank you! This one is perfect!",trans: "ありがとうございます！これは完璧です！", correct: true },
          { text: "Thank you. This size is good.", trans: "ありがとう。このサイズは良いです。", correct: false },
          { text: "OK good. This is fitting well.", trans: "良いです。これはよく合っています。", correct: false },
        ]},
      { aiLine: "Great! Would you like anything else?", aiTrans: "良かったです！他に何かお探しですか？",
        options: [
          { text: "No, I'm good. Just this one.",  trans: "いいえ、大丈夫です。これだけでいいです。", correct: true },
          { text: "No, only this T-shirt.",        trans: "いいえ、このTシャツだけです。",   correct: false },
          { text: "I am fine with only this.",     trans: "これだけで大丈夫です。",           correct: false },
        ]},
      { aiLine: "Is this a gift? We can gift-wrap it.", aiTrans: "プレゼント用ですか？ギフトラップできますよ。",
        options: [
          { text: "No, it's for me. Thanks, though!", trans: "いいえ、自分用です。でもありがとうございます！", correct: true },
          { text: "No, it's mine.",                trans: "いいえ、私のものです。",           correct: false },
          { text: "No, I buy for myself.",         trans: "いいえ、自分に買います。",         correct: false },
        ]},
      { aiLine: "That comes to $29.99. Cash or card?", aiTrans: "合計29ドル99セントです。現金ですかカードですか？",
        options: [
          { text: "Card, please.",                 trans: "カードでお願いします。",           correct: true  },
          { text: "I pay with card.",              trans: "カードで払います。",               correct: false },
          { text: "Card payment for me.",          trans: "カードでの支払いです。",           correct: false },
        ]},
      { aiLine: "Here's your receipt. Thanks for shopping with us!", aiTrans: "こちらがレシートです。ご利用ありがとうございました！",
        options: [
          { text: "Thank you! I love this store.", trans: "ありがとうございます！このお店が大好きです！", correct: true },
          { text: "Thank you. This store is good.", trans: "ありがとう。このお店は良いです。", correct: false },
          { text: "Yes, thanks. I like buy here.", trans: "はい、ありがとう。ここで買うのが好きです。", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 6. 🗺️ Asking for Directions
  // ─────────────────────────────────────────────────────────────
  {
    id: 'directions', title: 'Asking for Directions', situation: '旅行先で地元の人に道を聞く', emoji: '🗺️',
    exchanges: [
      { aiLine: "Hi! You look a bit lost. Can I help?", aiTrans: "こんにちは！少し迷っているみたいですね。お手伝いできますか？",
        options: [
          { text: "Yes, please! I'm looking for the station.", trans: "はい、お願いします！駅を探しています。", correct: true },
          { text: "Yes. Where is station?",         trans: "はい。駅はどこですか？",           correct: false },
          { text: "Yes, I am lost. Station please.", trans: "はい、迷っています。駅をお願いします。", correct: false },
        ]},
      { aiLine: "The train station? It's not far. About 10 minutes on foot.", aiTrans: "電車の駅ですか？遠くないです。歩いて約10分です。",
        options: [
          { text: "Great! Which direction should I go?", trans: "良かった！どの方向に行けばいいですか？", correct: true },
          { text: "Good. Which way I go?",          trans: "良いです。どの方向ですか？",       correct: false },
          { text: "10 minutes. I can walk.",        trans: "10分。歩けます。",                 correct: false },
        ]},
      { aiLine: "Go straight down this road, then turn left at the traffic light.", aiTrans: "この道をまっすぐ行って、信号を左に曲がってください。",
        options: [
          { text: "Straight, then left at the light. Got it!", trans: "まっすぐ、信号を左ですね。わかりました！", correct: true },
          { text: "OK, straight and left. I understand.", trans: "はい、まっすぐで左。わかりました。", correct: false },
          { text: "I go straight. And left at light.", trans: "まっすぐ行きます。そして信号で左。", correct: false },
        ]},
      { aiLine: "After the light, you'll see a big park on your right.", aiTrans: "信号の後、右手に大きな公園が見えます。",
        options: [
          { text: "OK, a big park on the right. And then?", trans: "はい、右に大きな公園ですね。それから？", correct: true },
          { text: "I see park on right. Then what?", trans: "右に公園が見えます。それから何？",   correct: false },
          { text: "Big park is right side. After?", trans: "大きな公園は右側。その後？",       correct: false },
        ]},
      { aiLine: "The station is just past the park on the left side.", aiTrans: "公園を過ぎると左側に駅があります。",
        options: [
          { text: "Perfect! I think I can find it now.", trans: "完璧です！もう見つけられると思います。", correct: true },
          { text: "OK, I understand now.",           trans: "はい、もうわかりました。",         correct: false },
          { text: "Good. Past park, left side.",    trans: "良いです。公園を過ぎて、左側。",   correct: false },
        ]},
      { aiLine: "Do you need me to draw a map?", aiTrans: "地図を描きましょうか？",
        options: [
          { text: "No, I think I'm fine. Thank you so much!", trans: "いいえ、大丈夫だと思います。ありがとうございます！", correct: true },
          { text: "No, thank you. I can go.",       trans: "いいえ、ありがとう。行けます。",   correct: false },
          { text: "No, map is not needed.",         trans: "いいえ、地図は必要ないです。",     correct: false },
        ]},
      { aiLine: "No problem. Are you visiting from out of town?", aiTrans: "どういたしまして。この街への旅行ですか？",
        options: [
          { text: "Yes! I'm from Japan. It's my first time here.", trans: "はい！日本からです。ここは初めてです。", correct: true },
          { text: "Yes, I come from Japan.",        trans: "はい、日本から来ました。",         correct: false },
          { text: "Yes, I am Japanese and visiting.", trans: "はい、日本人で訪問しています。", correct: false },
        ]},
      { aiLine: "Welcome! I hope you enjoy the city.", aiTrans: "ようこそ！この街を楽しんでください。",
        options: [
          { text: "Thank you! It's a beautiful city.", trans: "ありがとうございます！美しい街ですね。", correct: true },
          { text: "Thank you. This city is nice.", trans: "ありがとう。この街はいいですね。",   correct: false },
          { text: "Yes, I enjoy the city here.",   trans: "はい、ここの街を楽しみます。",     correct: false },
        ]},
      { aiLine: "Are you looking for any good restaurants nearby?", aiTrans: "近くで良いレストランをお探しですか？",
        options: [
          { text: "Oh yes! Do you have any recommendations?", trans: "ああ、はい！おすすめはありますか？", correct: true },
          { text: "Yes, I want good restaurant.",   trans: "はい、良いレストランが欲しいです。", correct: false },
          { text: "Yes please. Give me restaurant suggestion.", trans: "はい。レストランのアドバイスをください。", correct: false },
        ]},
      { aiLine: "There's a great sushi place two blocks away. Very popular!", aiTrans: "2ブロック先に素晴らしい寿司屋があります。とても人気ですよ！",
        options: [
          { text: "That sounds perfect! Thank you so much!", trans: "それは最高ですね！本当にありがとうございます！", correct: true },
          { text: "OK, sushi is good! Thank you.", trans: "はい、寿司はいいですね！ありがとう。", correct: false },
          { text: "Sushi is great. I go there now.", trans: "寿司は最高。今そこに行きます。",   correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 7. 👋 Making Friends
  // ─────────────────────────────────────────────────────────────
  {
    id: 'friends', title: 'Making New Friends', situation: '語学学校や街で新しい友達を作る', emoji: '👋',
    exchanges: [
      { aiLine: "Hey! Are you new here? I haven't seen you before.", aiTrans: "こんにちは！ここは初めてですか？見たことがなかったので。",
        options: [
          { text: "Yes! I just arrived from Japan.",trans: "はい！日本から来たばかりです。",   correct: true  },
          { text: "Yes, I come from Japan.",        trans: "はい、日本から来ます。",           correct: false },
          { text: "Yes, I am new here. Japan.",    trans: "はい、ここは初めてです。日本。",   correct: false },
        ]},
      { aiLine: "Nice to meet you! I'm Tom. What's your name?", aiTrans: "はじめまして！トムです。お名前は？",
        options: [
          { text: "Hi Tom! I'm Yuki. Nice to meet you too!", trans: "こんにちはトム！ユキです。こちらこそよろしく！", correct: true },
          { text: "Hello. My name is Yuki.",       trans: "こんにちは。私の名前はユキです。", correct: false },
          { text: "I am Yuki. Nice to meet.",      trans: "ユキです。よろしく。",             correct: false },
        ]},
      { aiLine: "How long have you been studying here?", aiTrans: "ここで勉強して、どのくらいになりますか？",
        options: [
          { text: "Just two weeks so far!",        trans: "まだ2週間です！",                  correct: true  },
          { text: "I study here two weeks.",       trans: "2週間ここで勉強します。",           correct: false },
          { text: "For two week I am here.",       trans: "2週間ここにいます。",               correct: false },
        ]},
      { aiLine: "What do you do back in Japan?", aiTrans: "日本では何をしていますか？",
        options: [
          { text: "I'm a music student.",          trans: "音楽学生です。",                   correct: true  },
          { text: "I study music in Japan.",       trans: "日本で音楽を勉強しています。",     correct: false },
          { text: "My job is music student.",      trans: "仕事は音楽学生です。",             correct: false },
        ]},
      { aiLine: "Oh cool! What instrument do you play?", aiTrans: "かっこいい！どんな楽器を演奏しますか？",
        options: [
          { text: "I play the piano and drums.",   trans: "ピアノとドラムを演奏します。",     correct: true  },
          { text: "I play piano and drum.",        trans: "ピアノとドラムを弾きます。",       correct: false },
          { text: "My instruments are piano, drum.", trans: "楽器はピアノとドラムです。",     correct: false },
        ]},
      { aiLine: "That's awesome! Do you have any plans this weekend?", aiTrans: "すごいね！今週末は何か予定はありますか？",
        options: [
          { text: "Not yet. Do you want to hang out?", trans: "まだないです。一緒に遊びますか？", correct: true },
          { text: "No plans. We can meet?",        trans: "予定なし。会えますか？",           correct: false },
          { text: "Nothing. Let's we meet.",       trans: "何もなし。会いましょう。",         correct: false },
        ]},
      { aiLine: "Sure! There's a live music event on Saturday. Want to go?", aiTrans: "もちろん！土曜日にライブ音楽イベントがあります。行きますか？",
        options: [
          { text: "That sounds fun! I'd love to go!", trans: "楽しそう！ぜひ行きたいです！",  correct: true  },
          { text: "Yes, I want go to live music.", trans: "はい、ライブ音楽に行きたいです。", correct: false },
          { text: "Music event sounds good. I go.", trans: "音楽イベントは良さそう。行きます。", correct: false },
        ]},
      { aiLine: "Great! Let's exchange numbers then.", aiTrans: "良かった！じゃあ連絡先を交換しましょう。",
        options: [
          { text: "Sure! Here's my number.",       trans: "もちろん！こちらが番号です。",     correct: true  },
          { text: "Yes, my number is this.",       trans: "はい、私の番号はこれです。",       correct: false },
          { text: "OK. I give you my number.",     trans: "はい。番号をあげます。",           correct: false },
        ]},
      { aiLine: "Perfect. I'll send you the event details.", aiTrans: "完璧。イベントの詳細を送ります。",
        options: [
          { text: "Thanks, I'll look forward to it!", trans: "ありがとう！楽しみにしています！", correct: true },
          { text: "OK, I wait for your message.",  trans: "はい、メッセージを待ちます。",     correct: false },
          { text: "I wait for your send message.", trans: "送信メッセージを待ちます。",       correct: false },
        ]},
      { aiLine: "See you Saturday then! It was great meeting you.", aiTrans: "じゃあ土曜日に！会えて良かったです。",
        options: [
          { text: "You too! See you on Saturday!", trans: "こちらこそ！土曜日に会いましょう！", correct: true },
          { text: "Yes, see you on Saturday.",    trans: "はい、土曜日に会いましょう。",     correct: false },
          { text: "Saturday, I will see you.",    trans: "土曜日、会います。",               correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 8. 💪 Gym
  // ─────────────────────────────────────────────────────────────
  {
    id: 'gym', title: 'At the Gym', situation: 'アメリカのジムで会話する', emoji: '💪',
    exchanges: [
      { aiLine: "Hi! First time at this gym?", aiTrans: "こんにちは！このジムは初めてですか？",
        options: [
          { text: "Yes! Can I get a tour?",        trans: "はい！案内してもらえますか？",     correct: true  },
          { text: "Yes, this is my first time.",   trans: "はい、初めてです。",               correct: false },
          { text: "Yes, I am new to this gym.",    trans: "はい、このジムは初めてです。",     correct: false },
        ]},
      { aiLine: "Sure! The cardio machines are upstairs.", aiTrans: "もちろん！有酸素運動マシンは上の階です。",
        options: [
          { text: "Great. And where are the weights?", trans: "良かった。ウェイトはどこですか？", correct: true },
          { text: "Where are the weight machines?", trans: "ウェイトマシンはどこですか？",    correct: false },
          { text: "OK. Weights room, where?",      trans: "はい。ウェイトルーム、どこ？",    correct: false },
        ]},
      { aiLine: "The free weights are in the back room.", aiTrans: "フリーウェイトは奥の部屋にあります。",
        options: [
          { text: "Thank you! Is there a locker room too?", trans: "ありがとうございます！ロッカールームもありますか？", correct: true },
          { text: "OK. And locker room?",          trans: "はい。ロッカールームは？",         correct: false },
          { text: "Thank you. I want locker room too.", trans: "ありがとう。ロッカールームも欲しいです。", correct: false },
        ]},
      { aiLine: "Yes, locker rooms are on the left. Do you need a lock?", aiTrans: "はい、ロッカールームは左側です。鍵は必要ですか？",
        options: [
          { text: "No, I brought my own. Thanks!", trans: "いいえ、持参しました。ありがとう！", correct: true },
          { text: "No, I have my own lock.",       trans: "いいえ、自分の鍵があります。",     correct: false },
          { text: "No. I bring my lock by myself.", trans: "いいえ。自分で鍵を持ってきました。", correct: false },
        ]},
      { aiLine: "Are you using that bench right now?", aiTrans: "今そのベンチを使っていますか？",
        options: [
          { text: "No, go ahead. I'm done.",       trans: "いいえ、どうぞ。終わりました。",   correct: true  },
          { text: "No, I finish using it.",        trans: "いいえ、使い終わりました。",       correct: false },
          { text: "No, you can use it. I don't use now.", trans: "いいえ、使っていいです。今使っていません。", correct: false },
        ]},
      { aiLine: "Thanks! Hey, do you mind if I work in?", aiTrans: "ありがとう！一緒に交互に使ってもいいですか？",
        options: [
          { text: "Not at all! Go for it.",        trans: "もちろんです！どうぞ。",           correct: true  },
          { text: "Yes, you can use.",             trans: "はい、使えます。",                 correct: false },
          { text: "No problem. You do it.",        trans: "問題なし。やってください。",       correct: false },
        ]},
      { aiLine: "How many sets do you have left?", aiTrans: "あと何セット残っていますか？",
        options: [
          { text: "Two more sets. Shouldn't take long.", trans: "あと2セットです。すぐ終わります。", correct: true },
          { text: "Two sets more.",                trans: "あと2セット。",                   correct: false },
          { text: "I have 2 sets remaining still.", trans: "まだ2セット残っています。",       correct: false },
        ]},
      { aiLine: "No rush! Do you come here often?", aiTrans: "急がなくていいですよ！ここにはよく来ますか？",
        options: [
          { text: "About three times a week.",     trans: "週に3回ほどです。",               correct: true  },
          { text: "I come here 3 times per week.", trans: "週に3回ここに来ます。",           correct: false },
          { text: "Three times in one week.",      trans: "1週間に3回。",                   correct: false },
        ]},
      { aiLine: "Nice! Do you have a trainer?", aiTrans: "いいですね！トレーナーはいますか？",
        options: [
          { text: "No, I work out on my own.",     trans: "いいえ、一人でトレーニングしています。", correct: true },
          { text: "No, I do exercise alone.",      trans: "いいえ、一人でやります。",         correct: false },
          { text: "No, I train by only myself.",   trans: "いいえ、自分だけでトレーニングします。", correct: false },
        ]},
      { aiLine: "Good work today! See you next time!", aiTrans: "今日は良い運動でしたね！また次回！",
        options: [
          { text: "Thanks! You too. See you around!", trans: "ありがとう！あなたも。またね！", correct: true  },
          { text: "Thank you. See you next.",      trans: "ありがとう。また今度。",           correct: false },
          { text: "Yes, thanks. I see you again.", trans: "はい、ありがとう。また会います。", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 9. 📞 Phone Call (Simple)
  // ─────────────────────────────────────────────────────────────
  {
    id: 'phone', title: 'Making a Phone Call', situation: 'ピザ屋に電話して注文する', emoji: '📞',
    exchanges: [
      { aiLine: "Thank you for calling Pizza Palace! How can I help you?", aiTrans: "ピザパレスへのお電話ありがとうございます！ご用件は？",
        options: [
          { text: "Hi! I'd like to order a pizza for delivery.", trans: "こんにちは！ピザをデリバリーで注文したいです。", correct: true },
          { text: "Hi, I want to order pizza.",  trans: "こんにちは、ピザを注文したいです。", correct: false },
          { text: "Hello. Give me pizza delivery.", trans: "こんにちは。ピザのデリバリーをください。", correct: false },
        ]},
      { aiLine: "Sure! What would you like?", aiTrans: "もちろんです！何になさいますか？",
        options: [
          { text: "A large pepperoni pizza, please.", trans: "ラージのペパロニピザをひとつお願いします。", correct: true },
          { text: "I want large pepperoni pizza.", trans: "ラージペパロニピザが欲しいです。", correct: false },
          { text: "Large size pepperoni, give me.", trans: "ラージサイズペパロニをください。", correct: false },
        ]},
      { aiLine: "Thick crust or thin crust?", aiTrans: "厚生地と薄生地、どちらにしますか？",
        options: [
          { text: "Thin crust, please.",           trans: "薄生地でお願いします。",           correct: true  },
          { text: "I want thin crust.",            trans: "薄生地が欲しいです。",             correct: false },
          { text: "Please thin type crust.",       trans: "薄いタイプの生地をください。",     correct: false },
        ]},
      { aiLine: "What's your address?", aiTrans: "お届け先の住所をお願いします。",
        options: [
          { text: "It's 123 Main Street, Apartment 4B.", trans: "メインストリート123番、アパート4Bです。", correct: true },
          { text: "My address is 123 Main Street.", trans: "住所はメインストリート123です。",   correct: false },
          { text: "I live at 123 Main Street.",   trans: "メインストリート123に住んでいます。", correct: false },
        ]},
      { aiLine: "And your phone number?", aiTrans: "電話番号をお願いします。",
        options: [
          { text: "It's 555-1234.",                trans: "555-1234です。",                   correct: true  },
          { text: "My number is 555-1234.",        trans: "番号は555-1234です。",             correct: false },
          { text: "Phone number is 555-1234.",     trans: "電話番号は555-1234。",             correct: false },
        ]},
      { aiLine: "That's $18.50. Cash or card on delivery?", aiTrans: "18ドル50セントです。代引き現金ですかカードですか？",
        options: [
          { text: "Card on delivery, please.",     trans: "代引きカードでお願いします。",     correct: true  },
          { text: "I pay by card when delivered.", trans: "デリバリー時にカードで払います。", correct: false },
          { text: "Card payment at delivery time.", trans: "デリバリー時にカード払い。",      correct: false },
        ]},
      { aiLine: "Your delivery will arrive in about 30 minutes.", aiTrans: "デリバリーは約30分でお届けします。",
        options: [
          { text: "Great! Thank you so much.",     trans: "やった！ありがとうございます。",   correct: true  },
          { text: "OK, 30 minutes is fine.",       trans: "はい、30分で大丈夫です。",         correct: false },
          { text: "I will wait 30 minutes.",       trans: "30分待ちます。",                   correct: false },
        ]},
      { aiLine: "Is there anything else you'd like to add?", aiTrans: "他にご注文はございますか？",
        options: [
          { text: "No, that's everything. Thanks!", trans: "いいえ、以上です。ありがとうございます！", correct: true },
          { text: "No, only pizza.",               trans: "いいえ、ピザだけです。",           correct: false },
          { text: "Nothing else. Only this.",      trans: "他には何もない。これだけ。",       correct: false },
        ]},
      { aiLine: "Your order has been placed! See you in 30 minutes.", aiTrans: "ご注文を承りました！30分でお伺いします。",
        options: [
          { text: "Perfect! I'll be here.",        trans: "完璧！ここで待っています。",       correct: true  },
          { text: "Good, I wait at home.",         trans: "良いです、家で待ちます。",         correct: false },
          { text: "OK. I am waiting here now.",    trans: "はい。今ここで待っています。",     correct: false },
        ]},
      { aiLine: "Thank you for calling! Have a great evening!", aiTrans: "お電話ありがとうございました！良い夜を！",
        options: [
          { text: "Thanks! You too. Goodbye!",     trans: "ありがとうございます！あなたも。さようなら！", correct: true },
          { text: "Thank you. Bye.",               trans: "ありがとう。さようなら。",         correct: false },
          { text: "Yes, good evening also.",       trans: "はい、あなたも良い夜を。",         correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 10. 💼 Simple Job Application
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview', title: 'Simple Job Interview', situation: 'アルバイトの簡単な面接を受ける', emoji: '💼',
    exchanges: [
      { aiLine: "Hi! Please come in and have a seat.", aiTrans: "こんにちは！どうぞ中に入って座ってください。",
        options: [
          { text: "Thank you! Nice to meet you.", trans: "ありがとうございます！よろしくお願いします。", correct: true },
          { text: "Thank you. I sit here.",       trans: "ありがとうございます。ここに座ります。", correct: false },
          { text: "OK, I am sitting now.",        trans: "はい、今座っています。",             correct: false },
        ]},
      { aiLine: "So, why do you want to work here?", aiTrans: "ここで働きたい理由を教えてください。",
        options: [
          { text: "I love music, and this is a music store.", trans: "音楽が大好きで、ここは音楽の店だからです。", correct: true },
          { text: "Because I like music very much.", trans: "なぜなら音楽がとても好きだからです。", correct: false },
          { text: "This store is good. I love music.", trans: "このお店は良いです。音楽が好きです。", correct: false },
        ]},
      { aiLine: "Do you have any work experience?", aiTrans: "お仕事の経験はありますか？",
        options: [
          { text: "Yes, I worked at a café for one year.", trans: "はい、カフェで1年間働きました。",  correct: true  },
          { text: "Yes, I work at café one year.",  trans: "はい、1年カフェで働きます。",     correct: false },
          { text: "Yes, café experience one year.", trans: "はい、カフェ経験1年。",           correct: false },
        ]},
      { aiLine: "Can you work on weekends?", aiTrans: "週末は働けますか？",
        options: [
          { text: "Yes, weekends are fine for me.", trans: "はい、週末は大丈夫です。",         correct: true  },
          { text: "Yes, I can work weekend.",      trans: "はい、週末働けます。",             correct: false },
          { text: "Yes, weekend working is OK.",   trans: "はい、週末働くのは大丈夫です。",   correct: false },
        ]},
      { aiLine: "How many hours a week can you work?", aiTrans: "週に何時間働けますか？",
        options: [
          { text: "About 20 hours a week.",        trans: "週に約20時間です。",               correct: true  },
          { text: "I can work 20 hours per week.", trans: "週20時間働けます。",               correct: false },
          { text: "20 hours in one week.",         trans: "1週間に20時間。",                 correct: false },
        ]},
      { aiLine: "What are you good at?", aiTrans: "得意なことは何ですか？",
        options: [
          { text: "I'm good at talking to people.", trans: "人と話すことが得意です。",         correct: true  },
          { text: "I am good in talking people.",  trans: "人に話すことが得意です。",         correct: false },
          { text: "My strength is people talking.", trans: "強みは人と話すことです。",         correct: false },
        ]},
      { aiLine: "Do you have any questions for us?", aiTrans: "何かご質問はありますか？",
        options: [
          { text: "Yes! What time do shifts usually start?", trans: "はい！シフトはたいてい何時から始まりますか？", correct: true },
          { text: "Yes. When start the shift?",   trans: "はい。シフトはいつ始まりますか？",  correct: false },
          { text: "Yes. I want know shift time.",  trans: "はい。シフトの時間を知りたいです。", correct: false },
        ]},
      { aiLine: "Morning shifts start at 9, and evening at 4.", aiTrans: "朝シフトは9時から、夜は4時からです。",
        options: [
          { text: "The evening shift works better for me.", trans: "夕方シフトの方が合っています。", correct: true },
          { text: "Evening shift is good for me.", trans: "夕方シフトは私に良いです。",       correct: false },
          { text: "I prefer to work at evening shift.", trans: "夕方シフトで働くのを好みます。", correct: false },
        ]},
      { aiLine: "Great! We'll call you by Friday.", aiTrans: "了解です！金曜日までにご連絡します。",
        options: [
          { text: "Thank you! I look forward to hearing from you.", trans: "ありがとうございます！ご連絡をお待ちしています。", correct: true },
          { text: "Thank you. I wait for your call.", trans: "ありがとう。電話を待ちます。",  correct: false },
          { text: "OK. I am waiting your contact.", trans: "はい。ご連絡を待っています。",    correct: false },
        ]},
      { aiLine: "It was great meeting you. Have a good day!", aiTrans: "お会いできて良かったです。良い一日を！",
        options: [
          { text: "You too! Thank you for your time.", trans: "こちらこそ！お時間をいただきありがとうございます。", correct: true },
          { text: "Thank you for meeting me.",     trans: "会っていただきありがとうございます。", correct: false },
          { text: "Same. Thanks for your time today.", trans: "こちらも。今日のお時間ありがとうございます。", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 11. 🎉 Birthday Party
  // ─────────────────────────────────────────────────────────────
  {
    id: 'party', title: 'Birthday Party', situation: '友人の誕生日パーティーでの会話', emoji: '🎉',
    exchanges: [
      { aiLine: "Hey! You made it! Happy to see you!", aiTrans: "やあ！来てくれたんだ！会えて嬉しい！",
        options: [
          { text: "Thanks for the invite! Happy birthday!", trans: "誘ってくれてありがとう！誕生日おめでとう！", correct: true },
          { text: "Yes I come. Happy birthday.",   trans: "はい来ました。誕生日おめでとう。",  correct: false },
          { text: "I am happy to be here. Birthday!", trans: "ここに来て嬉しいです。誕生日！", correct: false },
        ]},
      { aiLine: "How have you been? I haven't seen you in a while!", aiTrans: "元気でしたか？しばらく会ってなかったですね！",
        options: [
          { text: "I've been great! Really busy, but good!", trans: "元気でした！すごく忙しかったけど、良かったです！", correct: true },
          { text: "I am fine. Very busy.",         trans: "元気です。とても忙しい。",         correct: false },
          { text: "I was good. Busy many things.", trans: "良かったです。多くのことで忙しかった。", correct: false },
        ]},
      { aiLine: "Come on in! Can I get you a drink?", aiTrans: "さあ入って！飲み物はいかがですか？",
        options: [
          { text: "Yes please! Do you have juice?", trans: "はい！ジュースはありますか？",    correct: true  },
          { text: "Yes, I want juice.",            trans: "はい、ジュースが欲しいです。",     correct: false },
          { text: "Yes please give me juice.",     trans: "はいジュースをください。",         correct: false },
        ]},
      { aiLine: "Sure! Oh, this is my friend Mike. He's from Canada.", aiTrans: "もちろん！あ、こちら友人のマイク。カナダ出身です。",
        options: [
          { text: "Hi Mike! Nice to meet you. I'm Yuki.", trans: "こんにちはマイク！はじめまして。ユキです。", correct: true },
          { text: "Hello Mike. I am Yuki from Japan.", trans: "こんにちはマイク。日本のユキです。", correct: false },
          { text: "Nice meet you Mike. My name Yuki.", trans: "はじめましてマイク。名前ユキ。", correct: false },
        ]},
      { aiLine: "What kind of music do you like, Yuki?", aiTrans: "ユキさんはどんな音楽が好きですか？",
        options: [
          { text: "I love jazz and pop music!",    trans: "ジャズとポップ音楽が大好きです！",  correct: true  },
          { text: "I like jazz music and pop.",    trans: "ジャズとポップが好きです。",       correct: false },
          { text: "My favorite is jazz and pop.",  trans: "お気に入りはジャズとポップです。", correct: false },
        ]},
      { aiLine: "Oh nice! Do you play any instruments?", aiTrans: "いいですね！楽器は演奏しますか？",
        options: [
          { text: "Yes! I play piano and drums.",  trans: "はい！ピアノとドラムを弾きます。", correct: true  },
          { text: "Yes, I play piano and drum.",   trans: "はい、ピアノとドラムを演奏します。", correct: false },
          { text: "Yes. Piano, drum is my instrument.", trans: "はい。ピアノとドラムが楽器です。", correct: false },
        ]},
      { aiLine: "That's so cool! Is the food OK? Please eat!", aiTrans: "かっこいい！食べ物は大丈夫ですか？どうぞ食べてください！",
        options: [
          { text: "Everything looks delicious!",  trans: "全部おいしそうですね！",           correct: true  },
          { text: "Yes, food is very good.",       trans: "はい、食べ物はとても良いです。",   correct: false },
          { text: "The food looks very delicious.", trans: "食べ物はとても美味しそうです。",  correct: false },
        ]},
      { aiLine: "I made the cake myself! Do you want some?", aiTrans: "ケーキは自分で作りました！食べますか？",
        options: [
          { text: "Yes please! It looks amazing!",  trans: "はい！すごく美味しそうです！",    correct: true  },
          { text: "Yes I want cake.",              trans: "はい、ケーキが欲しいです。",       correct: false },
          { text: "Yes, give me cake please.",     trans: "はい、ケーキをください。",         correct: false },
        ]},
      { aiLine: "Here you go! Hope you like it!", aiTrans: "どうぞ！気に入ってもらえると嬉しいです！",
        options: [
          { text: "Mmm, it's delicious! You're a great baker!", trans: "うーん、おいしい！すごく上手なケーキ屋さんですね！", correct: true },
          { text: "Very delicious. You make good cake.", trans: "とても美味しい。良いケーキを作りました。", correct: false },
          { text: "It's good cake! You are good at cake.", trans: "良いケーキです！ケーキが上手ですね。", correct: false },
        ]},
      { aiLine: "So glad you could come! See you soon!", aiTrans: "来てくれて嬉しかったです！また近いうちに！",
        options: [
          { text: "It was so much fun! Happy birthday again!", trans: "すごく楽しかった！もう一度誕生日おめでとう！", correct: true },
          { text: "Yes, very fun. Happy birthday!",  trans: "はい、とても楽しかった。誕生日おめでとう！", correct: false },
          { text: "I enjoy it. Birthday happy!",   trans: "楽しめました。誕生日おめでとう！", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 12. 🚕 Taxi / Ride Share
  // ─────────────────────────────────────────────────────────────
  {
    id: 'taxi', title: 'Taking a Taxi', situation: 'タクシーやライドシェアで目的地に向かう', emoji: '🚕',
    exchanges: [
      { aiLine: "Hi! Are you Yuki?", aiTrans: "こんにちは！ユキさんですか？",
        options: [
          { text: "Yes, that's me! Thanks for coming.", trans: "はい、私です！来てくれてありがとう！", correct: true },
          { text: "Yes, I am Yuki.",                trans: "はい、ユキです。",                 correct: false },
          { text: "Yes. The person is me.",         trans: "はい。その人は私です。",           correct: false },
        ]},
      { aiLine: "Where would you like to go?", aiTrans: "どちらまでいかれますか？",
        options: [
          { text: "To City Hall, please.",          trans: "市役所までお願いします。",         correct: true  },
          { text: "I go to City Hall.",             trans: "市役所に行きます。",               correct: false },
          { text: "City Hall is my destination.",   trans: "市役所が目的地です。",             correct: false },
        ]},
      { aiLine: "No problem. It'll take about 15 minutes.", aiTrans: "了解です。約15分かかります。",
        options: [
          { text: "That's fine. I'm not in a rush.", trans: "大丈夫です。急いでいません。",    correct: true  },
          { text: "OK, 15 minutes is fine.",        trans: "はい、15分で大丈夫です。",         correct: false },
          { text: "No problem. I am not rush.",     trans: "大丈夫。急いでいません。",         correct: false },
        ]},
      { aiLine: "Beautiful day today, isn't it?", aiTrans: "今日は良い天気ですね！",
        options: [
          { text: "Yes! Perfect weather.",          trans: "はい！完璧な天気ですね。",         correct: true  },
          { text: "Yes, weather is nice.",          trans: "はい、天気はいいですね。",         correct: false },
          { text: "Yes, today weather is beautiful.", trans: "はい、今日の天気は美しいです。", correct: false },
        ]},
      { aiLine: "Are you visiting, or do you live here?", aiTrans: "旅行中ですか？それともここに住んでいますか？",
        options: [
          { text: "I'm studying here for six months.", trans: "6ヶ月間ここで勉強しています。", correct: true  },
          { text: "I study here for 6 months.",    trans: "6ヶ月間ここで勉強します。",         correct: false },
          { text: "I am a student here for 6 month.", trans: "ここの学生で6ヶ月です。",       correct: false },
        ]},
      { aiLine: "Wow, six months! Do you like it here?", aiTrans: "わあ、6ヶ月も！ここは気に入っていますか？",
        options: [
          { text: "Yes! I love it. The people are so friendly.", trans: "はい！大好きです。人々がとても親切で。", correct: true },
          { text: "Yes, I like it. People are friendly.", trans: "はい、好きです。人々は親切です。", correct: false },
          { text: "Yes. Friendly people here.",   trans: "はい。ここは友好的な人々。",       correct: false },
        ]},
      { aiLine: "We're almost there. Any plans today?", aiTrans: "もうすぐ着きます。今日は何か予定がありますか？",
        options: [
          { text: "Just a meeting at City Hall.",  trans: "市役所でミーティングがあるだけです。", correct: true },
          { text: "I have meeting at City Hall.",  trans: "市役所でミーティングがあります。",  correct: false },
          { text: "Today I go City Hall for meeting.", trans: "今日は市役所にミーティングで行きます。", correct: false },
        ]},
      { aiLine: "Here we are! That's City Hall on the left.", aiTrans: "着きました！左側が市役所です。",
        options: [
          { text: "Great! How much do I owe you?", trans: "ありがとう！いくらですか？",       correct: true  },
          { text: "OK. How much is the fare?",    trans: "はい。料金はいくらですか？",       correct: false },
          { text: "We arrive. Money how much?",   trans: "着きました。料金はいくらですか？", correct: false },
        ]},
      { aiLine: "It's $12.50. The payment is in the app.", aiTrans: "12ドル50セントです。お支払いはアプリでお願いします。",
        options: [
          { text: "Oh right! I'll pay through the app now.", trans: "あ、そうですね！今アプリで払います。", correct: true },
          { text: "OK, I pay with the app.",      trans: "はい、アプリで払います。",         correct: false },
          { text: "Yes, app payment OK.",         trans: "はい、アプリ支払いOKです。",       correct: false },
        ]},
      { aiLine: "Have a great day! Good luck with your meeting!", aiTrans: "良い一日を！ミーティング頑張ってください！",
        options: [
          { text: "Thank you! Drive safe!",        trans: "ありがとうございます！安全運転で！", correct: true  },
          { text: "Thank you. Bye bye.",           trans: "ありがとうございます。さようなら。", correct: false },
          { text: "Thanks. Safe drive please.",   trans: "ありがとう。安全に運転してください。", correct: false },
        ]},
    ],
  },
];

// ── ユーティリティ ──────────────────────────────────────────────
function dayOfYear(): number {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

function getTodayDateStr(): string {
  return new Date().toISOString().split('T')[0];
}

const EQ_PROGRESS_KEY = 'sparta-eq-progress-';
const EQ_COMPLETE_KEY = 'sparta-eq-complete-';

function loadProgress(date: string): number {
  try { return parseInt(localStorage.getItem(EQ_PROGRESS_KEY + date) ?? '0', 10); } catch { return 0; }
}
function saveProgress(date: string, round: number): void {
  try { localStorage.setItem(EQ_PROGRESS_KEY + date, String(round)); } catch {}
}
function loadComplete(date: string): boolean {
  try { return localStorage.getItem(EQ_COMPLETE_KEY + date) === '1'; } catch { return false; }
}
function saveComplete(date: string): void {
  try { localStorage.setItem(EQ_COMPLETE_KEY + date, '1'); } catch {}
}

// Fisher-Yates シャッフル
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// TTS（英語）— cancel() 直後に speak() すると Chrome で無視されるため 50ms 遅延
function speakEnglish(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt  = new SpeechSynthesisUtterance(text);
  utt.lang   = 'en-US';
  utt.rate   = 0.85;
  utt.pitch  = 1.0;
  utt.onend  = () => { if (onEnd) onEnd(); };
  utt.onerror = () => { if (onEnd) onEnd(); };
  setTimeout(() => window.speechSynthesis.speak(utt), 50);
}

// ── メインコンポーネント ─────────────────────────────────────────
export function EnglishQuiz() {
  const todayStr  = getTodayDateStr();
  const scenario  = SCENARIOS[dayOfYear() % SCENARIOS.length];

  const [round,       setRound]       = useState<number>(0);
  const [completed,   setCompleted]   = useState<boolean>(false);
  const [options,     setOptions]     = useState<QuizOption[]>([]);
  const [selected,    setSelected]    = useState<number | null>(null);
  const [feedback,    setFeedback]    = useState<'correct' | 'wrong' | null>(null);
  const [taunt,          setTaunt]          = useState('');
  // 'ai' = AIセリフ読み上げ中, number = 選択肢index読み上げ中, null = 停止中
  const [speakingTarget, setSpeakingTarget] = useState<'ai' | number | null>(null);
  const [collapsed,      setCollapsed]      = useState(false);
  const [initialized, setInitialized] = useState(false);

  // ── 初期化（localStorage から復元） ──────────────────────────
  useEffect(() => {
    const savedRound = loadProgress(todayStr);
    const done       = loadComplete(todayStr);
    setRound(savedRound);
    setCompleted(done);
    setInitialized(true);
  }, [todayStr]);

  // ── 選択肢のシャッフル（ラウンド変更時） ──────────────────────
  useEffect(() => {
    if (!initialized || completed) return;
    if (round >= scenario.exchanges.length) return;
    setOptions(shuffle(scenario.exchanges[round].options));
    setSelected(null);
    setFeedback(null);
    setTaunt('');
  }, [round, initialized, completed, scenario.exchanges]);

  const currentExchange = scenario.exchanges[round] ?? null;

  // ── TTS 発音（target: 'ai' or 選択肢index）────────────────────
  const handleSpeak = useCallback((text: string, target: 'ai' | number) => {
    setSpeakingTarget(target);
    speakEnglish(text, () => setSpeakingTarget(null));
  }, []);

  // ── 選択肢タップ ─────────────────────────────────────────────
  const handleSelect = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (options[idx].correct) {
      setFeedback('correct');
    } else {
      setFeedback('wrong');
      setTaunt(TAUNT_MSGS[Math.floor(Math.random() * TAUNT_MSGS.length)]);
    }
  };

  // ── 次へ進む ─────────────────────────────────────────────────
  const handleNext = () => {
    const nextRound = round + 1;
    if (nextRound >= scenario.exchanges.length) {
      saveProgress(todayStr, nextRound);
      saveComplete(todayStr);
      setRound(nextRound);
      setCompleted(true);
    } else {
      saveProgress(todayStr, nextRound);
      setRound(nextRound);
    }
  };

  // ── やり直し ─────────────────────────────────────────────────
  const handleRetry = () => {
    setOptions(shuffle(options));
    setSelected(null);
    setFeedback(null);
    setTaunt('');
  };

  // ── 今日リセット ─────────────────────────────────────────────
  const handleReset = () => {
    if (!confirm('今日の英会話進捗をリセットしますか？')) return;
    try {
      localStorage.removeItem(EQ_PROGRESS_KEY + todayStr);
      localStorage.removeItem(EQ_COMPLETE_KEY + todayStr);
    } catch {}
    setRound(0);
    setCompleted(false);
  };

  if (!initialized) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── ヘッダー ── */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-emerald-700 to-teal-700 hover:opacity-95 transition-all"
      >
        <span className="text-xl">{scenario.emoji}</span>
        <div className="flex-1 text-left">
          <p className="text-xs font-black text-white">スパルタ英会話クイズ（初級〜中級）</p>
          <p className="text-[10px] text-emerald-200">{scenario.title} — {scenario.situation}</p>
        </div>
        {completed ? (
          <span className="text-[10px] bg-yellow-400 text-yellow-900 font-black px-2 py-0.5 rounded-full">✅ 今日完了！</span>
        ) : (
          <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">
            {round + 1}/{scenario.exchanges.length}往復
          </span>
        )}
        <span className={`text-white text-xs transition-transform ${collapsed ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4">

          {/* ── 完了画面 ── */}
          {completed ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-4xl">🏆</p>
              <p className="text-base font-black text-gray-900">今日の英会話ノルマ達成！</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                よくやった！<br/>
                10往復の英会話を完璧にこなした。<br/>
                毎日続ければ、基礎は必ず身に付くぞ！
              </p>
              <p className="text-xs text-gray-400">明日は別のシナリオで練習だ！</p>
              <button
                onClick={handleReset}
                className="text-[10px] text-gray-400 hover:text-gray-600 underline"
              >やり直す（テスト用）</button>
            </div>
          ) : currentExchange ? (
            <>
              {/* ── 進捗バー ── */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-gray-500">
                  <span className="font-bold text-emerald-700">{round + 1}往復目 / 全10往復</span>
                  <span>残り{scenario.exchanges.length - round - 1}往復</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${(round / scenario.exchanges.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* ── AIのセリフ ── */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0 mt-0.5">{scenario.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-emerald-800 mb-1">相手のセリフ</p>
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {currentExchange.aiLine}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {currentExchange.aiTrans}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSpeak(currentExchange.aiLine, 'ai')}
                    disabled={speakingTarget !== null}
                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      speakingTarget === 'ai'
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                    title="AIセリフを聞く"
                  >🔊</button>
                </div>
              </div>

              {/* ── 3択クイズ ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500">
                  最も自然な英語の返答を選べ！（A1〜B1レベル）
                </p>
                {options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const isCorrect  = opt.correct;
                  let btnClass = 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50';
                  if (isSelected && feedback === 'correct')  btnClass = 'border-green-400 bg-green-50 ring-1 ring-green-300';
                  if (isSelected && feedback === 'wrong')    btnClass = 'border-red-400 bg-red-50 ring-1 ring-red-300';
                  if (selected !== null && !isSelected && isCorrect)  btnClass = 'border-green-200 bg-green-50/50 opacity-70';
                  if (selected !== null && !isSelected && !isCorrect) btnClass = 'border-gray-100 bg-gray-50 opacity-40';

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelect(idx)}
                      disabled={selected !== null}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-all ${btnClass}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`text-xs font-black flex-shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected && feedback === 'correct'  ? 'bg-green-500 text-white' :
                          isSelected && feedback === 'wrong'    ? 'bg-red-500 text-white'   :
                          selected !== null && isCorrect        ? 'bg-green-400 text-white'  :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {isSelected && feedback === 'correct' ? '○' :
                           isSelected && feedback === 'wrong'   ? '✕' :
                           selected !== null && isCorrect       ? '○' :
                           String.fromCharCode(65 + idx)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 leading-snug">{opt.text}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{opt.trans}</p>
                        </div>
                        {/* 個別🔊ボタン（常時表示）*/}
                        <button
                          onClick={e => { e.stopPropagation(); handleSpeak(opt.text, idx); }}
                          disabled={speakingTarget !== null}
                          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] transition-all ${
                            speakingTarget === idx
                              ? 'bg-emerald-500 text-white animate-pulse'
                              : isSelected && feedback === 'correct'
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                          }`}
                          title="発音を聞く"
                        >🔊</button>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* ── フィードバック ── */}
              {feedback === 'correct' && (
                <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-2xl">
                  <span className="text-xl flex-shrink-0">✅</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-green-700">正解！ナイスな英語だ！</p>
                    <p className="text-[10px] text-green-600">
                      {round + 1 < scenario.exchanges.length
                        ? `次の往復へ進め！（${round + 2}/${scenario.exchanges.length}）`
                        : '最後の往復！クリアしろ！'}
                    </p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="flex-shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl transition-all"
                  >{round + 1 < scenario.exchanges.length ? '次へ →' : '🏆 完了！'}</button>
                </div>
              )}
              {feedback === 'wrong' && (
                <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <div className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">🔥</span>
                    <div className="flex-1">
                      <p className="text-sm font-black text-red-700">不正解！</p>
                      <p className="text-xs text-red-600 mt-0.5">{taunt}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="self-end px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all"
                  >もう一度 ↺</button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
