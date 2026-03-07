import { FormField, FormItem, FormLabel, FormControl } from "~/ui/form";
import { Input } from "~/ui/input";
import { ToggleGroup, ToggleGroupItem } from "~/ui/toggle-group";

export function TabYouTube() {
  return (
    <div className="flex flex-col gap-6">
      <FormField
        name="platform_configurations.youtube.title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input placeholder="Enter YouTube video title" {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        name="platform_configurations.youtube.privacy_status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Privacy</FormLabel>
            <FormControl>
              <ToggleGroup
                variant="outline"
                type="single"
                value={field.value}
                onValueChange={field.onChange}
              >
                <ToggleGroupItem value="public" className="px-3">
                  Public
                </ToggleGroupItem>
                <ToggleGroupItem value="unlisted" className="px-3">
                  Unlisted
                </ToggleGroupItem>
                <ToggleGroupItem value="private" className="px-3">
                  Private
                </ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
          </FormItem>
        )}
      />
    </div>
  );
}
