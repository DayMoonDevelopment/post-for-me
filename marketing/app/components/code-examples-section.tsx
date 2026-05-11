import { CodeSamples } from "~/components/code-samples";

export const CodeExamplesSection = () => {
  return (
    <div className="dark flex items-center justify-center px-4 py-16 bg-background">
      <div className="max-w-(--breakpoint-xl) w-full">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.03em] mb-4 text-card-foreground">
            See it in action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose your favorite language and get started with our simple, intuitive API.
          </p>
        </div>

        <div className="bg-card text-card-foreground rounded-3xl p-6 lg:p-8 border border-primary/25">
          <CodeSamples />
        </div>
      </div>
    </div>
  );
};