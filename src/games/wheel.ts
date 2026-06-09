import { floatFromSeed } from "../lib/provablyFair";

export type WheelRisk = "low" | "medium" | "high";

export interface WheelSegment {
  multiplier: number;
  weight: number;
}

const SEGMENTS: Record<WheelRisk, WheelSegment[]> = {
  low: [
    { multiplier: 0,    weight: 5  },
    { multiplier: 1.2,  weight: 30 },
    { multiplier: 1.5,  weight: 20 },
    { multiplier: 2,    weight: 12 },
    { multiplier: 3,    weight: 8  },
    { multiplier: 5,    weight: 4  },
    { multiplier: 10,   weight: 1  },
  ],
  medium: [
    { multiplier: 0,    weight: 20 },
    { multiplier: 1.5,  weight: 20 },
    { multiplier: 2,    weight: 15 },
    { multiplier: 3,    weight: 10 },
    { multiplier: 5,    weight: 8  },
    { multiplier: 10,   weight: 4  },
    { multiplier: 20,   weight: 2  },
    { multiplier: 50,   weight: 1  },
  ],
  high: [
    { multiplier: 0,    weight: 40 },
    { multiplier: 2,    weight: 10 },
    { multiplier: 5,    weight: 8  },
    { multiplier: 10,   weight: 5  },
    { multiplier: 20,   weight: 3  },
    { multiplier: 50,   weight: 2  },
    { multiplier: 100,  weight: 1  },
    { multiplier: 200,  weight: 1  },
  ],
};

export interface WheelResult {
  risk: WheelRisk;
  segments: WheelSegment[];
  landedIndex: number;
  multiplier: number;
}

export function spinWheel(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  risk: WheelRisk
): WheelResult {
  const segments = SEGMENTS[risk];
  const totalWeight = segments.reduce((sum, s) => sum + s.weight, 0);
  const float = floatFromSeed(serverSeed, clientSeed, nonce);

  let cumulative = 0;
  const target = float * totalWeight;
  let landedIndex = segments.length - 1;

  for (let i = 0; i < segments.length; i++) {
    cumulative += segments[i].weight;
    if (target < cumulative) {
      landedIndex = i;
      break;
    }
  }

  return {
    risk,
    segments,
    landedIndex,
    multiplier: segments[landedIndex].multiplier,
  };
}

export function validateWheel(risk: string): string | null {
  if (!["low", "medium", "high"].includes(risk)) {
    return 'risk must be "low", "medium", or "high"';
  }
  return null;
}
