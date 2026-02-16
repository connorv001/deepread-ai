"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Search,
  MoreVertical,
  Trash2,
  FileText,
  Loader2,
  Clock,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { libraryApi, documentsApi, authApi } from "@/lib/api";
import { formatBytes } from "@/lib/utils";
import { useAuthStore } from "@/lib/store";
import { useState } from "react";

export default function LibraryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Fetch user on mount (cookie-based auth via BFF)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await authApi.me();
        setAuth(response.data.data.user);
      } catch (error) {
        // Not authenticated, middleware will redirect
        console.log('Auth check failed');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [setAuth, setLoading]);

  const { data: documents, isLoading: isDocsLoading } = useQuery({
    queryKey: ["documents", searchQuery],
    queryFn: () => libraryApi.list({ search: searchQuery }).then((r) => r.data.data.documents),
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentsApi.upload(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      uploadMutation.mutate(file);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      // Ignore errors
    }
    logout();
    router.push("/login");
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">DeepRead AI</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-10 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {user && (
              <span className="text-sm text-muted-foreground hidden md:inline">
                {user.email}
              </span>
            )}
            <Button variant="ghost" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Library</h1>
            <p className="text-muted-foreground mt-1">
              {documents?.length || 0} document{documents?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild>
            <label className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Upload Document
              <input
                type="file"
                accept=".pdf,.epub"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
          </Button>
        </div>

        {isDocsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : documents?.length === 0 ? (
          <Card className="py-16">
            <CardContent className="text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-6">
                Upload your first PDF or EPUB to start reading
              </p>
              <Button asChild>
                <label className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Document
                  <input
                    type="file"
                    accept=".pdf,.epub"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </label>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents?.map((doc: any) => (
              <Card
                key={doc.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => router.push(`/reader/${doc.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold line-clamp-1">{doc.title}</h3>
                        {doc.author && (
                          <p className="text-sm text-muted-foreground">{doc.author}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.type} · {formatBytes(doc.size)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate(doc.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {doc.progressPercent > 0 && (
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        {Math.round(doc.progressPercent)}%
                      </div>
                      {doc.lastReadAt && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(doc.lastReadAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Upload Dialog */}
      <Dialog open={isUploading} onOpenChange={setIsUploading}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading Document</DialogTitle>
            <DialogDescription>
              Please wait while we process your document...
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
