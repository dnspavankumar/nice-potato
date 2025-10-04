'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.';
      case 'AccessDenied':
        return 'Access was denied. You may have denied access or the request was cancelled.';
      case 'Verification':
        return 'The verification token has expired or has already been used.';
      default:
        return 'An error occurred during authentication.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-red-600">
            Authentication Error
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {getErrorMessage(error)}
          </p>
        </div>
        <div className="text-center">
          <Link
            href="/auth/signin"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Try again
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthError() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
