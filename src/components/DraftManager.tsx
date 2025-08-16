import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { useLocation } from 'wouter';
import type { FormDraft } from '../lib/firebaseService';

interface Draft extends FormDraft {
  id: string;
  formTypeId: string; // Changed to string to match FormDraft
  name: string;
  lastUpdated: string;
}

interface FormType {
  id: number; // id is number, requires type conversion when comparing with formTypeId
  code: string;
  name: string;
}

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';

interface DraftManagerProps {
  authToken: string;
  onContinueDraft?: (draft: Draft) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function DraftManager({ authToken, onContinueDraft, isModal, onClose }: DraftManagerProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  
  // Fetch user's drafts
  const { data: drafts, isLoading } = useQuery<Draft[]>({
    queryKey: ['/api/drafts'],
    queryFn: async () => {
      return await apiRequest<Draft[]>({
        url: '/api/drafts',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    },
    enabled: !!authToken,
  });
  
  // Fetch form types for reference
  const { data: formTypes } = useQuery<FormType[]>({
    queryKey: ['/api/form-types'],
    queryFn: async () => {
      return await apiRequest<FormType[]>({
        url: '/api/form-types',
        method: 'GET',
      });
    },
  });
  
  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      return await apiRequest({
        url: `/api/drafts/${draftId}`,
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drafts'] });
      toast({
        title: 'Draft Deleted',
        description: 'Your draft has been deleted successfully.',
      });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Failed to delete draft';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
  
  const handleDeleteDraft = (draft: Draft) => {
    setSelectedDraft(draft);
  };
  
  const confirmDeleteDraft = () => {
    if (selectedDraft) {
      deleteDraftMutation.mutate(selectedDraft.id);
      setSelectedDraft(null);
    }
  };
  
  const handleContinueDraft = (draft: Draft) => {
    if (onContinueDraft) {
      onContinueDraft(draft);
    } else {
      // Get the form type code
      const formType = formTypes?.find(type => type.id === parseInt(draft.formTypeId));
      if (formType) {
        // If not in modal mode, navigate to the form filling page with the draft
        navigate(`/form/${formType.code}?draftId=${draft.id}`);
      }
    }
  };
  
  // Format dates for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  const getFormTypeName = (formTypeId: string) => {
    const formType = formTypes?.find(type => type.id === parseInt(formTypeId));
    return formType?.name || 'Unknown Form';
  };

  return (
    <Card className={isModal ? "w-full" : "w-full max-w-4xl mx-auto mt-6"}>
      <CardHeader>
        <CardTitle>Your Saved Drafts</CardTitle>
        <CardDescription>
          Continue working on your previously saved forms or start a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Loading state
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : drafts && drafts.length > 0 ? (
          // Drafts table
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Form Type</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => (
                <TableRow key={draft.id}>
                  <TableCell className="font-medium">{draft.name}</TableCell>
                  <TableCell>{getFormTypeName(draft.formTypeId)}</TableCell>
                  <TableCell>{formatDate(draft.lastUpdated)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleContinueDraft(draft)}
                      >
                        Continue
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => handleDeleteDraft(draft)}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete your draft "{draft.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmDeleteDraft}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          // No drafts message
          <div className="text-center py-8">
            <p className="text-muted-foreground">You don't have any saved drafts yet.</p>
            <p className="mt-2">Start filling a form and save your progress to see it here.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end">
        {isModal && onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}