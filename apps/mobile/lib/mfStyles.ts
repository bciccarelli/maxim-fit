import type { TextStyle, ViewStyle } from 'react-native';
import { mf, fonts } from './theme';

export function mono(
  size: number,
  color: string = mf.fg,
  weight: '400' | '500' | '600' = '500'
): TextStyle {
  const family =
    weight === '600' ? fonts.monoSemibold : weight === '500' ? fonts.monoMedium : fonts.mono;
  return {
    fontFamily: family,
    fontSize: size,
    color,
    // tabular-nums analogue
    fontVariant: ['tabular-nums'],
  };
}

export function sans(
  size: number,
  color: string = mf.fg,
  weight: '400' | '500' | '600' = '400'
): TextStyle {
  const family =
    weight === '600' ? fonts.sansSemibold : weight === '500' ? fonts.sansMedium : fonts.sans;
  return {
    fontFamily: family,
    fontSize: size,
    color,
  };
}

// The ubiquitous 10px uppercase tracked label
export function trackedSm(color: string = mf.fg3): TextStyle {
  return {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color,
  };
}

// The 12px uppercase tracked label (for headers)
export function tracked(color: string = mf.fg3): TextStyle {
  return {
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color,
  };
}

export function leftBorder(color: string = mf.line2): ViewStyle {
  return {
    borderLeftWidth: 2,
    borderLeftColor: color,
    paddingLeft: 12,
  };
}

export function tile(): ViewStyle {
  return {
    backgroundColor: mf.surface,
    borderWidth: 1,
    borderColor: mf.line,
    padding: 10,
  };
}

export function cardSection(borderColor: string = mf.line2): ViewStyle {
  return {
    backgroundColor: mf.surface,
    borderWidth: 1,
    borderColor: mf.line,
    borderLeftWidth: 2,
    borderLeftColor: borderColor,
  };
}
