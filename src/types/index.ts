export type User<TRoles extends readonly string[] = string[]> = {
  id: number;
  publicId: string;
  firstName: string;
  lastName: string;
  name: string;
  initials: string;
  avatar: string | null;
  email: string;
  roles: TRoles;
};

export type Prettify<T> = { [K in keyof T]: T[K] } & {};
