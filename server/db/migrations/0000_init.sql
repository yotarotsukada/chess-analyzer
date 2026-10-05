CREATE TABLE "analyses" (
	"game_id" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"engine_name" text,
	"depth" integer NOT NULL,
	"multi_pv" integer NOT NULL,
	"total_positions" integer NOT NULL,
	"done_positions" integer DEFAULT 0 NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"counted_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"counted_on" date,
	"error" text,
	"queued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"heartbeat_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"token_hash" text NOT NULL,
	"start_fen" text,
	"moves" jsonb NOT NULL,
	"player_color" text NOT NULL,
	"game_source" text NOT NULL,
	"import_method" text NOT NULL,
	"opponent_type" text DEFAULT 'unknown' NOT NULL,
	"result" text,
	"termination" text,
	"played_on" date,
	"manual_retries" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "position_evaluations" (
	"game_id" text NOT NULL,
	"ply" integer NOT NULL,
	"fen" text NOT NULL,
	"terminal" text,
	"candidates" jsonb NOT NULL,
	CONSTRAINT "position_evaluations_game_id_ply_pk" PRIMARY KEY("game_id","ply")
);
--> statement-breakpoint
CREATE TABLE "rate_counters" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"day" date NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_counters_scope_key_day_pk" PRIMARY KEY("scope","key","day")
);
--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "position_evaluations" ADD CONSTRAINT "position_evaluations_game_id_analyses_game_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."analyses"("game_id") ON DELETE cascade ON UPDATE no action;