# Load libraries
library(nflfastR)
library(dplyr)

cat("🏈 Processing All 2024 NFL Games for Win Probability Analysis\n\n")

# Create games directory if it doesn't exist
if (!dir.exists("games")) {
  dir.create("games")
  cat("📁 Created 'games' directory\n")
}

# Get all 2024 play-by-play data
cat("Loading 2024 NFL data...\n")
pbp_2024 <- load_pbp(2024)

# Get list of all unique games
all_games <- pbp_2024 %>%
  select(game_id, home_team, away_team, week, game_date, season_type) %>%
  distinct() %>%
  arrange(week, game_date)

cat("Found", nrow(all_games), "games to process\n\n")

# Track high-impact plays across all games
high_impact_plays <- c()

# Process each game
for (i in 1:nrow(all_games)) {
  current_game <- all_games[i, ]
  game_id <- current_game$game_id
  
  cat("Processing game", i, "of", nrow(all_games), ":", 
      current_game$away_team, "at", current_game$home_team, 
      "(Week", current_game$week, ")\n")
  
  # Process the game
  game_data <- pbp_2024 %>%
    filter(game_id == !!game_id) %>%
    filter(!is.na(desc), !is.na(home_wp)) %>%
    arrange(qtr, desc(time)) %>%  # Chronological order
    mutate(
      play_number = row_number(),
      win_prob_change = home_wp - lag(home_wp, default = first(home_wp))
    ) %>%
    select(
      game_id, play_number, desc, qtr, time, down, ydstogo, 
      yardline_100,  # Added back field position!
      play_type, yards_gained, posteam, defteam,
      score_differential, home_wp, away_wp, win_prob_change, wpa,
      home_team, away_team, week, game_date, season_type,
      home_timeouts_remaining, away_timeouts_remaining
    )
  
  # Create filename
  filename <- paste0("games/", game_id, "_", current_game$away_team, "_at_", 
                     current_game$home_team, "_week", current_game$week, ".csv")
  
  # Save the game data
  write.csv(game_data, filename, row.names = FALSE)
  
  # Calculate stats
  biggest_swing <- max(abs(game_data$win_prob_change), na.rm = TRUE)
  biggest_wpa <- max(abs(game_data$wpa), na.rm = TRUE)
  total_plays <- nrow(game_data)
  final_score_diff <- tail(game_data$score_differential, 1)
  
  # Count high-impact plays (8% or more WPA)
  high_impact_count <- sum(abs(game_data$wpa) >= 0.08, na.rm = TRUE)
  high_impact_plays <- c(high_impact_plays, high_impact_count)
  
  cat("  ✅ Saved", total_plays, "plays")
  cat(" | Final diff:", final_score_diff)
  cat(" | Max swing:", round(biggest_swing * 100, 1), "%")
  cat(" | Max WPA:", round(biggest_wpa * 100, 1), "%")
  cat(" | High-impact plays (≥8%):", high_impact_count)
  cat(" | File:", basename(filename), "\n")
}

cat("\n🎉 Processing complete! All game files saved in 'games/' directory\n")

# Show summary of what was created
game_files <- list.files("games", pattern = "*.csv", full.names = FALSE)
cat("Created", length(game_files), "game files:\n")
for (file in head(game_files, 10)) {
  cat("  -", file, "\n")
}

# Calculate and show average high-impact plays
if (length(high_impact_plays) > 0) {
  avg_high_impact <- round(mean(high_impact_plays), 1)
  total_high_impact <- sum(high_impact_plays)
  
  cat("\n📊 HIGH-IMPACT PLAY SUMMARY:\n")
  cat("Total high-impact plays (≥8% WPA):", total_high_impact, "\n")
  cat("Average per game:", avg_high_impact, "\n")
  cat("Range:", min(high_impact_plays), "to", max(high_impact_plays), "per game\n")
}

cat("\n💡 To process all 2024 games, remove the 'head(10)' line and re-run!\n")