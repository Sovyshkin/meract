const CATEGORY_KEY_BY_NAME = {
  'Fresh Drop': 'catFreshDrop',
  'Near You': 'catNearYou',
  'Going Live': 'catGoingLive',
  'Starting Now': 'catStartingNow',
  'Starting Soon': 'catStartingSoon',
  'Live Now': 'catLiveNow',
  'Top Signals': 'catTopSignals',
  'Rising Pulse': 'catRisingPulse',
  'Guild Runs': 'catGuildRuns',
  'Storylines': 'catStorylines',
  'High Stakes': 'catHighStakes',
  'Completed Legends': 'catCompletedLegends',
  'Live ended': 'catLiveEnded',
  'My acts': 'catMyActs',
};

const CATEGORY_KEY_BY_KEY = {
  fresh_drop: 'catFreshDrop',
  near_you: 'catNearYou',
  going_live: 'catGoingLive',
  starting_now: 'catStartingNow',
  starting_soon: 'catStartingSoon',
  live_now: 'catLiveNow',
  top_signals: 'catTopSignals',
  rising_pulse: 'catRisingPulse',
  guild_runs: 'catGuildRuns',
  storylines: 'catStorylines',
  high_stakes: 'catHighStakes',
  completed_legends: 'catCompletedLegends',
  live_ended: 'catLiveEnded',
  my_acts: 'catMyActs',
};

export function getCategoryTranslationKey(category) {
  if (!category) return null;
  if (category.key && CATEGORY_KEY_BY_KEY[category.key]) {
    return CATEGORY_KEY_BY_KEY[category.key];
  }
  if (category.name && CATEGORY_KEY_BY_NAME[category.name]) {
    return CATEGORY_KEY_BY_NAME[category.name];
  }
  return null;
}
