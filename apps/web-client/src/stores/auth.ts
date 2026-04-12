import { atom } from 'nanostores';

export type User = {
  email: string;
};

export const userStore = atom<User | undefined>(undefined);

export async function fetchUser() {
  try {
    const res = await fetch(`${import.meta.env.PUBLIC_API_URL}/v1/auth/me`, {
      credentials: 'include',
    });

    if (!res.ok) {
      userStore.set(undefined);
      return;
    }

    const data: User = await res.json();
    userStore.set(data);
  } catch {
    userStore.set(undefined);
  }
}

if (typeof window !== 'undefined') {
  fetchUser();
}
