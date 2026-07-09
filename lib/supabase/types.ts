// Auto-generated types matching the schema in 001_initial_schema.sql
// When schema changes, regenerate via: npx supabase gen types typescript --local

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          plan: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      cases: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          case_number: string | null;
          court: string | null;
          judge: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["cases"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["cases"]["Insert"]>;
      };
      evidence: {
        Row: {
          id: string;
          case_id: string;
          uploaded_by: string;
          title: string;
          category: string;
          file_type: string | null;
          file_path: string | null;
          file_size_bytes: number | null;
          tags: string[];
          exhibit_number: string | null;
          status: string;
          ai_summary: string | null;
          ai_dates_detected: string[] | null;
          ai_people_detected: string[] | null;
          ai_category_suggest: string | null;
          ai_approved: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["evidence"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["evidence"]["Insert"]>;
      };
      timeline_events: {
        Row: {
          id: string;
          case_id: string;
          title: string;
          description: string | null;
          event_date: string;
          category: string;
          severity: string;
          flagged: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["timeline_events"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["timeline_events"]["Insert"]>;
      };
      tasks: {
        Row: {
          id: string;
          case_id: string;
          owner_id: string;
          title: string;
          due_date: string | null;
          priority: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["tasks"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["tasks"]["Insert"]>;
      };
      exhibits: {
        Row: {
          id: string;
          case_id: string;
          evidence_id: string | null;
          number: string;
          title: string;
          description: string | null;
          status: string;
          admitted: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exhibits"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["exhibits"]["Insert"]>;
      };
      court_orders: {
        Row: {
          id: string;
          case_id: string;
          evidence_id: string | null;
          title: string;
          issued_date: string | null;
          judge: string | null;
          summary: string | null;
          status: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["court_orders"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["court_orders"]["Insert"]>;
      };
      hearings: {
        Row: {
          id: string;
          case_id: string;
          hearing_type: string;
          hearing_date: string | null;
          location: string | null;
          department: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["hearings"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["hearings"]["Insert"]>;
      };
      hearing_packets: {
        Row: {
          id: string;
          hearing_id: string;
          case_id: string;
          created_by: string;
          sections: Json;
          exported_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["hearing_packets"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["hearing_packets"]["Insert"]>;
      };
      people: {
        Row: {
          id: string;
          case_id: string;
          name: string;
          role: string;
          relationship: string | null;
          phone: string | null;
          email: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["people"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["people"]["Insert"]>;
      };
      evidence_timeline_links: {
        Row: { evidence_id: string; timeline_event_id: string };
        Insert: Database["public"]["Tables"]["evidence_timeline_links"]["Row"];
        Update: never;
      };
      evidence_people_links: {
        Row: { evidence_id: string; person_id: string };
        Insert: Database["public"]["Tables"]["evidence_people_links"]["Row"];
        Update: never;
      };
      timeline_people_links: {
        Row: { timeline_event_id: string; person_id: string };
        Insert: Database["public"]["Tables"]["timeline_people_links"]["Row"];
        Update: never;
      };
    };
  };
}

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Case = Database["public"]["Tables"]["cases"]["Row"];
export type Evidence = Database["public"]["Tables"]["evidence"]["Row"];
export type TimelineEvent = Database["public"]["Tables"]["timeline_events"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type Exhibit = Database["public"]["Tables"]["exhibits"]["Row"];
export type CourtOrder = Database["public"]["Tables"]["court_orders"]["Row"];
export type Hearing = Database["public"]["Tables"]["hearings"]["Row"];
export type HearingPacket = Database["public"]["Tables"]["hearing_packets"]["Row"];
export type Person = Database["public"]["Tables"]["people"]["Row"];
