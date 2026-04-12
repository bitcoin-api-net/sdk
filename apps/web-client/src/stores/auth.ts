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

export async function logout() {
  try {
    await fetch(`${import.meta.env.PUBLIC_API_URL}/v1/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } finally {
    userStore.set(undefined);
  }
}
