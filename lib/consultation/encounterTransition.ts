export type EncounterTransitionResult = 'completed' | 'blocked';

/**
 * One shared lock for Load, Next, Complete, and leaving the consultation room.
 * The lock is taken synchronously so a second click cannot start another save or navigation.
 * Callers put navigation inside `transition`, which runs only after `save` resolves.
 */
export async function runEncounterTransition(params: {
  guard: { current: boolean };
  save: () => Promise<void>;
  transition: () => Promise<void>;
}): Promise<EncounterTransitionResult> {
  if (params.guard.current) return 'blocked';
  params.guard.current = true;
  try {
    await params.save();
    await params.transition();
    return 'completed';
  } finally {
    params.guard.current = false;
  }
}
