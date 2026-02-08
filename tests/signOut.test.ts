import { describe, expect, it, vi } from 'vitest';
import { signOutAndRedirect } from '@/lib/auth/signOut';

describe('signOutAndRedirect', () => {
  it('redirects after successful sign out', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null });
    const push = vi.fn();
    const refresh = vi.fn();

    await signOutAndRedirect(
      { auth: { signOut } },
      { push, refresh }
    );

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith('/login');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('throws and avoids redirect when sign out fails', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: { message: 'session revoke failed' } });
    const push = vi.fn();
    const refresh = vi.fn();

    await expect(
      signOutAndRedirect(
        { auth: { signOut } },
        { push, refresh }
      )
    ).rejects.toThrow('session revoke failed');

    expect(push).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
  });
});
