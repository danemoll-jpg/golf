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
  /**
   * Special-cased reactions, keyed by the lowercased name of the specific player being
   * addressed — lets a real person at the table get personalized treatment instead of the
   * generic "*Other" reaction (e.g. Ed calling his son "son", Carol going soft on her
   * granddaughter, or the two of them being visibly married to each other). Only ever
   * consulted for "*Other" keys (reacting to someone else) — there's no "Self" version of
   * addressing another named player. Falls back to `lines` when the current player at the
   * table doesn't match any override, so nothing changes for anyone else.
   */
  namedOverrides?: Partial<Record<string, Partial<Record<CommentaryKey, string[]>>>>;
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
        "Low score, my way. I'll take it.",
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
    namedOverrides: {
      // His wife. Quiet about most things — not about her.
      carol: {
        greatPlayOther: [
          "That's my wife. Still sharper than the rest of us.",
          "Careful, honey, you're making everyone else look bad.",
          "Atta girl. That's why I married her.",
          "There she goes again. Never bet against Carol.",
        ],
        layoutCompleteOther: [
          "Done already, dear? Showing us all up, as usual.",
          "That's my wife for you — three steps ahead of everybody.",
        ],
        holeWonOther: [
          "That hole's yours, love. Well played.",
          "Can't even be mad about that one. Nice hole, honey.",
        ],
        matchWinOther: [
          "She beat me again. Wouldn't have it any other way.",
          "That's my wife. Never bet against her.",
        ],
      },
      // His son.
      dan: {
        greatPlayOther: [
          'Good play, son.',
          "That's my boy.",
          'Nicely done, son.',
          'Knew you had it in you, kid.',
        ],
        layoutCompleteOther: [
          "That's my son — all flipped and done. Look at you.",
          'Good hustle, son.',
        ],
        holeWonOther: [
          "Hole's yours, son. Proud of you.",
          'Good hole, son.',
        ],
        matchWinOther: [
          'You got me, son. Well played.',
          "That's my boy. Well earned.",
        ],
      },
    },
  },
  carol: {
    id: 'carol',
    displayName: 'Carol',
    avatar: '🏌️‍♀️',
    tagline: 'Loud, encouraging, your biggest fan — until you play too well, then watch out.',
    lines: {
      holeStart: [
        "Hole {hole}, baby, let's GO!",
        'New hole! Everybody flip those cards, c\'mon!',
        "Alright, hole {hole} — who's feeling lucky?!",
        'Here we go, hole {hole}! I love this part!',
      ],
      greatPlaySelf: [
        'Ha! Told you I had it!',
        "THAT'S how it's done, folks!",
        "Ooh, I'm good. I'm really good.",
      ],
      greatPlayOther: [
        'You dirty dog, {player}!',
        'You absolute dirty dog!',
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
        "Nice, {player}! ...okay, don't get used to it.",
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
    namedOverrides: {
      // Her husband. She'll needle a stranger — him she's just proud of.
      ed: {
        greatPlayOther: [
          'That\'s my husband, ladies and gentlemen!',
          'Ed! Look at you! I married a genius, apparently.',
          "There he is. There's my Ed.",
        ],
        layoutCompleteOther: [
          'All done, honey? Look at my Ed go.',
          "That's my husband — quiet, but he gets it done.",
        ],
        holeWonOther: [
          "That hole is all yours, honey. I love watching you play.",
          'Atta boy, Ed.',
        ],
        matchWinOther: [
          "Well, he beat me. I still love him anyway.",
          "That's my husband. I'll let him have this one.",
        ],
      },
      // Her granddaughter — no needling, ever. Just proud.
      juliana: {
        greatPlayOther: [
          "That's my girl!",
          'Look at you, sweetheart!',
          'Atta girl, Juliana!',
          'Grandma is SO proud right now.',
        ],
        layoutCompleteOther: [
          'All done already, sweetheart? Show-off — in the best way.',
          "That's my girl, all finished up.",
        ],
        holeWonOther: [
          'That hole is all yours, sweetheart.',
          "Yes! That's my girl!",
        ],
        matchWinOther: [
          "You beat your grandma fair and square. I couldn't be prouder.",
          "That's my girl. Best player at this table, no contest.",
        ],
      },
    },
  },
};
