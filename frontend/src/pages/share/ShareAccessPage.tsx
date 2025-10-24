import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/providers/auth-provider';
import api from '@/libs/api';

interface ShareAccessResponse {
  downloadUrl: string;
  metadata: {
    originalName: string;
    mimetype: string;
    encryptionType?: string;
    iv?: string;
    encryptedKey?: string;
    owner: {
      name?: string;
      email?: string;
    };
  };
}

export default function ShareAccessPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAuthenticated, fetchUser } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [addingToAccount, setAddingToAccount] = useState(false);
  const [fileData, setFileData] = useState<ShareAccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    if (token) {
      // First, try to access without password to check if password is required
      checkAccessRequirements();
    }
  }, [token]);

  // Refresh auth state when page becomes visible (e.g., returning from login)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser]);

  const checkAccessRequirements = async () => {
    try {
      const response = await api.get(`/share/access/${token}`);
      setFileData(response.data);
      setError(null);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setRequiresPassword(true);
        setError(null);
      } else {
        const errorMsg = err.response?.data?.message || 'Failed to access shared file';
        setError(errorMsg);
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/share/access/${token}`, {
        params: { password: password.trim() }
      });
      
      setFileData(response.data);
      setRequiresPassword(false);
      setError(null);
      
      toast({
        title: "Access granted",
        description: "You can now download the file."
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to access shared file';
      setError(errorMsg);
      
      toast({
        title: "Access denied",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (fileData?.downloadUrl) {
      // Create a temporary link to download the file
      const link = document.createElement('a');
      link.href = fileData.downloadUrl;
      link.download = fileData.metadata.originalName;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${fileData.metadata.originalName}`
      });
    }
  };

  const handleAddToAccount = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Please login to add files to your account",
        variant: "destructive"
      });
      return;
    }

    setAddingToAccount(true);
    try {
      const response = await api.post(`/share/add-to-account/${token}`, {
        password: password.trim() || undefined
      });
      
      toast({
        title: "✅ File added to account",
        description: `${response.data.file.originalName} has been added to your files`
      });
      
      // Navigate to user's files
      navigate('/dashboard/my-files');
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to add file to account';
      toast({
        title: "❌ Failed to add file",
        description: errorMsg,
        variant: "destructive"
      });
    } finally {
      setAddingToAccount(false);
    }
  };

  const getFileIcon = (mimetype?: string) => {
    if (!mimetype) {
      return (
        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    if (mimetype.startsWith('image/')) {
      return (
        <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }

    if (mimetype.includes('pdf')) {
      return (
        <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    return (
      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Link</h1>
            <p className="text-gray-600 mb-6">The share link you're trying to access is invalid.</p>
            <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="p-8 max-w-md w-full mx-4">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {requiresPassword && !fileData && (
          <div className="text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Required</h1>
              <p className="text-gray-600">This shared file is password protected.</p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Enter Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the file password"
                  className="mt-1"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !password.trim()}
              >
                {loading ? 'Verifying...' : 'Access File'}
              </Button>
            </form>
          </div>
        )}

        {fileData && (
          <div className="text-center">
            <div className="mb-6">
              {/* Image Preview */}
              {fileData.metadata.mimetype?.startsWith('image/') ? (
                <div className="mb-4">
                  <img 
                    src={fileData.downloadUrl} 
                    alt={fileData.metadata.originalName}
                    className="max-w-full max-h-64 mx-auto rounded-lg shadow-md object-contain"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <div className="hidden">
                    {getFileIcon(fileData.metadata.mimetype)}
                  </div>
                </div>
              ) : (
                getFileIcon(fileData.metadata.mimetype)
              )}
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2 mt-4">
                {fileData.metadata.originalName}
              </h1>
              <p className="text-gray-600 mb-2">
                Shared by {fileData.metadata.owner.name || fileData.metadata.owner.email || 'Unknown'}
              </p>
              {fileData.metadata.encryptionType && (
                <p className="text-sm text-blue-600 mb-4">
                  🔒 Encrypted file - Secure download
                </p>
              )}
            </div>

            <div className="space-y-3">
              <Button 
                onClick={handleDownload}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download File
              </Button>

              {/* Add to Account Button - Only show if user is authenticated */}
              {isAuthenticated && (
                <Button 
                  onClick={handleAddToAccount}
                  disabled={addingToAccount}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {addingToAccount ? (
                    <>
                      <svg className="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Adding to Account...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Add to My Files
                    </>
                  )}
                </Button>
              )}

              {/* Login prompt for non-authenticated users */}
              {!isAuthenticated && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    💡 Want to save this file to your account?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        // Save current share link to return after login
                        sessionStorage.setItem('redirectAfterLogin', `/share/${token}`);
                        navigate('/login');
                      }}
                      variant="outline"
                      size="sm"
                      className="flex-1"
                    >
                      Login
                    </Button>
                    <Button
                      onClick={() => {
                        // Save current share link to return after signup
                        sessionStorage.setItem('redirectAfterLogin', `/share/${token}`);
                        navigate('/signup');
                      }}
                      variant="default"
                      size="sm"
                      className="flex-1"
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
