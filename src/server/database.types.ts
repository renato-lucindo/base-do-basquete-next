export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      admin_access: {
        Row: {
          created_at: string;
          enabled: boolean;
          singleton: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          enabled?: boolean;
          singleton?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          enabled?: boolean;
          singleton?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      championships: {
        Row: {
          id: string;
          name: string;
          saved_at: string;
          version: number;
        };
        Insert: {
          id: string;
          name: string;
          saved_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          name?: string;
          saved_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      coaches: {
        Row: {
          person_id: string;
        };
        Insert: {
          person_id: string;
        };
        Update: {
          person_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coaches_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: true;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
        ];
      };
      disputes: {
        Row: {
          category: string;
          division: string | null;
          gender: string;
          id: string;
          season_id: string;
        };
        Insert: {
          category: string;
          division?: string | null;
          gender: string;
          id: string;
          season_id: string;
        };
        Update: {
          category?: string;
          division?: string | null;
          gender?: string;
          id?: string;
          season_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "disputes_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sheet_entries: {
        Row: {
          game_id: string;
          jersey: string;
          ordinal: number;
          person_id: string;
          person_snapshot: Json;
          registration_id: string;
          roster_entry_id: string;
          side: string;
        };
        Insert: {
          game_id: string;
          jersey: string;
          ordinal: number;
          person_id: string;
          person_snapshot: Json;
          registration_id: string;
          roster_entry_id: string;
          side: string;
        };
        Update: {
          game_id?: string;
          jersey?: string;
          ordinal?: number;
          person_id?: string;
          person_snapshot?: Json;
          registration_id?: string;
          roster_entry_id?: string;
          side?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_sheet_entries_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "game_sheets";
            referencedColumns: ["game_id"];
          },
          {
            foreignKeyName: "game_sheet_entries_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "persons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_sheet_entries_registration_id_fkey";
            columns: ["registration_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "game_sheet_entries_roster_entry_id_fkey";
            columns: ["roster_entry_id"];
            isOneToOne: false;
            referencedRelation: "roster_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      game_sheets: {
        Row: {
          confirmed: boolean;
          document: Json;
          game_id: string;
          saved_at: string;
          staff_snapshot: Json;
          version: number;
        };
        Insert: {
          confirmed?: boolean;
          document: Json;
          game_id: string;
          saved_at?: string;
          staff_snapshot: Json;
          version?: number;
        };
        Update: {
          confirmed?: boolean;
          document?: Json;
          game_id?: string;
          saved_at?: string;
          staff_snapshot?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "game_sheets_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: true;
            referencedRelation: "games";
            referencedColumns: ["id"];
          },
        ];
      };
      games: {
        Row: {
          away_registration_id: string;
          dispute_id: string;
          game_number: string | null;
          home_registration_id: string;
          id: string;
          saved_at: string;
          scheduled_date: string | null;
          scheduled_time: string | null;
          state: string;
          venue: string | null;
          version: number;
        };
        Insert: {
          away_registration_id: string;
          dispute_id: string;
          game_number?: string | null;
          home_registration_id: string;
          id: string;
          saved_at?: string;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          state?: string;
          venue?: string | null;
          version?: number;
        };
        Update: {
          away_registration_id?: string;
          dispute_id?: string;
          game_number?: string | null;
          home_registration_id?: string;
          id?: string;
          saved_at?: string;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          state?: string;
          venue?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "games_away_registration_id_dispute_id_fkey";
            columns: ["away_registration_id", "dispute_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id", "dispute_id"];
          },
          {
            foreignKeyName: "games_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "disputes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_home_registration_id_dispute_id_fkey";
            columns: ["home_registration_id", "dispute_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id", "dispute_id"];
          },
        ];
      };
      pdf_reviews: {
        Row: {
          dispute_id: string;
          document: Json;
          game_id: string | null;
          saved_at: string;
          saved_by: string;
          source_id: string;
          version: number;
        };
        Insert: {
          dispute_id: string;
          document: Json;
          game_id?: string | null;
          saved_at?: string;
          saved_by: string;
          source_id: string;
          version?: number;
        };
        Update: {
          dispute_id?: string;
          document?: Json;
          game_id?: string | null;
          saved_at?: string;
          saved_by?: string;
          source_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pdf_reviews_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "disputes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pdf_reviews_game_id_dispute_id_fkey";
            columns: ["game_id", "dispute_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id", "dispute_id"];
          },
          {
            foreignKeyName: "pdf_reviews_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: true;
            referencedRelation: "pdf_sources";
            referencedColumns: ["id"];
          },
        ];
      };
      pdf_sources: {
        Row: {
          byte_size: number;
          created_by: string;
          dispute_id: string;
          filename: string;
          id: string;
          page_count: number;
          parsed: Json;
          ready: boolean;
          saved_at: string;
          sha256: string;
          storage_path: string | null;
          version: number;
        };
        Insert: {
          byte_size: number;
          created_by: string;
          dispute_id: string;
          filename: string;
          id: string;
          page_count: number;
          parsed: Json;
          ready?: boolean;
          saved_at?: string;
          sha256: string;
          storage_path?: string | null;
          version?: number;
        };
        Update: {
          byte_size?: number;
          created_by?: string;
          dispute_id?: string;
          filename?: string;
          id?: string;
          page_count?: number;
          parsed?: Json;
          ready?: boolean;
          saved_at?: string;
          sha256?: string;
          storage_path?: string | null;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "pdf_sources_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "disputes";
            referencedColumns: ["id"];
          },
        ];
      };
      persons: {
        Row: {
          biography: string | null;
          dominant_hand: string | null;
          height_cm: number | null;
          id: string;
          name: string;
          name_key: string | null;
          nickname: string | null;
          origin_city: string | null;
          origin_state: string | null;
          position: string | null;
          public_birth_year: number | null;
          saved_at: string;
          version: number;
          weight_kg: number | null;
        };
        Insert: {
          biography?: string | null;
          dominant_hand?: string | null;
          height_cm?: number | null;
          id: string;
          name: string;
          name_key?: string | null;
          nickname?: string | null;
          origin_city?: string | null;
          origin_state?: string | null;
          position?: string | null;
          public_birth_year?: number | null;
          saved_at?: string;
          version?: number;
          weight_kg?: number | null;
        };
        Update: {
          biography?: string | null;
          dominant_hand?: string | null;
          height_cm?: number | null;
          id?: string;
          name?: string;
          name_key?: string | null;
          nickname?: string | null;
          origin_city?: string | null;
          origin_state?: string | null;
          position?: string | null;
          public_birth_year?: number | null;
          saved_at?: string;
          version?: number;
          weight_kg?: number | null;
        };
        Relationships: [];
      };
      published_games: {
        Row: {
          dispute_id: string;
          game_id: string;
          published_at: string;
          snapshot: Json;
          version: number;
        };
        Insert: {
          dispute_id: string;
          game_id: string;
          published_at: string;
          snapshot: Json;
          version: number;
        };
        Update: {
          dispute_id?: string;
          game_id?: string;
          published_at?: string;
          snapshot?: Json;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "published_games_game_id_dispute_id_fkey";
            columns: ["game_id", "dispute_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id", "dispute_id"];
          },
        ];
      };
      registrations: {
        Row: {
          dispute_id: string;
          id: string;
          name: string;
          saved_at: string;
          team_id: string;
          version: number;
        };
        Insert: {
          dispute_id: string;
          id: string;
          name: string;
          saved_at?: string;
          team_id: string;
          version?: number;
        };
        Update: {
          dispute_id?: string;
          id?: string;
          name?: string;
          saved_at?: string;
          team_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_dispute_id_fkey";
            columns: ["dispute_id"];
            isOneToOne: false;
            referencedRelation: "disputes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
        ];
      };
      roster_entries: {
        Row: {
          dispute_id: string;
          ended_at: string | null;
          id: string;
          jersey: string | null;
          person_id: string;
          registration_id: string;
          saved_at: string;
          started_at: string;
          version: number;
        };
        Insert: {
          dispute_id: string;
          ended_at?: string | null;
          id: string;
          jersey?: string | null;
          person_id: string;
          registration_id: string;
          saved_at?: string;
          started_at?: string;
          version?: number;
        };
        Update: {
          dispute_id?: string;
          ended_at?: string | null;
          id?: string;
          jersey?: string | null;
          person_id?: string;
          registration_id?: string;
          saved_at?: string;
          started_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "roster_entries_registration_id_dispute_id_fkey";
            columns: ["registration_id", "dispute_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id", "dispute_id"];
          },
        ];
      };
      seasons: {
        Row: {
          championship_id: string;
          id: string;
          year: number;
        };
        Insert: {
          championship_id: string;
          id: string;
          year: number;
        };
        Update: {
          championship_id?: string;
          id?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_championship_id_fkey";
            columns: ["championship_id"];
            isOneToOne: false;
            referencedRelation: "championships";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_entries: {
        Row: {
          dispute_id: string;
          ended_at: string | null;
          id: string;
          person_id: string;
          registration_id: string;
          role: string;
          saved_at: string;
          started_at: string;
          version: number;
        };
        Insert: {
          dispute_id: string;
          ended_at?: string | null;
          id: string;
          person_id: string;
          registration_id: string;
          role: string;
          saved_at?: string;
          started_at?: string;
          version?: number;
        };
        Update: {
          dispute_id?: string;
          ended_at?: string | null;
          id?: string;
          person_id?: string;
          registration_id?: string;
          role?: string;
          saved_at?: string;
          started_at?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: "staff_entries_person_id_fkey";
            columns: ["person_id"];
            isOneToOne: false;
            referencedRelation: "coaches";
            referencedColumns: ["person_id"];
          },
          {
            foreignKeyName: "staff_entries_registration_id_dispute_id_fkey";
            columns: ["registration_id", "dispute_id"];
            isOneToOne: false;
            referencedRelation: "registrations";
            referencedColumns: ["id", "dispute_id"];
          },
        ];
      };
      teams: {
        Row: {
          abbreviation: string | null;
          id: string;
          name: string;
          saved_at: string;
          version: number;
        };
        Insert: {
          abbreviation?: string | null;
          id: string;
          name: string;
          saved_at?: string;
          version?: number;
        };
        Update: {
          abbreviation?: string | null;
          id?: string;
          name?: string;
          saved_at?: string;
          version?: number;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      confirm_text_row: { Args: { p_command: Json }; Returns: Json };
      finish_pdf_source: { Args: { p_command: Json }; Returns: Json };
      get_competition: { Args: { p_id: string }; Returns: Json };
      get_game: { Args: { p_id: string }; Returns: Json };
      get_game_occurrence_state: {
        Args: { p_game_id: string; p_offset?: number };
        Returns: Json;
      };
      get_game_occurrence_version: {
        Args: { p_game_id: string; p_version: number };
        Returns: Json;
      };
      get_game_publication_state: {
        Args: { p_game_id: string; p_offset?: number };
        Returns: Json;
      };
      get_game_publication_version: {
        Args: { p_game_id: string; p_version: number };
        Returns: Json;
      };
      get_game_sheet: { Args: { p_game_id: string }; Returns: Json };
      get_import_person: {
        Args: {
          p_dispute_id: string;
          p_id: string;
          p_registration_id?: string;
        };
        Returns: Json;
      };
      get_pdf_publication_preparation: {
        Args: { p_source_id: string };
        Returns: Json;
      };
      get_pdf_review: { Args: { p_source_id: string }; Returns: Json };
      get_pdf_source: { Args: { p_id: string }; Returns: Json };
      get_person: { Args: { p_id: string }; Returns: Json };
      get_public_game: { Args: { p_id: string }; Returns: Json };
      get_registration: { Args: { p_id: string }; Returns: Json };
      get_registration_withdrawal_state: {
        Args: { p_offset?: number; p_registration_id: string };
        Returns: Json;
      };
      get_registration_withdrawal_version: {
        Args: { p_registration_id: string; p_version: number };
        Returns: Json;
      };
      get_regulation_state: {
        Args: { p_dispute_id: string; p_offset?: number };
        Returns: Json;
      };
      get_regulation_version: {
        Args: { p_dispute_id: string; p_version: number };
        Returns: Json;
      };
      get_roster_entry: { Args: { p_id: string }; Returns: Json };
      get_staff_entry: { Args: { p_id: string }; Returns: Json };
      get_team: { Args: { p_id: string }; Returns: Json };
      get_text_review: { Args: { p_id: string }; Returns: Json };
      list_competitions: {
        Args: { p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_games: {
        Args: { p_dispute_id: string; p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_pdf_sources: {
        Args: { p_dispute_id: string; p_offset?: number };
        Returns: Json;
      };
      list_persons: {
        Args: { p_kind?: string; p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_registrations: {
        Args: { p_dispute_id: string; p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_roster: {
        Args: {
          p_active_only?: boolean;
          p_offset?: number;
          p_registration_id: string;
        };
        Returns: Json;
      };
      list_staff: {
        Args: {
          p_active_only?: boolean;
          p_offset?: number;
          p_registration_id: string;
        };
        Returns: Json;
      };
      list_teams: {
        Args: { p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_text_reviews: {
        Args: { p_dispute_id: string; p_offset?: number };
        Returns: Json;
      };
      match_import_players: {
        Args: {
          p_dispute_id: string;
          p_players: Json;
          p_registration_id: string;
        };
        Returns: Json;
      };
      match_import_players_new_target: {
        Args: { p_dispute_id: string; p_players: Json };
        Returns: Json;
      };
      prepare_pdf_source: { Args: { p_command: Json }; Returns: Json };
      prepare_text_target: { Args: { p_command: Json }; Returns: Json };
      publish_pdf_game: { Args: { p_command: Json }; Returns: Json };
      publish_sheet_game: { Args: { p_command: Json }; Returns: Json };
      save_competition: { Args: { p_command: Json }; Returns: Json };
      save_game: { Args: { p_command: Json }; Returns: Json };
      save_game_occurrence: { Args: { p_command: Json }; Returns: Json };
      save_game_sheet: { Args: { p_command: Json }; Returns: Json };
      save_pdf_publication_preparation: {
        Args: { p_command: Json };
        Returns: Json;
      };
      save_pdf_review: { Args: { p_command: Json }; Returns: Json };
      save_person: { Args: { p_command: Json }; Returns: Json };
      save_registration: { Args: { p_command: Json }; Returns: Json };
      save_registration_withdrawal: {
        Args: { p_command: Json };
        Returns: Json;
      };
      save_regulation: { Args: { p_command: Json }; Returns: Json };
      save_roster_entry: { Args: { p_command: Json }; Returns: Json };
      save_staff_entry: { Args: { p_command: Json }; Returns: Json };
      save_team: { Args: { p_command: Json }; Returns: Json };
      save_text_review: { Args: { p_command: Json }; Returns: Json };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
