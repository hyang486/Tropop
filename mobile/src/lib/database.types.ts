export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      arrivals: {
        Row: {
          activity_seq: number
          arrived_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          activity_seq?: number
          arrived_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          activity_seq?: number
          arrived_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrivals_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      cleanup_jobs: {
        Row: {
          attempts: number
          bucket: string
          created_at: string
          id: string
          last_error: string | null
          prefix: string
          reason: string
          verified_empty_at: string | null
        }
        Insert: {
          attempts?: number
          bucket: string
          created_at?: string
          id?: string
          last_error?: string | null
          prefix: string
          reason: string
          verified_empty_at?: string | null
        }
        Update: {
          attempts?: number
          bucket?: string
          created_at?: string
          id?: string
          last_error?: string | null
          prefix?: string
          reason?: string
          verified_empty_at?: string | null
        }
        Relationships: []
      }
      connect_requests: {
        Row: {
          created_at: string
          from_user: string
          id: string
          room_id: string | null
          status: string
          to_user: string
        }
        Insert: {
          created_at?: string
          from_user: string
          id?: string
          room_id?: string | null
          status?: string
          to_user: string
        }
        Update: {
          created_at?: string
          from_user?: string
          id?: string
          room_id?: string | null
          status?: string
          to_user?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_requests_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      connections: {
        Row: {
          created_at: string
          room_id: string | null
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          room_id?: string | null
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          room_id?: string | null
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_acks: {
        Row: {
          acked_at: string
          event_id: string
          on_way: boolean
          on_way_at: string | null
          user_id: string
        }
        Insert: {
          acked_at?: string
          event_id: string
          on_way?: boolean
          on_way_at?: string | null
          user_id: string
        }
        Update: {
          acked_at?: string
          event_id?: string
          on_way?: boolean
          on_way_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_acks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "emergency_events"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_events: {
        Row: {
          created_at: string
          id: string
          push_requested_at: string | null
          push_result: Json | null
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          push_requested_at?: string | null
          push_result?: Json | null
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          push_requested_at?: string | null
          push_result?: Json | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_profiles: {
        Row: {
          answers: Json
          headline: string
          interests: string
          links: string[]
          looking_for: string
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers?: Json
          headline: string
          interests?: string
          links?: string[]
          looking_for?: string
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers?: Json
          headline?: string
          interests?: string
          links?: string[]
          looking_for?: string
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_profiles_room_id_user_id_fkey"
            columns: ["room_id", "user_id"]
            isOneToOne: true
            referencedRelation: "room_members"
            referencedColumns: ["room_id", "user_id"]
          },
        ]
      }
      entry_questions: {
        Row: {
          created_at: string
          id: string
          kind: string
          position: number
          prompt: string
          required: boolean
          room_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          position: number
          prompt: string
          required?: boolean
          room_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          position?: number
          prompt?: string
          required?: boolean
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_questions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      expiry_reminders: {
        Row: {
          created_at: string
          detail: Json | null
          expiry_version: number
          room_id: string
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json | null
          expiry_version: number
          room_id: string
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json | null
          expiry_version?: number
          room_id?: string
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expiry_reminders_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      face_enrollments: {
        Row: {
          created_at: string
          id: string
          ref_path: string
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ref_path: string
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ref_path?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_enrollments_room_id_user_id_fkey"
            columns: ["room_id", "user_id"]
            isOneToOne: true
            referencedRelation: "room_members"
            referencedColumns: ["room_id", "user_id"]
          },
        ]
      }
      face_jobs: {
        Row: {
          attempts: number
          created_at: string
          enrollment_id: string
          id: string
          last_error: string | null
          media_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          enrollment_id: string
          id?: string
          last_error?: string | null
          media_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          enrollment_id?: string
          id?: string
          last_error?: string | null
          media_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "face_jobs_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "face_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_jobs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      face_matches: {
        Row: {
          created_at: string
          enrollment_id: string
          excluded: boolean
          matched: boolean
          media_id: string
          similarity: number | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          excluded?: boolean
          matched: boolean
          media_id: string
          similarity?: number | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          excluded?: boolean
          matched?: boolean
          media_id?: string
          similarity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "face_matches_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "face_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "face_matches_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      join_attempts: {
        Row: {
          attempted_at: string
          id: number
          ip_hash: string | null
          kind: string
          succeeded: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: never
          ip_hash?: string | null
          kind?: string
          succeeded: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: never
          ip_hash?: string | null
          kind?: string
          succeeded?: boolean
          user_id?: string
        }
        Relationships: []
      }
      live_presence: {
        Row: {
          accuracy_m: number | null
          heading: number | null
          lat: number
          lng: number
          room_id: string
          speed_mps: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_m?: number | null
          heading?: number | null
          lat: number
          lng: number
          room_id: string
          speed_mps?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_m?: number | null
          heading?: number | null
          lat?: number
          lng?: number
          room_id?: string
          speed_mps?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_presence_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          content_sha256: string | null
          created_at: string
          duration_ms: number | null
          file_name: string
          height: number | null
          id: string
          kind: string
          mime_type: string
          original_path: string
          preview_path: string | null
          room_id: string
          size_bytes: number | null
          status: string
          uploader_id: string
          width: number | null
        }
        Insert: {
          content_sha256?: string | null
          created_at?: string
          duration_ms?: number | null
          file_name: string
          height?: number | null
          id?: string
          kind: string
          mime_type: string
          original_path: string
          preview_path?: string | null
          room_id: string
          size_bytes?: number | null
          status?: string
          uploader_id: string
          width?: number | null
        }
        Update: {
          content_sha256?: string | null
          created_at?: string
          duration_ms?: number | null
          file_name?: string
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string
          original_path?: string
          preview_path?: string | null
          room_id?: string
          size_bytes?: number | null
          status?: string
          uploader_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      member_status: {
        Row: {
          room_id: string
          status_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          room_id: string
          status_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          room_id?: string
          status_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_status_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_status_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "status_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      message_reactions: {
        Row: {
          created_at: string
          message_id: string
          reaction: number
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          reaction: number
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          reaction?: number
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      message_triage: {
        Row: {
          created_at: string
          important: boolean | null
          message_id: string
          reason: string | null
          room_id: string
          source: string
          state: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          important?: boolean | null
          message_id: string
          reason?: string | null
          room_id: string
          source?: string
          state: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          important?: boolean | null
          message_id?: string
          reason?: string | null
          room_id?: string
          source?: string
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_triage_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_triage_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          media_id: string | null
          room_id: string
          sender_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_id?: string | null
          room_id: string
          sender_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          media_id?: string | null
          room_id?: string
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_character: number | null
          avatar_path: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_character?: number | null
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_character?: number | null
          avatar_path?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          app: string
          image_path: string
          link: string | null
          owner_id: string
          reported_at: string | null
          reported_by: string | null
          updated_at: string
        }
        Insert: {
          app: string
          image_path: string
          link?: string | null
          owner_id: string
          reported_at?: string | null
          reported_by?: string | null
          updated_at?: string
        }
        Update: {
          app?: string
          image_path?: string
          link?: string | null
          owner_id?: string
          reported_at?: string | null
          reported_by?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qrewing_matches: {
        Row: {
          created_at: string
          input_hash: string
          matches: Json
          room_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          input_hash: string
          matches: Json
          room_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          input_hash?: string
          matches?: Json
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrewing_matches_room_id_user_id_fkey"
            columns: ["room_id", "user_id"]
            isOneToOne: true
            referencedRelation: "room_members"
            referencedColumns: ["room_id", "user_id"]
          },
        ]
      }
      qrewing_members: {
        Row: {
          ai_ok_at: string | null
          mute_small_talk: boolean
          room_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_ok_at?: string | null
          mute_small_talk?: boolean
          room_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_ok_at?: string | null
          mute_small_talk?: boolean
          room_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrewing_members_room_id_user_id_fkey"
            columns: ["room_id", "user_id"]
            isOneToOne: true
            referencedRelation: "room_members"
            referencedColumns: ["room_id", "user_id"]
          },
        ]
      }
      qrewing_rooms: {
        Row: {
          ai_enabled: boolean
          entry_required: boolean
          room_id: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          entry_required?: boolean
          room_id: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          entry_required?: boolean
          room_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qrewing_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      question_cards: {
        Row: {
          answer: string | null
          answered_at: string | null
          answerer_id: string
          asker_id: string
          created_at: string
          id: string
          posted_as_notice: boolean
          question: string
          room_id: string
          status: string
          timeout_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answerer_id: string
          asker_id: string
          created_at?: string
          id?: string
          posted_as_notice?: boolean
          question: string
          room_id: string
          status?: string
          timeout_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answerer_id?: string
          asker_id?: string
          created_at?: string
          id?: string
          posted_as_notice?: boolean
          question?: string
          room_id?: string
          status?: string
          timeout_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_cards_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_members: {
        Row: {
          joined_at: string
          last_read_at: string
          role: string
          room_id: string
          share_location: boolean
          user_id: string
        }
        Insert: {
          joined_at?: string
          last_read_at?: string
          role?: string
          room_id: string
          share_location?: boolean
          user_id: string
        }
        Update: {
          joined_at?: string
          last_read_at?: string
          role?: string
          room_id?: string
          share_location?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_recaps: {
        Row: {
          created_at: string
          highlights: string[] | null
          refreshed_at: string | null
          room_id: string
          state: string
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          highlights?: string[] | null
          refreshed_at?: string | null
          room_id: string
          state: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          highlights?: string[] | null
          refreshed_at?: string | null
          room_id?: string
          state?: string
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_recaps_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          activity_ended_at: string | null
          activity_seq: number
          activity_started_at: string | null
          activity_state: string
          code: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          expiry_version: number
          grace_until: string | null
          host_id: string
          id: string
          invite_token: string
          location_allowed: boolean
          max_members: number
          name: string
          no_limit: boolean
          notice_set_at: string | null
          notice_set_by: string | null
          notice_text: string | null
          place_lat: number | null
          place_lng: number | null
          place_name: string | null
          public_icon: string | null
          public_location: string | null
          route: Json
          starts_at: string | null
          type: string
          visibility: string
        }
        Insert: {
          activity_ended_at?: string | null
          activity_seq?: number
          activity_started_at?: string | null
          activity_state?: string
          code: string
          created_at?: string
          deleted_at?: string | null
          expires_at: string
          expiry_version?: number
          grace_until?: string | null
          host_id: string
          id?: string
          invite_token?: string
          location_allowed?: boolean
          max_members?: number
          name: string
          no_limit?: boolean
          notice_set_at?: string | null
          notice_set_by?: string | null
          notice_text?: string | null
          place_lat?: number | null
          place_lng?: number | null
          place_name?: string | null
          public_icon?: string | null
          public_location?: string | null
          route?: Json
          starts_at?: string | null
          type?: string
          visibility?: string
        }
        Update: {
          activity_ended_at?: string | null
          activity_seq?: number
          activity_started_at?: string | null
          activity_state?: string
          code?: string
          created_at?: string
          deleted_at?: string | null
          expires_at?: string
          expiry_version?: number
          grace_until?: string | null
          host_id?: string
          id?: string
          invite_token?: string
          location_allowed?: boolean
          max_members?: number
          name?: string
          no_limit?: boolean
          notice_set_at?: string | null
          notice_set_by?: string | null
          notice_text?: string | null
          place_lat?: number | null
          place_lng?: number | null
          place_name?: string | null
          public_icon?: string | null
          public_location?: string | null
          route?: Json
          starts_at?: string | null
          type?: string
          visibility?: string
        }
        Relationships: []
      }
      status_definitions: {
        Row: {
          id: string
          is_emergency: boolean
          label: string
          room_id: string
          sort: number
        }
        Insert: {
          id?: string
          is_emergency?: boolean
          label: string
          room_id: string
          sort?: number
        }
        Update: {
          id?: string
          is_emergency?: boolean
          label?: string
          room_id?: string
          sort?: number
        }
        Relationships: [
          {
            foreignKeyName: "status_definitions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plans: {
        Row: {
          plan: string
          updated_at: string
          user_id: string
        }
        Insert: {
          plan: string
          updated_at?: string
          user_id: string
        }
        Update: {
          plan?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ack_emergency: { Args: { p_event_id: string }; Returns: undefined }
      answer_question_card: {
        Args: {
          p_answer: string
          p_card_id: string
          p_post_as_notice?: boolean
        }
        Returns: {
          answer: string | null
          answered_at: string | null
          answerer_id: string
          asker_id: string
          created_at: string
          id: string
          posted_as_notice: boolean
          question: string
          room_id: string
          status: string
          timeout_at: string
        }
        SetofOptions: {
          from: "*"
          to: "question_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      ask_question_in_chat: {
        Args: { p_card_id: string }
        Returns: {
          answer: string | null
          answered_at: string | null
          answerer_id: string
          asker_id: string
          created_at: string
          id: string
          posted_as_notice: boolean
          question: string
          room_id: string
          status: string
          timeout_at: string
        }
        SetofOptions: {
          from: "*"
          to: "question_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_connect_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      clear_my_status: { Args: { p_room_id: string }; Returns: undefined }
      connection_qr_codes: {
        Args: { p_other: string }
        Returns: {
          app: string
          image_path: string
          link: string
          reported_by_me: boolean
          updated_at: string
        }[]
      }
      create_room: {
        Args: {
          p_expires_at: string
          p_location_allowed: boolean
          p_max_members?: number
          p_name: string
          p_no_limit?: boolean
          p_place_lat?: number
          p_place_lng?: number
          p_place_name?: string
          p_public_icon?: string
          p_public_location?: string
          p_starts_at?: string
          p_statuses?: string[]
          p_type: string
          p_visibility?: string
        }
        Returns: {
          activity_ended_at: string | null
          activity_seq: number
          activity_started_at: string | null
          activity_state: string
          code: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          expiry_version: number
          grace_until: string | null
          host_id: string
          id: string
          invite_token: string
          location_allowed: boolean
          max_members: number
          name: string
          no_limit: boolean
          notice_set_at: string | null
          notice_set_by: string | null
          notice_text: string | null
          place_lat: number | null
          place_lng: number | null
          place_name: string | null
          public_icon: string | null
          public_location: string | null
          route: Json
          starts_at: string | null
          type: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_qr_code: { Args: { p_app: string }; Returns: undefined }
      end_room: { Args: { p_room_id: string }; Returns: undefined }
      enroll_face: {
        Args: { p_ref_path: string; p_room_id: string }
        Returns: string
      }
      get_my_plan: { Args: never; Returns: string }
      janitor_detect_objects: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          name: string
        }[]
      }
      janitor_secret_ok: { Args: { p_secret: string }; Returns: boolean }
      join_open_room: { Args: { p_room_id: string }; Returns: string }
      join_room: {
        Args: { p_code?: string; p_token?: string }
        Returns: string
      }
      leave_room: { Args: { p_room_id: string }; Returns: undefined }
      list_open_rooms: {
        Args: { p_limit?: number }
        Returns: {
          already_member: boolean
          expires_at: string
          max_members: number
          member_count: number
          name: string
          public_icon: string
          public_location: string
          room_id: string
          type: string
        }[]
      }
      log_qrewing_usage: {
        Args: {
          p_action: string
          p_input_tokens: number
          p_model: string
          p_output_tokens: number
          p_room_id: string
          p_user_id?: string
        }
        Returns: undefined
      }
      mark_arrived: { Args: { p_room_id: string }; Returns: string }
      mark_room_read: { Args: { p_room_id: string }; Returns: string }
      my_connect_requests: {
        Args: never
        Returns: {
          created_at: string
          direction: string
          expires_at: string
          other_apps: string[]
          other_avatar_path: string
          other_id: string
          other_name: string
          request_id: string
          room_id: string
          room_name: string
        }[]
      }
      my_connection_quota: {
        Args: never
        Returns: {
          can_add: boolean
          max_connections: number
          pending_incoming: number
          plan: string
          used: number
        }[]
      }
      my_connections: {
        Args: never
        Returns: {
          created_at: string
          other_apps: string[]
          other_avatar_path: string
          other_id: string
          other_name: string
          room_id: string
          room_name: string
        }[]
      }
      my_qr_codes: {
        Args: never
        Returns: {
          app: string
          image_path: string
          link: string
          reported_at: string
          reported_by: string
          reported_by_name: string
          updated_at: string
        }[]
      }
      prepare_account_deletion: { Args: { p_user_id: string }; Returns: Json }
      preview_room: {
        Args: { p_code?: string; p_token?: string }
        Returns: {
          already_member: boolean
          expires_at: string
          max_members: number
          member_count: number
          name: string
          place_lat: number | null
          place_lng: number | null
          place_name: string | null
          room_id: string
          starts_at: string | null
          type: string
        }[]
      }
      qrewing_usage_count: {
        Args: {
          p_action: string
          p_room_id: string
          p_since: string
          p_user_id?: string
        }
        Returns: number
      }
      register_push_token: {
        Args: { p_platform?: string; p_token: string }
        Returns: undefined
      }
      remove_connection: { Args: { p_other: string }; Returns: undefined }
      remove_face_enrollment: {
        Args: { p_room_id: string }
        Returns: undefined
      }
      report_location: {
        Args: {
          p_accuracy?: number
          p_heading?: number
          p_lat: number
          p_lng: number
          p_room_id: string
          p_speed?: number
        }
        Returns: boolean
      }
      report_qr_code: {
        Args: { p_app: string; p_owner: string }
        Returns: undefined
      }
      request_connection: {
        Args: { p_room_id: string; p_to: string }
        Returns: string
      }
      respond_connection: {
        Args: { p_accept: boolean; p_request_id: string }
        Returns: string
      }
      room_connect_people: {
        Args: { p_room_id: string }
        Returns: {
          apps: string[]
          can_connect: boolean
          request_id: string
          state: string
          user_id: string
        }[]
      }
      room_list_summaries: {
        Args: { p_room_ids?: string[] }
        Returns: {
          last_at: string
          last_body: string
          last_kind: string
          last_sender_id: string
          last_sender_name: string
          room_id: string
          unread: number
        }[]
      }
      rotate_invite: {
        Args: { p_room_id: string }
        Returns: {
          code: string
          invite_token: string
        }[]
      }
      set_activity_state: {
        Args: { p_room_id: string; p_state: string }
        Returns: undefined
      }
      set_emergency_on_way: {
        Args: { p_event_id: string; p_on: boolean }
        Returns: {
          acked_at: string
          event_id: string
          on_way: boolean
          on_way_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "emergency_acks"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_entry_questions: {
        Args: { p_questions: Json; p_room_id: string }
        Returns: {
          created_at: string
          id: string
          kind: string
          position: number
          prompt: string
          required: boolean
          room_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "entry_questions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      set_location_allowed: {
        Args: { p_allowed: boolean; p_room_id: string }
        Returns: undefined
      }
      set_my_plan: { Args: { p_plan: string }; Returns: string }
      set_my_status: {
        Args: { p_room_id: string; p_status_id: string }
        Returns: string
      }
      set_qrewing_member: {
        Args: { p_ai_ok: boolean; p_mute: boolean; p_room_id: string }
        Returns: {
          ai_ok_at: string | null
          mute_small_talk: boolean
          room_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "qrewing_members"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_qrewing_room: {
        Args: {
          p_ai_enabled: boolean
          p_entry_required: boolean
          p_room_id: string
        }
        Returns: {
          ai_enabled: boolean
          entry_required: boolean
          room_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "qrewing_rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_room_notice: {
        Args: { p_room_id: string; p_text: string }
        Returns: {
          activity_ended_at: string | null
          activity_seq: number
          activity_started_at: string | null
          activity_state: string
          code: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          expiry_version: number
          grace_until: string | null
          host_id: string
          id: string
          invite_token: string
          location_allowed: boolean
          max_members: number
          name: string
          no_limit: boolean
          notice_set_at: string | null
          notice_set_by: string | null
          notice_text: string | null
          place_lat: number | null
          place_lng: number | null
          place_name: string | null
          public_icon: string | null
          public_location: string | null
          route: Json
          starts_at: string | null
          type: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_route: {
        Args: { p_room_id: string; p_route: Json }
        Returns: undefined
      }
      set_share_location: {
        Args: { p_room_id: string; p_share: boolean }
        Returns: undefined
      }
      set_status_definitions: {
        Args: { p_labels: string[]; p_room_id: string }
        Returns: undefined
      }
      stop_my_location: { Args: never; Returns: undefined }
      toggle_message_check: { Args: { p_message_id: string }; Returns: boolean }
      toggle_message_reaction: {
        Args: { p_message_id: string; p_reaction: number }
        Returns: boolean
      }
      unregister_push_token: { Args: { p_token: string }; Returns: undefined }
      update_room_expiry: {
        Args: { p_expires_at: string; p_room_id: string }
        Returns: {
          activity_ended_at: string | null
          activity_seq: number
          activity_started_at: string | null
          activity_state: string
          code: string
          created_at: string
          deleted_at: string | null
          expires_at: string
          expiry_version: number
          grace_until: string | null
          host_id: string
          id: string
          invite_token: string
          location_allowed: boolean
          max_members: number
          name: string
          no_limit: boolean
          notice_set_at: string | null
          notice_set_by: string | null
          notice_text: string | null
          place_lat: number | null
          place_lng: number | null
          place_name: string | null
          public_icon: string | null
          public_location: string | null
          route: Json
          starts_at: string | null
          type: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "rooms"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_entry_answers: {
        Args: { p_answers: Json; p_room_id: string }
        Returns: {
          answers: Json
          headline: string
          interests: string
          links: string[]
          looking_for: string
          room_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entry_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_entry_profile: {
        Args: {
          p_headline: string
          p_interests: string
          p_links: string[]
          p_looking_for: string
          p_room_id: string
        }
        Returns: {
          answers: Json
          headline: string
          interests: string
          links: string[]
          looking_for: string
          room_id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "entry_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_qr_code: {
        Args: { p_app: string; p_image_path: string; p_link: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
