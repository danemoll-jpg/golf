import { BotPersonalityId } from '../types.js';

export type CommentaryKey =
  | 'holeStart'
  | 'greatPlaySelf'
  | 'greatPlayOther'
  | 'layoutCompleteSelf'
  | 'layoutCompleteOther'
  | 'holeWonSelf'
  | 'holeWonOther'
  | 'matchWinSelf'
  | 'matchWinOther'
  | 'matchDraw';

export interface Personality {
  id: BotPersonalityId;
  displayName: string;
  avatar: string;
  tagline: string;
  lines: Record<CommentaryKey, string[]>;
}

export const PERSONALITIES: Record<BotPersonalityId, Personality> = {
  ed: {
    id: 'ed',
    displayName: 'Ed',
    avatar: '🏌️‍♂️',
    tagline: "Quiet, confident, doesn't say much — but when he does, it lands.",
    lines: {
      holeStart: [
        "Hole {hole}. Let's see what the deck's got today.",
        'New hole, new deck. Try not to overthink it.',
        "Hole {hole} — deal 'em out.",
        'Alright. Hole {hole}.',
      ],
      greatPlaySelf: [
        'Yeah, I meant to do that.',
        'That one felt good.',
        'Every so often the deck agrees with me.',
      ],
      greatPlayOther: [
        "Nice. Didn't expect that from you.",
        'Alright. Not bad.',
        'Huh. That was actually a good swap.',
        'Okay, I saw that one.',
      ],
      layoutCompleteSelf: [
        "Layout's full. Let's see who's chasing.",
        "That's me done. Good luck catching up.",
      ],
      layoutCompleteOther: [
        "{player}'s all flipped. Clock's running.",
        "And {player}'s finished. Everybody else, last call.",
      ],
      holeWonSelf: [
        'Low score, my way. I\'ll take it.',
        "That's a hole in my favor.",
        'Quietly, that was a good hole for me.',
      ],
      holeWonOther: [
        'Hole goes to {player}. Fine.',
        '{player} takes that one. Noted.',
      ],
      matchWinSelf: [
        "Nine holes, lowest score. That's the whole game, really.",
        "Guess I'll take the trophy nobody made.",
      ],
      matchWinOther: [
        '{player} wins it. You earned that one.',
        'Well played, {player}. Truly.',
      ],
      matchDraw: [
        'A tie. Somehow that feels about right.',
        'Dead even after nine holes. Nobody blinked.',
      ],
    },
  },
  carol: {
    id: 'carol',
    displayName: 'Carol',
    avatar: '🏌️‍♀️',
    tagline: 'Loud, encouraging, your biggest fan — until you play too well, then watch out.',
    lines: {
      holeStart: [
        'Hole {hole}, baby, let\'s GO!',
        'New hole! Everybody flip those cards, c\'mon!',
        "Alright, hole {hole} — who's feeling lucky?!",
        "Here we go, hole {hole}! I love this part!",
      ],
      greatPlaySelf: [
        'Ha! Told you I had it!',
        "THAT'S how it's done, folks!",
        "Ooh, I'm good. I'm really good.",
      ],
      greatPlayOther: [
        'Ooooh, look at {player} showing off!',
        'Okay {player}, okay! I SEE you.',
        "Well don't you think you're SOMETHING, {player}.",
        'Hold on now — {player} really pulled that off?!',
      ],
      layoutCompleteSelf: [
        'Flipped and done! Catch me if you can!',
        "That's a wrap for me — everybody else, hustle!",
      ],
      layoutCompleteOther: [
        "{player}'s all flipped up — go go go, everybody!",
        "Ooh {player}'s done! Last turns, let's move!",
      ],
      holeWonSelf: [
        "That hole's MINE, thank you very much!",
        'Yes! Put it on the board!',
        "That's what I'm talking about!",
      ],
      holeWonOther: [
        'Fine, {player}, take your little hole.',
        'Nice, {player}! ...okay, don\'t get used to it.',
        '{player} gets this one. Enjoy it while it lasts.',
      ],
      matchWinSelf: [
        "NINE holes and I'm still standing! Let's GO!",
        "That's a win, that's a win, THAT'S A WIN!",
      ],
      matchWinOther: [
        'Ugh, fine, {player}. Good game. GOOD game.',
        "{player} wins! I'm happy for you. Mostly.",
      ],
      matchDraw: [
        'A tie?! After NINE holes?! Unbelievable.',
        "We're tied. Rematch. Immediately.",
      ],
    },
  },
};
