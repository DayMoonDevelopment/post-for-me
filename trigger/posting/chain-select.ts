export const CHAIN_SELECT = `
        social_post_chain_items (
          id,
          sequence,
          caption,
          social_post_chain_item_media (
            id,
            url,
            thumbnail_url,
            thumbnail_timestamp_ms,
            tags,
            skip_processing
          )
        )`;
