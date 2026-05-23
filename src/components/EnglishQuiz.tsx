'use client';

import { useState, useEffect, useCallback } from 'react';

// ── 型定義 ──────────────────────────────────────────────────────
interface QuizOption {
  text:   string;   // 英文
  trans:  string;   // 日本語訳
  correct: boolean;
}
interface Exchange {
  aiLine:  string;  // AI の英文セリフ
  aiTrans: string;  // 日本語訳
  options: QuizOption[];
}
interface Scenario {
  id:        string;
  title:     string;
  situation: string;  // 状況説明（日本語）
  emoji:     string;
  exchanges: Exchange[];
}

// ── スパルタあおりメッセージ ──────────────────────────────────────
const TAUNT_MSGS = [
  'そんな返答じゃ伝わらないぞ！もう一度考えろ！',
  '英語で恥をかく前にちゃんと考えろ！やり直しだ！',
  'ネイティブに笑われる前に正しい表現を身につけろ！',
  'お前の英語は通じない！選び直せ！',
  '甘えるな！正確な英語で答えるまでやり直しだ！',
];

// ── 12シナリオ × 10往復 ──────────────────────────────────────────
const SCENARIOS: Scenario[] = [

  // ─────────────────────────────────────────────────────────────
  // 1. ☕ Coffee Shop
  // ─────────────────────────────────────────────────────────────
  {
    id: 'coffee', title: 'Coffee Shop Order', situation: 'ニューヨークのカフェで注文をする', emoji: '☕',
    exchanges: [
      { aiLine: "Hi! Welcome in. What can I get for you today?", aiTrans: "いらっしゃいませ。本日はご注文は何にしますか？",
        options: [
          { text: "I'd like a medium latte, please.",            trans: "ミディアムラテをひとつお願いします。",     correct: true  },
          { text: "Give me coffee.",                             trans: "コーヒーをくれ。",                         correct: false },
          { text: "I am wanting to drink a latte.",              trans: "ラテが飲みたいです。",                     correct: false },
        ]},
      { aiLine: "Hot or iced?", aiTrans: "ホットにしますかアイスにしますか？",
        options: [
          { text: "Hot, please.",                                trans: "ホットでお願いします。",                   correct: true  },
          { text: "Yes, I want it.",                             trans: "はい、それが欲しいです。",                 correct: false },
          { text: "I prefer to have the hot one.",               trans: "ホットの方を好みます。",                   correct: false },
        ]},
      { aiLine: "What size? Small, medium, or large?", aiTrans: "サイズはスモール・ミディアム・ラージのどれにしますか？",
        options: [
          { text: "A large one, please.",                        trans: "ラージをお願いします。",                   correct: true  },
          { text: "Give me the big coffee.",                     trans: "大きいコーヒーをくれ。",                   correct: false },
          { text: "I will choose large size number.",            trans: "ラージサイズ番号を選びます。",             correct: false },
        ]},
      { aiLine: "Would you like anything to eat with that?", aiTrans: "何かお食事はご一緒にいかがですか？",
        options: [
          { text: "No, thank you. Just the coffee.",             trans: "いいえ、結構です。コーヒーだけで。",       correct: true  },
          { text: "No I don't.",                                 trans: "いいえ、違います。",                       correct: false },
          { text: "I am not eating anything now.",               trans: "今は何も食べません。",                     correct: false },
        ]},
      { aiLine: "Can I get a name for the order?", aiTrans: "ご注文のお名前をお聞きしてもよいですか？",
        options: [
          { text: "It's Alex. A-L-E-X.",                         trans: "アレックスです。A-L-E-X。",               correct: true  },
          { text: "My name is very long, sorry.",                trans: "私の名前はとても長くて、すみません。",     correct: false },
          { text: "I am called by the name Alex.",               trans: "私はアレックスと呼ばれています。",         correct: false },
        ]},
      { aiLine: "That'll be $6.50. Cash or card?", aiTrans: "合計6ドル50セントです。現金ですかカードですか？",
        options: [
          { text: "Card, please.",                               trans: "カードでお願いします。",                   correct: true  },
          { text: "Yes, I have money to pay.",                   trans: "はい、支払うお金があります。",             correct: false },
          { text: "I will use my card for the paying.",          trans: "支払いにカードを使います。",               correct: false },
        ]},
      { aiLine: "Just tap here. Perfect!", aiTrans: "こちらをタップするだけです。完璧です！",
        options: [
          { text: "Great, thank you!",                           trans: "ありがとうございます！",                   correct: true  },
          { text: "OK, I tap it now.",                           trans: "はい、今タップします。",                   correct: false },
          { text: "The machine is tapped by me.",                trans: "機械は私にタップされました。",             correct: false },
        ]},
      { aiLine: "Your order will be ready in about 3 minutes.", aiTrans: "ご注文は約3分でご用意できます。",
        options: [
          { text: "Sure, I'll wait right here. Thanks!",         trans: "わかりました、ここで待ちます。ありがとう！", correct: true },
          { text: "3 minutes is too long time.",                 trans: "3分は長すぎます。",                       correct: false },
          { text: "OK I am waiting for you here.",               trans: "はい、ここであなたを待ちます。",           correct: false },
        ]},
      { aiLine: "Alex! Your large hot latte is ready!", aiTrans: "アレックスさん！ラージホットラテができました！",
        options: [
          { text: "That's me! Thank you so much.",               trans: "はい私です！ありがとうございます！",       correct: true  },
          { text: "Yes, this is my coffee now.",                 trans: "はい、これは今の私のコーヒーです。",       correct: false },
          { text: "I am Alex. Give me that.",                    trans: "私はアレックスです。それをください。",     correct: false },
        ]},
      { aiLine: "Enjoy your drink! Have a wonderful day!", aiTrans: "お飲み物をお楽しみください！素晴らしい一日を！",
        options: [
          { text: "Thanks! You too!",                            trans: "ありがとう！あなたも！",                   correct: true  },
          { text: "OK, I will enjoy it slowly.",                 trans: "はい、ゆっくり楽しみます。",               correct: false },
          { text: "Yes. Goodbye very much.",                     trans: "はい。たいへんさようなら。",               correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 2. ✈️ Airport Check-in
  // ─────────────────────────────────────────────────────────────
  {
    id: 'airport', title: 'Airport Check-in', situation: 'JFK空港でチェックイン手続きをする', emoji: '✈️',
    exchanges: [
      { aiLine: "Good morning! Where are you flying to today?", aiTrans: "おはようございます！本日はどちらへ？",
        options: [
          { text: "I'm flying to Tokyo, Japan.",                 trans: "日本の東京に飛びます。",                   correct: true  },
          { text: "I go to the Tokyo.",                          trans: "東京に行きます。",                         correct: false },
          { text: "My destination is Tokyo in Japan country.",   trans: "目的地は日本国の東京です。",               correct: false },
        ]},
      { aiLine: "May I see your passport, please?", aiTrans: "パスポートを見せていただけますか？",
        options: [
          { text: "Of course, here you go.",                     trans: "もちろんです、どうぞ。",                   correct: true  },
          { text: "Yes I have my passport.",                     trans: "はい、パスポートを持っています。",         correct: false },
          { text: "Please to take my passport.",                 trans: "私のパスポートを取って��ださい。",         correct: false },
        ]},
      { aiLine: "How many bags are you checking in today?", aiTrans: "本日は手荷物を何個お預けですか？",
        options: [
          { text: "Just one bag, please.",                       trans: "スーツケースひとつだけです。",             correct: true  },
          { text: "I have got the one bag with me.",             trans: "バッグを一つ持っています。",               correct: false },
          { text: "My bags number is one.",                      trans: "私のバッグの数は一つです。",               correct: false },
        ]},
      { aiLine: "Did you pack this bag yourself?", aiTrans: "このバッグはご自分で荷造りされましたか？",
        options: [
          { text: "Yes, I packed it myself.",                    trans: "はい、自分で荷造りしました。",             correct: true  },
          { text: "Yes, I am pack it.",                          trans: "はい、荷造りします。",                     correct: false },
          { text: "Yes, the bag is packed by myself.",           trans: "はい、バッグは私自身によって荷造りされました。", correct: false },
        ]},
      { aiLine: "Would you prefer a window or aisle seat?", aiTrans: "窓側と通路側、どちらがよろしいですか？",
        options: [
          { text: "A window seat would be great, thanks.",       trans: "窓側の席がいいです、ありがとう。",         correct: true  },
          { text: "I want to sit at the window side.",           trans: "窓側に座りたいです。",                     correct: false },
          { text: "Window is my preference for the sitting.",    trans: "窓は座るための私の好みです。",             correct: false },
        ]},
      { aiLine: "Your flight boards at Gate B14 at 10:45.", aiTrans: "フライトはゲートB14から10時45分に搭乗開始です。",
        options: [
          { text: "Got it. Thank you for letting me know.",      trans: "わかりました。教えていただきありがとう。", correct: true  },
          { text: "I understand the gate is B14 and 10:45.",     trans: "ゲートがB14で10時45分と理解しています。", correct: false },
          { text: "OK I go to gate B14 right now.",              trans: "はい、今すぐゲートB14に行きます。",       correct: false },
        ]},
      { aiLine: "Your bag is 3 kilos overweight. There's a $60 excess fee.", aiTrans: "バッグが3キロ超過しています。超過料金60ドルかかります。",
        options: [
          { text: "I'll pay that. Can I use my card?",           trans: "払います。カードで支払えますか？",         correct: true  },
          { text: "60 dollars is very expensive!",               trans: "60ドルはとても高い！",                     correct: false },
          { text: "Why is my bag the overweight?",               trans: "なぜ私のバッグは超過なのですか？",         correct: false },
        ]},
      { aiLine: "Is there anything fragile or valuable in your checked bag?", aiTrans: "預け入れ荷物に壊れやすいものや貴重品はありますか？",
        options: [
          { text: "No, just clothes and everyday items.",        trans: "いいえ、衣類と日用品だけです。",           correct: true  },
          { text: "I don't have the fragile things.",            trans: "壊れやすいものは持っていません。",         correct: false },
          { text: "Nothing special and fragile is in there.",    trans: "特別で壊れやすいものはそこにありません。", correct: false },
        ]},
      { aiLine: "Here are your boarding pass and passport. Have a safe flight!", aiTrans: "搭乗券とパスポートをどうぞ。安全なご旅行を！",
        options: [
          { text: "Thank you so much! I really appreciate it.",  trans: "本当にありがとうございます！",             correct: true  },
          { text: "OK I take these things from you.",            trans: "はい、あなたからこれらをもらいます。",     correct: false },
          { text: "Yes these things are belonging to me.",       trans: "はい、これらは私のものです。",             correct: false },
        ]},
      { aiLine: "Security is just down the hall to your left.", aiTrans: "セキュリティチェックは廊下を進んで左です。",
        options: [
          { text: "Perfect, thank you! I'll head there now.",    trans: "わかりました、ありがとう！今から向かいます。", correct: true },
          { text: "I understand the direction is left.",         trans: "方向が左だと理解しています。",             correct: false },
          { text: "OK thank you very much for the help to me.",  trans: "はい、私への助けに大変ありがとう。",       correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 3. 🏨 Hotel Check-in
  // ─────────────────────────────────────────────────────────────
  {
    id: 'hotel', title: 'Hotel Check-in', situation: 'ホテルのフロントでチェックインをする', emoji: '🏨',
    exchanges: [
      { aiLine: "Good evening! Welcome to the Grand Hotel. Do you have a reservation?", aiTrans: "こんばんは！グランドホテルへようこそ。ご予約はございますか？",
        options: [
          { text: "Yes, I have a reservation under Kim.",        trans: "はい、キムの名前で予約しています。",       correct: true  },
          { text: "Yes I made reservation before.",              trans: "はい、前に予約しました。",                 correct: false },
          { text: "The reservation is having by me, yes.",       trans: "予約は私によって持たれています。",         correct: false },
        ]},
      { aiLine: "Could I see your ID or passport, please?", aiTrans: "IDまたはパスポートを拝見できますか？",
        options: [
          { text: "Sure, here's my passport.",                   trans: "もちろん、パスポートです。",               correct: true  },
          { text: "Yes I will show you the ID.",                 trans: "はい、IDをお見せします。",                 correct: false },
          { text: "My passport is this one here.",               trans: "パスポートはこちらのこれです。",           correct: false },
        ]},
      { aiLine: "You've booked a double room for three nights. Is that correct?", aiTrans: "ダブルルームを3泊でご予約いただいています。よろしいですか？",
        options: [
          { text: "That's right, yes.",                          trans: "はい、その通りです。",                     correct: true  },
          { text: "Yes it is the correct thing.",                trans: "はい、それが正しいことです。",             correct: false },
          { text: "I booked the double room for three nights.",  trans: "ダブルルームを3泊予約しました。",         correct: false },
        ]},
      { aiLine: "Would you like a room with a city view or a garden view?", aiTrans: "シティビューとガーデンビュー、どちらのお部屋がよろしいですか？",
        options: [
          { text: "City view sounds great, please.",             trans: "シティビューがいいです、お願いします。",   correct: true  },
          { text: "I want to see the city from my room.",        trans: "部屋から街を見たいです。",                 correct: false },
          { text: "City view is my selected choice.",            trans: "シティビューが私の選んだ選択です。",       correct: false },
        ]},
      { aiLine: "Breakfast is served from 7 to 10 AM in the restaurant on the second floor.", aiTrans: "朝食は2階のレストランにて7時から10時まで提供しております。",
        options: [
          { text: "Great, I'll keep that in mind. Thank you.",   trans: "わかりました、覚えておきます。ありがとう。", correct: true },
          { text: "OK I understand the breakfast time.",         trans: "はい、朝食の時間を理解しました。",         correct: false },
          { text: "Breakfast is at 7 to 10 on second floor.",    trans: "朝食は2階の7時から10時です。",             correct: false },
        ]},
      { aiLine: "The Wi-Fi password is on the card in your room.",  aiTrans: "Wi-Fiのパスワードはお部屋の中のカードに記載されています。",
        options: [
          { text: "Perfect. Is there anything else I should know?", trans: "わかりました。他に知っておくことはありますか？", correct: true },
          { text: "OK the password is on the card in my room.",  trans: "はい、パスワードは私の部屋のカードにあります。", correct: false },
          { text: "I will look for the card with password.",     trans: "パスワード付きのカードを探します。",       correct: false },
        ]},
      { aiLine: "Check-out time is at noon. Late check-out is available for an extra fee.", aiTrans: "チェックアウトは正午です。レイトチェックアウトは追加料金で可能です。",
        options: [
          { text: "Good to know. I'll probably check out at noon.", trans: "わかりました。おそらく正午にチェックアウトします。", correct: true },
          { text: "I understand check-out is 12 o'clock noon.", trans: "チェックアウトが正午12時と理解しました。",  correct: false },
          { text: "Noon is the time I must leave the hotel.",    trans: "正午は私がホテルを去らなければならない時間です。", correct: false },
        ]},
      { aiLine: "Here is your room key card. Your room is on the 8th floor, room 812.", aiTrans: "こちらがルームキーカードです。お部屋は8階の812号室です。",
        options: [
          { text: "Thank you! Is the elevator nearby?",          trans: "ありがとうございます！エレベーターはそこにありますか？", correct: true },
          { text: "OK I go to 8th floor room 812 now.",          trans: "はい、今すぐ8階812号室に行きます。",       correct: false },
          { text: "My room is 812 on the 8th floor.",            trans: "私の部屋は8階の812です。",                 correct: false },
        ]},
      { aiLine: "The elevator is right around the corner to your left.", aiTrans: "エレベーターは左に曲がったすぐのところにございます。",
        options: [
          { text: "Great, thank you for all your help!",         trans: "ありがとうございます、いろいろ助かりました！", correct: true },
          { text: "I see the elevator is to the left corner.",   trans: "エレベーターが左角にあるとわかります。",   correct: false },
          { text: "OK I turn left and find the elevator.",       trans: "はい、左に曲がってエレベーターを見つけます。", correct: false },
        ]},
      { aiLine: "Enjoy your stay! Please let us know if you need anything.", aiTrans: "どうぞごゆっくりお過ごしください！何かご用があればお知らせください。",
        options: [
          { text: "Thank you so much! I'll definitely reach out if I need anything.", trans: "ありがとうございます！何かあればご連絡します。", correct: true },
          { text: "OK I will tell you if I need something.",     trans: "はい、何か必要なら言います。",             correct: false },
          { text: "Yes I enjoy staying and tell you if needing.", trans: "はい、滞在を楽しみ必要なら言います。",   correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 4. 🍽️ Restaurant
  // ─────────��───────────────────────────────────────────────────
  {
    id: 'restaurant', title: 'At the Restaurant', situation: 'レストランで食事をする（席の案内から会計まで）', emoji: '🍽️',
    exchanges: [
      { aiLine: "Good evening! Do you have a reservation, or are you a walk-in?", aiTrans: "こんばんは！ご予約はありますか、それともウォークインですか？",
        options: [
          { text: "We're a walk-in. A table for two, please.",   trans: "予約なしです。2名でお願いします。",         correct: true  },
          { text: "We don't have reservation, two persons.",     trans: "予約はありません、2人です。",               correct: false },
          { text: "We are coming without reservation, two.",     trans: "予約なしで来ました、2人です。",             correct: false },
        ]},
      { aiLine: "Right this way, please. Here are your menus.", aiTrans: "こちらへどうぞ。メニューです。",
        options: [
          { text: "Thank you! This place looks lovely.",         trans: "ありがとうございます！素敵なお店ですね。", correct: true  },
          { text: "OK I take the menu now.",                     trans: "はい、今メニューをもらいます。",           correct: false },
          { text: "The menus are given to us. Thank you.",       trans: "メニューが私たちに渡されました。ありがとう。", correct: false },
        ]},
      { aiLine: "Can I start you off with some drinks?", aiTrans: "最初にお飲み物をいかがですか？",
        options: [
          { text: "I'll have a sparkling water, please.",        trans: "スパークリングウォーターをお願いします。", correct: true  },
          { text: "Yes water is good to drink.",                 trans: "はい、水は飲むのに良いです。",             correct: false },
          { text: "I am wanting to drink sparkling water.",      trans: "スパークリングウォーターを飲みたいです。", correct: false },
        ]},
      { aiLine: "Are you ready to order, or do you need a few more minutes?", aiTrans: "ご注文はよろしいですか、それともしばらく時間が必要ですか？",
        options: [
          { text: "I think we need a couple more minutes, if that's okay.", trans: "もう少し時間をいただけますか。", correct: true },
          { text: "We are not ready yet for the ordering.",      trans: "まだ注文する準備ができていません。",       correct: false },
          { text: "Please wait, we still reading the menu.",     trans: "待ってください、まだメニューを読んでいます。", correct: false },
        ]},
      { aiLine: "What would you like to have for your main course?", aiTrans: "メインコースは何になさいますか？",
        options: [
          { text: "I'll go with the grilled salmon, please.",    trans: "グリルサーモンにします。",                 correct: true  },
          { text: "I want to eat the salmon grilled.",           trans: "焼いたサーモンを食べたいです。",           correct: false },
          { text: "Give me salmon with grill, please.",          trans: "グリルのサーモンをください。",             correct: false },
        ]},
      { aiLine: "How would you like your steak cooked?", aiTrans: "ステーキの焼き加減はいかがいたしますか？",
        options: [
          { text: "Medium rare, please.",                        trans: "ミディアムレアでお願いします。",           correct: true  },
          { text: "I want half-cooked steak.",                   trans: "半分焼いたステーキが欲しいです。",         correct: false },
          { text: "Cook it in the medium and rare way.",         trans: "ミディアムとレアの方法で調理してください。", correct: false },
        ]},
      { aiLine: "Is everything tasting all right so far?", aiTrans: "お料理のお味はいかがでしょうか？",
        options: [
          { text: "Yes, it's absolutely delicious. Compliments to the chef!", trans: "はい、とても美味しいです。シェフに伝えてください！", correct: true },
          { text: "Yes the food is very delicious taste.",       trans: "はい、食べ物はとても美味しい味です。",     correct: false },
          { text: "The eating is good and delicious for me.",    trans: "食べることは私にとって良くて美味しいです。", correct: false },
        ]},
      { aiLine: "Can I get you anything else? Dessert, perhaps?", aiTrans: "他にご注文はございますか？デザートはいかがでしょうか？",
        options: [
          { text: "Actually, yes! What desserts do you have?",   trans: "そうですね！どんなデザートがありますか？", correct: true  },
          { text: "I want to see the dessert menu please.",      trans: "デザートメニューを見たいです。",           correct: false },
          { text: "Yes please show me what dessert you have.",   trans: "はい、どんなデザートがあるか見せてください。", correct: false },
        ]},
      { aiLine: "Would you like separate checks, or all together?", aiTrans: "別々でお支払いですか、それともまとめてですか？",
        options: [
          { text: "All together, please. I'll get it.",          trans: "まとめて、お願いします。私が払います。",   correct: true  },
          { text: "We pay together in one.",                     trans: "一つにまとめて払います。",                 correct: false },
          { text: "Together is fine for us.",                    trans: "まとめてが私たちには良いです。",           correct: false },
        ]},
      { aiLine: "I hope you enjoyed your meal! Please come again!", aiTrans: "お食事を楽しんでいただけたでしょうか！またぜひお越しください！",
        options: [
          { text: "It was fantastic! We'll definitely be back.",  trans: "素晴らしかったです！絶対また来ます。",     correct: true  },
          { text: "Yes the meal was enjoyed by us.",             trans: "はい、食事は私たちに楽しまれました。",     correct: false },
          { text: "We enjoyed. We will come again next time.",   trans: "楽しみました。次回またきます。",           correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 5. 🛒 Shopping
  // ─────────────────────────────────────────────────────────────
  {
    id: 'shopping', title: 'Shopping at a Store', situation: 'ブランドショップで服を購入する', emoji: '🛒',
    exchanges: [
      { aiLine: "Hi there! Can I help you find anything today?", aiTrans: "いらっしゃいませ！何かお探しですか？",
        options: [
          { text: "Yes, I'm looking for a casual jacket.",       trans: "はい、カジュアルジャケットを探しています。", correct: true },
          { text: "I am wanting to find a jacket.",              trans: "ジャケットを見つけたいです。",             correct: false },
          { text: "Yes, jacket is what I want to find.",         trans: "はい、ジャケットが見つけたいものです。",   correct: false },
        ]},
      { aiLine: "Do you have a particular size in mind?", aiTrans: "サイズはご希望がありますか？",
        options: [
          { text: "I usually wear a medium.",                    trans: "普通はMサイズです。",                     correct: true  },
          { text: "My size is the medium one.",                  trans: "私のサイズはMです。",                     correct: false },
          { text: "I am wearing size medium normally.",          trans: "普通はMサイズを着ています。",             correct: false },
        ]},
      { aiLine: "We have this style in black, navy, and olive green. Which do you prefer?", aiTrans: "このスタイルはブラック・ネイビー・オリーブグリーンがあります。どれがよろしいですか？",
        options: [
          { text: "The navy one looks great. Can I try it on?",  trans: "ネイビーが良さそうです。試着できますか？", correct: true  },
          { text: "I want to try the navy color one.",           trans: "ネイビーカラーのを試したいです。",         correct: false },
          { text: "Navy is my color choice. Try on possible?",  trans: "ネイビーが私の色の選択。試着可能ですか？", correct: false },
        ]},
      { aiLine: "The fitting rooms are right over here. Let me know how it fits!", aiTrans: "試着室はすぐそこです。サイズ感を教えてください！",
        options: [
          { text: "Thank you! I'll be right out.",               trans: "ありがとうございます！すぐ出てきます。",   correct: true  },
          { text: "OK I go to fitting room now.",                trans: "はい、今試着室に行きます。",               correct: false },
          { text: "I will try the clothes in the room.",         trans: "部屋で服を試します。",                     correct: false },
        ]},
      { aiLine: "How does it fit? Does it feel comfortable?", aiTrans: "サイズはいかがですか？着心地はよいですか？",
        options: [
          { text: "It fits perfectly! I'll take it.",            trans: "ぴったりです！これにします。",             correct: true  },
          { text: "Yes it is the good fit for me.",              trans: "はい、私には良いフィットです。",           correct: false },
          { text: "The jacket fits well and I want it.",         trans: "ジャケットはよく合い、欲しいです。",       correct: false },
        ]},
      { aiLine: "Would you like to pay full price, or would you like to use a coupon?", aiTrans: "通常価格でお支払いになりますか？それともクーポンをお使いになりますか？",
        options: [
          { text: "Do you accept digital coupons? I have one on my phone.", trans: "デジタルクーポンは使えますか？スマホにあります。", correct: true },
          { text: "I have coupon on my smartphone phone.",       trans: "スマートフォンにクーポンがあります。",     correct: false },
          { text: "Yes I want to use coupon if possible.",       trans: "はい、可能ならクーポンを使いたいです。",   correct: false },
        ]},
      { aiLine: "That'll be $89. And would you like a bag?", aiTrans: "89ドルです。袋はご入り用ですか？",
        options: [
          { text: "Yes, please. I'll pay by card.",              trans: "はい、お願いします。カードで払います。",   correct: true  },
          { text: "Yes give me bag. I pay with card.",           trans: "はい、袋をください。カードで払います。",   correct: false },
          { text: "Bag is needed by me. Card payment please.",   trans: "袋が私に必要です。カード払いでお願いします。", correct: false },
        ]},
      { aiLine: "We also have matching trousers if you're interested.", aiTrans: "ご興味があれば、お揃いのパンツもございます。",
        options: [
          { text: "Oh really? I might check those out too.",     trans: "本当ですか？そちらも見てみます。",         correct: true  },
          { text: "Yes I want to see the matching trousers.",    trans: "はい、お揃いのパンツを見たいです。",       correct: false },
          { text: "Interesting, show me the matching trouser.",  trans: "面白いです、お揃いのパンツを見せてください。", correct: false },
        ]},
      { aiLine: "Here's your receipt. You can return it within 30 days.", aiTrans: "レシートです。30日以内は返品が可能です。",
        options: [
          { text: "Good to know. Thanks for all your help today!", trans: "覚えておきます。今日はいろいろありがとうございました！", correct: true },
          { text: "OK I understand the return policy.",          trans: "はい、返品ポ��シーを理解しました。",       correct: false },
          { text: "Thank you for the receipt and information.",  trans: "レシートと情報をありがとう。",             correct: false },
        ]},
      { aiLine: "Come back anytime! We have new arrivals every week.", aiTrans: "またいつでもお越しください！毎週新商品が入ります。",
        options: [
          { text: "I definitely will! You've been so helpful.",  trans: "絶対また来ます！とても助かりました。",     correct: true  },
          { text: "OK I will come back when new things arrive.", trans: "新商品が来たらまた戻ります。",             correct: false },
          { text: "Yes I return here in the future times.",      trans: "はい、将来の時間にここに戻ります。",       correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 6. 🗺️ Asking Directions
  // ���────────────────────────────────────────────────────────────
  {
    id: 'directions', title: 'Asking for Directions', situation: '道で見知らぬ人に道を尋ねる', emoji: '🗺️',
    exchanges: [
      { aiLine: "Hi, can I help you?", aiTrans: "こんにちは、何かお手伝いできますか？",
        options: [
          { text: "Yes, please! I'm a bit lost. Could you help me?", trans: "はい！少し迷っています。助けてもらえますか？", correct: true },
          { text: "Yes I am lost and need help.",                trans: "はい、迷っていて助けが必要です。",         correct: false },
          { text: "I don't know where I am. Help me.",           trans: "どこにいるかわかりません。助けてください。", correct: false },
        ]},
      { aiLine: "Sure! Where are you trying to get to?", aiTrans: "もちろん！どこに行きたいですか？",
        options: [
          { text: "I'm looking for Central Park. Is it far from here?", trans: "セントラルパークを探しています。ここから遠いですか？", correct: true },
          { text: "I want to go to Central Park place.",         trans: "セントラルパークという場所に行きたいです。", correct: false },
          { text: "Central Park is my destination to go.",       trans: "セントラルパークが私の行く目的地です。",   correct: false },
        ]},
      { aiLine: "Not at all! It's about a 10-minute walk from here.", aiTrans: "全然遠くないですよ！ここから歩いて約10分です。",
        options: [
          { text: "Oh great! Which direction should I head?",    trans: "それは良かった！どちらの方向に向かえばいいですか？", correct: true },
          { text: "OK 10 minutes walking. Where I go?",          trans: "はい、10分歩きます。どこへ行きますか？",   correct: false },
          { text: "Thank you. What is the direction for going?", trans: "ありがとう。どの方向に行けばいいですか？", correct: false },
        ]},
      { aiLine: "Head straight down this road for two blocks, then turn left at the traffic light.", aiTrans: "この道を2ブロック真っ直ぐ進んで、信号を左に曲がってください。",
        options: [
          { text: "So straight for two blocks, then left at the light. Got it!", trans: "2ブロック直進して信号で左ですね。わかりました！", correct: true },
          { text: "I go straight two blocks and turn left.",     trans: "直進2ブロックで左折します。",               correct: false },
          { text: "Two blocks straight, after that left turn light.", trans: "2ブロック直進、その後左折信号。",     correct: false },
        ]},
      { aiLine: "After you turn left, you'll see a big green entrance on your right.", aiTrans: "左折すると、右手に大きな緑の入口が見えてきます。",
        options: [
          { text: "Perfect, a green entrance on the right. I'll keep an eye out for that.", trans: "わかりました、右手の緑の入口ですね。気をつけて探します。", correct: true },
          { text: "OK the green entrance is on right side.",     trans: "はい、緑の入口は右側です。",               correct: false },
          { text: "I will look for the green color entrance.",   trans: "緑色の入口を探します。",                   correct: false },
        ]},
      { aiLine: "You really can't miss it. It's quite large.", aiTrans: "見逃すことはないですよ。かなり大きいですから。",
        options: [
          { text: "Wonderful! Is there a landmark nearby so I know I'm going the right way?", trans: "素晴らしい！正しい方向を確認するためのランドマークはありますか？", correct: true },
          { text: "OK the entrance is very big and easy to see.", trans: "はい、入口はとても大きくて見やすいです。", correct: false },
          { text: "I understand it is large so I find it easy.", trans: "大きいので見つけやすいと理解しています。", correct: false },
        ]},
      { aiLine: "There's a Starbucks on the corner just before you turn left.", aiTrans: "左折する直前の角にスターバックスがあります。",
        options: [
          { text: "Oh, perfect. That'll be easy to spot. Thanks a lot!", trans: "それは完璧です。見つけやすいですね。ありがとうございます！", correct: true },
          { text: "Good, Starbucks is on the corner before turning.", trans: "良い、スターバックスは角に曲がる前にあります。", correct: false },
          { text: "I know Starbucks so I find the corner easy.", trans: "スターバックスを知っているので角を見つけやすいです。", correct: false },
        ]},
      { aiLine: "No problem at all. Are you visiting the area for the first time?", aiTrans: "どういたしまして。このエリアは初めてですか？",
        options: [
          { text: "Yes, first time in New York! It's amazing.",  trans: "はい、ニューヨーク初めてです！すごいですね。", correct: true },
          { text: "Yes it is my first time visiting here.",      trans: "はい、ここを訪問するのは初めてです。",     correct: false },
          { text: "I come here the first time, yes.",            trans: "はい、ここに初めて来ました。",             correct: false },
        ]},
      { aiLine: "Welcome to New York! You're going to love Central Park.", aiTrans: "ニューヨークへようこそ！セントラルパークは絶対好きになりますよ。",
        options: [
          { text: "I can't wait! Thanks so much for your help.",  trans: "楽しみです！本当にありがとうございました。", correct: true },
          { text: "Thank you for the welcome and your helping.", trans: "歓迎してくれてありがとう、助けてくれて。",   correct: false },
          { text: "Yes I will love the park very much surely.",  trans: "はい、絶対に公園がとても好きになります。", correct: false },
        ]},
      { aiLine: "Enjoy your day! Don't forget to check out the Boathouse while you're there!", aiTrans: "楽しんでください！ボートハウスも見てみてくださいね！",
        options: [
          { text: "I'll make sure to! You've been incredibly helpful.", trans: "必ず見ます！本当に助かりました。",   correct: true  },
          { text: "OK I will go to the Boathouse place.",        trans: "はい、ボートハウスという場所に行きます。", correct: false },
          { text: "Thank you for the day enjoying suggestion.",  trans: "一日の楽しむ提案をありがとう。",           correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 7. 👋 Making New Friends
  // ─────────────────────────────────────────────────────────────
  {
    id: 'friends', title: 'Making New Friends', situation: '海外留学先のパーティーで新しい友達を作る', emoji: '👋',
    exchanges: [
      { aiLine: "Hey! I don't think we've met. I'm Sam.", aiTrans: "やあ！会ったことなかったよね。サムだよ。",
        options: [
          { text: "Hey Sam! I'm Yuki. Nice to meet you!",        trans: "サム！ユキだよ。よろしくね！",             correct: true  },
          { text: "Hello, my name is Yuki. It is pleasure.",     trans: "こんにちは、私の名前はユキです。光栄です。", correct: false },
          { text: "I am Yuki. This is my name.",                 trans: "私はユキです。これが私の名前です。",       correct: false },
        ]},
      { aiLine: "Where are you from, Yuki?", aiTrans: "ユキはどこ出身なの？",
        options: [
          { text: "I'm from Japan, originally from Osaka.",      trans: "日本出身で、元々は大阪です。",             correct: true  },
          { text: "I come from the country of Japan.",           trans: "日本という国から来ています。",             correct: false },
          { text: "My country where I come from is Japan.",      trans: "私が来た国は日本です。",                   correct: false },
        ]},
      { aiLine: "Oh cool, Japan! What brings you here?", aiTrans: "日本か、いいね！ここに来た理由は？",
        options: [
          { text: "I'm studying music here for a year.",         trans: "音楽を勉強するために1年間来ています。",     correct: true  },
          { text: "I come here to study the music for one year.", trans: "1年間音楽を勉強するためにここに来ました。", correct: false },
          { text: "Music studying is why I am here for year.",   trans: "音楽の勉強が私がここに1年いる理由です。", correct: false },
        ]},
      { aiLine: "Music? That's awesome! What instrument do you play?", aiTrans: "音楽？それいいね！どの楽器を演奏するの？",
        options: [
          { text: "I play piano and drums. What about you?",     trans: "ピアノとドラムを弾きます。あなたは？",     correct: true  },
          { text: "I play piano and drum. And you?",             trans: "ピアノとドラムを弾きます。あなたは？",     correct: false },
          { text: "My instruments are piano and also the drums.", trans: "私の楽器はピアノとまたドラムです。",     correct: false },
        ]},
      { aiLine: "No way! I play guitar. We should jam sometime!", aiTrans: "嘘！ギターを弾くよ。いつかセッションしようよ！",
        options: [
          { text: "That would be amazing! I'd love that.",       trans: "それは素晴らしい！ぜひやりたい！",         correct: true  },
          { text: "Yes I want to do jam session with you.",      trans: "はい、あなたとジャムセッションしたいです。", correct: false },
          { text: "OK we can do the jamming together sometime.", trans: "はい、いつかー緒にジャムできます。",       correct: false },
        ]},
      { aiLine: "How long have you been here so far?", aiTrans: "ここに来てどのくらいになる？",
        options: [
          { text: "Just about two months. I'm still getting used to everything!", trans: "約2ヶ月です。まだいろいろ慣れているところです！", correct: true },
          { text: "Two months I have been here already.",        trans: "もう2ヶ月ここにいます。",                 correct: false },
          { text: "I am here since two months ago.",             trans: "2ヶ月前からここにいます。",               correct: false },
        ]},
      { aiLine: "Is the food here very different from Japan?", aiTrans: "こっちの食べ物は日本と全然違う？",
        options: [
          { text: "Pretty different! I miss Japanese food, but I'm starting to love the food here.", trans: "かなり違います！和食が恋しいですが、こっちの料理も好きになってきました。", correct: true },
          { text: "Yes the food here is very different from Japan food.", trans: "はい、こちらの食べ物は日本の食べ物とかなり違います。", correct: false },
          { text: "I miss Japan food but here food is also OK.", trans: "日本食は恋しいがここの食べ物もOKです。", correct: false },
        ]},
      { aiLine: "You should try some local restaurants. I know some great spots!", aiTrans: "地元のレストランに行ってみるべきだよ。いいお店知ってるよ！",
        options: [
          { text: "Oh, I'd love some recommendations! What do you suggest?", trans: "おすすめを教えてほしい！何がいいですか？", correct: true },
          { text: "Yes please tell me the good restaurant places.", trans: "はい、良いレストランの場所を教えてください。", correct: false },
          { text: "I want you to recommend good eating places.", trans: "良い食事場所をおすすめしてほしいです。",   correct: false },
        ]},
      { aiLine: "Are you free this weekend? A few of us are going to a concert.", aiTrans: "今週末空いてる？何人かでコンサートに行くんだけど。",
        options: [
          { text: "That sounds fun! I'd love to join if it's okay.", trans: "楽しそう！よければ参加させてほしいな。", correct: true },
          { text: "Yes I am free and I want to join concert.",   trans: "はい、空いていてコンサートに参加したいです。", correct: false },
          { text: "Concert sounds good. I can come on weekend.", trans: "コンサートは良いですね。週末に来られます。", correct: false },
        ]},
      { aiLine: "Great! Let me get your number so I can send you the details.", aiTrans: "やった！連絡先を教えてもらえれば詳細を送るよ。",
        options: [
          { text: "Sure! Here it is. Looking forward to it!",    trans: "もちろん！どうぞ。楽しみにしています！",   correct: true  },
          { text: "OK I give you my phone number now.",          trans: "はい、今電話番号を渡します。",             correct: false },
          { text: "You can have my number. I look forward.",     trans: "番号を持っていいです。楽しみにしています。", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 8. 💪 At the Gym
  // ─────────────────────────────────────────────────────────────
  {
    id: 'gym', title: 'At the Gym', situation: 'ジムでトレーナーに相談し、マシンの使い方を聞く', emoji: '💪',
    exchanges: [
      { aiLine: "Hey! First time at this gym?", aiTrans: "やあ！このジムは初めてですか？",
        options: [
          { text: "Yes, I just signed up today. Is it obvious?", trans: "はい、今日入会しました。わかりますか？",   correct: true  },
          { text: "Yes it is my first time this gym.",           trans: "はい、このジムは初めてです。",             correct: false },
          { text: "I signed up today so yes it is first time.",  trans: "今日入会したのではい、初めてです。",       correct: false },
        ]},
      { aiLine: "Ha! No worries. I'm Jake, one of the trainers here. Let me show you around.", aiTrans: "はは！大丈夫ですよ。トレーナーのジェイクです。ご案内しますよ。",
        options: [
          { text: "That would be really helpful, thank you Jake!", trans: "それはとても助かります、ジェイクさん！",   correct: true  },
          { text: "Thank you Jake for showing me around.",       trans: "案内してくれてジェイク、ありがとう。",     correct: false },
          { text: "Yes please show me the gym around.",          trans: "はい、ジムの周りを見せてください。",       correct: false },
        ]},
      { aiLine: "What are your fitness goals? Are you looking to build muscle or lose weight?", aiTrans: "フィットネスの目標は何ですか？筋肉をつけたいですか、それとも体重を減らしたいですか？",
        options: [
          { text: "Mainly muscle building, but some cardio for stamina too.", trans: "主に筋肉をつけたいです。スタミナのためにカーディオも。", correct: true },
          { text: "I want muscle and also to do cardio.",        trans: "筋肉とカーディオもしたいです。",           correct: false },
          { text: "My goal is muscle building and cardio doing.", trans: "目標は筋肉づくりとカーディオすることです。", correct: false },
        ]},
      { aiLine: "How often are you planning to come in?", aiTrans: "どのくらいの頻度で来る予定ですか？",
        options: [
          { text: "I'm aiming for about 4 times a week.",        trans: "週4回を目標にしています。",               correct: true  },
          { text: "I will come 4 times in one week.",            trans: "1週間に4回来ます。",                       correct: false },
          { text: "My coming plan is 4 times per the week.",     trans: "来る計画は週4回です。",                   correct: false },
        ]},
      { aiLine: "Perfect. Let me show you how to use this cable machine properly.", aiTrans: "良いですね。このケーブルマシンの正しい使い方を教えます。",
        options: [
          { text: "Sure! I want to make sure I'm using it safely.", trans: "はい！安全に使いたいので助かります。",   correct: true  },
          { text: "Yes please teach me how to use machine.",     trans: "はい、マシンの使い方を教えてください。",   correct: false },
          { text: "I want to learn the correct using of machine.", trans: "マシンの正しい使い方を学びたいです。", correct: false },
        ]},
      { aiLine: "Always keep your core tight and your back straight. Never arch it.", aiTrans: "常に体幹を締めて背筋を真っ直ぐに。絶対に反らしてはいけません。",
        options: [
          { text: "Got it. Core tight, back straight. I'll remember that.", trans: "わかりました。体幹を締めて、背中を真っ直ぐ。覚えます。", correct: true },
          { text: "OK I will tight core and straight back.",     trans: "はい、体幹を締めて背中を真っ直ぐにします。", correct: false },
          { text: "I understand the core tight and back straight rule.", trans: "体幹締め・背中真っ直ぐルールを理解しました。", correct: false },
        ]},
      { aiLine: "Start with a lighter weight to warm up. How does that feel?", aiTrans: "軽い重量からウォームアップしましょう。どんな感じですか？",
        options: [
          { text: "It feels manageable. Should I increase the weight?", trans: "いけそうです。重量を上げてみますか？", correct: true },
          { text: "It is OK weight. I can do more weight.",      trans: "OKの重量です。もっと重くできます。",       correct: false },
          { text: "The weight is light and I can add more.",     trans: "重量が軽くてもっと追加できます。",         correct: false },
        ]},
      { aiLine: "Try 3 sets of 12 reps. Rest for 60 seconds between sets.", aiTrans: "12回3セットやってみてください。セット間は60秒休憩。",
        options: [
          { text: "Sounds good. I'll time my rest with my phone.", trans: "わかりました。スマホで休憩時間を計���ます。", correct: true },
          { text: "OK 3 sets 12 times and 60 second rest.",      trans: "はい、3セット12回と60秒休憩。",             correct: false },
          { text: "I will do 3 sets with 12 reps and rest 60.",  trans: "12回3セットと60秒休憩をします。",           correct: false },
        ]},
      { aiLine: "You're doing great! Keep that form consistent throughout.", aiTrans: "上手いですよ！そのフォームを最後まで保ってください。",
        options: [
          { text: "Thanks! I can already feel it working.",      trans: "ありがとうございます！効いているのが感じられます。", correct: true },
          { text: "Thank you. I feel the effect of exercise.",   trans: "ありがとう。運動の効果を感じます。",       correct: false },
          { text: "OK I keep the form consistent like you said.", trans: "はい、おっしゃったようにフォームを保ちます。", correct: false },
        ]},
      { aiLine: "Nice workout today! See you next time!", aiTrans: "今日はいいトレーニングでした！またね！",
        options: [
          { text: "Thanks for all the tips, Jake! See you next time!", trans: "アドバイスありがとうジェイク！またね！", correct: true },
          { text: "OK thank you Jake. I will come next time.",   trans: "はい、ありがとうジェイク。次回来ます。",   correct: false },
          { text: "Good workout. I see you the next time.",      trans: "良いトレーニング。次回またね。",           correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 9. 📞 Phone Conversation
  // ─────────────────────────────────────────────────────────────
  {
    id: 'phone', title: 'Phone Conversation', situation: '英語で病院の予約電話をかける', emoji: '📞',
    exchanges: [
      { aiLine: "Good afternoon, City Medical Center. How can I help you?", aiTrans: "こんにちは、シティ医療センターです。どのようなご用件ですか？",
        options: [
          { text: "Hi, I'd like to make an appointment to see a doctor, please.", trans: "こんにちは、診察の予約をしたいのですが。", correct: true },
          { text: "Hello, I want appointment with doctor.",      trans: "こんにちは、医師と予約したいです。",       correct: false },
          { text: "I am calling to make the doctor appointment.", trans: "医師の予約をするために電話しています。", correct: false },
        ]},
      { aiLine: "Of course. Is this for a new patient or an existing patient?", aiTrans: "もちろんです。新患ですか、それとも既存の患者様ですか？",
        options: [
          { text: "I'm a new patient. This is my first time.",   trans: "新患です。初めての来院です。",             correct: true  },
          { text: "I am new patient. It is first time for me.",  trans: "新患です。初めてです。",                   correct: false },
          { text: "This is the first time so I am new.",         trans: "初めてなので新患です。",                   correct: false },
        ]},
      { aiLine: "What seems to be the problem?", aiTrans: "どのような症状がありますか？",
        options: [
          { text: "I've had a sore throat and a mild fever for three days.", trans: "3日間、喉の痛みと軽い熱があります。", correct: true },
          { text: "I have sore throat and fever since 3 days.", trans: "3日間、喉の痛みと熱があります。",           correct: false },
          { text: "My throat is hurting and fever for 3 days.", trans: "喉が痛くて3日間熱があります。",             correct: false },
        ]},
      { aiLine: "I see. Are you available this Thursday at 2 PM?", aiTrans: "わかりました。今週木曜日の午後2時はご都合よろしいですか？",
        options: [
          { text: "Yes, Thursday at 2 PM works for me.",         trans: "はい、木曜の午後2時で大丈夫です。",       correct: true  },
          { text: "Yes Thursday 2 PM is OK for me.",             trans: "はい、木曜14時は私にはOKです。",           correct: false },
          { text: "I can come on Thursday at the 2 PM time.",    trans: "木曜の午後2時という時間に来られます。",   correct: false },
        ]},
      { aiLine: "Great. May I have your full name and date of birth?", aiTrans: "ありがとうございます。フルネームと生年月日をお聞かせください。",
        options: [
          { text: "Sure. It's Yuki Tanaka, born March 15th, 1998.", trans: "はい。田中ユキ、1998年3月15日生まれです。", correct: true },
          { text: "My name is Yuki Tanaka, birthday is March 15, 1998.", trans: "名前は田中ユキ、誕生日は1998年3月15日です。", correct: false },
          { text: "I am Yuki Tanaka and born on the 15 March 1998.", trans: "私は田中ユキで1998年3月15日生まれです。", correct: false },
        ]},
      { aiLine: "And a phone number where we can reach you?", aiTrans: "ご連絡先の電話番号をお聞かせください。",
        options: [
          { text: "It's 080-1234-5678.",                         trans: "080-1234-5678です。",                     correct: true  },
          { text: "My phone number is 080-1234-5678.",           trans: "私の電話番号は080-1234-5678です。",       correct: false },
          { text: "You can call me on 080-1234-5678 number.",    trans: "私への電話は080-1234-5678番にできます。", correct: false },
        ]},
      { aiLine: "Do you have any health insurance?", aiTrans: "健康保険はお持ちですか？",
        options: [
          { text: "Yes, I have international health insurance through my school.", trans: "はい、学校の国際健康保険があります。", correct: true },
          { text: "Yes I have insurance from my school.",        trans: "はい、学校からの保険があります。",         correct: false },
          { text: "My school gives me international insurance.", trans: "学校が国際保険を与えてくれます。",         correct: false },
        ]},
      { aiLine: "Perfect. Please arrive 10 minutes early to fill out paperwork.", aiTrans: "わかりました。書類記入のため10分前にお越しください。",
        options: [
          { text: "Of course, I'll be there 10 minutes early.",  trans: "もちろんです、10分前に参ります。",         correct: true  },
          { text: "OK I come 10 minutes earlier than appointment.", trans: "はい、予約より10分早く来ます。",       correct: false },
          { text: "I will arrive before 10 minutes early.",      trans: "10分前に早く到着します。",                 correct: false },
        ]},
      { aiLine: "Is there anything else I can help you with?", aiTrans: "他にご用件はございますか？",
        options: [
          { text: "No, that's everything. Thank you so much!",   trans: "いいえ、以上です。ありがとうございます！", correct: true  },
          { text: "No thank you, that is all I need.",           trans: "いいえありがとう、必要なことは以上です。", correct: false },
          { text: "Nothing else, I am done with this call.",     trans: "他には何もなく、この電話は終わりです。",   correct: false },
        ]},
      { aiLine: "You're welcome. See you Thursday. Take care and feel better soon!", aiTrans: "どういたしまして。木曜日にお待ちしています。お大事にどうぞ！",
        options: [
          { text: "Thank you! See you Thursday.",                 trans: "ありがとうございます！木曜日に。",         correct: true  },
          { text: "OK goodbye for now Thursday see you.",        trans: "はい、では木曜日にさようなら。",           correct: false },
          { text: "Thank you very much for helping me today.",   trans: "今日助けてくれてありがとうございます。",   correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 10. 💼 Job Interview
  // ─────────────────────────────────────────────────────────────
  {
    id: 'interview', title: 'Job Interview', situation: 'ミュージックスタジオでのアシスタント職の面接', emoji: '💼',
    exchanges: [
      { aiLine: "Please have a seat. Thanks for coming in today.", aiTrans: "どうぞお座りください。今日はお越しいただきありがとうございます。",
        options: [
          { text: "Thank you for having me. I've been looking forward to this.", trans: "お招きいただきありがとうございます。楽しみにしていました。", correct: true },
          { text: "Thank you. I am looking forward to this interview.", trans: "ありがとう。この面接を楽しみにしていました。", correct: false },
          { text: "Thank you very much for giving me this chance.", trans: "このチャンスをくれてありがとうございます。", correct: false },
        ]},
      { aiLine: "Tell me a little about yourself.", aiTrans: "自己紹介をお願いします。",
        options: [
          { text: "Sure. I'm Yuki, a music student from Japan. I've been playing piano for 10 years and I'm passionate about music production.", trans: "はい。日本出身の音楽学生ユキです。10年間ピアノを演奏しており、音楽プロダクションに情熱を持っています。", correct: true },
          { text: "I am Yuki from Japan. I play piano 10 years and love music production.", trans: "日本からのユキです。10年ピアノを弾き音楽プロダクションが好きです。", correct: false },
          { text: "My name is Yuki. I am Japanese music student who plays piano.", trans: "私の名前はユキです。ピアノを弾く日本人音楽学生です。", correct: false },
        ]},
      { aiLine: "What experience do you have with recording software?", aiTrans: "レコーディングソフトウェアの経験はありますか？",
        options: [
          { text: "I have two years of experience with Logic Pro, and I've also used Pro Tools on a few projects.", trans: "Logic Proを2年間使用しており、いくつかのプロジェクトでPro Toolsも使いました。", correct: true },
          { text: "I use Logic Pro for 2 years and some Pro Tools.", trans: "2年間Logic Proと少しのPro Toolsを使います。", correct: false },
          { text: "My experience is Logic Pro 2 years and also Pro Tools.", trans: "経験はLogic Pro 2年とPro Toolsもです。", correct: false },
        ]},
      { aiLine: "Why are you interested in working at this studio?", aiTrans: "なぜこのスタジオで働きたいのですか？",
        options: [
          { text: "Your studio has an amazing reputation for working with emerging artists, and I'd love to contribute to that environment.", trans: "このスタジオは新進アーティストとの仕事で素晴らしい評判があり、その環境に貢献したいと思っています。", correct: true },
          { text: "Your studio is very famous and I want to work here.", trans: "このスタジオはとても有名で、ここで働きたいです。", correct: false },
          { text: "I like music and this studio is good place to work.", trans: "音楽が好きでこのスタジオは働くのに良い場所です。", correct: false },
        ]},
      { aiLine: "Where do you see yourself in five years?", aiTrans: "5年後の自分をどのように描いていますか？",
        options: [
          { text: "I'd like to be a full-time music producer, working with both Japanese and international artists.", trans: "フルタイムの音楽プロデューサーとして日本と海外のアーティストと仕事したいです。", correct: true },
          { text: "In 5 years I want to be music producer.",     trans: "5年後に音楽プロデューサーになりたいです。", correct: false },
          { text: "My future is becoming music producer in 5 years.", trans: "私の未来は5年後に音楽プロデューサーになることです。", correct: false },
        ]},
      { aiLine: "What are your greatest strengths?", aiTrans: "あなたの最大の強みは何ですか？",
        options: [
          { text: "I'm detail-oriented and I work well under pressure. I also pick up new tools quickly.", trans: "細部にこだわり、プレッシャー下でもうまく機能します。新しいツールも素早く習得します。", correct: true },
          { text: "I am very careful and fast learning person.", trans: "私はとても注意深く素早く学ぶ人です。",       correct: false },
          { text: "My strong points are detail care and fast to learn.", trans: "強みは細部のケアと素早い学習です。", correct: false },
        ]},
      { aiLine: "Do you have any questions for us?", aiTrans: "弊社についてご質問はありますか？",
        options: [
          { text: "Yes! What does a typical day look like for this role?", trans: "はい！この役職の典型的な一日はどのようなものですか？", correct: true },
          { text: "Yes, what do I do in typical day of this job?", trans: "はい、この仕事の典型的な一日に何をしますか？", correct: false },
          { text: "I want to know what work I do every day here.", trans: "毎日何の仕事をするか知りたいです。",       correct: false },
        ]},
      { aiLine: "The assistant would help with session setup, client communication, and some production work.", aiTrans: "アシスタントはセッションの準備、クライアントとのコミュニケーション、プロダクション作業を手伝ってもらいます。",
        options: [
          { text: "That sounds like a great balance. I'd be excited to take on all of those responsibilities.", trans: "バランスが良さそうですね。それらすべての責任を担うのが楽しみです。", correct: true },
          { text: "OK I understand the duties. I can do all of those.", trans: "はい、職務を理解しました。すべてできます。", correct: false },
          { text: "The job sounds interesting and I want to do it.", trans: "仕事が面白そうでやりたいです。",           correct: false },
        ]},
      { aiLine: "We'll be in touch within the week. Thank you for your time.", aiTrans: "1週間以内にご連絡します。お時間をいただきありがとうございました。",
        options: [
          { text: "Thank you so much! I'm really excited about this opportunity.", trans: "ありがとうございます！このチャンスにとても興奮しています。", correct: true },
          { text: "Thank you. I wait for your contact.",          trans: "ありがとう。ご連絡をお待ちします。",       correct: false },
          { text: "I am happy to wait for the answer from you.", trans: "あなたからの返答を待つのが嬉しいです。",   correct: false },
        ]},
      { aiLine: "We'll see ourselves out. It was a pleasure meeting you.", aiTrans: "お見送りします。お会いできて光栄でした。",
        options: [
          { text: "The pleasure was all mine. I hope to hear from you soon!", trans: "こちらこそ光栄でした。近いうちにご連絡をお待ちしています！", correct: true },
          { text: "Nice to meet you too. I hope for your contact.", trans: "こちらもよろしく。ご連絡を期待しています。", correct: false },
          { text: "It was also my pleasure meeting you today.",   trans: "今日お会いできたことも私の喜びでした。",   correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 11. 🎉 Party / Social
  // ─────────────────────────────────────────────────────────────
  {
    id: 'party', title: 'Party & Social', situation: '友人の誕生日パーティーでの会話', emoji: '🎉',
    exchanges: [
      { aiLine: "Hey! You made it! I'm so glad you came!", aiTrans: "やあ！来てくれたんだ！来てくれて嬉しいよ！",
        options: [
          { text: "Thanks for the invite! Happy birthday! This looks amazing.", trans: "招待してくれてありがとう！誕生日おめでとう！すごいパーティーだね。", correct: true },
          { text: "Yes I came. Happy birthday to you.",           trans: "はい、来ました。お誕生日おめでとう。",     correct: false },
          { text: "I am very happy to come to your birthday.",   trans: "あなたの誕生日に来てとても嬉しいです。",   correct: false },
        ]},
      { aiLine: "I've been looking forward to seeing you! How have you been?", aiTrans: "会うのを楽しみにしてたよ！元気だった？",
        options: [
          { text: "I've been great! Really busy with music, but loving it. How about you?", trans: "元気だよ！音楽でとても忙しいけど楽しんでるよ。あなたは？", correct: true },
          { text: "I am fine, very busy with music. And you?",   trans: "元気、音楽でとても忙しい。あなたは？",     correct: false },
          { text: "Good. I was doing music practice. You?",      trans: "元気。音楽練習をしていました。あなたは？", correct: false },
        ]},
      { aiLine: "There are some people I'd love to introduce you to. Do you mind?", aiTrans: "紹介したい人がいるんだけど。いい？",
        options: [
          { text: "Not at all! I'd love to meet more people.",   trans: "もちろん！もっと人と出会いたいな。",       correct: true  },
          { text: "Yes please introduce me to people.",          trans: "はい、人々に紹介してください。",           correct: false },
          { text: "I don't mind. New people are OK for me.",     trans: "構いません。新しい人々は私に大丈夫です。", correct: false },
        ]},
      { aiLine: "This is Mike! He's also a musician.", aiTrans: "こちらマイク！彼も音楽家だよ。",
        options: [
          { text: "Hey Mike! Nice to meet you. What kind of music do you play?", trans: "マイク！はじめまして。どんな音楽をやってるの？", correct: true },
          { text: "Hello Mike. I am Yuki. I play music too.",    trans: "こんにちはマイク。私はユキです。私も音楽をします。", correct: false },
          { text: "Nice to meet Mike. What music are you playing?", trans: "マイクに会えて嬉しい。どんな音楽を弾い���るの？", correct: false },
        ]},
      { aiLine: "I play jazz trumpet. What about you?", aiTrans: "ジャズトランペットを吹いてるよ。あなたは？",
        options: [
          { text: "I'm primarily a pianist, but I drum too. I love jazz — do you perform live often?", trans: "主にピアニストですがドラムも。ジャズが大好き——よくライブをするの？", correct: true },
          { text: "I play piano and drum. I also love jazz music.", trans: "ピアノとドラムを弾きます。ジャズも好きです。", correct: false },
          { text: "Piano is my instrument. Drum also. Jazz is good.", trans: "ピアノが楽器。ドラムも。ジャズは良いです。", correct: false },
        ]},
      { aiLine: "Yeah, we have a gig next Friday at a bar downtown. You should come!", aiTrans: "そうだよ、来週金曜日に街のバーでライブがあるよ。来なよ！",
        options: [
          { text: "That sounds great! I'd love to come. What time does it start?", trans: "それは良さそう！ぜひ行きたい。何時開始ですか？", correct: true },
          { text: "Yes I will come to your live music gig.",     trans: "はい、ライブに来ます。",                   correct: false },
          { text: "I want to come. When the gig is starting?",   trans: "行きたいです。ライブは何時から始まりますか？", correct: false },
        ]},
      { aiLine: "Around 8 PM. I can put you on the guest list!", aiTrans: "夜8時頃だよ。ゲストリストに入れてあげるよ！",
        options: [
          { text: "That's so kind of you! I'll definitely be there.", trans: "それはご親切に！絶対行きます。",       correct: true  },
          { text: "Thank you very kind. I definitely go there.", trans: "とても親切にありがとう。絶対そこに行きます。", correct: false },
          { text: "Very nice of you. I will come at 8PM Friday.", trans: "あなたはとても良いです。金曜8時に来ます。", correct: false },
        ]},
      { aiLine: "By the way, can I try some of that food you brought?", aiTrans: "ところで、持ってきた料理を試していい？",
        options: [
          { text: "Of course! It's Japanese onigiri. I made it myself.", trans: "もちろん！日本のおにぎりだよ。自分で作ったんだ。", correct: true },
          { text: "Yes please eat it. I made Japanese onigiri.", trans: "はい、食べてください。日本のおにぎりを作りました。", correct: false },
          { text: "It is OK to eat. This is onigiri from Japan.", trans: "食べていいです。これは日本のおにぎりです。", correct: false },
        ]},
      { aiLine: "Oh wow, this is delicious! What's inside?", aiTrans: "すごい、美味しい！中に何が入ってるの？",
        options: [
          { text: "This one has salmon and the other has tuna mayo. Glad you like it!", trans: "これはサーモンで、もう一つはツナマヨだよ。気に入ってもらえて嬉しい！", correct: true },
          { text: "Inside is salmon and tuna mayo. Happy you like.", trans: "中身はサーモンとツナマヨです。気に入って嬉しい。", correct: false },
          { text: "I put salmon and tuna mayo as the inside ingredient.", trans: "中の材料としてサーモンとツナマヨを入れました。", correct: false },
        ]},
      { aiLine: "I'm going to need your recipe! This was the best thing I've eaten all night.", aiTrans: "レシピを教えてほしいな！今夜食べた中で一番美味しかった。",
        options: [
          { text: "Ha! I'll send you the recipe. So glad you enjoyed it! Great party by the way!", trans: "わかった！レシピ送るよ。気に入ってもらえて良かった！ところで素晴らしいパーティーだね！", correct: true },
          { text: "OK I give you recipe. I am happy you liked it.", trans: "はい、レシピを渡します。気に入ってもらえて嬉しいです。", correct: false },
          { text: "Thank you. I send recipe to you. Good party!", trans: "ありがとう。レシピを送ります。良いパーティー！", correct: false },
        ]},
    ],
  },

  // ─────────────────────────────────────────────────────────────
  // 12. 🚕 Taking a Taxi / Ride Share
  // ─────────────────────────────────────────────────────────────
  {
    id: 'taxi', title: 'Taking a Ride Share', situation: 'ライドシェアに乗って目的地に向かう', emoji: '🚕',
    exchanges: [
      { aiLine: "Hey, are you Yuki? The ride for downtown?", aiTrans: "ユキさんですか？ダウンタウン行きのご注文の方？",
        options: [
          { text: "Yes, that's me! Thanks for coming.",          trans: "はい、私です！来てくれてありがとうございます。", correct: true },
          { text: "Yes I am Yuki and I need ride downtown.",     trans: "はい、私はユキでダウンタウンへのライドが必要です。", correct: false },
          { text: "I am the person who is called Yuki, yes.",    trans: "はい、ユキと呼ばれている人間です。",       correct: false },
        ]},
      { aiLine: "Great! Go ahead and hop in. You have an address in the app?", aiTrans: "良かった！どうぞ乗ってください。アプリに住所は入れてますか？",
        options: [
          { text: "Yes, it's already set in the app. It's the music hall on 5th Ave.", trans: "はい、アプリに設定済みです。5番街のミュージックホールです。", correct: true },
          { text: "Yes I put address in app already. Music hall.", trans: "はい、アプリに住所を入れました。ミュージックホール。", correct: false },
          { text: "The address is in the app. I go to music hall.", trans: "アドレスはアプリにあります。ミュージックホールに行きます。", correct: false },
        ]},
      { aiLine: "Nice! Big event tonight?", aiTrans: "いいですね！今夜は大きなイベントがあるんですか？",
        options: [
          { text: "Yeah, I'm going to a live jazz concert. I'm really excited!", trans: "はい、ライブジャズコンサートに行きます。とても楽しみです！", correct: true },
          { text: "Yes I go to jazz concert live tonight.",       trans: "はい、今夜ジャズのライブコンサートに行きます。", correct: false },
          { text: "Tonight is jazz concert and I am going.",     trans: "今夜はジャズコンサートで私は行きます。",   correct: false },
        ]},
      { aiLine: "Oh fun! Do you play music yourself?", aiTrans: "楽しそう！ご自身も音楽をやりますか？",
        options: [
          { text: "Yes! I play piano and drums. I'm actually studying music here.", trans: "はい！ピアノとドラムを演奏します。実はここで音楽を勉強しています。", correct: true },
          { text: "Yes I play piano and drum. I study music here.", trans: "はい、ピアノとドラムを弾きます。ここで音楽を勉強しています。", correct: false },
          { text: "I am musician who plays piano and drum also.", trans: "ピアノとドラムも弾く音楽家です。",         correct: false },
        ]},
      { aiLine: "That's cool! Traffic might be a bit heavy tonight. Is that okay?", aiTrans: "いいですね！今夜は少し渋滞かもしれません。大丈夫ですか？",
        options: [
          { text: "That's fine. The concert doesn't start until 8, so I have time.", trans: "大丈夫です。コンサートは8時からなので時間はあります。", correct: true },
          { text: "It is OK because concert is at 8 PM.",        trans: "コンサートが8時なので大丈夫です。",         correct: false },
          { text: "No problem traffic. I have enough of time.",   trans: "渋滞は問題なし。十分な時間があります。",   correct: false },
        ]},
      { aiLine: "Have you been in this city long?", aiTrans: "この街には長くいますか？",
        options: [
          { text: "Just a couple of months. I moved here for school. Still exploring!", trans: "2ヶ月ほどです。学校のために引っ越してきました。まだ探索中です！", correct: true },
          { text: "I am here 2 months for my school studies.",   trans: "学校の勉強のために2ヶ月います。",           correct: false },
          { text: "Two months only. I came here for school.",    trans: "2ヶ月だけ。学校のためにここに来ました。", correct: false },
        ]},
      { aiLine: "What's your favorite thing about the city so far?", aiTrans: "今のところ、この街で一番好きなことは何ですか？",
        options: [
          { text: "Honestly, the music scene. There's live music everywhere!", trans: "正直、音楽シーンです。どこでもライブ音楽がある！", correct: true },
          { text: "The music scene is what I like most here.",   trans: "音楽シーンがここで一番好きです。",         correct: false },
          { text: "I like the most the music happening here.",   trans: "ここで起こっている音楽が一番好きです。",   correct: false },
        ]},
      { aiLine: "We're about 5 minutes away now.", aiTrans: "あと約5分で着きます。",
        options: [
          { text: "Perfect timing! Right on schedule.",          trans: "ちょうどいいタイミングですね！予定通りです。", correct: true },
          { text: "Good, 5 minutes is fine for me.",             trans: "良い、5分は私には大丈夫です。",             correct: false },
          { text: "OK 5 minutes and we are arriving there.",     trans: "はい、5分で到着します。",                   correct: false },
        ]},
      { aiLine: "I'll drop you off right in front of the main entrance.", aiTrans: "メインエントランスの目の前で降ろしますよ。",
        options: [
          { text: "That's perfect. Thank you so much!",          trans: "ありがとうございます。最高です！",         correct: true  },
          { text: "OK that is good place for me to get off.",    trans: "はい、降りるのに良い場所です。",           correct: false },
          { text: "Good place. I get out from the car there.",   trans: "良い場所。そこで車から出ます。",           correct: false },
        ]},
      { aiLine: "Here we are! Have a great time at the concert!", aiTrans: "着きましたよ！コンサートを楽しんでください！",
        options: [
          { text: "Thank you! You've been a great driver. Have a wonderful evening!", trans: "ありがとうございます！素晴らしいドライバーでした。良い夜を！", correct: true },
          { text: "Thank you driver. I enjoy the concert now.",  trans: "ありがとうドライバー。コンサートを楽しみます。", correct: false },
          { text: "Thanks for driving. Good night to you.",      trans: "運転してくれてありがとう。おやすみなさい。", correct: false },
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

// シャッフル（Fisher-Yates）
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// TTS（英語）
function speakEnglish(text: string, onEnd?: () => void): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt      = new SpeechSynthesisUtterance(text);
  utt.lang       = 'en-US';
  utt.rate       = 0.9;
  utt.pitch      = 1.0;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}

// ── メインコンポーネント ─────────────────────────────────────────
export function EnglishQuiz() {
  const todayStr  = getTodayDateStr();
  const scenario  = SCENARIOS[dayOfYear() % SCENARIOS.length];

  const [round,     setRound]     = useState<number>(0);
  const [completed, setCompleted] = useState<boolean>(false);
  const [options,   setOptions]   = useState<QuizOption[]>([]);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [feedback,  setFeedback]  = useState<'correct' | 'wrong' | null>(null);
  const [taunt,     setTaunt]     = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);
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

  // ── TTS 発音 ─────────────────────────────────────────────────
  const handleSpeak = useCallback((text: string) => {
    setIsSpeaking(true);
    speakEnglish(text, () => setIsSpeaking(false));
  }, []);

  // ── 選択肢タップ ─────────────────────────────────────────────
  const handleSelect = (idx: number) => {
    if (selected !== null) return; // already answered
    setSelected(idx);
    const opt = options[idx];
    if (opt.correct) {
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
      // 10往復クリア
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

  // ── 今日リセット（デバッグ用） ──────────────────────────────
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
          <p className="text-xs font-black text-white">スパルタ英会話クイズ</p>
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
                この調子で毎日続けろ！プロのリスニングは積み重ねだ！
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-400">明日は新しいシナリオが待っている</span>
              </div>
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
                    style={{ width: `${((round) / scenario.exchanges.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* ── AI のセリフ ── */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-lg flex-shrink-0 mt-0.5">{scenario.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-emerald-800 mb-1">
                      {scenario.title.split(' ').slice(-2).join(' ')}からのセリフ
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {currentExchange.aiLine}
                    </p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {currentExchange.aiTrans}
                    </p>
                  </div>
                  {/* TTS 発音ボタン */}
                  <button
                    onClick={() => handleSpeak(currentExchange.aiLine)}
                    disabled={isSpeaking}
                    className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isSpeaking
                        ? 'bg-emerald-500 text-white animate-pulse'
                        : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                    }`}
                    title="英語で発音を聞く"
                  >
                    🔊
                  </button>
                </div>
              </div>

              {/* ── 3択クイズ ── */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-500">
                  あなたの返答として最も自然な英文を選べ！
                </p>
                {options.map((opt, idx) => {
                  const isSelected = selected === idx;
                  const isCorrect  = opt.correct;
                  let btnClass = 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50';
                  if (isSelected && feedback === 'correct')  btnClass = 'border-green-400 bg-green-50 ring-1 ring-green-300';
                  if (isSelected && feedback === 'wrong')    btnClass = 'border-red-400 bg-red-50 ring-1 ring-red-300';
                  if (selected !== null && !isSelected && isCorrect) btnClass = 'border-green-200 bg-green-50/50 opacity-70';
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
                          {/* 選んだ時だけ TTS */}
                          {isSelected && feedback === 'correct' && (
                            <button
                              onClick={e => { e.stopPropagation(); handleSpeak(opt.text); }}
                              className="mt-1 text-[9px] text-green-600 hover:text-green-800 flex items-center gap-0.5"
                            >🔊 発音を聞く</button>
                          )}
                        </div>
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
                        : '最後の往復だ！クリアしろ！'}
                    </p>
                  </div>
                  <button
                    onClick={handleNext}
                    className="flex-shrink-0 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl transition-all"
                  >{round + 1 < scenario.exchanges.length ? '次へ →' : '🏆 完了！'}</button>
                </div>
              )}

              {feedback === 'wrong' && (
                <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-2xl">
                  <span className="text-xl flex-shrink-0">🔥</span>
                  <div className="flex-1">
                    <p className="text-sm font-black text-red-700">不正解！</p>
                    <p className="text-[10px] text-red-600 mt-0.5 leading-relaxed">{taunt}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="flex-shrink-0 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all"
                  >やり直し</button>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
