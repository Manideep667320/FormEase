import { auth } from "@/lib/firebase";
import DraftManager from "@/components/DraftManager";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

export default function Drafts() {
  const user = auth.currentUser;
  const isLoading = !user;

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="container mx-auto py-12">
        <div className="space-y-2">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <div className="space-y-3 mt-8">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Saved Drafts</h1>
      <DraftManager authToken={user.uid} />
    </div>
  );
}