// Single source of truth for pages: load the JSON data and expose computed state.
// (The Slack script loads data via fs instead, since plain Node needs import
// attributes for JSON — see scripts/slack-matchday.mjs.)
import season from '../data/season.json';
import players from '../data/players.json';
import eventsFile from '../data/events.json';
import config from '../data/config.json';
import { computeState, activityFeed } from './engine.mjs';

export const data = { season, players, events: eventsFile.events, config };
export const getState = () => computeState(data);
export { activityFeed };
