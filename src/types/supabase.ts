export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string;
          event_date: string;
          event_time: string;
          location: string;
          price: number;
          capacity: number;
          image_url: string | null;
          start_registration: string | null;
          end_registration: string | null;
          ticket_photo_url: string | null;
          additional_info: string | null;
          category: string | null;
          organizer_name: string | null;
          organizer_contact: string | null;
          venue_details: string | null;
          dress_code: string | null;
          age_restriction: string | null;
          gallery_images: string[] | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          event_date: string;
          event_time: string;
          location: string;
          price: number;
          capacity: number;
          image_url?: string | null;
          start_registration?: string | null;
          end_registration?: string | null;
          ticket_photo_url?: string | null;
          additional_info?: string | null;
          category?: string | null;
          organizer_name?: string | null;
          organizer_contact?: string | null;
          venue_details?: string | null;
          dress_code?: string | null;
          age_restriction?: string | null;
          gallery_images?: string[] | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          event_date?: string;
          event_time?: string;
          location?: string;
          price?: number;
          capacity?: number;
          image_url?: string | null;
          start_registration?: string | null;
          end_registration?: string | null;
          ticket_photo_url?: string | null;
          additional_info?: string | null;
          category?: string | null;
          organizer_name?: string | null;
          organizer_contact?: string | null;
          venue_details?: string | null;
          dress_code?: string | null;
          age_restriction?: string | null;
          gallery_images?: string[] | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      registrations: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          status: string;
          registration_date: string;
          checked_in: boolean;
          checked_in_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_id: string;
          status?: string;
          registration_date?: string;
          checked_in?: boolean;
          checked_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          event_id?: string;
          status?: string;
          registration_date?: string;
          checked_in?: boolean;
          checked_in_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registrations_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registrations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      family_members: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          relationship: string;
          age: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          full_name: string;
          relationship: string;
          age?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          full_name?: string;
          relationship?: string;
          age?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "family_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      superusers: {
        Row: {
          id: string;
          user_id: string;
          permissions: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          permissions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          permissions?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "superusers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_admins: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        }[];
      };
      get_all_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        }[];
      };
      get_family_members_for_user: {
        Args: {
          target_user_id: string;
        };
        Returns: {
          id: string;
          user_id: string;
          full_name: string;
          relationship: string;
          age: number | null;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
