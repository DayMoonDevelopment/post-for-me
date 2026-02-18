export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  cms: {
    Tables: {
      resources: {
        Row: {
          body_blocks: Json
          created_at: string
          id: string
          seo_meta: Json | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body_blocks: Json
          created_at?: string
          id?: string
          seo_meta?: Json | null
          slug: string
          status: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body_blocks?: Json
          created_at?: string
          id?: string
          seo_meta?: Json | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      slug_redirects: {
        Row: {
          added_at: string
          http_status: number
          slug: string
          target_slug: string
        }
        Insert: {
          added_at?: string
          http_status?: number
          slug: string
          target_slug: string
        }
        Update: {
          added_at?: string
          http_status?: number
          slug?: string
          target_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "slug_redirects_target_slug_fkey"
            columns: ["target_slug"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["slug"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      projects: {
        Row: {
          auth_callback_url: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          team_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          auth_callback_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          team_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          auth_callback_url?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          team_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_configurations: {
        Row: {
          caption: string | null
          id: string
          post_id: string
          provider: Database["public"]["Enums"]["social_provider"] | null
          provider_connection_id: string | null
          provider_data: Json | null
        }
        Insert: {
          caption?: string | null
          id?: string
          post_id: string
          provider?: Database["public"]["Enums"]["social_provider"] | null
          provider_connection_id?: string | null
          provider_data?: Json | null
        }
        Update: {
          caption?: string | null
          id?: string
          post_id?: string
          provider?: Database["public"]["Enums"]["social_provider"] | null
          provider_connection_id?: string | null
          provider_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_configurations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_configurations_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "social_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_media: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          meta_data: Json | null
          post_id: string
          provider: Database["public"]["Enums"]["social_provider"] | null
          provider_connection_id: string | null
          skip_processing: boolean | null
          tags: Json | null
          thumbnail_timestamp_ms: number | null
          thumbnail_url: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          meta_data?: Json | null
          post_id: string
          provider?: Database["public"]["Enums"]["social_provider"] | null
          provider_connection_id?: string | null
          skip_processing?: boolean | null
          tags?: Json | null
          thumbnail_timestamp_ms?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          meta_data?: Json | null
          post_id?: string
          provider?: Database["public"]["Enums"]["social_provider"] | null
          provider_connection_id?: string | null
          skip_processing?: boolean | null
          tags?: Json | null
          thumbnail_timestamp_ms?: number | null
          thumbnail_url?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_media_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "social_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_provider_connections: {
        Row: {
          created_at: string
          id: string
          post_id: string
          provider_connection_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          provider_connection_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          provider_connection_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_provider_connections_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_provider_connections_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "social_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_results: {
        Row: {
          created_at: string
          details: Json | null
          error_message: string | null
          id: string
          post_id: string
          provider_connection_id: string
          provider_post_id: string | null
          provider_post_url: string | null
          success: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          post_id: string
          provider_connection_id: string
          provider_post_id?: string | null
          provider_post_url?: string | null
          success: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          id?: string
          post_id?: string
          provider_connection_id?: string
          provider_post_id?: string | null
          provider_post_url?: string | null
          success?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_post_results_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_results_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "social_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          api_key: string
          caption: string
          created_at: string
          external_id: string | null
          id: string
          post_at: string
          project_id: string
          status: Database["public"]["Enums"]["social_post_status"]
          updated_at: string
        }
        Insert: {
          api_key: string
          caption: string
          created_at?: string
          external_id?: string | null
          id?: string
          post_at?: string
          project_id: string
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Update: {
          api_key?: string
          caption?: string
          created_at?: string
          external_id?: string | null
          id?: string
          post_at?: string
          project_id?: string
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_provider_app_credentials: {
        Row: {
          app_id: string | null
          app_secret: string | null
          created_at: string
          project_id: string
          provider: Database["public"]["Enums"]["social_provider"]
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          project_id: string
          provider: Database["public"]["Enums"]["social_provider"]
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          project_id?: string
          provider?: Database["public"]["Enums"]["social_provider"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_provider_app_credentials_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_provider_connection_oauth_data: {
        Row: {
          created_at: string | null
          id: string
          key: string
          key_id: string
          project_id: string
          provider: Database["public"]["Enums"]["social_provider"]
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          key_id: string
          project_id: string
          provider: Database["public"]["Enums"]["social_provider"]
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          key_id?: string
          project_id?: string
          provider?: Database["public"]["Enums"]["social_provider"]
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_provider_connection_oauth_data_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      social_provider_connection_pagination_data: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json
          provider_connection_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata: Json
          provider_connection_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json
          provider_connection_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_provider_connection_paginati_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "social_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      social_provider_connections: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          created_at: string
          external_id: string | null
          id: string
          project_id: string
          provider: Database["public"]["Enums"]["social_provider"]
          refresh_token: string | null
          refresh_token_expires_at: string | null
          social_provider_metadata: Json | null
          social_provider_profile_photo_url: string | null
          social_provider_user_id: string
          social_provider_user_name: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          project_id: string
          provider: Database["public"]["Enums"]["social_provider"]
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          social_provider_metadata?: Json | null
          social_provider_profile_photo_url?: string | null
          social_provider_user_id: string
          social_provider_user_name?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          project_id?: string
          provider?: Database["public"]["Enums"]["social_provider"]
          refresh_token?: string | null
          refresh_token_expires_at?: string | null
          social_provider_metadata?: Json | null
          social_provider_profile_photo_url?: string | null
          social_provider_user_id?: string
          social_provider_user_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_provider_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      system_social_provider_app_credentials: {
        Row: {
          app_id: string | null
          app_secret: string | null
          created_at: string
          id: string
          provider: Database["public"]["Enums"]["social_provider"]
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          id?: string
          provider: Database["public"]["Enums"]["social_provider"]
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          app_secret?: string | null
          created_at?: string
          id?: string
          provider?: Database["public"]["Enums"]["social_provider"]
          updated_at?: string
        }
        Relationships: []
      }
      team_addons: {
        Row: {
          addon: Database["public"]["Enums"]["subscription_addon"]
          expires_at: string
          id: string
          team_id: string
        }
        Insert: {
          addon: Database["public"]["Enums"]["subscription_addon"]
          expires_at: string
          id?: string
          team_id: string
        }
        Update: {
          addon?: Database["public"]["Enums"]["subscription_addon"]
          expires_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_addons_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_social_post_meters: {
        Row: {
          count: number
          day: number
          hour: number
          id: string
          minute: number
          month: number
          provider: Database["public"]["Enums"]["social_provider"]
          team_id: string
          year: number
        }
        Insert: {
          count: number
          day: number
          hour: number
          id?: string
          minute: number
          month: number
          provider: Database["public"]["Enums"]["social_provider"]
          team_id: string
          year: number
        }
        Update: {
          count?: number
          day?: number
          hour?: number
          id?: string
          minute?: number
          month?: number
          provider?: Database["public"]["Enums"]["social_provider"]
          team_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_social_post_meters_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_users: {
        Row: {
          created_at: string | null
          created_by: string | null
          team_id: string
          updated_at: string | null
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          team_id: string
          updated_at?: string | null
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          team_id?: string
          updated_at?: string | null
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_users_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_users_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          billing_email: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          stripe_customer_id: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          billing_email?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          billing_email?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          stripe_customer_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      test_social_provider_connections: {
        Row: {
          created_at: string | null
          created_by: string | null
          name: string | null
          social_provider_connection_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          name?: string | null
          social_provider_connection_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          name?: string | null
          social_provider_connection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_social_provider_connecti_social_provider_connection_i_fkey"
            columns: ["social_provider_connection_id"]
            isOneToOne: true
            referencedRelation: "social_provider_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string
          first_name: string | null
          id: string
          last_name: string | null
        }
        Insert: {
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
        }
        Update: {
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          data: Json
          id: string
          response: Json | null
          status: Database["public"]["Enums"]["webhook_event_status"]
          type: Database["public"]["Enums"]["webhook_event_type"]
          updated_at: string | null
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          data: Json
          id?: string
          response?: Json | null
          status: Database["public"]["Enums"]["webhook_event_status"]
          type: Database["public"]["Enums"]["webhook_event_type"]
          updated_at?: string | null
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json
          id?: string
          response?: Json | null
          status?: Database["public"]["Enums"]["webhook_event_status"]
          type?: Database["public"]["Enums"]["webhook_event_type"]
          updated_at?: string | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscribed_event_types: {
        Row: {
          id: string
          type: Database["public"]["Enums"]["webhook_event_type"]
          webhook_id: string
        }
        Insert: {
          id?: string
          type: Database["public"]["Enums"]["webhook_event_type"]
          webhook_id: string
        }
        Update: {
          id?: string
          type?: Database["public"]["Enums"]["webhook_event_type"]
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscribed_event_types_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          id: string
          project_id: string
          secret_key: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          project_id: string
          secret_key: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          project_id?: string
          secret_key?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_tiktok_verification_files: {
        Row: {
          bucket_id: string | null
          name: string | null
          project_id: string | null
        }
        Insert: {
          bucket_id?: string | null
          name?: string | null
          project_id?: never
        }
        Update: {
          bucket_id?: string | null
          name?: string | null
          project_id?: never
        }
        Relationships: []
      }
    }
    Functions: {
      citext: {
        Args: { "": boolean } | { "": string } | { "": unknown }
        Returns: string
      }
      citext_hash: {
        Args: { "": string }
        Returns: number
      }
      citextin: {
        Args: { "": unknown }
        Returns: string
      }
      citextout: {
        Args: { "": string }
        Returns: unknown
      }
      citextrecv: {
        Args: { "": unknown }
        Returns: string
      }
      citextsend: {
        Args: { "": string }
        Returns: string
      }
      increment_team_social_post_meter: {
        Args: {
          p_team_id: string
          p_day: number
          p_month: number
          p_hour: number
          p_min: number
          p_year: number
          p_provider: Database["public"]["Enums"]["social_provider"]
        }
        Returns: undefined
      }
      is_system_project: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { team_id: string }
        Returns: boolean
      }
      nanoid: {
        Args: { prefix: string; size?: number; alphabet?: string }
        Returns: string
      }
      user_has_post_access: {
        Args: { post_id: string }
        Returns: boolean
      }
      user_has_project_access: {
        Args: { project_id: string }
        Returns: boolean
      }
      user_has_webhook_access: {
        Args: { webhook_id: string }
        Returns: boolean
      }
    }
    Enums: {
      social_post_status:
        | "draft"
        | "scheduled"
        | "processing"
        | "posted"
        | "processed"
      social_provider:
        | "facebook"
        | "instagram"
        | "x"
        | "tiktok"
        | "youtube"
        | "pinterest"
        | "linkedin"
        | "bluesky"
        | "threads"
        | "tiktok_business"
        | "instagram_w_facebook"
      subscription_addon: "managed_system_credentials"
      webhook_event_status: "pending" | "processing" | "completed" | "failed"
      webhook_event_type:
        | "social.post.created"
        | "social.post.updated"
        | "social.post.deleted"
        | "social.post.result.created"
        | "social.account.created"
        | "social.account.updated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  cms: {
    Enums: {},
  },
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      social_post_status: [
        "draft",
        "scheduled",
        "processing",
        "posted",
        "processed",
      ],
      social_provider: [
        "facebook",
        "instagram",
        "x",
        "tiktok",
        "youtube",
        "pinterest",
        "linkedin",
        "bluesky",
        "threads",
        "tiktok_business",
        "instagram_w_facebook",
      ],
      subscription_addon: ["managed_system_credentials"],
      webhook_event_status: ["pending", "processing", "completed", "failed"],
      webhook_event_type: [
        "social.post.created",
        "social.post.updated",
        "social.post.deleted",
        "social.post.result.created",
        "social.account.created",
        "social.account.updated",
      ],
    },
  },
} as const

