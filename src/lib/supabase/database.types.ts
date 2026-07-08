export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ProfilePlan = "free" | "premium";
export type PollStatus = "draft" | "active" | "closed";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          plan: ProfilePlan;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          plan?: ProfilePlan;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          plan?: ProfilePlan;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      polls: {
        Row: {
          id: string;
          slug: string;
          owner_id: string | null;
          title: string;
          description: string | null;
          category: string | null;
          organizer_name: string | null;
          logo_url: string | null;
          photo_url: string | null;
          primary_color: string | null;
          is_premium: boolean;
          status: PollStatus;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          owner_id?: string | null;
          title: string;
          description?: string | null;
          category?: string | null;
          organizer_name?: string | null;
          logo_url?: string | null;
          photo_url?: string | null;
          primary_color?: string | null;
          is_premium?: boolean;
          status?: PollStatus;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          owner_id?: string | null;
          title?: string;
          description?: string | null;
          category?: string | null;
          organizer_name?: string | null;
          logo_url?: string | null;
          photo_url?: string | null;
          primary_color?: string | null;
          is_premium?: boolean;
          status?: PollStatus;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          poll_id: string;
          text: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          text: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          text?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      options: {
        Row: {
          id: string;
          question_id: string;
          text: string;
          sort_order: number;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          text: string;
          sort_order?: number;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          text?: string;
          sort_order?: number;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      votes: {
        Row: {
          id: string;
          poll_id: string;
          question_id: string;
          option_id: string;
          voter_token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          poll_id: string;
          question_id: string;
          option_id: string;
          voter_token: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          poll_id?: string;
          question_id?: string;
          option_id?: string;
          voter_token?: string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      poll_results: {
        Row: {
          poll_id: string;
          question_id: string;
          option_id: string;
          option_text: string;
          sort_order: number;
          vote_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_poll_slug: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Poll = Tables<"polls">;
export type Question = Tables<"questions">;
export type Option = Tables<"options">;
export type Vote = Tables<"votes">;
export type PollResult = Database["public"]["Views"]["poll_results"]["Row"];
