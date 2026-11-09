import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import DraftManager from "@/components/DraftManager";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function Drafts() {
  const { currentUser, loading } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      if (currentUser && 'getIdToken' in currentUser) {
        try {
          const idToken = await currentUser.getIdToken();
          setToken(idToken);
        } catch {
          setToken(currentUser.uid);
        }
      }
    };
    fetchToken();
  }, [currentUser]);

  // Show loading state while checking auth
  if (loading) {
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
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Saved Drafts</h1>
      <DraftManager authToken={token || currentUser.uid} />
    </div>
  );
}
