/**
 * Domain Enum: ImageAngle
 * 
 * Represents the camera angle/viewpoint of a patient image.
 */
export enum ImageAngle {
  FRONT = 'FRONT',
  OBLIQUE_LEFT = 'OBLIQUE_LEFT',
  OBLIQUE_RIGHT = 'OBLIQUE_RIGHT',
  PROFILE_LEFT = 'PROFILE_LEFT',
  PROFILE_RIGHT = 'PROFILE_RIGHT',
  BACK = 'BACK',
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
  CUSTOM = 'CUSTOM',
}

export function isImageAngle(value: string): value is ImageAngle {
  return Object.values(ImageAngle).includes(value as ImageAngle);
}

export function getImageAngleLabel(angle: ImageAngle): string {
  const labels: Record<ImageAngle, string> = {
    [ImageAngle.FRONT]: 'Front',
    [ImageAngle.OBLIQUE_LEFT]: 'Oblique Left',
    [ImageAngle.OBLIQUE_RIGHT]: 'Oblique Right',
    [ImageAngle.PROFILE_LEFT]: 'Profile Left',
    [ImageAngle.PROFILE_RIGHT]: 'Profile Right',
    [ImageAngle.BACK]: 'Back',
    [ImageAngle.TOP]: 'Top',
    [ImageAngle.BOTTOM]: 'Bottom',
    [ImageAngle.CUSTOM]: 'Custom',
  };
  return labels[angle];
}
