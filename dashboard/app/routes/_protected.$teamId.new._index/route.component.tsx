import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router";

import { useForm as useFormFetcher } from "~/hooks/use-form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/ui/form";
import { Button } from "~/ui/button";
import { ToggleGroup, ToggleGroupItem } from "~/ui/toggle-group";
import { Input } from "~/ui/input";

const projectSetupSchema = z
  .object({
    name: z.string().optional(),
    project_type: z.string().optional(),
  })
  .refine((data) => data.project_type && data.project_type.trim() !== "", {
    message: "A project type is required",
    path: ["project_type"],
  });

type ProjectSetupFormValues = z.infer<typeof projectSetupSchema>;

export function Component() {
  const navigate = useNavigate();
  const { fetcher, isSubmitting } = useFormFetcher({ withToast: true });

  const form = useForm<ProjectSetupFormValues>({
    resolver: zodResolver(projectSetupSchema),
    defaultValues: {
      name: "New Project",
      project_type: "user",
    },
  });

  const onSubmit = (values: ProjectSetupFormValues) => {
    const formData = new FormData();

    if (values.name && values.name.trim() !== "") {
      formData.append("name", values.name);
    }

    if (values.project_type && values.project_type.trim() !== "") {
      formData.append("project_type", values.project_type);
    }

    fetcher.submit(formData, { method: "post" });
  };

  const handleClose = () => {
    navigate(-1);
  };

  const handleCancel = () => {
    // Reset form to original values
    form.reset({
      name: "New Project",
      project_type: "user",
    });

    navigate(-1);
  };

  const submitLoading = isSubmitting;
  const submitDisabled = !form.formState.isValid || submitLoading;

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Enter the project name and select a project type.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 w-full min-w-0"
          >
            <div className="text-sm text-destructive empty:hidden">
              {form.formState.errors?.project_type?.message}
            </div>
            <FormField
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        className={`bg-card pr-10`}
                        placeholder={"name"}
                        type="text"
                        autoComplete="off"
                        data-lpignore="true"
                        data-form-type="other"
                        data-1p-ignore="true"
                        spellCheck="false"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            <FormField
              name="project_type"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-2">
                    <FormLabel>Choose a project type</FormLabel>
                  </div>
                  <FormControl>
                    <ToggleGroup
                      variant="outline"
                      type="single"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <ToggleGroupItem value="user" className="px-3">
                        White Label Project
                      </ToggleGroupItem>
                      <ToggleGroupItem value="system" className="px-3">
                        Quickstart Project
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              {
                <>
                  <Button type="button" variant="ghost" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={submitLoading}
                    disabled={submitDisabled}
                  >
                    Create Project
                  </Button>
                </>
              }
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
