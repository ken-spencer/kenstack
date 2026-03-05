export type User = {
  id: number;
  publicId: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  avatar: string | null;
  email: string;
  roles: string[];
};
