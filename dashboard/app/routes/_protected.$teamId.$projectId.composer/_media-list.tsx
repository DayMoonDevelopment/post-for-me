import { VideoIcon } from "lucide-react";
import { CrossSmallIcon } from "~/components/icons";

import type { MediaListProps, MediaListItemProps } from "./types";

export function MediaList({ items, onRemove }: MediaListProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium text-muted-foreground">
        Added Media ({items.length})
      </h4>

      <div className="space-y-2">
        {items.map((item) => (
          <MediaListItem key={item.id} item={item} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function MediaListItem({ item, onRemove }: MediaListItemProps) {
  return (
    <div className="flex items-center gap-3 p-2 bg-card border rounded-lg">
      <div className="flex-shrink-0">
        {item.preview ? (
          <img
            src={item.preview}
            alt={item.name}
            className="size-10 object-cover rounded"
          />
        ) : (
          <div className="size-10 bg-muted rounded flex items-center justify-center">
            <VideoIcon className="size-4 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground truncate">{item.url}</p>
      </div>

      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
          aria-label={`Remove ${item.name}`}
        >
          <CrossSmallIcon className="size-4 text-muted-foreground hover:text-foreground" />
        </button>
      ) : null}
    </div>
  );
}
