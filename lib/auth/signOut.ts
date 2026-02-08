type SignOutClient = {
  auth: {
    signOut: () => Promise<{ error: unknown }>;
  };
};

type Router = {
  push: (href: string) => void;
  refresh: () => void;
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return new Error(message);
    }
  }

  return new Error('Failed to sign out.');
};

export const signOutAndRedirect = async (
  client: SignOutClient,
  router: Router
): Promise<void> => {
  const { error } = await client.auth.signOut();
  if (error) {
    throw toError(error);
  }

  router.push('/login');
  router.refresh();
};
