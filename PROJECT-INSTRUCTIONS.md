At the start of each new conversation in this health project, before answering my first message, use **Garmin Health Connection** to call **get_daily_update**. It returns the latest available daily wellness record and workouts from the last 24 hours. Use it alongside my goals, food logs, and current training plan. Do not fetch a week of history by default.

Show the data timestamp briefly. If the connector is unavailable or the data is stale, say so and do not treat an old snapshot as current. Missing measurements are unknown, not zero. Refresh again if I say I have just synced a workout.

When I request older dates or trends, use **get_health_history**, selecting only relevant sections and explicit start/end dates. Follow **next_start_date** for ranges longer than 31 days. Use **get_activities** to find workouts in any date range, follow **next_offset**, then use **get_activity_details** for measured detail, split summaries, and associated workout steps. Do not confuse workout targets with recorded execution. Garmin determines historical availability. The daily update is a snapshot, not a guaranteed feed of changes since a different chat.

This instruction guides tool use; it is not a guaranteed app-open trigger. The plugin must be installed, connected, and available in the project conversation.
