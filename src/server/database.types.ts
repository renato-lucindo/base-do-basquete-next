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
      get_competition: { Args: { p_id: string }; Returns: Json };
      get_registration: { Args: { p_id: string }; Returns: Json };
      get_team: { Args: { p_id: string }; Returns: Json };
      list_competitions: {
        Args: { p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_registrations: {
        Args: { p_dispute_id: string; p_offset?: number; p_query?: string };
        Returns: Json;
      };
      list_teams: {
        Args: { p_offset?: number; p_query?: string };
        Returns: Json;
      };
      save_competition: { Args: { p_command: Json }; Returns: Json };
      save_registration: { Args: { p_command: Json }; Returns: Json };
      save_team: { Args: { p_command: Json }; Returns: Json };
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
