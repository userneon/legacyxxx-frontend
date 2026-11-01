import Aurora from "@/components/ui/aurora";

export default function AuroraDemo() {
  return (
    <Aurora className="flex h-screen w-full items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h2 className="text-3xl font-semibold">Aurora</h2>
        <p className="mt-2 text-muted-foreground">
          Soft light drifting behind your content.
        </p>
      </div>
    </Aurora>
  );
}
