// Auto-generated database types for the work_entries table.

export interface Database {
  public: {
    Tables: {
      work_entries: {
        Row: {
          date: string;
          start: string;
          finish: string;
          break_minutes: number;
          notes: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          date: string;
          start: string;
          finish: string;
          break_minutes?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          date?: string;
          start?: string;
          finish?: string;
          break_minutes?: number;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
