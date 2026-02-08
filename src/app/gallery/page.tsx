import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { captures, CaptureStatus } from "@/lib/db/schema";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ExternalLink, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default function GalleryPage() {
  const db = getDb();

  const successfulCaptures = db
    .select()
    .from(captures)
    .where(eq(captures.status, CaptureStatus.Success))
    .orderBy(desc(captures.createdAt))
    .limit(100)
    .all();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gallery</h1>
        <p className="text-muted-foreground mt-1">
          Browse all successful evidence captures.
        </p>
      </div>

      {successfulCaptures.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No successful captures yet.</p>
          <Link href="/" className="text-primary hover:underline text-sm mt-2 inline-block">
            Go capture some URLs
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {successfulCaptures.map((capture) => (
            <Link key={capture.id} href={`/captures/${capture.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader className="p-0">
                  <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/artifacts/${capture.id}/screenshot.png`}
                      alt={`Screenshot of ${capture.url}`}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-3">
                  <p className="font-mono text-xs truncate text-muted-foreground">
                    {capture.url}
                  </p>
                </CardContent>
                <CardFooter className="p-3 pt-0 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(capture.createdAt).toLocaleDateString()}
                  </span>
                  <ExternalLink className="h-3 w-3" />
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
