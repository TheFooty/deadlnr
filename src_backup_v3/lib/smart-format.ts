/**
 * Smart Dynamic Type Scaling & Text Formatting (100% Deterministic, Zero AI)
 */

export interface SmartTitleFormat {
  fontSizeClass: string;
}

export interface SmartDescFormat {
  fontSizeClass: string;
  lineHeightClass: string;
  paragraphs: string[];
}

export interface SmartCourseFormat {
  codeTag: string;
  fullName: string;
}

/**
 * Dynamically scales title font size based on character count so short titles look bold and long titles fit cleanly.
 */
export function getSmartTitleFormat(title: string): SmartTitleFormat {
  const len = title ? title.trim().length : 0;

  if (len < 25) {
    return { fontSizeClass: 'text-2xl sm:text-3xl lg:text-4xl tracking-tight font-black' };
  } else if (len < 55) {
    return { fontSizeClass: 'text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight' };
  } else {
    return { fontSizeClass: 'text-lg sm:text-xl lg:text-2xl font-extrabold tracking-normal' };
  }
}

/**
 * Dynamically formats description text into structured paragraphs & optimal font sizing.
 */
export function getSmartDescFormat(description: string): SmartDescFormat {
  if (!description || description.trim().length === 0) {
    return {
      fontSizeClass: 'text-sm sm:text-base',
      lineHeightClass: 'leading-relaxed',
      paragraphs: [],
    };
  }

  const trimmed = description.trim();
  const len = trimmed.length;

  // Split raw text into natural paragraphs or bullet points
  const paragraphs = trimmed
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (len < 140) {
    // Short description: bump font size so it comfortably fills the card without dead space
    return {
      fontSizeClass: 'text-base sm:text-lg lg:text-xl font-medium text-slate-200',
      lineHeightClass: 'leading-relaxed sm:leading-loose',
      paragraphs,
    };
  } else if (len < 320) {
    // Medium description
    return {
      fontSizeClass: 'text-sm sm:text-base lg:text-lg font-medium text-slate-300',
      lineHeightClass: 'leading-relaxed',
      paragraphs,
    };
  } else {
    // Long description: compact font size for legibility
    return {
      fontSizeClass: 'text-xs sm:text-sm lg:text-base font-normal text-slate-300',
      lineHeightClass: 'leading-normal sm:leading-relaxed',
      paragraphs,
    };
  }
}

/**
 * Formats course string e.g. "ENGL 201: Rhetoric & Composition" -> Code: "ENGL 201", Name: "Rhetoric & Composition"
 */
export function getSmartCourseFormat(courseStr: string): SmartCourseFormat {
  if (!courseStr) return { codeTag: 'CANVAS', fullName: '' };

  const colonIdx = courseStr.indexOf(':');
  if (colonIdx > 0 && colonIdx < 15) {
    return {
      codeTag: courseStr.substring(0, colonIdx).trim(),
      fullName: courseStr.substring(colonIdx + 1).trim(),
    };
  }

  const dashIdx = courseStr.indexOf(' - ');
  if (dashIdx > 0 && dashIdx < 15) {
    return {
      codeTag: courseStr.substring(0, dashIdx).trim(),
      fullName: courseStr.substring(dashIdx + 3).trim(),
    };
  }

  return {
    codeTag: courseStr.trim(),
    fullName: '',
  };
}
