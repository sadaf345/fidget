import React from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import {
  Cat, Circle, Disc3, Droplet, Hash, HeartPulse, Keyboard, PenLine, Snowflake, Sparkles, Spool, StickyNote, ToggleRight, Waves, Wind,
} from 'lucide-react-native';
import { theme } from '@/constants/colors';
import { ChargeArt, PickArt, PopArt, ShakeArt, SpinArt } from '@/components/home/SensationArt';

export type ToyCategory = 'pick' | 'click' | 'drag' | 'squish' | 'motion' | 'calm';

export const CATEGORIES: { id: ToyCategory; title: string }[] = [
  { id: 'pick', title: 'Pick & peel' },
  { id: 'click', title: 'Click' },
  { id: 'drag', title: 'Drag & spin' },
  { id: 'squish', title: 'Squish & hold' },
  { id: 'motion', title: 'Shake & tilt' },
  { id: 'calm', title: 'Calm' },
];

type IconComponent = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

export interface Toy {
  id: string;
  /** Route, also the quick-launch link: fidget://<id>. */
  route: string;
  title: string;
  line: string;
  color: string;
  category: ToyCategory;
  /** Custom illustration (52pt) or a line icon on a tinted tile. */
  Art?: React.ComponentType;
  Icon?: IconComponent;
  /** Its tap haptic can be replaced by a pattern recorded in the Haptics Lab. */
  tapPattern?: boolean;
}

function ZipperArt() {
  return (
    <Svg width={52} height={52} viewBox="-7 -6 40 38">
      {[3, 7, 11, 15].map(y => (
        <React.Fragment key={y}>
          <Rect x={7} y={y} width={5} height={2.4} rx={1} fill="#F97316" />
          <Rect x={14} y={y + 2} width={5} height={2.4} rx={1} fill="#F97316" />
        </React.Fragment>
      ))}
      <Line x1={9} y1={20} x2={6} y2={25} stroke="#F97316" strokeWidth={2.2} strokeLinecap="round" />
      <Line x1={17} y1={20} x2={20} y2={25} stroke="#F97316" strokeWidth={2.2} strokeLinecap="round" />
      <Rect x={9} y={17} width={8} height={5} rx={1.5} fill="#FDBA74" />
    </Svg>
  );
}

export const TOYS: Toy[] = [
  { id: 'pick', route: '/pick', title: 'Pick', line: 'Find a rough spot. Peel it off.', color: '#E8A87C', category: 'pick', Art: PickArt },
  { id: 'peel', route: '/peel', title: 'Peel', line: 'Screen film and masking tape.', color: '#93C5FD', category: 'pick', Icon: StickyNote },
  { id: 'thread', route: '/thread', title: 'Loose thread', line: 'Pull it. Watch it unravel.', color: '#FB7185', category: 'pick', Icon: Spool },
  { id: 'scratch', route: '/scratch', title: 'Scratch-off', line: 'Rub away the foil.', color: '#CBD5E1', category: 'pick', Icon: Sparkles },

  { id: 'pop', route: '/pop', title: 'Pop', line: 'A pop-it that never runs out.', color: '#FF7EC8', category: 'click', Art: PopArt },
  { id: 'switches', route: '/switches', title: 'Switch tester', line: 'Four keyboard switches.', color: '#60A5FA', category: 'click', Icon: Keyboard, tapPattern: true },
  { id: 'pen', route: '/pen', title: 'Pen click', line: "The click you can't stop.", color: '#FBBF24', category: 'click', Icon: PenLine, tapPattern: true },
  { id: 'toggles', route: '/toggles', title: 'Toggle wall', line: 'Twenty switches to flip.', color: '#34D399', category: 'click', Icon: ToggleRight, tapPattern: true },
  { id: 'tally', route: '/tally', title: 'Tally counter', line: 'Click. Count. Repeat.', color: '#FCA5A5', category: 'click', Icon: Hash, tapPattern: true },

  { id: 'spin', route: '/spin', title: 'Spin', line: 'Flick it and let it coast.', color: '#A78BFA', category: 'drag', Art: () => <SpinArt color="#A78BFA" /> },
  { id: 'dial', route: '/dial', title: 'Ratchet dial', line: 'Click it round, notch by notch.', color: '#2DD4BF', category: 'drag', Icon: Disc3 },
  { id: 'zipper', route: '/zipper', title: 'Zipper', line: 'Zip. Unzip. Again.', color: '#F97316', category: 'drag', Art: ZipperArt },
  { id: 'texture', route: '/texture', title: 'Texture rub', line: 'Corduroy, sandpaper, stone.', color: '#D6A77A', category: 'drag', Icon: Waves },

  { id: 'charge', route: '/charge', title: 'Charge', line: 'Hold. Build. Release.', color: theme.accent, category: 'squish', Art: () => <ChargeArt color={theme.accent} /> },
  { id: 'slime', route: '/slime', title: 'Slime', line: 'Press in. Let it wobble.', color: '#84CC16', category: 'squish', Icon: Droplet },
  { id: 'cat', route: '/cat', title: 'Purring cat', line: 'Hold on. It purrs.', color: '#FDBA74', category: 'squish', Icon: Cat },
  { id: 'ball', route: '/ball', title: 'Stress ball', line: 'Squeeze. Let go.', color: '#F87171', category: 'squish', Icon: Circle },

  { id: 'shake', route: '/shake', title: 'Shake', line: 'A jar of marbles. Tilt it, shake it.', color: '#38BDF8', category: 'motion', Art: () => <ShakeArt color="#38BDF8" /> },
  { id: 'snow', route: '/snow', title: 'Snow globe', line: 'Shake it. Watch it settle.', color: '#BAE6FD', category: 'motion', Icon: Snowflake },

  { id: 'breathe', route: '/breathe', title: 'Breathe', line: 'Box and 4-7-8 breathing, felt in your hand.', color: '#818CF8', category: 'calm', Icon: Wind },
  { id: 'heartbeat', route: '/heartbeat', title: 'Heartbeat', line: 'A slow pulse to sync with.', color: '#FB7185', category: 'calm', Icon: HeartPulse },
];

export const TOYS_BY_ID: Record<string, Toy> = Object.fromEntries(TOYS.map(t => [t.id, t]));

/** The toy's icon tile: its illustration, or its line icon on a tile tinted with its color. */
export function ToyIcon({ toy, size = 52 }: { toy: Toy; size?: number }) {
  if (toy.Art) {
    const Art = toy.Art;
    return (
      <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: toy.color + '1F', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <View style={{ transform: [{ scale: (size * 0.82) / 52 }] }}>
          <Art />
        </View>
      </View>
    );
  }
  const Icon = toy.Icon ?? Circle;
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.27, backgroundColor: toy.color + '1F', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={size * 0.5} color={toy.color} strokeWidth={2} />
    </View>
  );
}
