import { FolderAddLeftIcon } from "~/components/icons";
import { Link } from "react-router";
import { Card, CardContent, CardFooter } from "~/ui/card";

interface CreateProjectCardProps {
  teamId?: string;
}

export function CreateProjectCard({ teamId }: CreateProjectCardProps) {
  if (!teamId) {
    return null;
  }

  return (
    <Link to={`/${teamId}/new`}>
      <button className="hover:cursor-pointer hover:scale-[1.01] transition-all opacity-50 hover:opacity-100 w-full h-full">
        <Card className="gap-0 p-0 overflow-hidden h-full bg-transparent shadow-none border-dashed border-2 border-muted-foreground/50">
          <CardContent className="flex flex-col items-center justify-center p-8">
            <FolderAddLeftIcon className="size-16 text-muted-foreground" />
          </CardContent>
          <CardFooter className="text-center flex justify-center text-bold text-muted-foreground">
            <span>Create new project</span>
          </CardFooter>
        </Card>
      </button>
    </Link>
  );
}
