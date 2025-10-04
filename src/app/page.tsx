'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { Mail, Search, MessageSquare, Settings, RefreshCw, User, LogOut } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('');
  
  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: string, content: string}>>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  
  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  
  // Emails state
  const [syncedEmails, setSyncedEmails] = useState<any[]>([]);
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set());
  
  // Refs for auto-scrolling
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleSyncEmails = async () => {
    if (!session?.accessToken) {
      alert('Please sign in first');
      return;
    }

    console.log('Session data:', session);
    console.log('Access token:', session.accessToken);
    console.log('Refresh token:', session.refreshToken);

    setIsLoading(true);
    setSyncStatus('Syncing emails...');
    
    try {
      const response = await fetch('/api/emails/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        setSyncStatus(`Successfully synced ${data.processed} emails`);
        // Store the synced emails
        setSyncedEmails(data.emails || []);
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch (error) {
      setSyncStatus(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim() || isChatLoading) return;

    const question = chatInput.trim();
    setChatInput('');
    setIsChatLoading(true);

    // Add user message to chat history
    const newUserMessage = { role: 'user', content: question };
    setChatHistory(prev => [...prev, newUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add assistant response to chat history
        const assistantMessage = { role: 'assistant', content: data.answer };
        setChatHistory(prev => [...prev, assistantMessage]);
        
        // Update conversation history for context
        setConversationHistory(data.conversationHistory || []);
      } else {
        // Add error message to chat history
        const errorMessage = { role: 'assistant', content: `Error: ${data.error}` };
        setChatHistory(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      // Add error message to chat history
      const errorMessage = { role: 'assistant', content: `Error: ${error}` };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isChatLoading]);

  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  const handleSearch = async () => {
    if (!searchInput.trim() || isSearchLoading) return;

    setIsSearchLoading(true);
    
    try {
      const response = await fetch('/api/emails/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchInput.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
        alert(`Search error: ${data.error}`);
      }
    } catch (error) {
      setSearchResults([]);
      alert(`Search error: ${error}`);
    } finally {
      setIsSearchLoading(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  const toggleEmailExpansion = (emailId: string) => {
    const newExpanded = new Set(expandedEmails);
    if (newExpanded.has(emailId)) {
      newExpanded.delete(emailId);
    } else {
      newExpanded.add(emailId);
    }
    setExpandedEmails(newExpanded);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Today';
      } else if (diffDays === 2) {
        return 'Yesterday';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch (error) {
      return dateString;
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome to Email RAG
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in with Google to access your emails
            </p>
          </div>
          <div>
            <button
              onClick={() => signIn('google')}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-xl font-semibold text-gray-900">Email RAG</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-600">{session.user?.email}</span>
              </div>
              <button 
                onClick={handleSyncEmails}
                disabled={isLoading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isLoading ? 'Syncing...' : 'Sync Emails'}
              </button>
              <button 
                onClick={() => signOut()}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'chat', name: 'Chat', icon: MessageSquare },
              { id: 'search', name: 'Search', icon: Search },
              { id: 'emails', name: 'Emails', icon: Mail },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-1 py-4 text-sm font-medium border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Sync Status */}
      {syncStatus && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">{syncStatus}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'chat' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Chat with Your Emails</h2>
              <div className="space-y-4">
                {/* Chat History */}
                <div className="bg-gray-50 rounded-lg p-4 min-h-[400px] max-h-[400px] overflow-y-auto">
                  {chatHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600 mb-2">
                        Ask questions about your emails. The AI will search through your email content and provide relevant answers.
                      </p>
                      <p className="text-xs text-gray-500">
                        Make sure to sync your emails first using the "Sync Emails" button above.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatHistory.map((message, index) => (
                        <div
                          key={index}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === 'user'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-900 border'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="bg-white text-gray-900 border p-3 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                              <p className="text-sm">Thinking...</p>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </div>
                
                {/* Chat Input */}
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleChatKeyPress}
                    placeholder="Ask a question about your emails..."
                    disabled={isChatLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 bg-white placeholder-gray-500"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                  <button 
                    onClick={handleChatSubmit}
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isChatLoading ? 'Sending...' : 'Send'}
                  </button>
                </div>
                
                {/* Clear Chat Button */}
                {chatHistory.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setChatHistory([]);
                        setConversationHistory([]);
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Clear Chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Search Your Emails</h2>
              <div className="space-y-4">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="Search emails..."
                    disabled={isSearchLoading}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-gray-900 bg-white placeholder-gray-500"
                    style={{ color: '#111827', backgroundColor: '#ffffff' }}
                  />
                  <button 
                    onClick={handleSearch}
                    disabled={isSearchLoading || !searchInput.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                <div className="text-sm text-gray-600">
                  Use semantic search to find emails by meaning, not just keywords.
                </div>
                
                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-md font-medium text-gray-900 mb-3">
                      Search Results ({searchResults.length})
                    </h3>
                    <div className="space-y-3">
                      {searchResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{result.subject}</h4>
                            <span className="text-xs text-gray-500">
                              Score: {(result.score * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">From:</span> {result.sender}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Date:</span> {new Date(result.date).toLocaleDateString()}
                          </div>
                          {result.summary && (
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">Summary:</span> {
                                typeof result.summary === 'string' 
                                  ? result.summary.substring(0, 200) + '...'
                                  : JSON.stringify(result.summary).substring(0, 200) + '...'
                              }
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {searchResults.length === 0 && !isSearchLoading && searchInput && (
                  <div className="text-center py-8">
                    <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600">
                      No emails found matching your search. Try different keywords or make sure your emails are synced.
                    </p>
                  </div>
                )}
                
                {isSearchLoading && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Searching...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Your Emails</h2>
              
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Syncing emails...</p>
                </div>
              ) : syncedEmails.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">
                    No emails synced yet.
                  </p>
                  <p className="text-xs text-gray-500">
                    Click "Sync Emails" above to fetch your latest Canara Bank emails.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Showing {syncedEmails.length} synced emails
                    </p>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setSyncedEmails([]);
                          setExpandedEmails(new Set());
                          setSyncStatus('');
                        }}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleSyncEmails}
                        disabled={isLoading}
                        className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        Refresh
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {syncedEmails.map((email, index) => {
                      const emailId = email.id || `email-${index}`;
                      const isExpanded = expandedEmails.has(emailId);
                      
                      return (
                        <div key={emailId} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-gray-900 text-sm flex-1 mr-4">
                              {email.subject || 'No Subject'}
                            </h3>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500">
                                {formatDate(email.date)}
                              </span>
                              <button
                                onClick={() => toggleEmailExpansion(emailId)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {isExpanded ? 'Less' : 'More'}
                              </button>
                            </div>
                          </div>
                          
                          <div className="text-sm text-gray-600 mb-2 flex items-center justify-between">
                            <div>
                              <span className="font-medium">From:</span> {email.from}
                            </div>
                            {email.from.toLowerCase().includes('canara') && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Canara Bank
                              </span>
                            )}
                          </div>
                          
                          {isExpanded && (
                            <>
                              <div className="text-sm text-gray-600 mb-3">
                                <span className="font-medium">Date:</span> {new Date(email.date).toLocaleString()}
                              </div>
                              
                              {email.summary && (
                                <div className="bg-gray-50 rounded p-3">
                                  <h4 className="text-xs font-medium text-gray-700 mb-1">AI Summary:</h4>
                                  <div className="text-sm text-gray-700">
                                    {(() => {
                                      try {
                                        const summary = typeof email.summary === 'string' 
                                          ? JSON.parse(email.summary) 
                                          : email.summary;
                                        
                                        return (
                                          <div className="space-y-1">
                                            {summary.sender && (
                                              <p><span className="font-medium">Sender:</span> {summary.sender}</p>
                                            )}
                                            {summary.subject && (
                                              <p><span className="font-medium">Subject:</span> {summary.subject}</p>
                                            )}
                                            {summary.context && (
                                              <p><span className="font-medium">Context:</span> {summary.context}</p>
                                            )}
                                          </div>
                                        );
                                      } catch (error) {
                                        return <p>{email.summary.toString().substring(0, 500)}...</p>;
                                      }
                                    })()}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
