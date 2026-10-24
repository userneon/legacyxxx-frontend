/** What each server action does, in one or two sentences, for the tooltip on its button (staff site). */
export const ACTION_HINTS: Record<string, string> = {
  ban: "Bans the player on every LEGACY-X server and the site. Asks for a reason; an unban later needs an Admin request or a Manager.",
  kick: "Removes the player from this server right now. They can join again. Asks for a reason.",
  mute: "Silences the player's voice chat. Asks for a reason.",
  rename: "Changes the player's in-game name on this server for this session.",
  map_change: "Changes the map on the picked server to the map chosen above.",
  server_announcement: "Writes a message in the chat of the picked server for everyone.",
  match_announcement: "Writes a message to the players of the running match on the picked server.",
  hud_announcement: "Shows a message on every player's screen, in the game's own alert line, on the picked server.",
  player_message: "Shows a private message on this one player's screen.",
  restart_all: "Restarts every game server. Players on them are dropped. Owner only; asks to confirm.",
  restart_server: "Restarts the picked server. Players on it are dropped. Owner only; asks to confirm.",
  start_server: "Starts the picked server if it is stopped. Owner only.",
  stop_server: "Stops the picked server. Players on it are dropped. Owner only; asks to confirm.",
  timeout: "Pauses the running match on the picked server with a message to the players.",
  player_ip_lookup: "Looks up the player's IP address for a ban check. The result shows under Recent actions.",
}
