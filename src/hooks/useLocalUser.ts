import { useState } from 'react';
import { SESSION_KEYS } from '../constants/collab';
import { readSessionString, writeSessionString } from '../utils/sessionStore';
import { colorForUser } from '../utils/userColor';
import { generateUserId, generateUserName } from '../utils/userId';

export type LocalUser = {
  id: string;
  name: string;
  color: string;
};

export function useLocalUser(): LocalUser {
  const [user] = useState<LocalUser>(() => {
    const id = readSessionString(SESSION_KEYS.USER_ID) ?? generateUserId();
    const name = readSessionString(SESSION_KEYS.USER_NAME) ?? generateUserName();
    writeSessionString(SESSION_KEYS.USER_ID, id);
    writeSessionString(SESSION_KEYS.USER_NAME, name);
    return { id, name, color: colorForUser(id) };
  });
  return user;
}
